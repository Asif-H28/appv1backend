const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  tempOrgId: { type: String, default: null },   // ← selected during register
  orgId: { type: String, default: null },        // ← set only after approval
  classId: { type: String, default: null },
  joinStatus: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none'
  }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
