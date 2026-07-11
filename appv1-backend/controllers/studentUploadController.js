const StudentUpload = require('../models/StudentUpload');

// Create an upload
exports.createUpload = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    // user could be a student, their ID should be available in req.user
    const uploadedById = req.user.studentId || req.user.id || req.body.uploadedById;
    const { title, imageUrl, uploadedByName, uploadType, teacherId, teacherName } = req.body;

    if (!title || !imageUrl || !uploadedByName) {
      return res.status(400).json({ success: false, message: 'Title, imageUrl, and uploadedByName are required' });
    }

    const newUpload = new StudentUpload({
      orgId,
      title,
      imageUrl,
      uploadedById,
      uploadedByName,
      uploadType: uploadType || 'general',
      teacherId: uploadType === 'teacher' ? teacherId : null,
      teacherName: uploadType === 'teacher' ? teacherName : null,
    });

    await newUpload.save();
    res.status(201).json({ success: true, data: newUpload });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get uploads with filters and pagination
exports.getUploads = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { uploadType, teacherId, uploadedById, title, month, year, page = 1, limit = 10 } = req.query;

    const query = { orgId };
    if (uploadType) query.uploadType = uploadType;
    if (teacherId) query.teacherId = teacherId;
    if (uploadedById) query.uploadedById = uploadedById;
    
    // Support filtering by title (single or comma-separated)
    if (title) {
      const titlesArray = title.split(',').map(t => t.trim());
      if (titlesArray.length > 1) {
        // Case-insensitive exact match for multiple titles
        query.title = { $in: titlesArray.map(t => new RegExp(`^${t}$`, 'i')) };
      } else {
        // Partial case-insensitive match for single title
        query.title = { $regex: title, $options: 'i' };
      }
    }

    // Filter by month and year
    if (month && year) {
      // month is 1-indexed (1 = January)
      const startDate = new Date(year, parseInt(month) - 1, 1);
      const endDate = new Date(year, parseInt(month), 1); // 1st day of next month
      query.createdAt = { $gte: startDate, $lt: endDate };
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(parseInt(year) + 1, 0, 1);
      query.createdAt = { $gte: startDate, $lt: endDate };
    }

    const skip = (page - 1) * limit;

    const total = await StudentUpload.countDocuments(query);
    const uploads = await StudentUpload.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: uploads.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: uploads
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get upload by ID
exports.getUploadById = async (req, res) => {
  try {
    const upload = await StudentUpload.findById(req.params.id);
    if (!upload) {
      return res.status(404).json({ success: false, message: 'Upload not found' });
    }
    // Verify org
    if (upload.orgId !== req.user.orgId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.status(200).json({ success: true, data: upload });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update upload
exports.updateUpload = async (req, res) => {
  try {
    const { title, imageUrl } = req.body;
    let upload = await StudentUpload.findById(req.params.id);

    if (!upload) {
      return res.status(404).json({ success: false, message: 'Upload not found' });
    }

    if (upload.orgId !== req.user.orgId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (title) upload.title = title;
    if (imageUrl) upload.imageUrl = imageUrl;

    await upload.save();
    res.status(200).json({ success: true, data: upload });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete upload
exports.deleteUpload = async (req, res) => {
  try {
    const upload = await StudentUpload.findById(req.params.id);
    if (!upload) {
      return res.status(404).json({ success: false, message: 'Upload not found' });
    }

    if (upload.orgId !== req.user.orgId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await StudentUpload.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Upload deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
