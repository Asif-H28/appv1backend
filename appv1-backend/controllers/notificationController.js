const Notification = require('../models/Notification');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Organization = require('../models/Organization');
const { notifyClass, notifyStudent, notifyOrg } = require('../utils/sendNotification');

// SAVE FCM TOKEN — STUDENT
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

// SAVE FCM TOKEN — TEACHER
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

// SEND NOTIFICATION TO CLASS
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
    res.json({ success: true, message: 'Notification sent to class', totalSent: result.successCount, totalFailed: result.failureCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// SEND NOTIFICATION TO SINGLE STUDENT
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
    res.json({ success: true, message: 'Notification sent to student', totalSent: result.successCount, totalFailed: result.failureCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// SEND ORG-WIDE ANNOUNCEMENT
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
    res.json({ success: true, message: 'Announcement sent to org', totalSent: result.successCount, totalFailed: result.failureCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET NOTIFICATIONS BY CLASSID
exports.getNotificationsByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const notifications = await Notification.find({ classId }).sort({ createdAt: -1 });
    res.json({ success: true, count: notifications.length, notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET NOTIFICATIONS BY ORGID
exports.getNotificationsByOrg = async (req, res) => {
  try {
    const { orgId } = req.params;
    const notifications = await Notification.find({ orgId }).sort({ createdAt: -1 });
    res.json({ success: true, count: notifications.length, notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET NOTIFICATIONS BY STUDENTID
exports.getNotificationsByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const notifications = await Notification.find({ studentId }).sort({ createdAt: -1 });
    res.json({ success: true, count: notifications.length, notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET TEACHER LEAVE REQUEST NOTIFICATIONS — ADMIN
// Returns only leave-request notifications for an org
// ─────────────────────────────────────────────
exports.getTeacherLeaveNotificationsByOrg = async (req, res) => {
  try {
    const { orgId } = req.params;

    const notifications = await Notification.find({
      orgId,
      'data.route': 'teacher-leave-requests',
    }).sort({ createdAt: -1 });

    res.json({ success: true, count: notifications.length, notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET STUDENT LEAVES NOTIFICATIONS — TEACHER
// ─────────────────────────────────────────────
exports.getStudentLeavesNotificationsByTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const notifications = await Notification.find({
      'data.route': 'leave-requests',
      'data.teacherId': teacherId,
    }).sort({ createdAt: -1 });

    res.json({ success: true, count: notifications.length, notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET ADMIN APPROVED/REJECTED NOTIFICATIONS — TEACHER
// ─────────────────────────────────────────────
exports.getAdminLeaveReviewNotificationsByTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const notifications = await Notification.find({
      'data.route': 'my-leaves',
      'data.teacherId': teacherId,
    }).sort({ createdAt: -1 });

    res.json({ success: true, count: notifications.length, notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// MARK ALL TEACHER LEAVE NOTIFICATIONS AS READ — ADMIN
// Body: { "orgId": "ORG_XXX" }
// ─────────────────────────────────────────────
exports.markAllLeaveNotificationsRead = async (req, res) => {
  try {
    const { orgId } = req.body;

    if (!orgId) {
      return res.status(400).json({ error: 'orgId required' });
    }

    // Find all leave notifications for this org not yet read by the admin (orgId)
    const result = await Notification.updateMany(
      {
        orgId,
        'data.route': 'teacher-leave-requests',
        readBy: { $nin: [orgId] },   // not yet read by this admin
      },
      { $push: { readBy: orgId } }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} notification(s) marked as read`,
      updated: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// MARK ALL STUDENT LEAVE REQUESTS AS READ — TEACHER
// Body: { "teacherId": "TCH_XXX" }
// ─────────────────────────────────────────────
exports.markAllStudentLeavesRead = async (req, res) => {
  try {
    const { teacherId } = req.body;
    if (!teacherId) return res.status(400).json({ error: 'teacherId required' });

    const result = await Notification.updateMany(
      {
        'data.teacherId': teacherId,
        'data.route': 'leave-requests',
        readBy: { $nin: [teacherId] }
      },
      { $push: { readBy: teacherId } }
    );

    res.json({ success: true, updated: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// MARK ALL ADMIN LEAVE REVIEWS AS READ — TEACHER
// Body: { "teacherId": "TCH_XXX" }
// ─────────────────────────────────────────────
exports.markAllAdminReviewsRead = async (req, res) => {
  try {
    const { teacherId } = req.body;
    if (!teacherId) return res.status(400).json({ error: 'teacherId required' });

    const result = await Notification.updateMany(
      {
        'data.teacherId': teacherId,
        'data.route': 'my-leaves',
        readBy: { $nin: [teacherId] }
      },
      { $push: { readBy: teacherId } }
    );

    res.json({ success: true, updated: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// MARK SINGLE NOTIFICATION AS READ
// ─────────────────────────────────────────────
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { userId } = req.body;   // studentId or teacherId

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const notification = await Notification.findOne({ notificationId });
    if (!notification) return res.status(404).json({ error: 'Notification not found' });

    // Add userId only if not already in readBy[]
    if (!notification.readBy.includes(userId)) {
      notification.readBy.push(userId);
      await notification.save();
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      notificationId,
      readBy: notification.readBy
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// MARK ALL NOTIFICATIONS AS READ FOR A USER
// ─────────────────────────────────────────────
exports.markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.body;
    const { classId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // Find all notifications for this class not yet read by this user
    const unread = await Notification.find({
      classId,
      readBy: { $nin: [userId] }   // not in readBy array
    });

    if (unread.length === 0) {
      return res.json({ success: true, message: 'All notifications already read', updated: 0 });
    }

    // Add userId to readBy for all unread
    await Notification.updateMany(
      { classId, readBy: { $nin: [userId] } },
      { $push: { readBy: userId } }
    );

    res.json({
      success: true,
      message: `${unread.length} notification(s) marked as read`,
      updated: unread.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET UNREAD COUNT FOR A USER IN A CLASS
// ─────────────────────────────────────────────
exports.getUnreadCount = async (req, res) => {
  try {
    const { classId, userId } = req.params;

    const unreadCount = await Notification.countDocuments({
      classId,
      readBy: { $nin: [userId] }
    });

    res.json({
      success: true,
      classId,
      userId,
      unreadCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// CLEAR FCM TOKEN — STUDENT LOGOUT
exports.clearStudentFcmToken = async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: 'studentId required' });
    }

    await Student.findOneAndUpdate({ studentId }, { fcmToken: null });

    res.json({ success: true, message: 'Student FCM token cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// CLEAR FCM TOKEN — TEACHER LOGOUT
exports.clearTeacherFcmToken = async (req, res) => {
  try {
    const { teacherId } = req.body;
    if (!teacherId) {
      return res.status(400).json({ error: 'teacherId required' });
    }

    await Teacher.findOneAndUpdate({ teacherId }, { fcmToken: null });

    res.json({ success: true, message: 'Teacher FCM token cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.saveAdminFcmToken = async (req, res) => {
  try {
    const { orgId, fcmToken } = req.body;
    if (!orgId || !fcmToken) {
      return res.status(400).json({ error: 'orgId and fcmToken required' });
    }
    await Organization.findOneAndUpdate({ orgId }, { fcmToken });
    res.json({ success: true, message: 'Admin FCM token saved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// CLEAR FCM TOKEN — ADMIN LOGOUT
exports.clearAdminFcmToken = async (req, res) => {
  try {
    const { orgId } = req.body;
    if (!orgId) {
      return res.status(400).json({ error: 'orgId required' });
    }
    await Organization.findOneAndUpdate({ orgId }, { fcmToken: null });
    res.json({ success: true, message: 'Admin FCM token cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}