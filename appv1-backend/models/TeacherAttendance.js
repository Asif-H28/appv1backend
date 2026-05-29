const mongoose = require('mongoose');

const teacherAttendanceSchema = new mongoose.Schema({
  attendanceId: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, index: true },
  teacherId: { type: String, required: true, index: true },
  teacherName: { type: String, required: true, trim: true },
  date: { type: Date, required: true, index: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('TeacherAttendance', teacherAttendanceSchema);
