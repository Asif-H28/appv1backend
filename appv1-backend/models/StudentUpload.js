const mongoose = require('mongoose');

const studentUploadSchema = new mongoose.Schema({
  orgId: { type: String, required: true },
  title: { type: String, required: true },
  imageUrl: { type: String, required: true },
  uploadedById: { type: String, required: true }, // Usually the student ID
  uploadedByName: { type: String, required: true },
  uploadType: { type: String, enum: ['general', 'teacher'], default: 'general' },
  teacherId: { type: String, default: null }, // Only for 'teacher' type
  teacherName: { type: String, default: null } // Only for 'teacher' type
}, { timestamps: true });

module.exports = mongoose.model('StudentUpload', studentUploadSchema);
