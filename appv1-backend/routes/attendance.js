const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
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
  deleteAttendanceByClass,
  getAttendanceByWeek
} = require('../controllers/attendanceController');

// All routes are protected
router.use(protect);

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
