const Notification = require('../models/Notification');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const { notifyClass, notifyStudent, notifyOrg } = require('../utils/sendNotification');

// ─────────────────────────────────────────────
// SAVE FCM TOKEN — STUDENT
// ─────────────────────────────────────────────
exports.saveStudentFcmToken = async (req, res) => {
  try {
    const { studentId, fcmToken } = req.body;

    if (!studentId || !fcmToken) {
      return res.status(400).json({ error: 'studentId and fcmToken required' });
    }

    await Student.findOneAndUpdate({ studentId }, { fcmToken });

    res.json({ success: true, message: 'FCM token saved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// SAVE FCM TOKEN — TEACHER
// ─────────────────────────────────────────────
exports.saveTeacherFcmToken = async (req, res) => {
  try {
    const { teacherId, fcmToken } = req.body;

    if (!teacherId || !fcmToken) {
      return res.status(400).json({ error: 'teacherId and fcmToken required' });
    }

    await Teacher.findOneAndUpdate({ teacherId }, { fcmToken });

    res.json({ success: true, message: 'FCM token saved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// SEND NOTIFICATION TO CLASS
// ─────────────────────────────────────────────
exports.sendToClass = async (req, res) => {
  try {
    const { classId, orgId, title, body, type, sentBy, sentByName, data } = req.body;

    if (!classId || !orgId || !title || !body || !sentBy || !sentByName) {
      return res.status(400).json({ error: 'classId, orgId, title, body, sentBy, sentByName required' });
    }

    const result = await notifyClass({
      classId, orgId, title, body,
      type: type || 'general',
      sentBy, sentByName,
      data: data || {}
    });

    res.json({
      success: true,
      message: `Notification sent to class`,
      totalSent: result.successCount,
      totalFailed: result.failureCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// SEND NOTIFICATION TO SINGLE STUDENT
// ─────────────────────────────────────────────
exports.sendToStudent = async (req, res) => {
  try {
    const { studentId, orgId, classId, title, body, type, sentBy, sentByName, data } = req.body;

    if (!studentId || !title || !body || !sentBy || !sentByName) {
      return res.status(400).json({ error: 'studentId, title, body, sentBy, sentByName required' });
    }

    const result = await notifyStudent({
      studentId, orgId, classId, title, body,
      type: type || 'general',
      sentBy, sentByName,
      data: data || {}
    });

    res.json({
      success: true,
      message: 'Notification sent to student',
      totalSent: result.successCount,
      totalFailed: result.failureCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// SEND ORG-WIDE ANNOUNCEMENT
// ─────────────────────────────────────────────
exports.sendToOrg = async (req, res) => {
  try {
    const { orgId, targetRole, title, body, type, sentBy, sentByName, data } = req.body;

    if (!orgId || !title || !body || !sentBy || !sentByName) {
      return res.status(400).json({ error: 'orgId, title, body, sentBy, sentByName required' });
    }

    const result = await notifyOrg({
      orgId,
      targetRole: targetRole || 'student',
      title, body,
      type: type || 'announcement',
      sentBy, sentByName,
      data: data || {}
    });

    res.json({
      success: true,
      message: `Announcement sent to org`,
      totalSent: result.successCount,
      totalFailed: result.failureCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET NOTIFICATION HISTORY BY CLASSID
// ─────────────────────────────────────────────
exports.getNotificationsByClass = async (req, res) => {
  try {
    const { classId } = req.params;

    const notifications = await Notification.find({ classId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET NOTIFICATION HISTORY BY ORGID
// ─────────────────────────────────────────────
exports.getNotificationsByOrg = async (req, res) => {
  try {
    const { orgId } = req.params;

    const notifications = await Notification.find({ orgId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};