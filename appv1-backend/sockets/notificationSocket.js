const jwt = require('jsonwebtoken');
const NotificationStudio = require('../models/NotificationStudio');

let nsp = null;

module.exports = {
  /**
   * Initializes the /notifications Socket.IO namespace and authentication.
   * @param {import('socket.io').Server} io 
   */
  init: (io) => {
    nsp = io.of('/notifications');

    // Authentication middleware
    nsp.use((socket, next) => {
      try {
        const auth = socket.handshake.auth;
        const headers = socket.handshake.headers;
        
        const token = auth?.token || headers?.token || socket.handshake.query?.token;
        
        if (!token) {
          return next(new Error('Authentication error: Token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
      } catch (err) {
        return next(new Error('Authentication error: Invalid token'));
      }
    });

    nsp.on('connection', async (socket) => {
      try {
        const actualUserId = socket.user?.studentId || 
                             socket.user?.teacherId || 
                             socket.user?.orgId || 
                             socket.user?.adminId || 
                             socket.user?.userId || 
                             socket.user?.id;

        if (!actualUserId) {
          console.warn('⚠️ Notification socket connected but no user identifier found.');
          return socket.disconnect();
        }

        // Put the user in a room dedicated to their ID
        socket.join(actualUserId);
        console.log(`🔔 User ${actualUserId} joined notification room.`);

        // Immediately emit current unread count on connection
        const count = await NotificationStudio.countDocuments({ recipientId: actualUserId, isRead: false });
        socket.emit('unread_count', { count });

        socket.on('disconnect', (reason) => {
          console.log(`🔌 User ${actualUserId} disconnected from notification room. Reason: ${reason}`);
        });
      } catch (err) {
        console.error('❌ Notification Socket connection error:', err);
        socket.disconnect();
      }
    });
  },

  /**
   * Push a notification dynamically from any controller.
   * @param {string} recipientId - Target user ID (studentId, teacherId, etc.)
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {object} [data] - Optional metadata payload
   */
  sendNotification: async (recipientId, title, body, data = {}) => {
    try {
      // 1. Save notification to DB
      const notification = new NotificationStudio({
        recipientId,
        title,
        body,
        data,
        isRead: false
      });
      await notification.save();

      // 2. Real-time push via socket if user is online
      if (nsp) {
        // Emit new notification structure
        nsp.to(recipientId).emit('new_notification', notification);

        // Update the user's unread count real-time
        const count = await NotificationStudio.countDocuments({ recipientId, isRead: false });
        nsp.to(recipientId).emit('unread_count', { count });
      } else {
        console.warn('⚠️ Notification socket namespace /notifications is not initialized.');
      }

      return notification;
    } catch (err) {
      console.error('❌ Error sending notification through NotificationStudio:', err);
      throw err;
    }
  },

  /**
   * Recalculates and emits the unread count to the client.
   * Useful when marking notifications as read via HTTP API.
   * @param {string} recipientId 
   */
  sendCountUpdate: async (recipientId) => {
    try {
      if (nsp) {
        const count = await NotificationStudio.countDocuments({ recipientId, isRead: false });
        nsp.to(recipientId).emit('unread_count', { count });
      }
    } catch (err) {
      console.error('❌ Error pushing count update:', err);
    }
  }
};
