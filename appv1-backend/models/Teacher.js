const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  teacherId: { type: String, required: true, unique: true },
  orgId: { type: String, required: true },         // Belongs to organization
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },

  // Profile fields (PUT)
  dob: { type: String, default: '' },
  address: { type: String, default: '' },
  phoneNumber: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Teacher', teacherSchema);
