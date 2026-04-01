const express = require('express');
const router = express.Router();
const {
  teacherApplyLeave,
  getTeacherLeaves,
  getTeacherLeavesByOrg,
  reviewTeacherLeave,
  deleteTeacherLeave,
  studentApplyLeave,
  getStudentLeaves,
  getStudentLeavesByClass,
  getPendingStudentLeavesByClass,
  reviewStudentLeave,
  deleteStudentLeave
} = require('../controllers/leaveController');

// ── TEACHER LEAVE ROUTES ──
router.post('/teacher/apply',               teacherApplyLeave);
router.get('/teacher/:teacherId',           getTeacherLeaves);
router.get('/teacher/org/:orgId',           getTeacherLeavesByOrg);
router.put('/teacher/:leaveId/review',      reviewTeacherLeave);
router.delete('/teacher/:leaveId',          deleteTeacherLeave);

// ── STUDENT LEAVE ROUTES ──
router.post('/student/apply',               studentApplyLeave);
router.get('/student/:studentId',           getStudentLeaves);
router.get('/student/class/:classId',       getStudentLeavesByClass);
router.get('/student/class/:classId/pending', getPendingStudentLeavesByClass);
router.put('/student/:leaveId/review',      reviewStudentLeave);
router.delete('/student/:leaveId',          deleteStudentLeave);

module.exports = router;