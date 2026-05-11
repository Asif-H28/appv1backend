const Groq = require('groq-sdk');

/**
 * Generates MCQ questions using Groq (Llama-3 model)
 */
exports.generateMCQQuestions = async (subject, lessonName, className, totalQuestions, difficulty) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is missing in .env file. Please add it to generate quizzes.");
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prompt = `Generate ${totalQuestions} multiple choice questions for Class ${className}, Subject: ${subject}, Lesson: ${lessonName}, Difficulty: ${difficulty}.
    Return ONLY a valid JSON array. No markdown, no preamble, no explanation text outside the JSON.
    
    Format:
    [
      {
        "questionText": "Question here?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": "Option A",
        "explanation": "Why this is correct"
      }
    ]`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" } // Groq supports forced JSON mode
    });

    let text = completion.choices[0].message.content;
    console.log("--- GROQ RAW RESPONSE ---");
    console.log(text);
    console.log("---------------------------");

    // Some models wrap JSON in markdown even with response_format
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const parsed = JSON.parse(text);
      // Groq with json_object sometimes returns { "questions": [...] } or just the array
      const questions = Array.isArray(parsed) ? parsed : (parsed.questions || Object.values(parsed)[0]);
      
      if (!Array.isArray(questions)) {
        throw new Error("Response is not an array");
      }
      return questions;
    } catch (parseError) {
      console.error("Parsing Groq response failed:", text);
      throw new Error("Failed to parse quiz questions from AI response.");
    }
  } catch (error) {
    console.error("Groq API Error details:", error);
    throw error;
  }
};
