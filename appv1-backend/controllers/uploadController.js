const { cloudinary } = require('../config/cloudinary');

// UPLOAD IMAGE
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    res.json({
      success: true,
      file: {
        url: req.file.path,
        publicId: req.file.filename,
        format: req.file.mimetype,
        size: req.file.size
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPLOAD PDF
exports.uploadPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF uploaded' });
    }

    res.json({
      success: true,
      file: {
        url: req.file.path,
        publicId: req.file.filename,
        format: 'pdf',
        size: req.file.size
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPLOAD ANY FILE (image or pdf)
exports.uploadAny = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
      success: true,
      file: {
        url: req.file.path,
        publicId: req.file.filename,
        type: req.file.mimetype,
        size: req.file.size
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE FILE
exports.deleteFile = async (req, res) => {
  try {
    const { publicId, resourceType } = req.body;

    if (!publicId) {
      return res.status(400).json({ error: 'publicId required' });
    }

    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType || 'image'
    });

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
