const express = require('express');
const router = express.Router();
const {
  registerTeacher,
  loginTeacher,
  updateTeacherProfile,
  getTeacherProfile,
  getOrgTeachers
} = require('../controllers/teacherController');

router.post('/register', registerTeacher);
router.post('/login', loginTeacher);
router.get('/org/:orgId', getOrgTeachers);                    // All teachers in org
router.get('/:teacherId/profile', getTeacherProfile);         // Get profile
router.put('/:teacherId/profile', updateTeacherProfile);      // Update profile

module.exports = router;
