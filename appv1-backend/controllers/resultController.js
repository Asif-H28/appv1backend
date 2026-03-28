const Result = require('../models/Result');
const Test = require('../models/Test');
const Student = require('../models/Student');
const Classroom = require('../models/Classroom');

const generateResultId = () => `RES_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

// ─────────────────────────────────────────────
// HELPER: Calculate Grade
// ─────────────────────────────────────────────
const calculateGrade = (percentage) => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
};

// ─────────────────────────────────────────────
// PUBLISH RESULT (CREATE)
// ─────────────────────────────────────────────
exports.publishResult = async (req, res) => {
  try {
    const {
      testId,
      studentId,
      subjectResults,  // [{ subjectName, scoredMarks }]
      publishedBy
    } = req.body;

    if (!testId || !studentId || !publishedBy || !subjectResults || subjectResults.length === 0) {
      return res.status(400).json({ error: 'testId, studentId, publishedBy, subjectResults required' });
    }

    // Fetch test
    const test = await Test.findOne({ testId });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    // Fetch student
    const student = await Student.findOne({ studentId });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Fetch classroom
    const classroom = await Classroom.findOne({ classId: test.classId });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    // Check duplicate result
    const existing = await Result.findOne({ testId, studentId });
    if (existing) return res.status(400).json({ error: 'Result already published for this student and test' });

    // Build full subjectResults with pass/fail from test config
    let totalScoredMarks = 0;
    let totalMaximumMarks = 0;
    let anyFail = false;

    const fullSubjectResults = subjectResults.map(sr => {
      const testSubject = test.subjects.find(s => s.subjectName === sr.subjectName);
      if (!testSubject) throw new Error(`Subject "${sr.subjectName}" not found in test`);

      const passed = sr.scoredMarks >= testSubject.minimumScore;
      if (!passed) anyFail = true;

      totalScoredMarks += sr.scoredMarks;
      totalMaximumMarks += testSubject.maximumScore;

      return {
        subjectName: sr.subjectName,
        scoredMarks: sr.scoredMarks,
        maximumScore: testSubject.maximumScore,
        minimumScore: testSubject.minimumScore,
        status: passed ? 'pass' : 'fail',
        remarks: sr.remarks || null
      };
    });

    const percentage = parseFloat(((totalScoredMarks / totalMaximumMarks) * 100).toFixed(2));
    const overallStatus = anyFail ? 'fail' : 'pass';
    const grade = calculateGrade(percentage);

    let resultId = generateResultId();
    while (await Result.findOne({ resultId })) {
      resultId = generateResultId();
    }

    const result = await Result.create({
      resultId,
      testId,
      studentId,
      studentName: student.name,
      classId: test.classId,
      orgId: test.orgId,
      testModule: test.testModule,
      className: classroom.className,
      subjectResults: fullSubjectResults,
      totalScoredMarks,
      totalMaximumMarks,
      percentage,
      overallStatus,
      grade,
      publishedBy,
      publishedAt: new Date()
    });

    res.status(201).json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// PUBLISH BULK RESULTS (Multiple students at once)
// ─────────────────────────────────────────────
exports.publishBulkResults = async (req, res) => {
  try {
    const { testId, publishedBy, results } = req.body;
    // results: [{ studentId, subjectResults: [{ subjectName, scoredMarks, remarks }] }]

    if (!testId || !publishedBy || !results || results.length === 0) {
      return res.status(400).json({ error: 'testId, publishedBy, results[] required' });
    }

    const test = await Test.findOne({ testId });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const classroom = await Classroom.findOne({ classId: test.classId });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    const published = [];
    const skipped = [];

    for (const entry of results) {
      try {
        const existing = await Result.findOne({ testId, studentId: entry.studentId });
        if (existing) {
          skipped.push({ studentId: entry.studentId, reason: 'Result already exists' });
          continue;
        }

        const student = await Student.findOne({ studentId: entry.studentId });
        if (!student) {
          skipped.push({ studentId: entry.studentId, reason: 'Student not found' });
          continue;
        }

        let totalScoredMarks = 0;
        let totalMaximumMarks = 0;
        let anyFail = false;

        const fullSubjectResults = entry.subjectResults.map(sr => {
          const testSubject = test.subjects.find(s => s.subjectName === sr.subjectName);
          if (!testSubject) throw new Error(`Subject "${sr.subjectName}" not found in test`);

          const passed = sr.scoredMarks >= testSubject.minimumScore;
          if (!passed) anyFail = true;

          totalScoredMarks += sr.scoredMarks;
          totalMaximumMarks += testSubject.maximumScore;

          return {
            subjectName: sr.subjectName,
            scoredMarks: sr.scoredMarks,
            maximumScore: testSubject.maximumScore,
            minimumScore: testSubject.minimumScore,
            status: passed ? 'pass' : 'fail',
            remarks: sr.remarks || null
          };
        });

        const percentage = parseFloat(((totalScoredMarks / totalMaximumMarks) * 100).toFixed(2));
        const overallStatus = anyFail ? 'fail' : 'pass';
        const grade = calculateGrade(percentage);

        let resultId = generateResultId();
        while (await Result.findOne({ resultId })) {
          resultId = generateResultId();
        }

        const result = await Result.create({
          resultId,
          testId,
          studentId: entry.studentId,
          studentName: student.name,
          classId: test.classId,
          orgId: test.orgId,
          testModule: test.testModule,
          className: classroom.className,
          subjectResults: fullSubjectResults,
          totalScoredMarks,
          totalMaximumMarks,
          percentage,
          overallStatus,
          grade,
          publishedBy,
          publishedAt: new Date()
        });

        published.push(result);
      } catch (err) {
        skipped.push({ studentId: entry.studentId, reason: err.message });
      }
    }

    res.status(201).json({
      success: true,
      publishedCount: published.length,
      skippedCount: skipped.length,
      published,
      skipped
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET RESULT BY RESULTID
// ─────────────────────────────────────────────
exports.getResult = async (req, res) => {
  try {
    const { resultId } = req.params;

    const result = await Result.findOne({ resultId });
    if (!result) return res.status(404).json({ error: 'Result not found' });

    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET ALL RESULTS BY STUDENTID
// ─────────────────────────────────────────────
exports.getResultsByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    const results = await Result.find({ studentId }).sort({ publishedAt: -1 });

    res.json({
      success: true,
      count: results.length,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET ALL RESULTS BY TESTID
// ─────────────────────────────────────────────
exports.getResultsByTest = async (req, res) => {
  try {
    const { testId } = req.params;

    const results = await Result.find({ testId }).sort({ percentage: -1 });

    res.json({
      success: true,
      count: results.length,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET ALL RESULTS BY CLASSID
// ─────────────────────────────────────────────
exports.getResultsByClass = async (req, res) => {
  try {
    const { classId } = req.params;

    const results = await Result.find({ classId }).sort({ publishedAt: -1 });

    res.json({
      success: true,
      count: results.length,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET ALL RESULTS BY ORGID
// ─────────────────────────────────────────────
exports.getResultsByOrg = async (req, res) => {
  try {
    const { orgId } = req.params;

    const results = await Result.find({ orgId }).sort({ publishedAt: -1 });

    res.json({
      success: true,
      count: results.length,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// UPDATE RESULT (fix wrong marks)
// ─────────────────────────────────────────────
exports.updateResult = async (req, res) => {
  try {
    const { resultId } = req.params;
    const { subjectResults, publishedBy } = req.body;

    const result = await Result.findOne({ resultId });
    if (!result) return res.status(404).json({ error: 'Result not found' });

    const test = await Test.findOne({ testId: result.testId });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    let totalScoredMarks = 0;
    let totalMaximumMarks = 0;
    let anyFail = false;

    const fullSubjectResults = subjectResults.map(sr => {
      const testSubject = test.subjects.find(s => s.subjectName === sr.subjectName);
      if (!testSubject) throw new Error(`Subject "${sr.subjectName}" not found in test`);

      const passed = sr.scoredMarks >= testSubject.minimumScore;
      if (!passed) anyFail = true;

      totalScoredMarks += sr.scoredMarks;
      totalMaximumMarks += testSubject.maximumScore;

      return {
        subjectName: sr.subjectName,
        scoredMarks: sr.scoredMarks,
        maximumScore: testSubject.maximumScore,
        minimumScore: testSubject.minimumScore,
        status: passed ? 'pass' : 'fail',
        remarks: sr.remarks || null
      };
    });

    const percentage = parseFloat(((totalScoredMarks / totalMaximumMarks) * 100).toFixed(2));

    result.subjectResults = fullSubjectResults;
    result.totalScoredMarks = totalScoredMarks;
    result.totalMaximumMarks = totalMaximumMarks;
    result.percentage = percentage;
    result.overallStatus = anyFail ? 'fail' : 'pass';
    result.grade = calculateGrade(percentage);
    if (publishedBy) result.publishedBy = publishedBy;
    result.publishedAt = new Date();

    await result.save();
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// DELETE RESULT
// ─────────────────────────────────────────────
exports.deleteResult = async (req, res) => {
  try {
    const { resultId } = req.params;

    const result = await Result.findOneAndDelete({ resultId });
    if (!result) return res.status(404).json({ error: 'Result not found' });

    res.json({
      success: true,
      message: `Result for student ${result.studentName} deleted`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// DELETE ALL RESULTS BY TESTID
// ─────────────────────────────────────────────
exports.deleteResultsByTest = async (req, res) => {
  try {
    const { testId } = req.params;

    const result = await Result.deleteMany({ testId });

    res.json({
      success: true,
      message: `${result.deletedCount} result(s) deleted for test ${testId}`,
      deleted: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


await notifyStudent({
  studentId,
  orgId: test.orgId,
  classId: test.classId,
  title: `📊 Result Published: ${test.testModule}`,
  body: `You scored ${percentage}% — Grade ${grade}`,
  type: 'result',
  sentBy: publishedBy,
  sentByName: publishedBy,
  data: { route: '/results', resultId: result.resultId }
});