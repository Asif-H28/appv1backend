const express = require('express');
const router = express.Router();
const {
  submitRequest,
  getRequests,
  updateRequest
} = require('../controllers/licenseRequestController');
const superAdminAuth = require('../middleware/superAdminAuth');

// Public route to submit request
router.post('/', submitRequest);

// Protected routes for Super Admin
router.get('/', superAdminAuth, getRequests);
router.patch('/:id', superAdminAuth, updateRequest);

module.exports = router;
