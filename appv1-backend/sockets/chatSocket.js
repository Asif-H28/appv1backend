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
    const token = socket.handshake.auth.token || socket.handshake.headers.token;
    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // Contains orgId, userId, role
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, orgId, role } = socket.user;
    console.log(`🔌 User connected: ${userId} (${role})`);

    // Scope user to their organization room
    socket.join(`org_${orgId}`);

    // user_online → store userId+socketId, broadcast online_status
    socket.on('user_online', (data) => {
      onlineUsers.set(userId, socket.id);
      io.to(`org_${orgId}`).emit('online_status', {
        userId,
        isOnline: true,
        lastSeen: new Date()
      });
    });

    // join_conversation → socket.join(conversationId)
    socket.on('join_conversation', (conversationId) => {
      socket.join(conversationId);
      console.log(`👥 User ${userId} joined conversation: ${conversationId}`);
    });

    // send_message
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, text, mediaUrl, senderName, senderRole } = data;

        // 1. Save Message to DB
        const newMessage = new Message({
          conversationId,
          senderId: userId,
          senderName,
          senderRole,
          text,
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
        const recipients = conversation.participants.filter(p => p.userId !== userId);
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
        console.error('❌ Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // typing indicator
    socket.on('typing', (data) => {
      const { conversationId, userName } = data;
      socket.to(conversationId).emit('user_typing', {
        userId,
        userName,
        conversationId
      });
    });

    socket.on('stop_typing', (data) => {
      const { conversationId } = data;
      socket.to(conversationId).emit('user_stop_typing', {
        userId,
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
        console.error('❌ Error updating delivery status:', err);
      }
    });

    // message_read update
    socket.on('message_read', async (data) => {
      const { messageId, conversationId } = data;
      try {
        await Message.findByIdAndUpdate(messageId, { 
          status: 'read',
          $push: { readBy: { userId, readAt: new Date() } }
        });
        
        // Reset unread count for this user
        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
          conversation.unreadCounts.set(userId, 0);
          await conversation.save();
        }

        io.to(conversationId).emit('status_update', { messageId, status: 'read' });
      } catch (err) {
        console.error('❌ Error updating read status:', err);
      }
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      io.to(`org_${orgId}`).emit('online_status', {
        userId,
        isOnline: false,
        lastSeen: new Date()
      });
      console.log(`🔌 User disconnected: ${userId}`);
    });
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
