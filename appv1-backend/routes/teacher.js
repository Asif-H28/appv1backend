const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  registerTeacher,
  loginTeacher,
  refreshTeacherToken,
  logoutTeacher,
  updateTeacherProfile,
  getTeacherProfile,
  getOrgTeachers,
  sendJoinRequest,
  getJoinRequests,
  approveJoinRequest,
  rejectJoinRequest
} = require('../controllers/teacherController');

// Public Auth
router.post('/register', registerTeacher);
router.post('/login', loginTeacher);
router.post('/refresh', refreshTeacherToken);

// Protected routes
router.use(protect);

router.post('/logout', logoutTeacher);
router.get('/org/:orgId', getOrgTeachers);
router.get('/:teacherId/profile', getTeacherProfile);
router.put('/:teacherId/profile', updateTeacherProfile);
router.post('/:teacherId/join-request', sendJoinRequest);
router.get('/join-requests/:orgId', getJoinRequests);
router.put('/join-requests/:requestId/approve', approveJoinRequest);
router.put('/join-requests/:requestId/reject', rejectJoinRequest);

module.exports = router;
