const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  register,
  login,
  listOrgs,
  listClassesByOrg,
  sendJoinRequest,
  getStudentProfile,
    updateStudentProfile,  
    getStudentsByClass
} = require('../controllers/studentController');

router.post('/register', register);
router.post('/login', login);
router.get('/orgs', listOrgs);
router.get('/orgs/:orgId/classes', listClassesByOrg);

// Protected routes
router.use(protect);

router.post('/join-request', sendJoinRequest);
router.get('/profile/:studentId', getStudentProfile);
router.put('/profile/:studentId', updateStudentProfile);
router.get('/class/:classId', getStudentsByClass);  // ← ADD THIS

module.exports = router;
