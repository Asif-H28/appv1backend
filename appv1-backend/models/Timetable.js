const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true
  },
  periodNumber: { type: Number, required: true },
  startTime: { type: String, required: true },   // "09:00"
  endTime: { type: String, required: true },     // "10:00"
  subjectName: { type: String, default: null },
  teacherName: { type: String, default: null },
  teacherId: { type: String, default: null },
  type: {
    type: String,
    enum: ['class', 'lunch', 'break', 'free', 'pt', 'lab'],
    default: 'class'
  }
}, { _id: false });

const timetableSchema = new mongoose.Schema({
  timetableId: { type: String, required: true, unique: true },
  classId: { type: String, required: true },
  orgId: { type: String, required: true },
  className: { type: String, required: true },
  createdBy: { type: String, required: true },       // teacherId
  createdByName: { type: String, required: true },   // teacherName
  academicYear: { type: String, required: true },    // "2025-26"
  slots: { type: [slotSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Timetable', timetableSchema);