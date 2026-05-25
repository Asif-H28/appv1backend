const ComprehensiveResult = require('../models/ComprehensiveResult');
const ComprehensiveAssessment = require('../models/ComprehensiveAssessment');
const ResultAISummary = require('../models/ResultAISummary');
const ExcelJS = require('exceljs');
const crypto = require('crypto');
const Groq = require('groq-sdk');
const notificationSocket = require('../sockets/notificationSocket');

// Create or update a single student's result
exports.createOrUpdateResult = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { 
      studentId, studentName, classId, orgId, className, 
      scholasticResults, coScholasticResults, publishedBy,
      overallGrade, overallRemarks
    } = req.body;

    if (!studentId || !studentName || !classId || !orgId || !publishedBy) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify assessment exists
    const assessment = await ComprehensiveAssessment.findOne({ assessmentId });
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Calculate totals
    let totalInternalScored = 0;
    let totalExternalScored = 0;
    let overallTotalScored = 0;
    let overallTotalMaximum = 0;
    let failedSubjects = 0;

    if (scholasticResults && scholasticResults.length > 0) {
      scholasticResults.forEach(r => {
        totalInternalScored += (r.internalMarksScored || 0);
        totalExternalScored += (r.externalMarksScored || 0);
        overallTotalScored += (r.totalMarksScored || 0);
        
        if (r.status === 'fail') {
          failedSubjects++;
        }
      });
      
      // Calculate max possible marks from assessment definition
      assessment.scholasticSubjects.forEach(s => {
        overallTotalMaximum += (s.totalMaximumScore || 0);
      });
    }

    const percentage = overallTotalMaximum > 0 
      ? Number(((overallTotalScored / overallTotalMaximum) * 100).toFixed(2)) 
      : 0;

    const overallStatus = failedSubjects > 0 ? 'fail' : 'pass';
    
    // Simple grading logic if not provided
    let calculatedGrade = overallGrade;
    if (!calculatedGrade) {
      if (percentage >= 91) calculatedGrade = 'A1';
      else if (percentage >= 81) calculatedGrade = 'A2';
      else if (percentage >= 71) calculatedGrade = 'B1';
      else if (percentage >= 61) calculatedGrade = 'B2';
      else if (percentage >= 51) calculatedGrade = 'C1';
      else if (percentage >= 41) calculatedGrade = 'C2';
      else if (percentage >= 33) calculatedGrade = 'D';
      else calculatedGrade = 'E';
    }

    // Check if result already exists
    let existingResult = await ComprehensiveResult.findOne({ assessmentId, studentId });

    if (existingResult) {
      existingResult.scholasticResults = scholasticResults || [];
      existingResult.coScholasticResults = coScholasticResults || [];
      existingResult.totalInternalScored = totalInternalScored;
      existingResult.totalExternalScored = totalExternalScored;
      existingResult.overallTotalScored = overallTotalScored;
      existingResult.overallTotalMaximum = overallTotalMaximum;
      existingResult.percentage = percentage;
      existingResult.overallStatus = overallStatus;
      existingResult.overallGrade = overallGrade;
      existingResult.publishedBy = publishedBy;
      existingResult.publishedAt = Date.now();

      await existingResult.save();

      // ✅ Send in-app notification via Socket.IO
      try {
        await notificationSocket.sendNotification(
          studentId,
          `📊 Result Published: ${assessment.title}`,
          `Your result for ${assessment.title} has been updated. Score: ${percentage}% (${overallGrade || existingResult.overallGrade || ''})`,
          { route: '/results', assessmentId }
        );
      } catch (notifyError) {
        console.error('Result notification failed:', notifyError.message);
      }

      return res.status(200).json({ message: 'Result updated successfully', result: existingResult });
    } else {
      const resultId = `CR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      
      const newResult = new ComprehensiveResult({
        resultId,
        assessmentId,
        studentId,
        studentName,
        classId,
        orgId,
        className,
        title: assessment.title,
        scholasticResults: scholasticResults || [],
        coScholasticResults: coScholasticResults || [],
        totalInternalScored,
        totalExternalScored,
        overallTotalScored,
        overallTotalMaximum,
        percentage,
        overallStatus,
        overallGrade: calculatedGrade,
        overallRemarks,
        publishedBy
      });

      await newResult.save();

      // ✅ Send in-app notification via Socket.IO
      try {
        await notificationSocket.sendNotification(
          studentId,
          `📊 Result Published: ${assessment.title}`,
          `Your result for ${assessment.title} has been published. Score: ${percentage}% (${calculatedGrade})`,
          { route: '/results', assessmentId }
        );
      } catch (notifyError) {
        console.log('Result notification failed:', notifyError.message);
      }

      return res.status(201).json({ message: 'Result created successfully', result: newResult });
    }
  } catch (error) {
    console.error('Error saving result:', error);
    res.status(500).json({ error: 'Server error saving result' });
  }
};

// Get all results for a specific assessment
exports.getResultsByAssessment = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const results = await ComprehensiveResult.find({ assessmentId }).sort({ studentName: 1 });
    res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: 'Server error fetching results' });
  }
};

// Get all results for a specific student
exports.getResultsByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const results = await ComprehensiveResult.find({ studentId }).sort({ createdAt: -1 });

    // Filter out results from archived classes
    const activeResults = [];
    const classStatusCache = {};
    const Classroom = require('../models/Classroom');
    
    for (const r of results) {
      if (classStatusCache[r.classId] === undefined) {
        const cls = await Classroom.findOne({ classId: r.classId, isActive: true });
        classStatusCache[r.classId] = !!cls;
      }
      if (classStatusCache[r.classId]) {
        activeResults.push(r);
      }
    }
    
    res.status(200).json(activeResults);
  } catch (error) {
    console.error('Error fetching student results:', error);
    res.status(500).json({ error: 'Server error fetching student results' });
  }
};

// Get result by ID
exports.getResultById = async (req, res) => {
  try {
    const { resultId } = req.params;
    const result = await ComprehensiveResult.findOne({ resultId });
    
    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching result:', error);
    res.status(500).json({ error: 'Server error fetching result' });
  }
};

// Delete a result
exports.deleteResult = async (req, res) => {
  try {
    const { resultId } = req.params;
    const deletedResult = await ComprehensiveResult.findOneAndDelete({ resultId });

    if (!deletedResult) {
      return res.status(404).json({ error: 'Result not found' });
    }

    res.status(200).json({ message: 'Result deleted successfully' });
  } catch (error) {
    console.error('Error deleting result:', error);
    res.status(500).json({ error: 'Server error deleting result' });
  }
};

// Import CA results from Excel
exports.importResults = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { publishedBy } = req.body; // Teacher name/ID who is uploading

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const assessment = await ComprehensiveAssessment.findOne({ assessmentId });
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet(1);

    const results = [];
    const headers = [];

    // Get headers from first row
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value;
    });

    // Iterate through rows (skipping header)
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      if (!row.getCell(1).value) continue; // Skip empty rows

      const studentId = row.getCell(1).value.toString();
      const studentName = row.getCell(2).value.toString();

      let scholasticResults = [];
      let coScholasticResults = [];
      let totalInternalScored = 0;
      let totalExternalScored = 0;
      let overallTotalScored = 0;
      let failedSubjects = 0;
      let overallGradeFromExcel = null;
      let overallRemarksFromExcel = null;

      // Map columns to subjects/activities
      for (let col = 3; col <= worksheet.columnCount; col++) {
        const header = headers[col];
        if (!header) continue;

        const cellValue = row.getCell(col).value || 0;

        // Overall Grade/Remarks
        if (header === 'Overall Grade') {
          overallGradeFromExcel = row.getCell(col).value;
          continue;
        }
        if (header === 'Overall Remarks') {
          overallRemarksFromExcel = row.getCell(col).value;
          continue;
        }

        // Check Scholastic Subjects
        const subjectMatch = assessment.scholasticSubjects.find(s => 
          header.startsWith(s.subjectName)
        );

        if (subjectMatch) {
          let resObj = scholasticResults.find(r => r.subjectName === subjectMatch.subjectName);
          if (!resObj) {
            resObj = { 
              subjectName: subjectMatch.subjectName, 
              internalMarksScored: 0, 
              externalMarksScored: 0, 
              totalMarksScored: 0,
              status: 'pass',
              grade: null,
              remarks: null
            };
            scholasticResults.push(resObj);
          }

          if (header.includes('(Internal')) {
            resObj.internalMarksScored = Number(cellValue);
          } else if (header.includes('(External')) {
            resObj.externalMarksScored = Number(cellValue);
          } else if (header.endsWith('Grade')) {
            resObj.grade = cellValue;
          } else if (header.endsWith('Remarks')) {
            resObj.remarks = cellValue;
          }

          // Recalculate total for subject
          resObj.totalMarksScored = resObj.internalMarksScored + resObj.externalMarksScored;
          resObj.status = resObj.totalMarksScored < subjectMatch.minimumPassScore ? 'fail' : 'pass';
          continue;
        }

        // Check Co-Scholastic Activities
        const activityMatch = assessment.coScholasticActivities.find(a => 
          header.startsWith(a.activityName)
        );

        if (activityMatch) {
          let resObj = coScholasticResults.find(r => r.activityName === activityMatch.activityName);
          if (!resObj) {
            resObj = { 
              activityName: activityMatch.activityName, 
              grade: null, 
              remarks: null 
            };
            coScholasticResults.push(resObj);
          }

          if (header.endsWith('Grade')) {
            resObj.grade = cellValue;
          } else if (header.endsWith('Remarks')) {
            resObj.remarks = cellValue;
          }
          continue;
        }
      }

      // Calculate aggregated values
      scholasticResults.forEach(r => {
        totalInternalScored += r.internalMarksScored;
        totalExternalScored += r.externalMarksScored;
        overallTotalScored += r.totalMarksScored;
        if (r.status === 'fail') failedSubjects++;
      });

      let overallTotalMaximum = 0;
      assessment.scholasticSubjects.forEach(s => {
        overallTotalMaximum += s.totalMaximumScore;
      });

      const percentage = overallTotalMaximum > 0 
        ? Number(((overallTotalScored / overallTotalMaximum) * 100).toFixed(2)) 
        : 0;

      const overallStatus = failedSubjects > 0 ? 'fail' : 'pass';

      // Use grade from Excel or calculate
      let finalOverallGrade = overallGradeFromExcel;
      if (!finalOverallGrade) {
        if (percentage >= 91) finalOverallGrade = 'A1';
        else if (percentage >= 81) finalOverallGrade = 'A2';
        else if (percentage >= 71) finalOverallGrade = 'B1';
        else if (percentage >= 61) finalOverallGrade = 'B2';
        else if (percentage >= 51) finalOverallGrade = 'C1';
        else if (percentage >= 41) finalOverallGrade = 'C2';
        else if (percentage >= 33) finalOverallGrade = 'D';
        else finalOverallGrade = 'E';
      }

      const resultData = {
        assessmentId,
        studentId,
        studentName,
        classId: assessment.classId,
        orgId: assessment.orgId,
        className: assessment.className,
        title: assessment.title,
        scholasticResults,
        coScholasticResults,
        totalInternalScored,
        totalExternalScored,
        overallTotalScored,
        overallTotalMaximum,
        percentage,
        overallStatus,
        overallGrade: finalOverallGrade,
        overallRemarks: overallRemarksFromExcel,
        publishedBy: publishedBy || 'Teacher',
        publishedAt: Date.now()
      };

      // Upsert result
      await ComprehensiveResult.findOneAndUpdate(
        { assessmentId, studentId },
        { $set: resultData, resultId: `CR-${crypto.randomBytes(4).toString('hex').toUpperCase()}` },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // ✅ Send in-app notification via Socket.IO
      try {
        await notificationSocket.sendNotification(
          studentId,
          `📊 Result Published: ${assessment.title}`,
          `Your result for ${assessment.title} has been published. Score: ${percentage}% (${finalOverallGrade})`,
          { route: '/results', assessmentId }
        );
      } catch (notifyError) {
        console.log('Imported result notification failed:', notifyError.message);
      }
    }

    res.status(200).json({ success: true, message: 'Results imported successfully' });
  } catch (error) {
    console.error('Error importing results:', error);
    res.status(500).json({ error: 'Server error importing results' });
  }
};

// ─── AI SUMMARY ────────────────────────────────────────────────────────────

// POST /summary/:studentId/:assessmentId
// One-time action: generates an AI performance summary for a student's result
// and persists it. On repeated calls for the same student+assessment returns 409.
exports.generateAISummary = async (req, res) => {
  try {
    const { studentId, assessmentId } = req.params;

    // ── Guard: already generated? ──
    const existing = await ResultAISummary.findOne({ assessmentId, studentId });
    if (existing) {
      return res.status(409).json({
        alreadyGenerated: true,
        message: 'AI summary already exists for this student and assessment',
        summary: existing
      });
    }

    // ── Fetch result ──
    const result = await ComprehensiveResult.findOne({ assessmentId, studentId });
    if (!result) {
      return res.status(404).json({ error: 'Result not found for this student and assessment' });
    }

    // ── Fetch assessment for max marks context ──
    const assessment = await ComprehensiveAssessment.findOne({ assessmentId });
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // ── Build structured prompt ──
    const scholasticLines = result.scholasticResults.map(s => {
      const subjectDef = assessment.scholasticSubjects.find(d => d.subjectName === s.subjectName);
      const maxMarks = subjectDef ? subjectDef.totalMaximumScore : '?';
      const passScore = subjectDef ? subjectDef.minimumPassScore : '?';
      return `  - ${s.subjectName}: ${s.totalMarksScored}/${maxMarks} (Pass Score: ${passScore}) | Grade: ${s.grade || 'N/A'} | Status: ${s.status.toUpperCase()}${s.remarks ? ` | Remarks: ${s.remarks}` : ''}`;
    }).join('\n');

    const coScholasticLines = result.coScholasticResults.length > 0
      ? result.coScholasticResults.map(a =>
          `  - ${a.activityName}: Grade ${a.grade || 'N/A'}${a.remarks ? ` | Remarks: ${a.remarks}` : ''}`
        ).join('\n')
      : '  None recorded';

    const prompt = `
You are an expert academic counselor. Analyse the following student result and produce a structured performance summary.

Student: ${result.studentName}
Class: ${result.className}
Assessment: ${result.title}
Overall Score: ${result.overallTotalScored}/${result.overallTotalMaximum} (${result.percentage}%)
Overall Grade: ${result.overallGrade || 'N/A'}
Overall Status: ${result.overallStatus.toUpperCase()}

Scholastic (Academic) Results:
${scholasticLines}

Co-Scholastic (Activities) Results:
${coScholasticLines}

Return ONLY a valid JSON object with exactly these keys:
{
  "overallSummary": "<2-3 sentence paragraph summarising the student's overall performance>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "areasForImprovement": ["<area 1>", "<area 2>"],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"],
  "motivationalNote": "<1 encouraging sentence for the student>"
}
`.trim();

    // ── Call Groq ──
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are an expert academic counselor. Always respond with a valid JSON object only. No markdown, no code blocks, no preamble, no text outside the JSON.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.6
    });

    let rawText = completion.choices[0].message.content || '';
    console.log('Groq AI summary raw (first 300 chars):', rawText.substring(0, 300));

    // Strip accidental markdown wrappers
    rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

    // Extract only the JSON object
    const startIdx = rawText.indexOf('{');
    const endIdx = rawText.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1) {
      throw new Error('Groq response did not contain a valid JSON object');
    }
    const jsonStr = rawText.substring(startIdx, endIdx + 1);
    const parsed = JSON.parse(jsonStr);

    // Validate required keys
    const required = ['overallSummary', 'strengths', 'areasForImprovement', 'recommendations', 'motivationalNote'];
    for (const key of required) {
      if (!(key in parsed)) throw new Error(`Missing key "${key}" in Groq response`);
    }

    // ── Persist summary ──
    const summaryId = `AIS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const summary = await ResultAISummary.create({
      summaryId,
      assessmentId,
      resultId: result.resultId,
      studentId,
      studentName: result.studentName,
      classId: result.classId,
      orgId: result.orgId,
      overallSummary: parsed.overallSummary,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      areasForImprovement: Array.isArray(parsed.areasForImprovement) ? parsed.areasForImprovement : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      motivationalNote: parsed.motivationalNote || '',
      rawResponse: jsonStr
    });

    res.status(201).json({ success: true, summary });
  } catch (error) {
    console.error('Error generating AI summary:', error.message);
    res.status(500).json({ error: 'Failed to generate AI summary: ' + error.message });
  }
};

// GET /summary/:studentId/:assessmentId
// Returns the stored AI summary (if generated) so the UI can display it directly
exports.getAISummary = async (req, res) => {
  try {
    const { studentId, assessmentId } = req.params;
    const summary = await ResultAISummary.findOne({ assessmentId, studentId });
    if (!summary) {
      return res.status(404).json({ exists: false, message: 'No AI summary found. Please generate one first.' });
    }
    res.status(200).json({ exists: true, summary });
  } catch (error) {
    console.error('Error fetching AI summary:', error.message);
    res.status(500).json({ error: 'Server error fetching AI summary' });
  }
};

