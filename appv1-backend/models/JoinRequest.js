const mongoose = require('mongoose');

const joinRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  teacherId: { type: String, required: true },
  orgId: { type: String, required: true },
  teacherName: { type: String, required: true },
  teacherEmail: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('JoinRequest', joinRequestSchema);
