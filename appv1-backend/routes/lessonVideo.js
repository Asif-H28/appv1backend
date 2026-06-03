const express = require('express');
const router = express.Router();
const {
  addLessonVideo,
  getLessonVideos,
  deleteLessonVideo
} = require('../controllers/lessonVideoController');

const auth = require('../middleware/auth');
const checkOrgStatus = require('../middleware/checkOrgStatus');

// Protect all routes
router.use(auth);
router.use(checkOrgStatus);

// Create a new video link
router.post('/add', addLessonVideo);

// Get videos for an org (can pass ?className=... & subject=...)
router.get('/org/:orgId', getLessonVideos);

// Delete a video
router.delete('/:id', deleteLessonVideo);

module.exports = router;
