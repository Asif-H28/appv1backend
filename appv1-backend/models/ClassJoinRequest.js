const mongoose = require('mongoose');

const classJoinRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  classId: { type: String, required: true },
  className: { type: String, required: true },
  orgId: { type: String, required: true },
  teacherId: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  reviewedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('ClassJoinRequest', classJoinRequestSchema);
