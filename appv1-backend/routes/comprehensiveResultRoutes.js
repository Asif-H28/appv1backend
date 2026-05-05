const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const resultController = require('../controllers/comprehensiveResultController');

router.use(protect);

// Route to create or update a student's result for an assessment
router.post('/assessment/:assessmentId/result', resultController.createOrUpdateResult);

// Route to get all results for a specific assessment
router.get('/assessment/:assessmentId', resultController.getResultsByAssessment);

// Route to get all comprehensive results for a specific student
router.get('/student/:studentId', resultController.getResultsByStudent);

// Route to get a specific result by resultId
router.get('/details/:resultId', resultController.getResultById);

// Route to delete a result
router.delete('/delete/:resultId', resultController.deleteResult);

module.exports = router;
