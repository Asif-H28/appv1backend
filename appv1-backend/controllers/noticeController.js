const Notice = require('../models/Notice');
const Classroom = require('../models/Classroom');
const { uploadToAzure, deleteFromAzure, sharp } = require('../config/azureStorage');
const { notifyClass } = require('../utils/sendNotification');  // ← ADD THIS

const generateNoticeId = () => `NTC_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

// CREATE NOTICE
exports.createNotice = async (req, res) => {
  try {
    const { title, description, createdBy, classroomId, expiresAt } = req.body;

    if (!title || !description || !createdBy || !classroomId || !expiresAt) {
      return res.status(400).json({ error: 'title, description, createdBy, classroomId, expiresAt required' });
    }

    const classroom = await Classroom.findOne({ classId: classroomId, isActive: true });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        let buffer = file.buffer;
        let mimeType = file.mimetype;
        let name = file.originalname;

        const isPdf = file.mimetype === 'application/pdf';
        const isImage = file.mimetype.startsWith('image/');
        const folder = isImage ? 'images' : (isPdf ? 'pdfs' : 'docs');

        if (isImage) {
          try {
            buffer = await sharp(file.buffer)
              .resize({ width: 1000, withoutEnlargement: true })
              .webp({ quality: 80 })
              .toBuffer();
            mimeType = 'image/webp';
            name = name.replace(/\.[^/.]+$/, "") + ".webp";
          } catch (sharpError) {
            console.error('Sharp optimization failed, uploading raw image:', sharpError);
          }
        }

        const uploadResult = await uploadToAzure(buffer, name, mimeType, `notices/${folder}`);
        attachments.push({
          url: uploadResult.url,
          publicId: uploadResult.publicId,
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

    // ✅ Send notification — inside try/catch so it won't break the API
    try {
      await notifyClass({
        classId: classroomId,
        orgId: classroom.orgId,
        title: `📢 New Notice: ${title}`,
        body: description.substring(0, 100),
        type: 'notice',
        sentBy: createdBy,
        sentByName: createdBy,
        data: { route: '/notices', noticeId: notice.noticeId }
      });

      // ✅ Send in-app notification via Socket.IO to each approved student
      const Student = require('../models/Student');
      const approvedStudents = await Student.find({ classId: classroomId, joinStatus: 'approved' }, 'studentId');
      const notificationSocket = require('../sockets/notificationSocket');
      for (const std of approvedStudents) {
        await notificationSocket.sendNotification(
          std.studentId,
          `📢 New Notice: ${title}`,
          description.substring(0, 100),
          { route: '/notices', noticeId: notice.noticeId }
        );
      }
    } catch (notifyError) {
      console.log('Notification failed (non-critical):', notifyError.message);
    }

    res.status(201).json({ success: true, notice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET ALL NOTICES BY CLASSROOM (auto-delete expired)
exports.getNoticesByClassroom = async (req, res) => {
  try {
    const { classId } = req.params;

    const expiredNotices = await Notice.find({
      classroomId: classId,
      expiresAt: { $lt: new Date() }
    });

    for (const notice of expiredNotices) {
      for (const att of notice.attachments) {
        try {
          await deleteFromAzure(att.publicId);
        } catch (azureErr) {
          console.error('Azure deletion error (non-critical):', azureErr.message);
        }
      }
    }

    await Notice.deleteMany({
      classroomId: classId,
      expiresAt: { $lt: new Date() }
    });

    
    const __clsCheck = await require('../models/Classroom').findOne({ classId, isActive: true });
    if (!__clsCheck) return res.status(403).json({ error: 'Classroom is inactive or not found' });

    const notices = await Notice.find({ classroomId: classId }).sort({ createdAt: -1 });

    res.json({ success: true, count: notices.length, notices });
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

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        let buffer = file.buffer;
        let mimeType = file.mimetype;
        let name = file.originalname;

        const isPdf = file.mimetype === 'application/pdf';
        const isImage = file.mimetype.startsWith('image/');
        const folder = isImage ? 'images' : (isPdf ? 'pdfs' : 'docs');

        if (isImage) {
          try {
            buffer = await sharp(file.buffer)
              .resize({ width: 1000, withoutEnlargement: true })
              .webp({ quality: 80 })
              .toBuffer();
            mimeType = 'image/webp';
            name = name.replace(/\.[^/.]+$/, "") + ".webp";
          } catch (sharpError) {
            console.error('Sharp optimization failed, uploading raw image:', sharpError);
          }
        }

        const uploadResult = await uploadToAzure(buffer, name, mimeType, `notices/${folder}`);
        notice.attachments.push({
          url: uploadResult.url,
          publicId: uploadResult.publicId,
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

    try {
      await deleteFromAzure(publicId);
    } catch (azureErr) {
      console.error('Azure deletion error (non-critical, might be Cloudinary asset):', azureErr.message);
    }

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

    for (const att of notice.attachments) {
      try {
        await deleteFromAzure(att.publicId);
      } catch (azureErr) {
        console.error('Azure deletion error (non-critical):', azureErr.message);
      }
    }

    await Notice.findOneAndDelete({ noticeId });
    res.json({ success: true, message: `Notice "${notice.title}" deleted` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PURGE EXPIRED NOTICES
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
        try {
          await deleteFromAzure(att.publicId);
        } catch (azureErr) {
          console.error('Azure deletion error (non-critical):', azureErr.message);
        }
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