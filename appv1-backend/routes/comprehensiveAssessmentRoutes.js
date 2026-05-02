const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/comprehensiveAssessmentController');

// Route to create a new assessment
router.post('/create', assessmentController.createAssessment);

// Route to get all assessments for a class in an org
router.get('/list', assessmentController.getAssessments);

// Route to get a single assessment by assessmentId
router.get('/details/:assessmentId', assessmentController.getAssessmentById);

// Route to update an assessment
router.put('/update/:assessmentId', assessmentController.updateAssessment);

// Route to delete an assessment
router.delete('/delete/:assessmentId', assessmentController.deleteAssessment);

module.exports = router;
