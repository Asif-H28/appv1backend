const mongoose = require('mongoose');

const subjectScoreSchema = new mongoose.Schema({
  subjectName: { type: String, required: true, trim: true },
  maximumScore: { type: Number, required: true },
  minimumScore: { type: Number, required: true }
}, { _id: false });

const testSchema = new mongoose.Schema({
  testId: { type: String, required: true, unique: true },
  orgId: { type: String, required: true },
  classId: { type: String, required: true },
  teacherName: { type: String, required: true, trim: true },
  teacherId: { type: String, required: true },
  className: { type: String, required: true, trim: true },
  subjects: { type: [subjectScoreSchema], default: [] },
  testModule: { type: String, required: true, trim: true }  // text
}, { timestamps: true });

module.exports = mongoose.model('Test', testSchema);
