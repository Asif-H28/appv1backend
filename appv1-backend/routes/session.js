const express = require('express');
const router = express.Router();
const { upload } = require('../config/azureStorage');
const {
  generateQR,
  checkIn,
  forceCheckIn,
  updateActivity,
  checkOut,
  getSessions,
  getSessionById
} = require('../controllers/sessionController');

const auth = require('../middleware/auth');
const checkOrgStatus = require('../middleware/checkOrgStatus');

router.use(auth);
router.use(checkOrgStatus);

// Generate QR (Student / Admin)
router.post('/generate-qr', generateQR);

// Teacher scans QR and checks in
router.post('/checkin', checkIn);

// Teacher forces check-in (without QR)
router.post('/force-checkin', forceCheckIn);

// Teacher updates ongoing session activity
// Supporting max 10 files per section
router.put('/:id/activity', upload.fields([
  { name: 'homeworkProvidedFiles', maxCount: 10 },
  { name: 'studentCompletedHomeworkFiles', maxCount: 10 },
  { name: 'testGivenFiles', maxCount: 10 },
  { name: 'additionalFiles', maxCount: 10 }
]), updateActivity);

// Teacher ends session
router.patch('/:id/checkout', checkOut);

// Admin / Dashboard gets session list
router.get('/org/:orgId', getSessions);

// Get specific session detail
router.get('/:id', getSessionById);

module.exports = router;
