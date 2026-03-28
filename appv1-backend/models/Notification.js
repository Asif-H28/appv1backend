const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  notificationId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  type: {
    type: String,
    enum: [
      'notice',        // new notice posted
      'result',        // result published
      'attendance',    // attendance marked
      'timetable',     // timetable updated
      'join_request',  // join request approved/rejected
      'announcement',  // org-wide announcement
      'general'        // general notification
    ],
    required: true
  },
  sentBy: { type: String, required: true },       // teacherId or adminId
  sentByName: { type: String, required: true },
  targetRole: {
    type: String,
    enum: ['student', 'teacher', 'all'],
    required: true
  },
  classId: { type: String, default: null },
  orgId: { type: String, default: null },
  studentId: { type: String, default: null },     // if targeted to one student
  referenceId: { type: String, default: null },   // noticeId / resultId etc
  totalSent: { type: Number, default: 0 },
  totalFailed: { type: Number, default: 0 },
  data: { type: Object, default: {} }             // extra payload for navigation
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);