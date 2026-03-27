const express = require('express');
const router = express.Router();
const {
  register,
  login,
  listOrgs,
  listClassesByOrg,
  sendJoinRequest,
  getStudentProfile,
    updateStudentProfile  
} = require('../controllers/studentController');

router.post('/register', register);
router.post('/login', login);
router.get('/orgs', listOrgs);
router.get('/orgs/:orgId/classes', listClassesByOrg);
router.post('/join-request', sendJoinRequest);
router.get('/profile/:studentId', getStudentProfile);
router.put('/profile/:studentId', updateStudentProfile);

module.exports = router;
