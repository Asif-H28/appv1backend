const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { uploadNoticeFiles } = require('../config/cloudinary');
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

router.use(protect);

// ── ADMIN ────────────────────────────────────────────────
router.post('/create',                uploadNoticeFiles.array('files', 5), createAdminNotice);
router.get('/org/:orgId',             getAdminNoticesByOrg);
router.put('/:noticeId',              uploadNoticeFiles.array('files', 5), updateAdminNotice);
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