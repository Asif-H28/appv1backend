const express = require('express');
const router = express.Router();
const {
  createAttendance,
  getAttendance,
  getAttendanceByClass,
  getAttendanceByClassAndDate,
  getAttendanceByOrg,
  getStudentAttendanceSummary,
  updateAttendance,
  updateStudentAttendance,
  deleteAttendance,
  deleteAttendanceByClass
} = require('../controllers/attendanceController');

router.post('/create', createAttendance);
router.get('/class/:classId', getAttendanceByClass);
router.get('/class/:classId/date/:date', getAttendanceByClassAndDate);
router.get('/org/:orgId', getAttendanceByOrg);
router.get('/summary/:classId/:studentId', getStudentAttendanceSummary);
router.get('/:attendanceId', getAttendance);
router.put('/:attendanceId', updateAttendance);
router.patch('/:attendanceId/student', updateStudentAttendance);
router.delete('/class/:classId/all', deleteAttendanceByClass);
router.delete('/:attendanceId', deleteAttendance);
router.get('/class/:classId/week', getAttendanceByWeek);

module.exports = router;
