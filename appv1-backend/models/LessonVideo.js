const mongoose = require('mongoose');

const lessonVideoSchema = new mongoose.Schema({
  url: { type: String, required: true, trim: true },
  title: { type: String, trim: true }, // Optional title, useful for general videos
  videoType: { type: String, enum: ['lesson', 'general'], default: 'lesson' },
  classId: { type: String, required: true },
  className: { type: String, trim: true },
  subjectId: { type: String, trim: true }, // Optional because of 'general' type
  lessonId: { type: String, trim: true },  // Optional because of 'general' type
  teacherId: { type: String, required: true },
  teacherName: { type: String, required: true, trim: true },
  orgId: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('LessonVideo', lessonVideoSchema);
