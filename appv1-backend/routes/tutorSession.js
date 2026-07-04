const express = require('express');
const router = express.Router();
const { startSession, updateSessionActivity, getTutorSessions } = require('../controllers/tutorSessionController');

const auth = require('../middleware/auth');
const checkOrgStatus = require('../middleware/checkOrgStatus');

router.use(auth);
router.use(checkOrgStatus);

// POST /api/tutor-sessions/start
router.post('/start', startSession);

// PUT /api/tutor-sessions/:id
router.put('/:id', updateSessionActivity);

// GET /api/tutor-sessions
router.get('/', getTutorSessions);

module.exports = router;
