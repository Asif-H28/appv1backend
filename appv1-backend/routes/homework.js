const express = require('express');
const router = express.Router();
const { upload } = require('../config/azureStorage');
const {
  createHomework,
  getHomeworkByClass,
  getHomeworkByClassAndSubject,
  getHomeworkByOrg,
  getHomework,
  updateHomework,
  deleteAttachment,
  deleteHomework,
  deleteHomeworkByClass
} = require('../controllers/homeworkController');

const auth = require('../middleware/auth');
const checkOrgStatus = require('../middleware/checkOrgStatus');

// All Homework APIs are private
router.use(auth);
router.use(checkOrgStatus);

router.post('/create', upload.array('files', 10), createHomework);
router.get('/class/:classId', getHomeworkByClass);
router.get('/class/:classId/subject/:subjectId', getHomeworkByClassAndSubject);
router.get('/org/:orgId', getHomeworkByOrg);
router.get('/:homeworkId', getHomework);
router.put('/:homeworkId', upload.array('files', 10), updateHomework);
router.delete('/:homeworkId/attachment', deleteAttachment);
router.delete('/class/:classId/all', deleteHomeworkByClass);
router.delete('/:homeworkId', deleteHomework);

module.exports = router;

