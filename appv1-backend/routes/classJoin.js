const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getPendingRequests,
  getRequestsByClass,
  approveRequest,
  rejectRequest,
  getRequestStatus,
  removeStudent           // ← ADD THIS
} = require('../controllers/classJoinController');

router.use(protect);

router.get('/teacher/:teacherId/pending', getPendingRequests);
router.get('/class/:classId', getRequestsByClass);
router.put('/:requestId/approve', approveRequest);
router.put('/:requestId/reject', rejectRequest);
router.get('/:requestId/status', getRequestStatus);
router.delete('/class/:classId/student/:studentId', removeStudent);  // ← ADD THIS

module.exports = router;
