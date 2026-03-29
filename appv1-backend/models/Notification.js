const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  notificationId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  type: {
    type: String,
    enum: [
      'notice',
      'result',
      'attendance',
      'timetable',
      'join_request',
      'announcement',
      'general'
    ],
    required: true
  },
  sentBy: { type: String, required: true },
  sentByName: { type: String, required: true },
  targetRole: {
    type: String,
    enum: ['student', 'teacher', 'all'],
    required: true
  },
  classId: { type: String, default: null },
  orgId: { type: String, default: null },
  studentId: { type: String, default: null },
  referenceId: { type: String, default: null },
  totalSent: { type: Number, default: 0 },
  totalFailed: { type: Number, default: 0 },
  data: { type: Object, default: {} },
  readBy: { type: [String], default: [] }   // ← ADDED: stores studentIds/teacherIds who read it
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);