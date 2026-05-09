const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  _id: {
    type: String
  },
  orgId: {
    type: String,
    required: true,
    index: true
  },
  participants: [{
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    role: { type: String, required: true }
  }],
  type: {
    type: String,
    enum: ['direct', 'group'],
    required: true
  },
  groupName: {
    type: String
  },
  lastMessage: {
    type: String
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  unreadCounts: {
    type: Map,
    of: Number,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('Conversation', ConversationSchema);
