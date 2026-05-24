const { uploadToAzure, deleteFromAzure, sharp } = require('../config/azureStorage');

// UPLOAD IMAGE (Auto-optimize with Sharp)
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    // Optimize image using Sharp
    const optimizedBuffer = await sharp(req.file.buffer)
      .resize({ width: 1000, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const uploadResult = await uploadToAzure(
      optimizedBuffer,
      req.file.originalname.replace(/\.[^/.]+$/, "") + ".webp", // replace ext with webp
      'image/webp',
      'images'
    );

    res.json({
      success: true,
      file: {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        format: 'image/webp',
        size: optimizedBuffer.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPLOAD PDF (Raw upload)
exports.uploadPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF uploaded' });
    }

    const uploadResult = await uploadToAzure(
      req.file.buffer,
      req.file.originalname,
      'application/pdf',
      'pdfs'
    );

    res.json({
      success: true,
      file: {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        format: 'pdf',
        size: req.file.size
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPLOAD ANY FILE
exports.uploadAny = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const isImage = req.file.mimetype.startsWith('image/');
    const isPdf = req.file.mimetype === 'application/pdf';
    const folder = isImage ? 'images' : (isPdf ? 'pdfs' : 'docs');
    
    let buffer = req.file.buffer;
    let mimeType = req.file.mimetype;
    let name = req.file.originalname;

    if (isImage) {
      buffer = await sharp(req.file.buffer)
        .resize({ width: 1000, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      mimeType = 'image/webp';
      name = name.replace(/\.[^/.]+$/, "") + ".webp";
    }

    const uploadResult = await uploadToAzure(buffer, name, mimeType, folder);

    res.json({
      success: true,
      file: {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        type: mimeType,
        size: buffer.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE FILE
exports.deleteFile = async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({ error: 'publicId required' });
    }

    await deleteFromAzure(publicId);

    res.json({
      success: true,
      message: 'File deleted successfully from Azure Blob Storage'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
