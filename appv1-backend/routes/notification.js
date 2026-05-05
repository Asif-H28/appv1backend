const express = require('express');
const router = express.Router();
const {
  saveStudentFcmToken,
  saveTeacherFcmToken,
  sendToClass,
  sendToStudent,
  sendToOrg,
  getNotificationsByClass,
  getNotificationsByOrg,
  getNotificationsByStudent,
  getTeacherLeaveNotificationsByOrg,
  getStudentLeavesNotificationsByTeacher,
  getAdminLeaveReviewNotificationsByTeacher,
  getAdminLeaveReviewNotificationsByTeacher,
  markAllLeaveNotificationsRead,
  markAllStudentLeavesRead,
  markAllAdminReviewsRead,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  clearStudentFcmToken,
  clearTeacherFcmToken,
  saveAdminFcmToken,
  clearAdminFcmToken
} = require('../controllers/notificationController');

router.post('/fcm/student', saveStudentFcmToken);
router.post('/fcm/teacher', saveTeacherFcmToken);
router.post('/send/class', sendToClass);
router.post('/send/student', sendToStudent);
router.post('/send/org', sendToOrg);
router.get('/class/:classId', getNotificationsByClass);
router.get('/org/:orgId/teacher-leave-requests', getTeacherLeaveNotificationsByOrg);
router.get('/teacher/:teacherId/student-leave-requests', getStudentLeavesNotificationsByTeacher);
router.get('/teacher/:teacherId/admin-leave-reviews', getAdminLeaveReviewNotificationsByTeacher);
router.put('/org/teacher-leave-requests/mark-all-read', markAllLeaveNotificationsRead); // ← specific FIRST
router.put('/teacher/student-leave-requests/mark-all-read', markAllStudentLeavesRead);
router.put('/teacher/admin-leave-reviews/mark-all-read', markAllAdminReviewsRead);
router.get('/org/:orgId', getNotificationsByOrg);                                     // ← generic AFTER
router.get('/student/:studentId', getNotificationsByStudent);
router.put('/:notificationId/read', markAsRead);             // ← NEW
router.put('/class/:classId/read-all', markAllAsRead);       // ← NEW
router.get('/class/:classId/unread/:userId', getUnreadCount); // ← NEW

router.post('/fcm/student/clear', clearStudentFcmToken);  // ← NEW
router.post('/fcm/teacher/clear', clearTeacherFcmToken);  // ← NEW

router.post('/fcm/admin/save',   saveAdminFcmToken);    // ← NEW
router.post('/fcm/admin/clear',  clearAdminFcmToken); 

module.exports = router;