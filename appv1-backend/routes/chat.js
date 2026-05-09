const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// GET /chat/conversations/:userId → list conversations sorted by lastMessageAt desc
router.get('/conversations/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const conversations = await Conversation.find({
      orgId: req.user.orgId,
      'participants.userId': userId
    }).sort({ lastMessageAt: -1 });
    
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /chat/messages/:conversationId → paginated history, query params: page, limit=30
router.get('/messages/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /chat/conversations → create or fetch existing direct conversation (idempotent)
router.post('/conversations', auth, async (req, res) => {
  try {
    const { recipientId, recipientName, recipientRole, senderName, senderRole } = req.body;
    const senderId = req.user.userId || req.user.id;
    const orgId = req.user.orgId;

    if (!recipientId) return res.status(400).json({ error: 'Recipient ID is required' });

    // conversationId for direct chat = [userId1, userId2].sort().join('_') + '_' + orgId
    const participantsIds = [senderId, recipientId].sort();
    const conversationId = `${participantsIds.join('_')}_${orgId}`;

    let conversation = await Conversation.findOne({ _id: conversationId });

    if (!conversation) {
      conversation = new Conversation({
        _id: conversationId,
        orgId,
        type: 'direct',
        participants: [
          { userId: senderId, userName: senderName, role: senderRole },
          { userId: recipientId, userName: recipientName, role: recipientRole }
        ],
        unreadCounts: new Map([[senderId, 0], [recipientId, 0]])
      });
      await conversation.save();
    }

    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const { nanoid } = require('nanoid');

// POST /chat/group → create group conversation
router.post('/group', auth, async (req, res) => {
  try {
    const { groupName, participants } = req.body; // participants: [{userId, userName, role}]
    const orgId = req.user.orgId;

    if (!groupName || !participants || participants.length === 0) {
      return res.status(400).json({ error: 'Group name and participants are required' });
    }

    const unreadCounts = new Map();
    participants.forEach(p => unreadCounts.set(p.userId, 0));

    const conversation = new Conversation({
      _id: `group_${nanoid(10)}`,
      orgId,
      type: 'group',
      groupName,
      participants,
      unreadCounts
    });

    await conversation.save();
    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /chat/messages/read/:conversationId → mark all messages read for a userId, reset unreadCount
router.put('/messages/read/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId || req.user.id;

    // Update unread count in conversation
    const conversation = await Conversation.findById(conversationId);
    if (conversation) {
      conversation.unreadCounts.set(userId, 0);
      await conversation.save();
    }

    // Mark messages as read by this user
    await Message.updateMany(
      { conversationId, 'readBy.userId': { $ne: userId } },
      { 
        $push: { readBy: { userId, readAt: new Date() } },
        $set: { status: 'read' } // This is simplified, usually status is per-recipient in group
      }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
