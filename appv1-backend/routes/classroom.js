const express = require('express');
const router = express.Router();
const {
  createClassroom,
  getClassroom,
  getClassroomsByTeacher,
  getClassroomsByOrg,
  updateClassroom,
  addSubject,
  addLesson,
  updateLessonStatus,
  addStudentToClassroom,
  removeStudentFromClassroom,
  deleteClassroom
} = require('../controllers/classroomController');

router.post('/create', createClassroom);
router.get('/teacher/:teacherId', getClassroomsByTeacher);
router.get('/org/:orgId', getClassroomsByOrg);
router.get('/:classId', getClassroom);
router.put('/:classId', updateClassroom);
router.post('/:classId/subjects', addSubject);
router.post('/:classId/lessons', addLesson);
router.put('/:classId/lessons/status', updateLessonStatus);
router.post('/:classId/students', addStudentToClassroom);
router.delete('/:classId/students/:studentId', removeStudentFromClassroom);
router.delete('/:classId', deleteClassroom);

module.exports = router;
