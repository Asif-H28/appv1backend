const express = require('express');
const router = express.Router();
const { startSession, updateSessionActivity, getTutorSessions, getAdminTutorSessions } = require('../controllers/tutorSessionController');

const auth = require('../middleware/auth');
const checkOrgStatus = require('../middleware/checkOrgStatus');

router.use(auth);
router.use(checkOrgStatus);

// POST /api/tutor-sessions/start
router.post('/start', startSession);

// PUT /api/tutor-sessions/:id
router.put('/:id', updateSessionActivity);

// GET /api/tutor-sessions (for logged in teacher)
router.get('/', getTutorSessions);

// GET /api/tutor-sessions/admin/teacher/:teacherId (for admin to view a teacher's sessions)
router.get('/admin/teacher/:teacherId', getAdminTutorSessions);

module.exports = router;
