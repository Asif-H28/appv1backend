const express = require('express');
const router = express.Router();
const {
  saveStudentFcmToken,
  saveTeacherFcmToken,
  sendToClass,
  sendToStudent,
  sendToOrg,
  getNotificationsByClass,
  getNotificationsByOrg
} = require('../controllers/notificationController');

router.post('/fcm/student', saveStudentFcmToken);
router.post('/fcm/teacher', saveTeacherFcmToken);
router.post('/send/class', sendToClass);
router.post('/send/student', sendToStudent);
router.post('/send/org', sendToOrg);
router.get('/class/:classId', getNotificationsByClass);
router.get('/org/:orgId', getNotificationsByOrg);

module.exports = router;