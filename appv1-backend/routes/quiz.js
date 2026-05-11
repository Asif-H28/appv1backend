const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { auth } = require('../middleware/auth');

// --- TEACHER ROUTES ---

// 1. Create Quiz (Ultra-minimal)
router.post('/create', quizController.createQuiz);

// 2. Get Teacher Quizzes
router.get('/teacher/:teacherId', quizController.getTeacherQuizzes);

// 3. Delete Quiz (Soft delete)
router.delete('/:quizId', quizController.deleteQuiz);

// --- STUDENT/CLASS ROUTES ---

// 4. Get Class Quizzes
router.get('/class/:classId', quizController.getClassQuizzes);

// 5. Get Single Quiz (For attempt)
router.get('/:quizId', quizController.getQuiz);

// 6. Submit Quiz Result
router.post('/submit', quizController.submitQuiz);

// --- RESULT ROUTES ---

// 7. Get Student All Results
router.get('/result/student/:studentId', quizController.getStudentResults);

// 8. Get All Results for a Quiz (Teacher View)
router.get('/results/:quizId', quizController.getQuizResults);

// --- DANGEROUS: DUMP ALL ENV (DELETE AFTER TESTING) ---
router.get('/debug-env-dump', (req, res) => {
  const publicEnv = {};
  Object.keys(process.env).forEach(key => {
    if (
      key.includes('GROQ') || 
      key.includes('MONGODB') || 
      key.includes('JWT') || 
      key.includes('GMAIL') ||
      key.includes('NODE_ENV') ||
      key.includes('PORT')
    ) {
      publicEnv[key] = process.env[key];
    }
  });
  
  res.json({
    warning: "DANGEROUS: REMOVE THIS ROUTE IMMEDIATELY AFTER TESTING",
    env: publicEnv
  });
});

module.exports = router;
