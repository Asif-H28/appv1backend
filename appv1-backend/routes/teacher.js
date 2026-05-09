const express = require('express');
const router = express.Router();
const {
  registerTeacher,
  loginTeacher,
  updateTeacherProfile,
  getTeacherProfile,
  getOrgTeachers,
  sendJoinRequest,
  getJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  getTeacherList
} = require('../controllers/teacherController');

const auth = require('../middleware/auth');
const checkOrgStatus = require('../middleware/checkOrgStatus');

// Auth (Public)
router.post('/register', registerTeacher);
router.post('/login', loginTeacher);
router.post('/:teacherId/join-request', sendJoinRequest); // Teacher sends request (Public)

// Protected Routes (Requires valid token and active organization)
router.use(auth);
router.use(checkOrgStatus);

// Profile
router.get('/list/:orgId', getTeacherList);
router.get('/org/:orgId', getOrgTeachers);
router.get('/:teacherId/profile', getTeacherProfile);
router.put('/:teacherId/profile', updateTeacherProfile);

// Join Requests
router.get('/join-requests/:orgId', getJoinRequests);               // Admin gets requests
router.put('/join-requests/:requestId/approve', approveJoinRequest); // Admin approves
router.put('/join-requests/:requestId/reject', rejectJoinRequest);   // Admin rejects

module.exports = router;
