const mongoose = require('mongoose');

const quizResultSchema = new mongoose.Schema({
  quizId: { type: String, required: true },
  quizTitle: { type: String },
  studentId: { type: String, required: true },
  studentName: { type: String },
  classId: { type: String },
  orgId: { type: String },
  answers: [
    {
      questionIndex: { type: Number, required: true },
      selectedAnswer: { type: String, required: true },
      isCorrect: { type: Boolean, required: true }
    }
  ],
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  percentage: { type: Number, required: true },
  timeTakenSeconds: { type: Number },
  submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QuizResult', quizResultSchema);
