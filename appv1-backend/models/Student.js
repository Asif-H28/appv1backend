const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], default: null },
  address: { type: String, default: null, trim: true },
  tempOrgId: { type: String, default: null },
  orgId: { type: String, default: null },
  classId: { type: String, default: null },
  joinStatus: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none'
  },
  fcmToken: { type: String, default: null }   // ← ADDED
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);