const NotificationStudio = require('../models/NotificationStudio');
const notificationSocket = require('../sockets/notificationSocket');

/**
 * Helper to retrieve actual userId from authenticated request token.
 */
const getUserIdFromRequest = (req) => {
  return req.user?.studentId ||
    req.user?.teacherId ||
    req.user?.orgId ||
    req.user?.adminId ||
    req.user?.userId ||
    req.user?.id;
};

/**
 * Get paginated notifications for the authenticated user.
 * GET /api/notification-studio
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'User identifier not found in request token' });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const notifications = await NotificationStudio.find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await NotificationStudio.countDocuments({ recipientId: userId });
    const unreadCount = await NotificationStudio.countDocuments({ recipientId: userId, isRead: false });

    res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('❌ Error in getNotifications:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Mark all notifications as read for the authenticated user.
 * PUT /api/notification-studio/mark-all-read
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'User identifier not found in request token' });
    }

    await NotificationStudio.updateMany(
      { recipientId: userId, isRead: false },
      { $set: { isRead: true } }
    );

    // Emit updated unread count (should now be 0)
    await notificationSocket.sendCountUpdate(userId);

    res.json({
      success: true,
      message: 'All notifications successfully marked as read'
    });
  } catch (err) {
    console.error('❌ Error in markAllAsRead:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Mark a single notification as read for the authenticated user.
 * PUT /api/notification-studio/:id/read
 */
exports.markSingleAsRead = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'User identifier not found in request token' });
    }

    const notification = await NotificationStudio.findOneAndUpdate(
      { _id: id, recipientId: userId },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Emit updated unread count
    await notificationSocket.sendCountUpdate(userId);

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification
    });
  } catch (err) {
    console.error('❌ Error in markSingleAsRead:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete all notifications older than 1 week (7 days).
 * DELETE /api/notification-studio/old
 */
exports.deleteOldNotifications = async (req, res) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Perform database-wide deletion of records older than 1 week
    const result = await NotificationStudio.deleteMany({
      createdAt: { $lt: oneWeekAgo }
    });

    res.json({
      success: true,
      message: `${result.deletedCount} notifications older than 1 week deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error('❌ Error in deleteOldNotifications:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Test trigger endpoint to push a notification via Socket.IO
 * POST /api/notification-studio/test-trigger
 */
exports.testTrigger = async (req, res) => {
  try {
    const { recipientId, title, body, data } = req.body;
    if (!recipientId || !title || !body) {
      return res.status(400).json({ error: 'recipientId, title, and body are required' });
    }

    await notificationSocket.sendNotification(recipientId, title, body, data || {});

    res.json({
      success: true,
      message: 'Notification pushed successfully'
    });
  } catch (err) {
    console.error('❌ Error in testTrigger:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

