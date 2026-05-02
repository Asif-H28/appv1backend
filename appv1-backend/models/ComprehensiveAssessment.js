const mongoose = require('mongoose');

const scholasticSubjectSchema = new mongoose.Schema({
  subjectName: { type: String, required: true, trim: true },
  internalMaximumScore: { type: Number, required: true, default: 0 },
  externalMaximumScore: { type: Number, required: true, default: 0 },
  totalMaximumScore: { type: Number, required: true },
  minimumPassScore: { type: Number, required: true }
}, { _id: false });

const coScholasticSubjectSchema = new mongoose.Schema({
  activityName: { type: String, required: true, trim: true },
  maximumScore: { type: Number, default: 0 } // Optional, can be used if grading relies on points
}, { _id: false });

const comprehensiveAssessmentSchema = new mongoose.Schema({
  assessmentId: { type: String, required: true, unique: true },
  orgId: { type: String, required: true },
  classId: { type: String, required: true },
  teacherName: { type: String, required: true, trim: true },
  teacherId: { type: String, required: true },
  className: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true }, // e.g., "Term 1 Comprehensive Assessment"
  scholasticSubjects: { type: [scholasticSubjectSchema], default: [] },
  coScholasticActivities: { type: [coScholasticSubjectSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('ComprehensiveAssessment', comprehensiveAssessmentSchema);
