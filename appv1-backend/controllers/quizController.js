const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
const GlobalConfig = require('../models/GlobalConfig');
const { generateMCQQuestions } = require('../utils/geminiQuizGenerator');

exports.createQuiz = async (req, res) => {
  try {
    const { 
      orgId, classId, teacherId, teacherName, subject, 
      lessonName, lessonId, className, totalQuestions, durationMinutes, 
      difficulty, title 
    } = req.body;

    // 1. Find GROQ API Key dynamically (searching keys for 'GROQ')
    let apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      // If not found by exact name, try to find any key containing 'GROQ'
      const foundKeyName = Object.keys(process.env).find(key => key.includes('GROQ'));
      if (foundKeyName) {
        apiKey = process.env[foundKeyName];
        console.log(`🔍 Found GROQ key in environment under name: ${foundKeyName}`);
      }
    }

    if (!apiKey) {
      // List available keys (names only) for easier debugging if it fails
      const availableKeys = Object.keys(process.env).filter(k => 
        k.includes('MONGODB') || k.includes('JWT') || k.includes('PORT') || k.includes('NODE')
      );
      return res.status(500).json({ 
        success: false, 
        error: "GROQ_API_KEY not found.",
        hint: "Check your Render Environment variables.",
        detectedSystemKeys: availableKeys
      });
    }

    // 2. Generate questions using Groq
    let generatedQuestions;
    try {
      generatedQuestions = await generateMCQQuestions(
        apiKey,
        subject || "General", 
        lessonName || "Lesson", 
        className || "Class", 
        totalQuestions || 5, 
        difficulty || 'medium'
      );
    } catch (aiError) {
      return res.status(500).json({ success: false, error: "AI Generation failed: " + aiError.message });
    }

    // 3. Save Quiz to MongoDB
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
};

exports.getQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) return res.status(404).json({ success: false, error: "Quiz not found" });
    res.json({ success: true, quiz });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteQuiz = async (req, res) => {
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
};

exports.getTeacherQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ teacherId: req.params.teacherId, isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, quizzes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getClassQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ classId: req.params.classId, isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, quizzes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.submitQuiz = async (req, res) => {
  try {
    const { quizId, studentId, studentName, classId, orgId, answers, timeTakenSeconds } = req.body;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ success: false, error: "Quiz not found" });

    const existingResult = await QuizResult.findOne({ quizId, studentId });
    if (existingResult) {
      return res.status(400).json({ success: false, error: "You have already submitted this quiz" });
    }

    let score = 0;
    const processedAnswers = answers.map(ans => {
      const question = quiz.questions[ans.questionIndex];
      const isCorrect = question.correctAnswer === ans.selectedAnswer;
      if (isCorrect) score++;
      return { ...ans, isCorrect };
    });

    const totalQuestions = quiz.questions.length;
    const percentage = (score / totalQuestions) * 100;

    const quizResult = new QuizResult({
      quizId,
      studentId,
      studentName,
      classId,
      orgId,
      score,
      totalQuestions,
      percentage,
      timeTakenSeconds,
      answers: processedAnswers
    });

    await quizResult.save();

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
};

exports.getStudentResults = async (req, res) => {
  try {
    const results = await QuizResult.find({ studentId: req.params.studentId }).sort({ submittedAt: -1 });
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getQuizResults = async (req, res) => {
  try {
    const results = await QuizResult.find({ quizId: req.params.quizId });
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
