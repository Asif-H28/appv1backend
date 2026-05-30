const express = require('express');
const router = express.Router();

const {
  issueBook,
  getIssuedBooks,
  markAsReturned,
  deleteIssueRecord
} = require('../controllers/libraryController');

const auth = require('../middleware/auth');
const checkOrgStatus = require('../middleware/checkOrgStatus');

// All library management routes are protected
router.use(auth);
router.use(checkOrgStatus);

router.post('/issue', issueBook);
router.get('/issues', getIssuedBooks);
router.patch('/issue/:id/return', markAsReturned);
router.delete('/issue/:id', deleteIssueRecord);

module.exports = router;
