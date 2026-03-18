const express = require('express');
const router = express.Router();
const {
  register,
  verifyOtp,
  resendOtp,
  login,
  listOrgs,
  listClassesByOrg,
  sendJoinRequest,
  getStudentProfile
} = require('../controllers/studentController');

router.post('/register', register);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', login);
router.get('/orgs', listOrgs);
router.get('/orgs/:orgId/classes', listClassesByOrg);
router.post('/join-request', sendJoinRequest);
router.get('/profile/:studentId', getStudentProfile);

module.exports = router;
