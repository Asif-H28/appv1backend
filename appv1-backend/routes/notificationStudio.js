const express = require('express');
const router = express.Router();

const {
  getNotifications,
  markAllAsRead,
  markSingleAsRead,
  deleteOldNotifications
} = require('../controllers/notificationStudioController');

const auth = require('../middleware/auth');
const checkOrgStatus = require('../middleware/checkOrgStatus');

// All endpoints require authentication and active organization status check
router.use(auth);
router.use(checkOrgStatus);

// GET /api/notification-studio - Retrieve paginated notifications
router.get('/', getNotifications);

// PUT /api/notification-studio/mark-all-read - Mark all unread notifications read for the user
router.put('/mark-all-read', markAllAsRead);

// PUT /api/notification-studio/:id/read - Mark a single notification read
router.put('/:id/read', markSingleAsRead);

// DELETE /api/notification-studio/old - Purge notifications older than 7 days
router.delete('/old', deleteOldNotifications);

module.exports = router;
