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
  rejectJoinRequest
} = require('../controllers/teacherController');

// Auth
router.post('/register', registerTeacher);
router.post('/login', loginTeacher);

// Profile
router.get('/org/:orgId', getOrgTeachers);
router.get('/:teacherId/profile', getTeacherProfile);
router.put('/:teacherId/profile', updateTeacherProfile);

// Join Requests
router.post('/:teacherId/join-request', sendJoinRequest);           // Teacher sends request
router.get('/join-requests/:orgId', getJoinRequests);               // Admin gets requests
router.put('/join-requests/:requestId/approve', approveJoinRequest); // Admin approves
router.put('/join-requests/:requestId/reject', rejectJoinRequest);   // Admin rejects

module.exports = router;
