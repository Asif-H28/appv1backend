const mongoose = require('mongoose');

const tutorSessionActivitySchema = new mongoose.Schema({
  orgId: { type: String, required: true, index: true },
  teacherId: { type: String, required: true, index: true }, // The tutor
  date: { type: Date, required: true, index: true },
  
  // Step 1: Start Session Data
  studentPhotos: { type: [String], default: [] },
  duration: { type: String }, // e.g., '2 hours'
  studentIds: { type: [String], default: [] },
  location: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String }
  },
  sessionStartedTime: { type: Date },
  sessionEndedTime: { type: Date },
  status: { type: String, enum: ['Session ongoing/started', 'Completed'], default: 'Session ongoing/started' },

  // Step 2: Update Session Activity Data
  sessionDescription: { type: String, default: '' },
  isHomeworkProvided: { type: Boolean, default: false },
  homeworkFiles: { type: [String], default: [] },
  isTestProvided: { type: Boolean, default: false },
  testFiles: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('TutorSessionActivity', tutorSessionActivitySchema);
