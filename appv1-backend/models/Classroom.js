const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  completed: { type: Boolean, default: false }
}, { _id: false });

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  lessons: { type: [lessonSchema], default: [] }
}, { _id: false });

const classroomSchema = new mongoose.Schema({
  classId: { type: String, required: true, unique: true },
  teacherId: { type: String, required: true },
  orgId: { type: String, required: true },
  className: { type: String, required: true, trim: true },
  studentIds: { type: [String], default: [] },
  subjects: { type: [subjectSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Classroom', classroomSchema);
