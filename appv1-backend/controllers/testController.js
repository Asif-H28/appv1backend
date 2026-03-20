const Test = require('../models/Test');
const Classroom = require('../models/Classroom');

const generateTestId = () => `TST_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

// ─────────────────────────────────────────────
// CREATE TEST
// ─────────────────────────────────────────────
exports.createTest = async (req, res) => {
  try {
    const {
      orgId,
      classId,
      teacherName,
      teacherId,
      subjects,
      testModule
    } = req.body;

    if (!orgId || !classId || !teacherName || !teacherId || !testModule) {
      return res.status(400).json({ error: 'orgId, classId, teacherName, teacherId, testModule required' });
    }

    if (!subjects || subjects.length === 0) {
      return res.status(400).json({ error: 'At least one subject required' });
    }

    // Validate each subject
    for (const sub of subjects) {
      if (!sub.subjectName || sub.maximumScore === undefined || sub.minimumScore === undefined) {
        return res.status(400).json({ error: 'Each subject needs subjectName, maximumScore, minimumScore' });
      }
      if (sub.minimumScore > sub.maximumScore) {
        return res.status(400).json({ error: `minimumScore cannot be greater than maximumScore for ${sub.subjectName}` });
      }
    }

    // Get className from classroom
    const classroom = await Classroom.findOne({ classId });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    let testId = generateTestId();
    while (await Test.findOne({ testId })) {
      testId = generateTestId();
    }

    const test = await Test.create({
      testId,
      orgId,
      classId,
      teacherName,
      teacherId,
      className: classroom.className,
      subjects,
      testModule
    });

    res.status(201).json({ success: true, test });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET ALL TESTS BY CLASSID
// ─────────────────────────────────────────────
exports.getTestsByClass = async (req, res) => {
  try {
    const { classId } = req.params;

    const tests = await Test.find({ classId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tests.length,
      tests
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET ALL TESTS BY ORGID
// ─────────────────────────────────────────────
exports.getTestsByOrg = async (req, res) => {
  try {
    const { orgId } = req.params;

    const tests = await Test.find({ orgId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tests.length,
      tests
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET ALL TESTS BY TEACHERID
// ─────────────────────────────────────────────
exports.getTestsByTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const tests = await Test.find({ teacherId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tests.length,
      tests
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET SINGLE TEST
// ─────────────────────────────────────────────
exports.getTest = async (req, res) => {
  try {
    const { testId } = req.params;

    const test = await Test.findOne({ testId });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    res.json({ success: true, test });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// UPDATE TEST
// ─────────────────────────────────────────────
exports.updateTest = async (req, res) => {
  try {
    const { testId } = req.params;
    const { teacherName, subjects, testModule } = req.body;

    const test = await Test.findOne({ testId });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    if (teacherName) test.teacherName = teacherName;
    if (testModule) test.testModule = testModule;

    if (subjects && subjects.length > 0) {
      // Validate updated subjects
      for (const sub of subjects) {
        if (!sub.subjectName || sub.maximumScore === undefined || sub.minimumScore === undefined) {
          return res.status(400).json({ error: 'Each subject needs subjectName, maximumScore, minimumScore' });
        }
        if (sub.minimumScore > sub.maximumScore) {
          return res.status(400).json({ error: `minimumScore cannot be greater than maximumScore for ${sub.subjectName}` });
        }
      }
      test.subjects = subjects;
    }

    await test.save();
    res.json({ success: true, test });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// ADD SUBJECT TO TEST
// ─────────────────────────────────────────────
exports.addSubject = async (req, res) => {
  try {
    const { testId } = req.params;
    const { subjectName, maximumScore, minimumScore } = req.body;

    if (!subjectName || maximumScore === undefined || minimumScore === undefined) {
      return res.status(400).json({ error: 'subjectName, maximumScore, minimumScore required' });
    }

    if (minimumScore > maximumScore) {
      return res.status(400).json({ error: 'minimumScore cannot be greater than maximumScore' });
    }

    const test = await Test.findOne({ testId });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const exists = test.subjects.find(s => s.subjectName === subjectName);
    if (exists) return res.status(400).json({ error: 'Subject already exists in this test' });

    test.subjects.push({ subjectName, maximumScore, minimumScore });
    await test.save();

    res.json({
      success: true,
      message: 'Subject added',
      subjects: test.subjects
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// REMOVE SUBJECT FROM TEST
// ─────────────────────────────────────────────
exports.removeSubject = async (req, res) => {
  try {
    const { testId, subjectName } = req.params;

    const test = await Test.findOne({ testId });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const exists = test.subjects.find(s => s.subjectName === subjectName);
    if (!exists) return res.status(404).json({ error: 'Subject not found in this test' });

    test.subjects = test.subjects.filter(s => s.subjectName !== subjectName);
    await test.save();

    res.json({
      success: true,
      message: `Subject "${subjectName}" removed`,
      subjects: test.subjects
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// DELETE TEST
// ─────────────────────────────────────────────
exports.deleteTest = async (req, res) => {
  try {
    const { testId } = req.params;

    const test = await Test.findOneAndDelete({ testId });
    if (!test) return res.status(404).json({ error: 'Test not found' });

    res.json({
      success: true,
      message: `Test "${test.testModule}" deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// DELETE ALL TESTS BY CLASSID
// ─────────────────────────────────────────────
exports.deleteTestsByClass = async (req, res) => {
  try {
    const { classId } = req.params;

    const result = await Test.deleteMany({ classId });

    res.json({
      success: true,
      message: `${result.deletedCount} test(s) deleted for class ${classId}`,
      deleted: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
