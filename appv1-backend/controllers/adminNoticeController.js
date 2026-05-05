const AdminNotice  = require('../models/AdminNotice');
const Classroom    = require('../models/Classroom');
const Teacher      = require('../models/Teacher');
const { cloudinary } = require('../config/cloudinary');
const admin          = require('../config/firebase');

const generateNoticeId = () =>
  `ANTC_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;


// ─────────────────────────────────────────────
// HELPER — Send FCM to a list of tokens
// ─────────────────────────────────────────────
const sendFcmToTokens = async (tokens, title, body, data = {}) => {
  if (!tokens || tokens.length === 0) return;

  // FCM supports max 500 tokens per multicast — chunk if needed
  const chunks = [];
  for (let i = 0; i < tokens.length; i += 500) {
    chunks.push(tokens.slice(i, i + 500));
  }

  for (const chunk of chunks) {
    await admin.messaging().sendEachForMulticast({
      tokens: chunk,
      notification: { title, body },
      data,
      android: {
        priority: 'high',
        notification: { channelId: 'high_importance_channel', sound: 'default' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    });
  }
};


// ─────────────────────────────────────────────
// CREATE ADMIN NOTICE
// ─────────────────────────────────────────────
exports.createAdminNotice = async (req, res) => {
  try {
    const {
      orgId,
      title,
      description,
      createdBy,
      audience,        // 'teachers_only' | 'teachers_and_students'
      targetScope,     // 'all_classes' | 'selected_classes' (only for teachers_and_students)
      targetClassIds,  // array of classIds (only when targetScope = 'selected_classes')
      expiresAt
    } = req.body;

    if (!orgId || !title || !description || !createdBy || !audience) {
      return res.status(400).json({
        error: 'orgId, title, description, createdBy, audience required'
      });
    }

    if (!['teachers_only', 'teachers_and_students'].includes(audience)) {
      return res.status(400).json({
        error: 'audience must be "teachers_only" or "teachers_and_students"'
      });
    }

    if (audience === 'teachers_and_students') {
      if (!targetScope || !['all_classes', 'selected_classes'].includes(targetScope)) {
        return res.status(400).json({
          error: 'targetScope required: "all_classes" or "selected_classes"'
        });
      }
      if (targetScope === 'selected_classes') {
        const ids = typeof targetClassIds === 'string'
          ? JSON.parse(targetClassIds)
          : targetClassIds;
        if (!ids || ids.length === 0) {
          return res.status(400).json({
            error: 'targetClassIds required when targetScope is "selected_classes"'
          });
        }
      }
    }

    // Parse targetClassIds if sent as JSON string (multipart/form-data)
    const parsedClassIds =
      audience === 'teachers_and_students' && targetScope === 'selected_classes'
        ? typeof targetClassIds === 'string'
          ? JSON.parse(targetClassIds)
          : targetClassIds
        : [];

    // Handle file attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const isPdf = file.mimetype === 'application/pdf';
        attachments.push({
          url:      file.path,
          publicId: file.filename,
          type:     isPdf ? 'pdf' : 'image',
        });
      }
    }

    let noticeId = generateNoticeId();
    while (await AdminNotice.findOne({ noticeId })) {
      noticeId = generateNoticeId();
    }

    const notice = await AdminNotice.create({
      noticeId,
      orgId,
      title,
      description,
      createdBy,
      audience,
      targetScope:    audience === 'teachers_and_students' ? targetScope : null,
      targetClassIds: parsedClassIds,
      attachments,
      expiresAt:      expiresAt ? new Date(expiresAt) : null,
    });

    // ─────────────────────────────────────────
    // SEND FCM NOTIFICATIONS
    // ─────────────────────────────────────────
    try {
      const fcmTitle = `📢 Notice: ${title}`;
      const fcmBody  = description.substring(0, 100);
      const fcmData  = { route: 'admin-notices', noticeId: notice.noticeId };

      if (audience === 'teachers_only') {
        // Notify all teachers in the org
        const teachers = await Teacher.find({ orgId }, 'fcmToken');
        const tokens = teachers.map(t => t.fcmToken).filter(Boolean);
        await sendFcmToTokens(tokens, fcmTitle, fcmBody, fcmData);

      } else if (audience === 'teachers_and_students') {
        // Step 1: Notify all teachers in org
        const teachers = await Teacher.find({ orgId }, 'fcmToken');
        const teacherTokens = teachers.map(t => t.fcmToken).filter(Boolean);
        await sendFcmToTokens(teacherTokens, fcmTitle, fcmBody, fcmData);

        // Step 2: Notify students based on scope
        let classIds = [];

        if (targetScope === 'all_classes') {
          const classes = await Classroom.find({ orgId }, 'classId');
          classIds = classes.map(c => c.classId);
        } else {
          classIds = parsedClassIds;
        }

        // Get all student FCM tokens for those classes
        const Student = require('../models/Student');
        const students = await Student.find(
          { classId: { $in: classIds }, joinStatus: 'approved' },
          'fcmToken'
        );
        const studentTokens = students.map(s => s.fcmToken).filter(Boolean);
        await sendFcmToTokens(studentTokens, fcmTitle, fcmBody, fcmData);
      }

      console.log(`✅ Admin notice notifications sent — audience: ${audience}`);

      // ─────────────────────────────────────────
      // ✅ SAVE NOTIFICATION RECORD TO DB
      // ─────────────────────────────────────────
      const Notification = require('../models/Notification');
      let notificationId = `NTF_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      while (await Notification.findOne({ notificationId })) {
        notificationId = `NTF_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      }

      await Notification.create({
        notificationId,
        title:      fcmTitle,
        body:       description,
        type:       'notice',
        sentBy:     createdBy,
        sentByName: 'Admin',
        targetRole: audience === 'teachers_only' ? 'teacher' : 'all',
        orgId,
        data:       {
          ...fcmData,
          targetScope:    audience === 'teachers_and_students' ? targetScope : null,
          targetClassIds: audience === 'teachers_and_students' ? parsedClassIds : []
        },
      });
      console.log('✅ Admin notice notification record saved to DB');

    } catch (notifyError) {
      console.error('❌ Admin notice FCM error (non-critical):', notifyError);
    }

    res.status(201).json({ success: true, notice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ─────────────────────────────────────────────
// GET ALL NOTICES BY ORG (admin view — all)
// ─────────────────────────────────────────────
exports.getAdminNoticesByOrg = async (req, res) => {
  try {
    const { orgId } = req.params;

    const notices = await AdminNotice.find({ orgId }).sort({ createdAt: -1 });
    res.json({ success: true, count: notices.length, notices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ─────────────────────────────────────────────
// GET NOTICES FOR TEACHER (teachers_only + teachers_and_students)
// ─────────────────────────────────────────────
exports.getAdminNoticesForTeacher = async (req, res) => {
  try {
    const { orgId } = req.params;

    const notices = await AdminNotice.find({
      orgId,
      audience: { $in: ['teachers_only', 'teachers_and_students'] },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
    }).sort({ createdAt: -1 });

    res.json({ success: true, count: notices.length, notices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ─────────────────────────────────────────────
// GET NOTICES FOR STUDENT (teachers_and_students only, matching classId)
// ─────────────────────────────────────────────
exports.getAdminNoticesForStudent = async (req, res) => {
  try {
    const { orgId, classId } = req.params;

    const notices = await AdminNotice.find({
      orgId,
      audience: 'teachers_and_students',
      $or: [
        { targetScope: 'all_classes' },
        { targetScope: 'selected_classes', targetClassIds: classId }
      ],
      $and: [
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }
      ]
    }).sort({ createdAt: -1 });

    res.json({ success: true, count: notices.length, notices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ─────────────────────────────────────────────
// GET SINGLE NOTICE
// ─────────────────────────────────────────────
exports.getAdminNotice = async (req, res) => {
  try {
    const { noticeId } = req.params;
    const notice = await AdminNotice.findOne({ noticeId });
    if (!notice) return res.status(404).json({ error: 'Notice not found' });
    res.json({ success: true, notice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ─────────────────────────────────────────────
// UPDATE ADMIN NOTICE
// ─────────────────────────────────────────────
exports.updateAdminNotice = async (req, res) => {
  try {
    const { noticeId } = req.params;
    const { title, description, expiresAt, targetScope, targetClassIds } = req.body;

    const notice = await AdminNotice.findOne({ noticeId });
    if (!notice) return res.status(404).json({ error: 'Notice not found' });

    if (title)       notice.title       = title;
    if (description) notice.description = description;
    if (expiresAt)   notice.expiresAt   = new Date(expiresAt);
    if (targetScope) notice.targetScope = targetScope;

    if (targetClassIds) {
      notice.targetClassIds = typeof targetClassIds === 'string'
        ? JSON.parse(targetClassIds)
        : targetClassIds;
    }

    // Append new files
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const isPdf = file.mimetype === 'application/pdf';
        notice.attachments.push({
          url:      file.path,
          publicId: file.filename,
          type:     isPdf ? 'pdf' : 'image',
        });
      }
    }

    await notice.save();
    res.json({ success: true, notice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ─────────────────────────────────────────────
// DELETE ATTACHMENT FROM NOTICE
// ─────────────────────────────────────────────
exports.deleteAdminNoticeAttachment = async (req, res) => {
  try {
    const { noticeId }              = req.params;
    const { publicId, resourceType } = req.body;

    const notice = await AdminNotice.findOne({ noticeId });
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


// ─────────────────────────────────────────────
// DELETE SINGLE NOTICE
// ─────────────────────────────────────────────
exports.deleteAdminNotice = async (req, res) => {
  try {
    const { noticeId } = req.params;

    const notice = await AdminNotice.findOne({ noticeId });
    if (!notice) return res.status(404).json({ error: 'Notice not found' });

    for (const att of notice.attachments) {
      await cloudinary.uploader.destroy(att.publicId, {
        resource_type: att.type === 'pdf' ? 'raw' : 'image'
      });
    }

    await AdminNotice.findOneAndDelete({ noticeId });
    res.json({ success: true, message: `Notice "${notice.title}" deleted` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ─────────────────────────────────────────────
// DELETE ALL NOTICES BY ORG
// ─────────────────────────────────────────────
exports.deleteAllAdminNotices = async (req, res) => {
  try {
    const { orgId } = req.params;

    const notices = await AdminNotice.find({ orgId });

    for (const notice of notices) {
      for (const att of notice.attachments) {
        await cloudinary.uploader.destroy(att.publicId, {
          resource_type: att.type === 'pdf' ? 'raw' : 'image'
        });
      }
    }

    const result = await AdminNotice.deleteMany({ orgId });
    res.json({
      success: true,
      message: `${result.deletedCount} notice(s) deleted`,
      deleted: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};