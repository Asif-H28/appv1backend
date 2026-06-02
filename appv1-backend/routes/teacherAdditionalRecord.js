const express = require('express');
const router = express.Router();
const { upsertRecord, getRecord } = require('../controllers/teacherAdditionalRecordController');

const auth = require('../middleware/auth');
const checkOrgStatus = require('../middleware/checkOrgStatus');

// Protect all routes with authentication and organization status check
router.use(auth);
router.use(checkOrgStatus);

// POST: Create or update teacher additional record
router.post('/', upsertRecord);

// GET: Retrieve teacher additional record for a specific teacher
router.get('/:teacherId', getRecord);

module.exports = router;
