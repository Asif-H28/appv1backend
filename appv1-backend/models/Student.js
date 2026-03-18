const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  orgId: { type: String, default: null },
  classId: { type: String, default: null },
  joinStatus: { 
    type: String, 
    enum: ['none', 'pending', 'approved', 'rejected'], 
    default: 'none' 
  },
  verified: { type: Boolean, default: false },
  otp: { type: String, default: null },
  otpExpiresAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
