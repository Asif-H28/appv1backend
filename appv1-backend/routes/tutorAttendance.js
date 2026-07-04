const express = require('express');
const router = express.Router();
const { getPresentTutors, getAttendanceReport, exportAttendanceReport } = require('../controllers/tutorAttendanceController');

const auth = require('../middleware/auth');
const checkOrgStatus = require('../middleware/checkOrgStatus');

router.use(auth);
router.use(checkOrgStatus);

// GET /api/tutor-attendance/present
router.get('/present', getPresentTutors);

// GET /api/tutor-attendance/report
router.get('/report', getAttendanceReport);

// GET /api/tutor-attendance/export
router.get('/export', exportAttendanceReport);

module.exports = router;
