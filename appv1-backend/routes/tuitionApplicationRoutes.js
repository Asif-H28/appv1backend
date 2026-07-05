const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const tuitionApplicationController = require('../controllers/tuitionApplicationController');

// Public route for customer/student to submit application
router.post('/', tuitionApplicationController.createApplication);

// Public route for customer/student to check their application status
router.post('/status', tuitionApplicationController.getStudentApplication);

// Admin routes (Protected by auth)
router.get('/', auth, tuitionApplicationController.getApplications);
router.put('/settings', auth, tuitionApplicationController.updateSettings);
router.put('/:id/review', auth, tuitionApplicationController.reviewApplication);
router.delete('/:id', auth, tuitionApplicationController.deleteApplication);

module.exports = router;
