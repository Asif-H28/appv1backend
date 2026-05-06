const ComprehensiveResult = require('../models/ComprehensiveResult');
const ComprehensiveAssessment = require('../models/ComprehensiveAssessment');
const ExcelJS = require('exceljs');
const crypto = require('crypto');

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
    res.status(200).json(results);
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
    }

    res.status(200).json({ success: true, message: 'Results imported successfully' });
  } catch (error) {
    console.error('Error importing results:', error);
    res.status(500).json({ error: 'Server error importing results' });
  }
};
