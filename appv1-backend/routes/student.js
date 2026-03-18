const express = require('express');
const router = express.Router();
const {
  register,
  login,
  listOrgs,
  listClassesByOrg,
  sendJoinRequest,
  getStudentProfile
} = require('../controllers/studentController');

router.post('/register', register);
router.post('/login', login);
router.get('/orgs', listOrgs);
router.get('/orgs/:orgId/classes', listClassesByOrg);
router.post('/join-request', sendJoinRequest);
router.get('/profile/:studentId', getStudentProfile);

module.exports = router;
