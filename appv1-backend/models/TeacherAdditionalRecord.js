const mongoose = require('mongoose');

const teacherAdditionalRecordSchema = new mongoose.Schema({
  teacherId: { type: String, required: true },
  orgId: { type: String, required: true },
  // Using Mixed array to allow dynamic rows and columns
  // e.g., [{ schoolName: 'X', collegeName: 'Y', degreeTitle: 'BSc', percentage: '80%' }, ...]
  records: [{ type: mongoose.Schema.Types.Mixed, default: {} }]
}, { timestamps: true });

// Ensure each teacher has only one additional record document per organization
teacherAdditionalRecordSchema.index({ teacherId: 1, orgId: 1 }, { unique: true });

module.exports = mongoose.model('TeacherAdditionalRecord', teacherAdditionalRecordSchema);
