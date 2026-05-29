const express = require('express');
const router = express.Router();
const {
  checkIn,
  checkOut,
  getPresentTeachers,
  exportTeacherAttendance
} = require('../controllers/teacherAttendanceController');

const auth = require('../middleware/auth');
const checkOrgStatus = require('../middleware/checkOrgStatus');

// Protect all routes with auth and checkOrgStatus
router.use(auth);
router.use(checkOrgStatus);

// POST /api/teacher-attendance/checkin
router.post('/checkin', checkIn);

// POST /api/teacher-attendance/checkout
router.post('/checkout', checkOut);

// GET /api/teacher-attendance/org/:orgId/present
// Query params: ?date=YYYY-MM-DD
router.get('/org/:orgId/present', getPresentTeachers);

// GET /api/teacher-attendance/org/:orgId/export
// Query params: ?month=MM&year=YYYY or ?date=YYYY-MM-DD
router.get('/org/:orgId/export', exportTeacherAttendance);

module.exports = router;
