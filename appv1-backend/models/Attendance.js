const mongoose = require('mongoose');

const studentAttendanceSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  attendance: { type: String, enum: ['Present', 'Absent'], required: true }
}, { _id: false });

const attendanceSchema = new mongoose.Schema({
  attendanceId: { type: String, required: true, unique: true },
  attendanceDate: { type: Date, required: true },
  classId: { type: String, required: true },
  orgId: { type: String, required: true },
  teacherId: { type: String, required: true },
  teacherName: { type: String, required: true, trim: true },
  className: { type: String, required: true, trim: true },
  students: { type: [studentAttendanceSchema], default: [] },
  totalPresent: { type: Number, default: 0 },   // auto calculated
  totalAbsent: { type: Number, default: 0 }     // auto calculated
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
