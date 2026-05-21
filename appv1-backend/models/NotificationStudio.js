const mongoose = require('mongoose');

const notificationStudioSchema = new mongoose.Schema({
  recipientId: { 
    type: String, 
    required: true, 
    index: true 
  }, // Identifier of the recipient (e.g. studentId, teacherId, orgId, adminId, etc.)
  title: { 
    type: String, 
    required: true 
  },
  body: { 
    type: String, 
    required: true 
  },
  data: { 
    type: Object, 
    default: {} 
  }, // Custom arbitrary payload for navigation/actions
  isRead: { 
    type: Boolean, 
    default: false,
    index: true
  }
}, { timestamps: true });

// Add composite index for efficient queries (getting unread, sorted list)
notificationStudioSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationStudioSchema.index({ createdAt: 1 });

module.exports = mongoose.model('NotificationStudio', notificationStudioSchema);
