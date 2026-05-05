const mongoose = require('mongoose');
const Classroom = require('../models/Classroom');
const Teacher = require('../models/Teacher');

const generateClassId = () => `CLS_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

// CREATE CLASSROOM
exports.createClassroom = async (req, res) => {
  try {
    const { teacherId, orgId, className, subjects } = req.body;

    if (!teacherId || !orgId || !className) {
      return res.status(400).json({ error: 'teacherId, orgId, className required' });
    }

    const teacher = await Teacher.findOne({ teacherId });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    if (!teacher.verified) return res.status(403).json({ error: 'Teacher not verified' });

    let classId = generateClassId();
    while (await Classroom.findOne({ classId })) {
      classId = generateClassId();
    }

    const classroom = await Classroom.create({
      classId,
      teacherId,
      orgId,
      className,
      studentIds: [],
      subjects: subjects || []
    });

    res.status(201).json({
      success: true,
      classroom: {
        classId: classroom.classId,
        teacherId: classroom.teacherId,
        orgId: classroom.orgId,
        className: classroom.className,
        studentIds: classroom.studentIds,
        subjects: classroom.subjects,
        createdAt: classroom.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET CLASSROOM BY ID
exports.getClassroom = async (req, res) => {
  try {
    const { classId } = req.params;
    const classroom = await Classroom.findOne({ classId });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    res.json({ success: true, classroom });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET ALL CLASSROOMS BY TEACHER
exports.getClassroomsByTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const classrooms = await Classroom.find({ teacherId });
    res.json({ success: true, count: classrooms.length, classrooms });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET ALL CLASSROOMS BY ORG
exports.getClassroomsByOrg = async (req, res) => {
  try {
    const { orgId } = req.params;
    const classrooms = await Classroom.find({ orgId });
    res.json({ success: true, count: classrooms.length, classrooms });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET CLASSROOM LIST (ID AND NAME ONLY) BY ORG
exports.getClassroomList = async (req, res) => {
  try {
    const { orgId } = req.params;
    const classrooms = await Classroom.find({ orgId }).select('classId className -_id');
    res.json({ success: true, count: classrooms.length, classrooms });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE CLASSROOM NAME
exports.updateClassroom = async (req, res) => {
  try {
    const { classId } = req.params;
    const { className, subjects } = req.body;

    const filteredData = {};
    if (className !== undefined) filteredData.className = className;
    if (subjects !== undefined) filteredData.subjects = subjects;

    const classroom = await Classroom.findOneAndUpdate(
      { classId },
      { $set: filteredData },
      { new: true }
    );

    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    res.json({ success: true, classroom });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ADD SUBJECT TO CLASSROOM
exports.addSubject = async (req, res) => {
  try {
    const { classId } = req.params;
    const { name, lessons } = req.body;

    if (!name) return res.status(400).json({ error: 'Subject name required' });

    const classroom = await Classroom.findOne({ classId });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    const existingSubject = classroom.subjects.find(s => s.name === name);
    if (existingSubject) return res.status(400).json({ error: 'Subject already exists' });

    classroom.subjects.push({ name, lessons: lessons || [] });
    await classroom.save();

    res.json({
      success: true,
      message: 'Subject added',
      subjects: classroom.subjects
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE LESSON COMPLETION
exports.updateLessonStatus = async (req, res) => {
  try {
    const { classId } = req.params;
    const { subjectName, lessonName, completed } = req.body;

    if (!subjectName || !lessonName || completed === undefined) {
      return res.status(400).json({ error: 'subjectName, lessonName, completed required' });
    }

    const classroom = await Classroom.findOne({ classId });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    const subject = classroom.subjects.find(s => s.name === subjectName);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const lesson = subject.lessons.find(l => l.name === lessonName);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    lesson.completed = completed;
    await classroom.save();

    res.json({
      success: true,
      message: `Lesson "${lessonName}" marked as ${completed ? 'completed' : 'incomplete'}`,
      subject: {
        name: subject.name,
        lessons: subject.lessons,
        completedCount: subject.lessons.filter(l => l.completed).length,
        totalCount: subject.lessons.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ADD LESSON TO SUBJECT
exports.addLesson = async (req, res) => {
  try {
    const { classId } = req.params;
    const { subjectName, lessonName } = req.body;

    if (!subjectName || !lessonName) {
      return res.status(400).json({ error: 'subjectName and lessonName required' });
    }

    const classroom = await Classroom.findOne({ classId });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    const subject = classroom.subjects.find(s => s.name === subjectName);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const existingLesson = subject.lessons.find(l => l.name === lessonName);
    if (existingLesson) return res.status(400).json({ error: 'Lesson already exists' });

    subject.lessons.push({ name: lessonName, completed: false });
    await classroom.save();

    res.json({
      success: true,
      message: 'Lesson added',
      subject: {
        name: subject.name,
        lessons: subject.lessons
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ADD STUDENT TO CLASSROOM
exports.addStudentToClassroom = async (req, res) => {
  try {
    const { classId } = req.params;
    const { studentId } = req.body;

    if (!studentId) return res.status(400).json({ error: 'studentId required' });

    const classroom = await Classroom.findOne({ classId });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    if (classroom.studentIds.includes(studentId)) {
      return res.status(400).json({ error: 'Student already in classroom' });
    }

    classroom.studentIds.push(studentId);
    await classroom.save();

    res.json({
      success: true,
      message: 'Student added',
      studentIds: classroom.studentIds
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// REMOVE STUDENT FROM CLASSROOM
exports.removeStudentFromClassroom = async (req, res) => {
  try {
    const { classId, studentId } = req.params;

    const classroom = await Classroom.findOneAndUpdate(
      { classId },
      { $pull: { studentIds: studentId } },
      { new: true }
    );

    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    res.json({
      success: true,
      message: 'Student removed',
      studentIds: classroom.studentIds
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE CLASSROOM
exports.deleteClassroom = async (req, res) => {
  try {
    const { classId } = req.params;
    const classroom = await Classroom.findOneAndDelete({ classId });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    res.json({
      success: true,
      message: `Classroom ${classroom.className} deleted`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE SUBJECT NAME
exports.updateSubject = async (req, res) => {
  try {
    const { classId } = req.params;
    const { oldName, newName } = req.body;

    if (!oldName || !newName) {
      return res.status(400).json({ error: 'oldName and newName required' });
    }

    const classroom = await Classroom.findOne({ classId });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    const subject = classroom.subjects.find(s => s.name === oldName);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const duplicate = classroom.subjects.find(s => s.name === newName);
    if (duplicate) return res.status(400).json({ error: 'Subject with this name already exists' });

    subject.name = newName;
    await classroom.save();

    res.json({
      success: true,
      message: `Subject renamed from "${oldName}" to "${newName}"`,
      subjects: classroom.subjects
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// REMOVE SUBJECT FROM CLASSROOM
exports.removeSubject = async (req, res) => {
  try {
    const { classId, subjectName } = req.params;

    const classroom = await Classroom.findOne({ classId });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    const exists = classroom.subjects.find(s => s.name === subjectName);
    if (!exists) return res.status(404).json({ error: 'Subject not found' });

    classroom.subjects = classroom.subjects.filter(s => s.name !== subjectName);
    await classroom.save();

    res.json({
      success: true,
      message: `Subject "${subjectName}" removed`,
      subjects: classroom.subjects
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE LESSON NAME
exports.updateLesson = async (req, res) => {
  try {
    const { classId } = req.params;
    const { subjectName, oldLessonName, newLessonName } = req.body;

    if (!subjectName || !oldLessonName || !newLessonName) {
      return res.status(400).json({ error: 'subjectName, oldLessonName, newLessonName required' });
    }

    const classroom = await Classroom.findOne({ classId });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    const subject = classroom.subjects.find(s => s.name === subjectName);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const lesson = subject.lessons.find(l => l.name === oldLessonName);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    const duplicate = subject.lessons.find(l => l.name === newLessonName);
    if (duplicate) return res.status(400).json({ error: 'Lesson with this name already exists' });

    lesson.name = newLessonName;
    await classroom.save();

    res.json({
      success: true,
      message: `Lesson renamed from "${oldLessonName}" to "${newLessonName}"`,
      subject: {
        name: subject.name,
        lessons: subject.lessons
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// REMOVE LESSON FROM SUBJECT
exports.removeLesson = async (req, res) => {
  try {
    const { classId, subjectName, lessonName } = req.params;

    const classroom = await Classroom.findOne({ classId });
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

    const subject = classroom.subjects.find(s => s.name === subjectName);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const lesson = subject.lessons.find(l => l.name === lessonName);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    subject.lessons = subject.lessons.filter(l => l.name !== lessonName);
    await classroom.save();

    res.json({
      success: true,
      message: `Lesson "${lessonName}" removed from "${subjectName}"`,
      subject: {
        name: subject.name,
        lessons: subject.lessons
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
