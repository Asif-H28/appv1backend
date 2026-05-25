const express = require('express');
const router  = express.Router();
const { upload } = require('../config/azureStorage');
const {
  createAdminNotice,
  getAdminNoticesByOrg,
  getAdminNoticesForTeacher,
  getAdminNoticesForStudent,
  getAdminNotice,
  updateAdminNotice,
  deleteAdminNoticeAttachment,
  deleteAdminNotice,
  deleteAllAdminNotices
} = require('../controllers/adminNoticeController');

const auth = require('../middleware/auth');
const checkOrgStatus = require('../middleware/checkOrgStatus');

router.use(auth);
router.use(checkOrgStatus);

// ── ADMIN ────────────────────────────────────────────────
router.post('/create',                upload.array('files', 5), createAdminNotice);
router.get('/org/:orgId',             getAdminNoticesByOrg);
router.put('/:noticeId',              upload.array('files', 5), updateAdminNotice);
router.delete('/org/:orgId/all',      deleteAllAdminNotices);
router.delete('/:noticeId/attachment',deleteAdminNoticeAttachment);
router.delete('/:noticeId',           deleteAdminNotice);

// ── TEACHER ──────────────────────────────────────────────
router.get('/teacher/:orgId',         getAdminNoticesForTeacher);

// ── STUDENT ──────────────────────────────────────────────
router.get('/student/:orgId/:classId',getAdminNoticesForStudent);

// ── SHARED ───────────────────────────────────────────────
router.get('/:noticeId',              getAdminNotice);

module.exports = router;