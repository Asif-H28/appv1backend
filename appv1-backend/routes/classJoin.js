const express = require('express');
const router = express.Router();
const {
  getPendingRequests,
  getRequestsByClass,
  approveRequest,
  rejectRequest,
  getRequestStatus
} = require('../controllers/classJoinController');

router.get('/teacher/:teacherId/pending', getPendingRequests);
router.get('/class/:classId', getRequestsByClass);
router.put('/:requestId/approve', approveRequest);
router.put('/:requestId/reject', rejectRequest);
router.get('/:requestId/status', getRequestStatus);

module.exports = router;
