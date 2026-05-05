const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { uploadNoticeFiles } = require('../config/cloudinary');
const {
  createNotice,
  getNoticesByClassroom,
  getNotice,
  updateNotice,
  deleteAttachment,
  deleteNotice,
  purgeExpiredNotices
} = require('../controllers/noticeController');

router.use(protect);

router.post('/create', uploadNoticeFiles.array('files', 5), createNotice);         // max 5 files
router.get('/classroom/:classId', getNoticesByClassroom);                          // auto-purge + get
router.get('/:noticeId', getNotice);
router.put('/:noticeId', uploadNoticeFiles.array('files', 5), updateNotice);
router.delete('/:noticeId/attachment', deleteAttachment);
router.delete('/purge/:classId', purgeExpiredNotices);                             // manual purge trigger
router.delete('/:noticeId', deleteNotice);

module.exports = router;
