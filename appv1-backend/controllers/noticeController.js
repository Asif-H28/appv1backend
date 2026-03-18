const Notice = require('../models/Notice');
const Classroom = require('../models/Classroom');
const { cloudinary } = require('../config/cloudinary');

const generateNoticeId = () => `NTC_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

// CREATE NOTICE
exports.createNotice = async (req, res) => {
  try {
    const { title, description, createdBy, classroomId, expiresAt } = req.body;

    if (!title || !description || !createdBy || !classroomId || !expiresAt) {
      return res.status(400).json({ error: 'title, description, createdBy, classroomId, expiresAt required' });
    }

    const classroom = await Classroom.findOne({ classId: classroomId });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    // Handle file attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const isPdf = file.mimetype === 'application/pdf';
        attachments.push({
          url: file.path,
          publicId: file.filename,
          type: isPdf ? 'pdf' : 'image'
        });
      }
    }

    let noticeId = generateNoticeId();
    while (await Notice.findOne({ noticeId })) {
      noticeId = generateNoticeId();
    }

    const notice = await Notice.create({
      noticeId,
      title,
      description,
      createdBy,
      classroomId,
      expiresAt: new Date(expiresAt),
      attachments
    });

    res.status(201).json({ success: true, notice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET ALL NOTICES BY CLASSROOM (auto-delete expired)
exports.getNoticesByClassroom = async (req, res) => {
  try {
    const { classId } = req.params;

    // Delete expired notices + cleanup cloudinary
    const expiredNotices = await Notice.find({
      classroomId: classId,
      expiresAt: { $lt: new Date() }
    });

    for (const notice of expiredNotices) {
      for (const att of notice.attachments) {
        await cloudinary.uploader.destroy(att.publicId, {
          resource_type: att.type === 'pdf' ? 'raw' : 'image'
        });
      }
    }

    await Notice.deleteMany({
      classroomId: classId,
      expiresAt: { $lt: new Date() }
    });

    // Return active notices
    const notices = await Notice.find({ classroomId: classId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: notices.length,
      notices
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET SINGLE NOTICE
exports.getNotice = async (req, res) => {
  try {
    const { noticeId } = req.params;
    const notice = await Notice.findOne({ noticeId });
    if (!notice) return res.status(404).json({ error: 'Notice not found' });

    res.json({ success: true, notice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE NOTICE
exports.updateNotice = async (req, res) => {
  try {
    const { noticeId } = req.params;
    const { title, description, expiresAt } = req.body;

    const notice = await Notice.findOne({ noticeId });
    if (!notice) return res.status(404).json({ error: 'Notice not found' });

    if (title) notice.title = title;
    if (description) notice.description = description;
    if (expiresAt) notice.expiresAt = new Date(expiresAt);

    // Append new attachments if uploaded
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const isPdf = file.mimetype === 'application/pdf';
        notice.attachments.push({
          url: file.path,
          publicId: file.filename,
          type: isPdf ? 'pdf' : 'image'
        });
      }
    }

    await notice.save();
    res.json({ success: true, notice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE SINGLE ATTACHMENT FROM NOTICE
exports.deleteAttachment = async (req, res) => {
  try {
    const { noticeId } = req.params;
    const { publicId, resourceType } = req.body;

    const notice = await Notice.findOne({ noticeId });
    if (!notice) return res.status(404).json({ error: 'Notice not found' });

    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType === 'pdf' ? 'raw' : 'image'
    });

    notice.attachments = notice.attachments.filter(a => a.publicId !== publicId);
    await notice.save();

    res.json({ success: true, message: 'Attachment deleted', attachments: notice.attachments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE NOTICE
exports.deleteNotice = async (req, res) => {
  try {
    const { noticeId } = req.params;
    const notice = await Notice.findOne({ noticeId });
    if (!notice) return res.status(404).json({ error: 'Notice not found' });

    // Cleanup cloudinary attachments
    for (const att of notice.attachments) {
      await cloudinary.uploader.destroy(att.publicId, {
        resource_type: att.type === 'pdf' ? 'raw' : 'image'
      });
    }

    await Notice.findOneAndDelete({ noticeId });
    res.json({ success: true, message: `Notice "${notice.title}" deleted` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PURGE EXPIRED NOTICES BY CLASSID (Manual trigger endpoint)
exports.purgeExpiredNotices = async (req, res) => {
  try {
    const { classId } = req.params;

    const expiredNotices = await Notice.find({
      classroomId: classId,
      expiresAt: { $lt: new Date() }
    });

    if (expiredNotices.length === 0) {
      return res.json({ success: true, message: 'No expired notices found', deleted: 0 });
    }

    for (const notice of expiredNotices) {
      for (const att of notice.attachments) {
        await cloudinary.uploader.destroy(att.publicId, {
          resource_type: att.type === 'pdf' ? 'raw' : 'image'
        });
      }
    }

    const result = await Notice.deleteMany({
      classroomId: classId,
      expiresAt: { $lt: new Date() }
    });

    res.json({
      success: true,
      message: `${result.deletedCount} expired notice(s) deleted`,
      deleted: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
