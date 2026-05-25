const mongoose = require('mongoose');

const languageSummarySchema = new mongoose.Schema({
  overallSummary:    { type: String, required: true },
  strengths:         { type: [String], default: [] },
  areasForImprovement: { type: [String], default: [] },
  recommendations:   { type: [String], default: [] },
  motivationalNote:  { type: String, default: '' },
}, { _id: false });

const resultAISummarySchema = new mongoose.Schema({
  summaryId:    { type: String, required: true, unique: true },
  assessmentId: { type: String, required: true },   // Links to ComprehensiveAssessment
  resultId:     { type: String, required: true },   // Links to ComprehensiveResult
  studentId:    { type: String, required: true },
  studentName:  { type: String, required: true, trim: true },
  classId:      { type: String, required: true },
  orgId:        { type: String, required: true },

  // Bilingual AI-generated content
  english: { type: languageSummarySchema, required: true },
  kannada: { type: languageSummarySchema, required: true },

  // Raw response stored as backup
  rawResponse: { type: String, default: '' },

  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Compound index to ensure one summary per student per assessment
resultAISummarySchema.index({ assessmentId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('ResultAISummary', resultAISummarySchema);
