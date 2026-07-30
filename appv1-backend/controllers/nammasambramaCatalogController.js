const NammaSambramaEvent = require('../models/NammaSambramaEvent');
const NammaSambramaFood = require('../models/NammaSambramaFood');
const NammaSambramaEnquiry = require('../models/NammaSambramaEnquiry');
const { uploadToAzure, deleteFromAzure, sharp } = require('../config/azureStorage');

const AZURE_FOLDER = 'nammasambrama';

/**
 * Shape a document for the frontend: expose `id` instead of `_id` so the
 * existing EventType / FoodCategory types keep working unchanged.
 */
function serialize(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, ...rest } = obj;
  return { id: String(_id), ...rest };
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

/** GET /public/events  and  GET /admin/events */
exports.listEvents = async (req, res) => {
  try {
    const events = await NammaSambramaEvent.find().sort({ createdAt: -1 });
    res.status(200).json({ events: events.map(serialize) });
  } catch (error) {
    console.error('listEvents error:', error);
    res.status(500).json({ error: 'Failed to load event types' });
  }
};

/** GET /public/events/:id  and  GET /admin/events/:id */
exports.getEvent = async (req, res) => {
  try {
    const event = await NammaSambramaEvent.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event type not found' });
    res.status(200).json({ event: serialize(event) });
  } catch (error) {
    console.error('getEvent error:', error);
    res.status(500).json({ error: 'Failed to load event type' });
  }
};

/** POST /admin/events */
exports.createEvent = async (req, res) => {
  try {
    const { eventType } = req.body;
    if (!eventType || !String(eventType).trim()) {
      return res.status(400).json({ error: 'Event type is required' });
    }

    // `id` is client-generated for local drafts — never let it overwrite _id
    const { id, _id, ...payload } = req.body;

    const event = await NammaSambramaEvent.create({
      ...payload,
      createdBy: req.admin?.username || ''
    });

    res.status(201).json({ message: 'Event type created', event: serialize(event) });
  } catch (error) {
    console.error('createEvent error:', error);
    res.status(500).json({ error: 'Failed to create event type' });
  }
};

/** PUT /admin/events/:id */
exports.updateEvent = async (req, res) => {
  try {
    const { id, _id, createdBy, ...payload } = req.body;

    const event = await NammaSambramaEvent.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: true }
    );

    if (!event) return res.status(404).json({ error: 'Event type not found' });
    res.status(200).json({ message: 'Event type updated', event: serialize(event) });
  } catch (error) {
    console.error('updateEvent error:', error);
    res.status(500).json({ error: 'Failed to update event type' });
  }
};

/** DELETE /admin/events/:id */
exports.deleteEvent = async (req, res) => {
  try {
    const event = await NammaSambramaEvent.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event type not found' });

    // Best effort blob cleanup — a failure here must not block the delete
    if (event.eventImageId) {
      try {
        await deleteFromAzure(event.eventImageId);
      } catch (err) {
        console.warn('Blob cleanup failed for', event.eventImageId, err.message);
      }
    }

    await NammaSambramaEvent.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Event type deleted', id: req.params.id });
  } catch (error) {
    console.error('deleteEvent error:', error);
    res.status(500).json({ error: 'Failed to delete event type' });
  }
};

/* ------------------------------------------------------------------ */
/* Food categories                                                     */
/* ------------------------------------------------------------------ */

/** GET /public/foods  and  GET /admin/foods */
exports.listFoods = async (req, res) => {
  try {
    const foods = await NammaSambramaFood.find().sort({ createdAt: -1 });
    res.status(200).json({ foods: foods.map(serialize) });
  } catch (error) {
    console.error('listFoods error:', error);
    res.status(500).json({ error: 'Failed to load food categories' });
  }
};

/** GET /admin/foods/:id */
exports.getFood = async (req, res) => {
  try {
    const food = await NammaSambramaFood.findById(req.params.id);
    if (!food) return res.status(404).json({ error: 'Food category not found' });
    res.status(200).json({ food: serialize(food) });
  } catch (error) {
    console.error('getFood error:', error);
    res.status(500).json({ error: 'Failed to load food category' });
  }
};

/** POST /admin/foods */
exports.createFood = async (req, res) => {
  try {
    const { foodType } = req.body;
    if (!foodType || !String(foodType).trim()) {
      return res.status(400).json({ error: 'Food type is required' });
    }

    const { id, _id, ...payload } = req.body;

    const food = await NammaSambramaFood.create({
      ...payload,
      createdBy: req.admin?.username || ''
    });

    res.status(201).json({ message: 'Food category created', food: serialize(food) });
  } catch (error) {
    console.error('createFood error:', error);
    res.status(500).json({ error: 'Failed to create food category' });
  }
};

