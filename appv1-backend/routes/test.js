const express = require('express');
const router = express.Router();
const {
  createTest,
  getTestsByClass,
  getTestsByOrg,
  getTestsByTeacher,
  getTest,
  updateTest,
  addSubject,
  removeSubject,
  deleteTest,
  deleteTestsByClass
} = require('../controllers/testController');

router.post('/create', createTest);
router.get('/class/:classId', getTestsByClass);
router.get('/org/:orgId', getTestsByOrg);
router.get('/teacher/:teacherId', getTestsByTeacher);
router.get('/:testId', getTest);
router.put('/:testId', updateTest);
router.post('/:testId/subjects', addSubject);
router.delete('/:testId/subjects/:subjectName', removeSubject);
router.delete('/class/:classId/all', deleteTestsByClass);
router.delete('/:testId', deleteTest);

module.exports = router;
