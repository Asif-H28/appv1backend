const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admissionFormController = require('../controllers/admissionFormController');

// All routes are protected by auth middleware

// Template Configuration Routes
router.get('/template', auth, admissionFormController.getTemplate);
router.put('/template', auth, admissionFormController.updateTemplate);

// Submission CRUD Routes
router.post('/', auth, admissionFormController.createSubmission);
router.get('/', auth, admissionFormController.getSubmissions);
router.put('/:id', auth, admissionFormController.updateSubmission);
router.delete('/:id', auth, admissionFormController.deleteSubmission);

module.exports = router;
