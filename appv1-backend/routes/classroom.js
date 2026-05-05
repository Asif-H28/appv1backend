const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createClassroom,
  getClassroom,
  getClassroomsByTeacher,
  getClassroomsByOrg,
  updateClassroom,
  addSubject,
  updateSubject,        // ← ADD
  removeSubject,        // ← ADD
  addLesson,
  updateLesson,         // ← ADD
  removeLesson,         // ← ADD
  updateLessonStatus,
  addStudentToClassroom,
  removeStudentFromClassroom,
  deleteClassroom,
  getClassroomList
} = require('../controllers/classroomController');

// All routes are protected
router.use(protect);

router.post('/create', createClassroom);
router.get('/teacher/:teacherId', getClassroomsByTeacher);
router.get('/org/:orgId', getClassroomsByOrg);
router.get('/list/:orgId', getClassroomList);
router.get('/:classId', getClassroom);
router.put('/:classId', updateClassroom);
router.post('/:classId/subjects', addSubject);
router.put('/:classId/subjects', updateSubject);                                   // ← ADD
router.delete('/:classId/subjects/:subjectName', removeSubject);                   // ← ADD
router.post('/:classId/lessons', addLesson);
router.put('/:classId/lessons', updateLesson);                                     // ← ADD
router.delete('/:classId/lessons/:subjectName/:lessonName', removeLesson);         // ← ADD
router.put('/:classId/lessons/status', updateLessonStatus);
router.post('/:classId/students', addStudentToClassroom);
router.delete('/:classId/students/:studentId', removeStudentFromClassroom);
router.delete('/:classId', deleteClassroom);

module.exports = router;
