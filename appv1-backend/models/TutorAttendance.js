const mongoose = require('mongoose');

const tutorAttendanceSchema = new mongoose.Schema({
  orgId: { type: String, required: true, index: true },
  teacherId: { type: String, required: true, index: true },
  date: { type: Date, required: true, index: true }, // Normalized to start of day
  status: { type: String, enum: ['Present', 'Absent'], required: true },
  totalSessionsCount: { type: Number, default: 0 }
}, { timestamps: true });

// Ensure a teacher only has one attendance record per day per org
tutorAttendanceSchema.index({ orgId: 1, teacherId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('TutorAttendance', tutorAttendanceSchema);
