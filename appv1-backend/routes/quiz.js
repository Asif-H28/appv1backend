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

    // a. Validate required fields
    if (!orgId || !classId || !teacherId || !subject || !lessonName || !lessonId || !title) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    // b. Run the 4-step lesson completion validation
    // Step 1: Query Classroom
    const classroom = await Classroom.findOne({ classId });
    if (!classroom) return res.status(400).json({ success: false, error: "Classroom not found" });

    // Step 2: Find subject
    const subjectObj = classroom.subjects.find(
      s => s.name.toLowerCase() === subject.toLowerCase()
    );
    if (!subjectObj) return res.status(400).json({ success: false, error: "Subject not found in this classroom" });

    // Step 3: Find lesson by ID
    const lessonObj = subjectObj.lessons.find(
      l => l._id.toString() === lessonId
    );
    if (!lessonObj) return res.status(400).json({ success: false, error: "Lesson ID not found in this subject" });

    // Step 4: Check completion
    if (!lessonObj.completed) {
      return res.status(400).json({ 
        success: false, 
        error: "Cannot create quiz. Lesson has not been marked as completed yet." 
      });
    }

    // c. Check creation limit using GlobalConfig
    let config = await GlobalConfig.findOne({ key: 'maxQuizzesPerLesson' });
    const maxLimit = config ? parseInt(config.value) : 3;

    // Count based on lessonId for reliable tracking across renames
    const quizCount = await Quiz.countDocuments({ classId, lessonId, teacherId });
    if (quizCount >= maxLimit) {
      return res.status(400).json({ 
        success: false, 
        error: `Limit reached. You can only create up to ${maxLimit} quizzes for this specific lesson.` 
      });
    }

    // d. Generate questions from Gemini
    let generatedQuestions;
    try {
      generatedQuestions = await generateMCQQuestions(
        subject, lessonName, className || classroom.className, 
        totalQuestions || 5, difficulty || 'medium'
      );
    } catch (geminiError) {
      return res.status(500).json({ success: false, error: geminiError.message || "Failed to generate questions. Please try again." });
    }

    // e. Save Quiz to MongoDB
    const quiz = new Quiz({
      orgId,
      classId,
      teacherId,
      teacherName,
      subject,
      lessonName,
      lessonId,
      className: className || classroom.className,
      title,
      questions: generatedQuestions,
      totalQuestions: generatedQuestions.length,
      durationMinutes: durationMinutes || 15,
      difficulty: difficulty || 'medium'
    });

    await quiz.save();

    // f. Return response
    res.status(201).json({
      success: true,
      message: "Quiz created successfully",
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        totalQuestions: quiz.totalQuestions,
        durationMinutes: quiz.durationMinutes,
        difficulty: quiz.difficulty
      }
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

// --- DEBUG ENDPOINT ---
router.get('/debug-key', (req, res) => {
  const groqKey = process.env.GROQ_API_KEY;
  const gmailPass = process.env.GMAIL_APP_PASS;

  const mask = (val) => val ? `${val.substring(0, 4)}...${val.substring(val.length - 4)}` : "MISSING";

  res.json({
    success: true,
    groq: {
      exists: !!groqKey,
      masked: mask(groqKey),
      length: groqKey ? groqKey.length : 0
    },
    gmail: {
      exists: !!gmailPass,
      masked: mask(gmailPass),
      length: gmailPass ? gmailPass.length : 0
    }
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
