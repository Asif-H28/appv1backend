const ComprehensiveResult = require('../models/ComprehensiveResult');
const ComprehensiveAssessment = require('../models/ComprehensiveAssessment');
const crypto = require('crypto');

// Create or update a single student's result
exports.createOrUpdateResult = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { 
      studentId, studentName, classId, orgId, className, 
      scholasticResults, coScholasticResults, publishedBy 
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
    
    // Simple grading logic (can be adjusted to standard CBSE/ICSE scales later)
    let overallGrade = 'E';
    if (percentage >= 91) overallGrade = 'A1';
    else if (percentage >= 81) overallGrade = 'A2';
    else if (percentage >= 71) overallGrade = 'B1';
    else if (percentage >= 61) overallGrade = 'B2';
    else if (percentage >= 51) overallGrade = 'C1';
    else if (percentage >= 41) overallGrade = 'C2';
    else if (percentage >= 33) overallGrade = 'D';
    else overallGrade = 'E';

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
        overallGrade,
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
