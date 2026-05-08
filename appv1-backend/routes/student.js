const express = require('express');
const router = express.Router();
const {
  register,
  login,
  listOrgs,
  listClassesByOrg,
  sendJoinRequest,
  getStudentProfile,
    updateStudentProfile,  
    getStudentsByClass,
    getStudentNamesByClass
} = require('../controllers/studentController');
const auth = require('../middleware/auth');
const checkOrgStatus = require('../middleware/checkOrgStatus');

// Auth (Public)
router.post('/register', register);
router.post('/login', login);

// Protected Routes
router.use(auth);
router.use(checkOrgStatus);

router.get('/orgs', listOrgs);
router.get('/orgs/:orgId/classes', listClassesByOrg);
router.post('/join-request', sendJoinRequest);
router.get('/profile/:studentId', getStudentProfile);
router.put('/profile/:studentId', updateStudentProfile);
router.get('/class/:classId', getStudentsByClass);  // ← Existing full profile list
router.get('/class/:classId/names', getStudentNamesByClass); // ← NEW: Names & IDs only (Rollup compatible)

module.exports = router;
