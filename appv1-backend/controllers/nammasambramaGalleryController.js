const { NammaSambramaGallerySettings, NammaSambramaGalleryItem } = require('../models/NammaSambramaGallery');
const { uploadToAzure, deleteFromAzure, sharp } = require('../config/azureStorage');

const AZURE_FOLDER = 'nammasambrama/gallery';

function extractYouTubeId(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = trimmed.match(regExp);
  return (match && match[2].length === 11) ? match[2] : '';
}

function serialize(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, adminId, ...rest } = obj;
  return { id: String(_id), ...rest };
}

/* ------------------------------------------------------------------ */
/* Public Endpoint (No Auth Required)                                  */
/* ------------------------------------------------------------------ */

/**
 * GET /public/gallery
 * Returns global enableGallery setting and all public-visible gallery items.
 */
exports.getPublicGallery = async (req, res) => {
  try {
    const settings = await NammaSambramaGallerySettings.findOne().sort({ updatedAt: -1 });
    const enableGallery = settings ? settings.enableGallery : true;

    if (!enableGallery) {
      return res.status(200).json({ enableGallery: false, items: [] });
    }

    const items = await NammaSambramaGalleryItem.find({ showInPublic: true }).sort({ createdAt: -1 });
    res.status(200).json({
      enableGallery: true,
      items: items.map(serialize)
    });
  } catch (error) {
    console.error('getPublicGallery error:', error);
    res.status(500).json({ error: 'Failed to fetch public gallery' });
  }
};

/* ------------------------------------------------------------------ */
/* Admin Endpoints (JWT Required)                                      */
/* ------------------------------------------------------------------ */

/**
 * GET /admin/gallery
 * Returns all gallery items and current admin enableGallery setting.
 */
exports.getAdminGallery = async (req, res) => {
  try {
    const settings = await NammaSambramaGallerySettings.findOne({ adminId: req.admin.adminId });
    const enableGallery = settings ? settings.enableGallery : true;
    const items = await NammaSambramaGalleryItem.find({ adminId: req.admin.adminId }).sort({ createdAt: -1 });

    res.status(200).json({
      enableGallery,
      items: items.map(serialize)
    });
  } catch (error) {
    console.error('getAdminGallery error:', error);
    res.status(500).json({ error: 'Failed to fetch admin gallery' });
  }
};

/**
 * PUT /admin/gallery/settings
 * Toggle global enableGallery setting for public site.
 */
exports.updateGallerySettings = async (req, res) => {
  try {
    const { enableGallery } = req.body;
    if (typeof enableGallery !== 'boolean') {
      return res.status(400).json({ error: 'enableGallery must be a boolean value' });
    }

    const settings = await NammaSambramaGallerySettings.findOneAndUpdate(
      { adminId: req.admin.adminId },
      { $set: { enableGallery } },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({ enableGallery: settings.enableGallery });
  } catch (error) {
    console.error('updateGallerySettings error:', error);
    res.status(500).json({ error: 'Failed to update gallery settings' });
  }
};

/**
 * POST /admin/gallery/items
 * Create a photo or video item.
 * Supports multipart upload for photos or JSON for videos/photos with external URLs.
 */
exports.createGalleryItem = async (req, res) => {
  try {
    const { type, title, description, eventType, showInPublic, youtubeUrl, imageUrl, imageId } = req.body;

    if (!type || !['photo', 'video'].includes(type)) {
      return res.status(400).json({ error: 'Valid type ("photo" or "video") is required' });
    }
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const newItem = {
      adminId: req.admin.adminId,
      type,
      title: String(title).trim(),
      description: String(description || '').trim(),
      eventType: String(eventType || 'General').trim(),
      showInPublic: showInPublic !== undefined ? Boolean(showInPublic) : true
    };

    if (type === 'photo') {
      if (req.file) {
        const optimized = await sharp(req.file.buffer)
          .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 88 })
          .toBuffer();

        const { url, publicId } = await uploadToAzure(
          optimized,
          req.file.originalname.replace(/\.[^.]+$/, '.jpg'),
          'image/jpeg',
          AZURE_FOLDER
        );

        newItem.imageUrl = url;
        newItem.imageId = publicId;
      } else if (imageUrl) {
        newItem.imageUrl = imageUrl;
        newItem.imageId = imageId || '';
      } else {
        return res.status(400).json({ error: 'Image file or imageUrl is required for photo items' });
      }
    } else if (type === 'video') {
      if (!youtubeUrl || !String(youtubeUrl).trim()) {
        return res.status(400).json({ error: 'YouTube URL is required for video items' });
      }
      const yId = extractYouTubeId(youtubeUrl);
      if (!yId) {
        return res.status(400).json({ error: 'Invalid YouTube URL provided' });
      }
      newItem.youtubeUrl = String(youtubeUrl).trim();
      newItem.youtubeId = yId;
    }

    const doc = await NammaSambramaGalleryItem.create(newItem);
    res.status(201).json({ item: serialize(doc) });
  } catch (error) {
    console.error('createGalleryItem error:', error);
    res.status(500).json({ error: 'Failed to create gallery item' });
  }
};

/**
 * PUT /admin/gallery/items/:id
 * Update a photo or video item (e.g. toggle showInPublic, change title/description).
 */
exports.updateGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, eventType, showInPublic, youtubeUrl } = req.body;

    const item = await NammaSambramaGalleryItem.findOne({ _id: id, adminId: req.admin.adminId });
    if (!item) {
      return res.status(404).json({ error: 'Gallery item not found' });
    }

    if (title !== undefined) item.title = String(title).trim();
    if (description !== undefined) item.description = String(description).trim();
    if (eventType !== undefined) item.eventType = String(eventType).trim();
    if (showInPublic !== undefined) item.showInPublic = Boolean(showInPublic);

    if (item.type === 'video' && youtubeUrl) {
      const yId = extractYouTubeId(youtubeUrl);
      if (!yId) {
        return res.status(400).json({ error: 'Invalid YouTube URL provided' });
      }
      item.youtubeUrl = String(youtubeUrl).trim();
      item.youtubeId = yId;
    }

    if (item.type === 'photo' && req.file) {
      if (item.imageId) {
        try {
          await deleteFromAzure(item.imageId);
        } catch (delErr) {
          console.warn('Failed to delete previous image from Azure:', delErr.message);
        }
      }

      const optimized = await sharp(req.file.buffer)
        .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 88 })
        .toBuffer();

      const { url, publicId } = await uploadToAzure(
        optimized,
        req.file.originalname.replace(/\.[^.]+$/, '.jpg'),
        'image/jpeg',
        AZURE_FOLDER
      );

      item.imageUrl = url;
      item.imageId = publicId;
    }

    await item.save();
    res.status(200).json({ item: serialize(item) });
  } catch (error) {
    console.error('updateGalleryItem error:', error);
    res.status(500).json({ error: 'Failed to update gallery item' });
  }
};

/**
 * DELETE /admin/gallery/items/:id
 * Delete a gallery item.
 */
exports.deleteGalleryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await NammaSambramaGalleryItem.findOneAndDelete({ _id: id, adminId: req.admin.adminId });

    if (!item) {
      return res.status(404).json({ error: 'Gallery item not found' });
    }

    if (item.imageId) {
      try {
        await deleteFromAzure(item.imageId);
      } catch (delErr) {
        console.warn('Failed to delete image from Azure:', delErr.message);
      }
    }

    res.status(200).json({ success: true, id });
  } catch (error) {
    console.error('deleteGalleryItem error:', error);
    res.status(500).json({ error: 'Failed to delete gallery item' });
  }
};
