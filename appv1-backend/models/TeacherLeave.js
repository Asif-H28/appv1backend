// models/TeacherLeave.js
const mongoose = require('mongoose');

const teacherLeaveSchema = new mongoose.Schema({
  leaveId:      { type: String, required: true, unique: true },
  teacherId:    { type: String, required: true },
  teacherName:  { type: String, required: true },
  orgId:        { type: String, required: true },
  reason:       { type: String, required: true },
  dates:        [{ type: String, required: true }],  // ["2026-04-01", "2026-04-02"]
  totalDays:    { type: Number, required: true },
  status:       { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy:   { type: String, default: null },   // adminId
  reviewNote:   { type: String, default: null },
  reviewedAt:   { type: Date,   default: null }
}, { timestamps: true });

module.exports = mongoose.model('TeacherLeave', teacherLeaveSchema);