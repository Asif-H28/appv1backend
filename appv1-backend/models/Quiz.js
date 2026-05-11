const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  orgId: { type: String, required: true },
  classId: { type: String, required: true },
  teacherId: { type: String, required: true },
  teacherName: { type: String },
  subject: { type: String, required: true },
  lessonName: { type: String, required: true },
  lessonId: { type: String, required: true },
  className: { type: String },
  title: { type: String, required: true },
  questions: [
    {
      questionText: { type: String, required: true },
      options: { type: [String], required: true }, // Exactly 4 expected
      correctAnswer: { type: String, required: true },
      explanation: { type: String }
    }
  ],
  totalQuestions: { type: Number },
  durationMinutes: { type: Number, default: 15 },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Quiz', quizSchema);
