const Groq = require('groq-sdk');

/**
 * Generates MCQ questions using Groq (Llama-3 model)
 */
exports.generateMCQQuestions = async (apiKey, subject, lessonName, className, totalQuestions, difficulty) => {
  try {
    

    const groq = new Groq({ apiKey });

    const prompt = `Generate ${totalQuestions} multiple choice questions for Class ${className}, Subject: ${subject}, Lesson: ${lessonName}, Difficulty: ${difficulty}.
Return ONLY a valid JSON array. No markdown, no preamble, no explanation outside the JSON.
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
      messages: [
        {
          role: 'system',
          content: 'You are an educational quiz generator. Always respond with a valid JSON array only. No markdown formatting, no code blocks, no preamble, and no explanation text outside the JSON.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
      // No response_format — let the system prompt enforce JSON
    });

    let text = completion.choices[0].message.content;
    console.log('Groq raw response (first 200 chars):', text?.substring(0, 200));

    // Strip any accidental markdown or preamble
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Find the first [ and last ] to extract only the JSON array
    const startIdx = text.indexOf('[');
    const endIdx = text.lastIndexOf(']');
    
    if (startIdx !== -1 && endIdx !== -1) {
      text = text.substring(startIdx, endIdx + 1);
    }

    const parsed = JSON.parse(text);
    const questions = Array.isArray(parsed) 
      ? parsed 
      : (parsed.questions || Object.values(parsed)[0]);

    if (!Array.isArray(questions)) {
      throw new Error('Response is not an array after parsing');
    }
    
    console.log('Questions generated successfully:', questions.length);

    // Sanitize and ensure correct types before returning
    return questions.map(q => ({
      questionText: String(q.questionText || ""),
      options: Array.isArray(q.options) ? q.options.slice(0, 4).map(String) : [],
      correctAnswer: Array.isArray(q.correctAnswer) 
        ? String(q.correctAnswer[0]) 
        : String(q.correctAnswer || ""),
      explanation: String(q.explanation || "")
    }));

  } catch (error) {
    console.error('Groq generation error:', error.message);
    throw error;
  }
};
