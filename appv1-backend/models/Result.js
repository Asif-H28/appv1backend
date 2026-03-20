const mongoose = require('mongoose');

const subjectResultSchema = new mongoose.Schema({
  subjectName: { type: String, required: true, trim: true },
  scoredMarks: { type: Number, required: true },
  maximumScore: { type: Number, required: true },
  minimumScore: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pass', 'fail'], 
    required: true 
  },
  remarks: { type: String, default: null, trim: true }
}, { _id: false });

const resultSchema = new mongoose.Schema({
  resultId: { type: String, required: true, unique: true },
  testId: { type: String, required: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true, trim: true },
  classId: { type: String, required: true },
  orgId: { type: String, required: true },
  testModule: { type: String, required: true },
  className: { type: String, required: true },
  subjectResults: { type: [subjectResultSchema], default: [] },
  totalScoredMarks: { type: Number, required: true },   // auto calculated
  totalMaximumMarks: { type: Number, required: true },  // auto calculated
  percentage: { type: Number, required: true },         // auto calculated
  overallStatus: { 
    type: String, 
    enum: ['pass', 'fail'], 
    required: true                                       // auto calculated
  },
  grade: { type: String, required: true },              // auto calculated
  publishedBy: { type: String, required: true, trim: true }, // teacher name
  publishedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Result', resultSchema);
