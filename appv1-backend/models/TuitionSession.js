const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  type: { type: String, enum: ['image', 'pdf'], required: true },
  filename: { type: String },
  section: {
    type: String,
    enum: ['homeworkProvided', 'studentCompletedHomework', 'testGiven', 'additional'],
    required: true
  }
}, { _id: true });

const tuitionSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, index: true },
  
  // Identifiers
  assignmentId: { type: String, required: true, index: true },
  studentId: { type: String, required: true, index: true },
  studentName: { type: String, trim: true },
  teacherId: { type: String, required: true, index: true },
  teacherName: { type: String, trim: true },
  
  // Date and Timing
  date: { type: Date, required: true, index: true }, // Normalized to 00:00:00
  
  // QR & Security Audit
  qrTokenId: { type: String, index: true }, // The unique JTI of the short-lived JWT
  qrGeneratedAt: { type: Date },
  qrExpiresAt: { type: Date },
  qrConsumedAt: { type: Date },
  startedByTeacherId: { type: String }, // Actual teacher who scanned it
  
  // Session State
  status: {
    type: String,
    enum: ['pending', 'ongoing', 'completed', 'missed'],
    default: 'pending'
  },
  
  // Check-in / Check-out Details
  forcedCheckIn: { type: Boolean, default: false },
  forcedCheckInReason: { type: String, default: '' },
  checkInTime: { type: Date },
  checkInLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  checkOutTime: { type: Date },
  checkOutLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  durationMinutes: { type: Number },
  
  // Activity Logging
  activity: {
    description: { type: String, default: '' },
    homeworkProvided: { type: Boolean, default: false },
    studentCompletedHomework: { type: Boolean, default: false },
    testGiven: { type: Boolean, default: false },
    lastUpdatedAt: { type: Date },
    attachments: { type: [attachmentSchema], default: [] }
  }
}, { timestamps: true });

module.exports = mongoose.model('TuitionSession', tuitionSessionSchema);
