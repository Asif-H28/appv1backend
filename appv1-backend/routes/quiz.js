const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
const Classroom = require('../models/Classroom');
const { generateMCQQuestions } = require('../utils/geminiQuizGenerator');
const superAdminAuth = require('../middleware/superAdminAuth');
const GlobalConfig = require('../models/GlobalConfig');

// --- CONFIG ENDPOINTS (Super Admin) ---

// 10. UPDATE QUIZ LIMIT (Super Admin Only)
router.post('/config/update-limit', superAdminAuth, async (req, res) => {
  try {
    const { limit } = req.body;
    if (limit === undefined) return res.status(400).json({ success: false, error: "Limit is required" });

    await GlobalConfig.findOneAndUpdate(
      { key: 'maxQuizzesPerLesson' },
      { value: limit, description: 'Maximum quizzes a teacher can create per lesson' },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: `Max quizzes per lesson updated to ${limit}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 11. GET CURRENT QUIZ LIMIT
router.get('/config/limit', async (req, res) => {
  try {
    const config = await GlobalConfig.findOne({ key: 'maxQuizzesPerLesson' });
    res.json({ success: true, limit: config ? config.value : 3 });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- QUIZ ENDPOINTS ---
router.post('/create', async (req, res) => {
  try {
    const { 
      orgId, classId, teacherId, teacherName, subject, 
      lessonName, lessonId, className, totalQuestions, durationMinutes, 
      difficulty, title 
    } = req.body;

    // 1. Generate questions using Groq
    let generatedQuestions;
    try {
      generatedQuestions = await generateMCQQuestions(
        process.env.GROQ_API_KEY,
        subject || "General", 
        lessonName || "Lesson", 
        className || "Class", 
        totalQuestions || 5, 
        difficulty || 'medium'
      );
    } catch (aiError) {
      return res.status(500).json({ success: false, error: "AI Generation failed: " + aiError.message });
    }

    // 2. Save Quiz to MongoDB
    const quiz = new Quiz({
      orgId: orgId || "TEST_ORG",
      classId: classId || "TEST_CLASS",
      teacherId: teacherId || "TEST_TCH",
      teacherName: teacherName || "Teacher",
      subject: subject || "General",
      lessonName: lessonName || "Lesson",
      lessonId: lessonId || Date.now().toString(),
      className: className || "Class",
      title: title || "Untitled Quiz",
      questions: generatedQuestions,
      totalQuestions: generatedQuestions.length,
      durationMinutes: durationMinutes || 15,
      difficulty: difficulty || 'medium'
    });

    await quiz.save();

    res.status(201).json({
      success: true,
      message: "Quiz created successfully",
      quizId: quiz.quizId,
      quiz: quiz
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. SUBMIT QUIZ RESULT (Put this before parameterized routes if needed, but it's /submit so it's fine)
router.post('/submit', async (req, res) => {
  try {
    const { quizId, studentId, studentName, classId, orgId, answers, timeTakenSeconds } = req.body;

    // a. Fetch quiz
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ success: false, error: "Quiz not found" });

    // e. Check duplicate submission
    const existingResult = await QuizResult.findOne({ quizId, studentId });
    if (existingResult) {
      return res.status(400).json({ success: false, error: "You have already submitted this quiz" });
    }

    // b. Validate answers
    let score = 0;
    const processedAnswers = answers.map(ans => {
      const question = quiz.questions[ans.questionIndex];
      const isCorrect = question.correctAnswer === ans.selectedAnswer;
      if (isCorrect) score++;
      return {
        questionIndex: ans.questionIndex,
        selectedAnswer: ans.selectedAnswer,
        isCorrect
      };
    });

    // c. Calculate metrics
    const totalQuestions = quiz.totalQuestions;
    const percentage = Math.round((score / totalQuestions) * 100);

    // f. Save Result
    const quizResult = new QuizResult({
      quizId,
      quizTitle: quiz.title,
      studentId,
      studentName,
      classId,
      orgId,
      answers: processedAnswers,
      score,
      totalQuestions,
      percentage,
      timeTakenSeconds
    });

    await quizResult.save();

    // g. Return response
    res.status(200).json({
      success: true,
      score,
      totalQuestions,
      percentage,
      answers: processedAnswers
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. GET STUDENT ALL RESULTS
router.get('/result/student/:studentId', async (req, res) => {
  try {
    const results = await QuizResult.find({ studentId: req.params.studentId }).sort({ submittedAt: -1 });
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. GET SINGLE STUDENT RESULT FOR SPECIFIC QUIZ
router.get('/result/:quizId/student/:studentId', async (req, res) => {
  try {
    const result = await QuizResult.findOne({ quizId: req.params.quizId, studentId: req.params.studentId });
    if (!result) return res.status(404).json({ success: false, error: "Result not found" });
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. GET ALL RESULTS FOR A QUIZ (Teacher View)
router.get('/results/:quizId', async (req, res) => {
  try {
    const results = await QuizResult.find({ quizId: req.params.quizId });
    const totalAttempts = results.length;
    let averageScore = 0;
    if (totalAttempts > 0) {
      const sumPercentage = results.reduce((acc, curr) => acc + curr.percentage, 0);
      averageScore = Math.round(sumPercentage / totalAttempts);
    }

    res.json({
      success: true,
      totalAttempts,
      averageScore,
      results
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. GET TEACHER QUIZZES
router.get('/teacher/:teacherId', async (req, res) => {
  try {
    const quizzes = await Quiz.find({ teacherId: req.params.teacherId, isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, quizzes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. GET CLASS QUIZZES
router.get('/class/:classId', async (req, res) => {
  try {
    const quizzes = await Quiz.find({ classId: req.params.classId, isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, quizzes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// TEMP: Test Groq directly
router.post('/test-groq', async (req, res) => {
  try {
    const { generateMCQQuestions } = require('../utils/geminiQuizGenerator');
    // Simple test data
    const questions = await generateMCQQuestions(process.env.GROQ_API_KEY, 'Math', 'Addition', 'Class 5', 2, 'easy');
    res.json({ success: true, count: questions.length, sample: questions[0] });
  } catch (err) {
    res.json({ 
      success: false, 
      errorMessage: err.message,
      errorName: err.name,
      errorStack: err.stack?.split('\n').slice(0, 5)
    });
  }
});

// --- DANGEROUS: DUMP ALL ENV (DELETE AFTER TESTING) ---
router.get('/debug-env-dump', (req, res) => {
  // We only return keys that aren't system-internal ones to keep it readable
  const publicEnv = {};
  Object.keys(process.env).forEach(key => {
    // Show only your custom keys, or keys starting with specific prefixes
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

// --- TEMP ENV TEST ---
router.get('/env-test', (req, res) => {
  res.json({
    GROQ_API_KEY_exists: !!process.env.GROQ_API_KEY,
    GROQ_API_KEY_length: process.env.GROQ_API_KEY?.length || 0,
    GROQ_API_KEY_first5: process.env.GROQ_API_KEY?.substring(0, 5) || 'NONE',
    NODE_ENV: process.env.NODE_ENV,
    all_keys_with_GROQ: Object.keys(process.env).filter(k => k.includes('GROQ')),
    all_keys_with_GMAIL: Object.keys(process.env).filter(k => k.includes('GMAIL'))
  });
});

// 3. GET SINGLE QUIZ (Full data for attempt)
router.get('/:quizId', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) return res.status(404).json({ success: false, error: "Quiz not found" });
    res.json({ success: true, quiz });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. DELETE QUIZ (Soft delete)
router.delete('/:quizId', async (req, res) => {
  try {
    const { teacherId } = req.body;
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) return res.status(404).json({ success: false, error: "Quiz not found" });

    if (quiz.teacherId !== teacherId) {
      return res.status(403).json({ success: false, error: "Unauthorized to delete this quiz" });
    }

    quiz.isActive = false;
    await quiz.save();

    res.json({ success: true, message: "Quiz deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 12. UPDATE QUIZ (Teacher can edit questions/title/etc)
router.patch('/:quizId', async (req, res) => {
  try {
    const { teacherId, title, questions, durationMinutes, difficulty, isActive } = req.body;
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) return res.status(404).json({ success: false, error: "Quiz not found" });

    // Validate ownership
    if (quiz.teacherId !== teacherId) {
      return res.status(403).json({ success: false, error: "Unauthorized to edit this quiz" });
    }

    // Update fields if provided
    if (title) quiz.title = title;
    if (questions) {
      quiz.questions = questions;
      quiz.totalQuestions = questions.length;
    }
    if (durationMinutes) quiz.durationMinutes = durationMinutes;
    if (difficulty) quiz.difficulty = difficulty;
    if (isActive !== undefined) quiz.isActive = isActive;

    await quiz.save();
    res.json({ success: true, message: "Quiz updated successfully", quiz });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


module.exports = router;
