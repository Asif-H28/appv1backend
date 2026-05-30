const express = require('express');
const router = express.Router();

const {
  createEnquiry,
  getEnquiries,
  getEnquiryById,
  updateStatus,
  addNote,
  deleteEnquiry,
  getStats
} = require('../controllers/admissionController');

const auth = require('../middleware/auth');
const checkOrgStatus = require('../middleware/checkOrgStatus');

// All admission tracking routes are protected
router.use(auth);
router.use(checkOrgStatus);

// Dashboard Stats (Must be placed before /:id routes so 'stats' isn't parsed as an ID)
router.get('/stats', getStats);

// Enquiry Routes
router.post('/', createEnquiry);
router.get('/', getEnquiries);
router.get('/:id', getEnquiryById);
router.patch('/:id/status', updateStatus);
router.post('/:id/notes', addNote);
router.delete('/:id', deleteEnquiry);

module.exports = router;