/** PUT /admin/foods/:id */
exports.updateFood = async (req, res) => {
  try {
    const { id, _id, createdBy, ...payload } = req.body;

    const food = await NammaSambramaFood.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: true }
    );

    if (!food) return res.status(404).json({ error: 'Food category not found' });
    res.status(200).json({ message: 'Food category updated', food: serialize(food) });
  } catch (error) {
    console.error('updateFood error:', error);
    res.status(500).json({ error: 'Failed to update food category' });
  }
};

/** DELETE /admin/foods/:id */
exports.deleteFood = async (req, res) => {
  try {
    const food = await NammaSambramaFood.findById(req.params.id);
    if (!food) return res.status(404).json({ error: 'Food category not found' });

    const blobIds = [
      food.foodtypeimageId,
      ...food.dishlist.map((d) => d.dishImageId)
    ].filter(Boolean);

    for (const blobId of blobIds) {
      try {
        await deleteFromAzure(blobId);
      } catch (err) {
        console.warn('Blob cleanup failed for', blobId, err.message);
      }
    }

    await NammaSambramaFood.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Food category deleted', id: req.params.id });
  } catch (error) {
    console.error('deleteFood error:', error);
    res.status(500).json({ error: 'Failed to delete food category' });
  }
};

/* ------------------------------------------------------------------ */
/* Uploads                                                             */
/* ------------------------------------------------------------------ */

/**
 * POST /admin/upload — multipart field `file`
 * Compresses images before pushing to Azure Blob.
 */
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const isImage = req.file.mimetype.startsWith('image/');
    let buffer = req.file.buffer;
    let mimeType = req.file.mimetype;
    let originalName = req.file.originalname;

    if (isImage) {
      buffer = await sharp(req.file.buffer)
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      mimeType = 'image/webp';
      originalName = `${originalName.split('.').slice(0, -1).join('.') || 'image'}.webp`;
    }

    const { url, publicId } = await uploadToAzure(
      buffer,
      originalName,
      mimeType,
      `${AZURE_FOLDER}/${isImage ? 'images' : 'files'}`
    );

    res.status(201).json({ url, publicId });
  } catch (error) {
    console.error('uploadImage error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
};

/** DELETE /admin/upload — Body: { publicId } */
exports.deleteImage = async (req, res) => {
  try {
    const { publicId } = req.body;
    if (!publicId) return res.status(400).json({ error: 'publicId is required' });

    // Confine deletes to this app's folder so a stray call cannot remove
    // blobs belonging to the school app.
    if (!String(publicId).startsWith(`${AZURE_FOLDER}/`)) {
      return res.status(400).json({ error: 'Invalid publicId' });
    }

    await deleteFromAzure(publicId);
    res.status(200).json({ message: 'File deleted', publicId });
  } catch (error) {
    console.error('deleteImage error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
};

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

/** GET /admin/dashboard/stats */
exports.dashboardStats = async (req, res) => {
  try {
    const [eventCount, foodCount, enquiryCounts, recentEnquiries] = await Promise.all([
      NammaSambramaEvent.countDocuments(),
      NammaSambramaFood.countDocuments(),
      NammaSambramaEnquiry.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      NammaSambramaEnquiry.find().sort({ createdAt: -1 }).limit(5)
    ]);

    const byStatus = { new: 0, contacted: 0, closed: 0 };
    enquiryCounts.forEach((row) => {
      if (row._id in byStatus) byStatus[row._id] = row.count;
    });

    // Dish totals across all categories
    const dishAgg = await NammaSambramaFood.aggregate([
      { $project: { count: { $size: { $ifNull: ['$dishlist', []] } } } },
      { $group: { _id: null, total: { $sum: '$count' } } }
    ]);

    res.status(200).json({
      stats: {
        events: eventCount,
        foodCategories: foodCount,
        dishes: dishAgg[0]?.total || 0,
        enquiries: byStatus.new + byStatus.contacted + byStatus.closed,
        enquiriesByStatus: byStatus
      },
      recentEnquiries: recentEnquiries.map(serialize)
    });
  } catch (error) {
    console.error('dashboardStats error:', error);
    res.status(500).json({ error: 'Failed to load dashboard stats' });
  }
};

exports.serialize = serialize;
