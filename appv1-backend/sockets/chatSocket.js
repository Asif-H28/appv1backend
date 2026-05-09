const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Teacher = require('../models/Teacher');
const Organization = require('../models/Organization');
const admin = require('../config/firebase');

const onlineUsers = new Map(); // userId → socketId

module.exports = (io) => {
  // Middleware: Validate JWT on every socket connection
  io.use((socket, next) => {
    try {
      const auth = socket.handshake.auth;
      const headers = socket.handshake.headers;
      
      const token = auth?.token || headers?.token || socket.handshake.query?.token;
      
      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // Contains orgId, userId, role
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    try {
      const { userId, teacherId, orgId, role } = socket.user || {};
      const actualUserId = userId || teacherId || socket.user?.id || orgId;

      if (!actualUserId || !orgId) {
        return socket.disconnect();
      }

      // Scope user to their organization room
      socket.join(`org_${orgId}`);

      // user_online
      socket.on('user_online', (data) => {
        onlineUsers.set(actualUserId, socket.id);
        io.to(`org_${orgId}`).emit('online_status', {
          userId: actualUserId,
          isOnline: true,
          lastSeen: new Date()
        });
      });

      // join_conversation
      socket.on('join_conversation', (conversationId) => {
        socket.join(conversationId);
      });

      // send_message
      socket.on('send_message', async (data) => {
        try {
          const { conversationId, mediaUrl, senderName } = data;
          const text = data.text || data.content; // Map Flutter 'content' to 'text'
          const senderRole = data.senderRole || socket.user?.role || 'user';

          // 1. Save Message to DB
          const newMessage = new Message({
            conversationId,
            senderId: actualUserId,
            senderName: senderName || 'Anonymous',
            senderRole,
            text: text || '',
            mediaUrl,
            status: 'sent'
          });
          await newMessage.save();

          // 2. Update Conversation metadata
          const conversation = await Conversation.findById(conversationId);
          if (!conversation) return;

          conversation.lastMessage = text || (mediaUrl ? 'Attachment' : '');
          conversation.lastMessageAt = new Date();

          // 3. Increment unreadCount for recipients
          const recipients = conversation.participants.filter(p => p.userId !== actualUserId);
          recipients.forEach(p => {
            const currentCount = conversation.unreadCounts.get(p.userId) || 0;
            conversation.unreadCounts.set(p.userId, currentCount + 1);
          });
          await conversation.save();

          // 4. Emit new_message to conversation room
          io.to(conversationId).emit('new_message', newMessage);

          // 5. Trigger FCM for offline recipients
          recipients.forEach(async (recipient) => {
            if (!onlineUsers.has(recipient.userId)) {
              sendPushNotification(recipient.userId, recipient.role, {
                title: senderName,
                body: text || 'Sent a media file',
                conversationId
              });
            }
          });

        } catch (error) {
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // typing indicator
      socket.on('typing', (data) => {
        const { conversationId, userName } = data;
        socket.to(conversationId).emit('user_typing', {
          userId: actualUserId,
          userName,
          conversationId
        });
      });

      socket.on('stop_typing', (data) => {
        const { conversationId } = data;
        socket.to(conversationId).emit('user_stop_typing', {
          userId: actualUserId,
          conversationId
        });
      });

      // message_delivered update
      socket.on('message_delivered', async (data) => {
        const { messageId, conversationId } = data;
        try {
          await Message.findByIdAndUpdate(messageId, { status: 'delivered' });
          io.to(conversationId).emit('status_update', { messageId, status: 'delivered' });
        } catch (err) {
        }
      });

      // message_read update
      socket.on('message_read', async (data) => {
        const { messageId, conversationId } = data;
        try {
          await Message.findByIdAndUpdate(messageId, { 
            status: 'read',
            $push: { readBy: { userId: actualUserId, readAt: new Date() } }
          });
          
          // Reset unread count for this user
          const conversation = await Conversation.findById(conversationId);
          if (conversation) {
            conversation.unreadCounts.set(actualUserId, 0);
            await conversation.save();
          }

          io.to(conversationId).emit('status_update', { messageId, status: 'read' });
        } catch (err) {
          console.error('❌ Error updating read status:', err);
        }
      });

      socket.on('disconnect', (reason) => {
        onlineUsers.delete(actualUserId);
        io.to(`org_${orgId}`).emit('online_status', {
          userId: actualUserId,
          isOnline: false,
          lastSeen: new Date()
        });
        console.log(`🔌 User disconnected: ${actualUserId} | Reason: ${reason}`);
      });
    } catch (connectionError) {
      console.error('❌ Socket Connection Handler Error:', connectionError);
      socket.disconnect();
    }
  });
};

// Helper: Send Push Notification via FCM
async function sendPushNotification(userId, role, payload) {
  try {
    let user;
    if (role === 'admin') {
      user = await Organization.findOne({ orgId: userId }); // Assuming userId is orgId for admins
    } else if (role === 'teacher') {
      user = await Teacher.findOne({ teacherId: userId });
    }

    if (user && user.fcmToken) {
      const message = {
        notification: {
          title: payload.title,
          body: payload.body
        },
        data: {
          conversationId: payload.conversationId,
          type: 'chat'
        },
        token: user.fcmToken
      };

      await admin.messaging().send(message);
      console.log(`🔔 Push notification sent to ${userId}`);
    }
  } catch (error) {
    console.error('❌ Error sending FCM:', error);
  }
}
