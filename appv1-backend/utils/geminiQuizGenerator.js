const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Generates MCQ questions using Google Gemini API.
 * @param {string} subject - The subject name.
 * @param {string} lessonName - The lesson name.
 * @param {string} className - The class name.
 * @param {number} totalQuestions - Number of questions to generate.
 * @param {string} difficulty - Difficulty level (easy, medium, hard).
 * @returns {Promise<Array>} - Array of question objects.
 */
exports.generateMCQQuestions = async (subject, lessonName, className, totalQuestions, difficulty) => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Generate ${totalQuestions} multiple choice questions for Class ${className}, Subject: ${subject}, Lesson: ${lessonName}, Difficulty: ${difficulty}.
    Return ONLY a valid JSON array. No markdown, no explanation.
    Format: [{ "questionText": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "...", "explanation": "..." }]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean up the response text (strip markdown code blocks if present)
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const questions = JSON.parse(text);
      if (!Array.isArray(questions)) {
        throw new Error("Gemini response is not an array");
      }
      return questions;
    } catch (parseError) {
      console.error("Parsing Gemini response failed:", text);
      throw new Error("Failed to generate questions from Gemini");
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
