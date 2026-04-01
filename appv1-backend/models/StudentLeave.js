// models/StudentLeave.js
const mongoose = require('mongoose');

const studentLeaveSchema = new mongoose.Schema({
  leaveId:      { type: String, required: true, unique: true },
  studentId:    { type: String, required: true },
  studentName:  { type: String, required: true },
  classId:      { type: String, required: true },
  orgId:        { type: String, required: true },
  reason:       { type: String, required: true },
  dates:        [{ type: String, required: true }],  // ["2026-04-01", "2026-04-02"]
  totalDays:    { type: Number, required: true },
  status:       { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy:   { type: String, default: null },   // teacherId
  reviewNote:   { type: String, default: null },
  reviewedAt:   { type: Date,   default: null }
}, { timestamps: true });

module.exports = mongoose.model('StudentLeave', studentLeaveSchema);