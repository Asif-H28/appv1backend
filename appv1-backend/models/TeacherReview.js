const mongoose = require('mongoose');

const teacherReviewSchema = new mongoose.Schema({
  orgId: { type: String, required: true },
  teacherId: { type: String, required: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  supportImage: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('TeacherReview', teacherReviewSchema);
