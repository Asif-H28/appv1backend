const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  teacherId:   { type: String,  required: true, unique: true },
  orgId:       { type: String,  required: true },
  name:        { type: String,  required: true, trim: true },
  email:       { type: String,  required: true, unique: true, lowercase: true },
  password:    { type: String,  required: true, minlength: 6 },
  dob:         { type: String,  default: '' },
  gender:      { type: String,  default: '' },   // ← ADDED
  address:     { type: String,  default: '' },
  phoneNumber: { type: String,  default: '' },
  verified:    { type: Boolean, default: false },
  fcmToken:    { type: String,  default: null },
  refreshToken: { type: String,  default: null }
}, { timestamps: true });

module.exports = mongoose.model('Teacher', teacherSchema);