const mongoose = require('mongoose');

const resultAISummarySchema = new mongoose.Schema({
  summaryId:    { type: String, required: true, unique: true },
  assessmentId: { type: String, required: true },   // Links to ComprehensiveAssessment
  resultId:     { type: String, required: true },   // Links to ComprehensiveResult
  studentId:    { type: String, required: true },
  studentName:  { type: String, required: true, trim: true },
  classId:      { type: String, required: true },
  orgId:        { type: String, required: true },

  // The AI-generated content (structured fields parsed from Groq response)
  overallSummary:    { type: String, required: true },
  strengths:         { type: [String], default: [] },
  areasForImprovement: { type: [String], default: [] },
  recommendations:   { type: [String], default: [] },
  motivationalNote:  { type: String, default: '' },

  // Raw response stored as backup
  rawResponse: { type: String, default: '' },

  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Compound index to ensure one summary per student per assessment
resultAISummarySchema.index({ assessmentId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('ResultAISummary', resultAISummarySchema);
