const express = require('express');
const router = express.Router();
const {
  publishResult,
  publishBulkResults,
  getResult,
  getResultsByStudent,
  getResultsByTest,
  getResultsByClass,
  getResultsByOrg,
  updateResult,
  deleteResult,
  deleteResultsByTest
} = require('../controllers/resultController');

router.post('/publish', publishResult);                      // single student
router.post('/publish/bulk', publishBulkResults);            // multiple students
router.get('/student/:studentId', getResultsByStudent);
router.get('/test/:testId', getResultsByTest);
router.get('/class/:classId', getResultsByClass);
router.get('/org/:orgId', getResultsByOrg);
router.get('/:resultId', getResult);
router.put('/:resultId', updateResult);
router.delete('/test/:testId/all', deleteResultsByTest);
router.delete('/:resultId', deleteResult);

module.exports = router;
