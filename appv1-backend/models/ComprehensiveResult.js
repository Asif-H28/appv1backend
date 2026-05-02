const mongoose = require('mongoose');

const scholasticResultSchema = new mongoose.Schema({
  subjectName: { type: String, required: true, trim: true },
  internalMarksScored: { type: Number, required: true, default: 0 },
  externalMarksScored: { type: Number, required: true, default: 0 },
  totalMarksScored: { type: Number, required: true },
  status: { type: String, enum: ['pass', 'fail'], required: true },
  grade: { type: String, required: true },
  remarks: { type: String, default: null, trim: true }
}, { _id: false });

const coScholasticResultSchema = new mongoose.Schema({
  activityName: { type: String, required: true, trim: true },
  grade: { type: String, required: true },
  remarks: { type: String, default: null, trim: true }
}, { _id: false });

const comprehensiveResultSchema = new mongoose.Schema({
  resultId: { type: String, required: true, unique: true },
  assessmentId: { type: String, required: true }, // Refers to ComprehensiveAssessment
  studentId: { type: String, required: true },
  studentName: { type: String, required: true, trim: true },
  classId: { type: String, required: true },
  orgId: { type: String, required: true },
  className: { type: String, required: true },
  title: { type: String, required: true }, // Copied from Assessment for convenience
  scholasticResults: { type: [scholasticResultSchema], default: [] },
  coScholasticResults: { type: [coScholasticResultSchema], default: [] },
  
  // Aggregated values based on scholastic results
  totalInternalScored: { type: Number, required: true },
  totalExternalScored: { type: Number, required: true },
  overallTotalScored: { type: Number, required: true },
  overallTotalMaximum: { type: Number, required: true },
  percentage: { type: Number, required: true },
  overallStatus: { type: String, enum: ['pass', 'fail'], required: true },
  overallGrade: { type: String, required: true },
  
  publishedBy: { type: String, required: true, trim: true },
  publishedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('ComprehensiveResult', comprehensiveResultSchema);
