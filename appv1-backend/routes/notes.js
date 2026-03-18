const express = require('express');
const router = express.Router();
const { uploadNotesFiles } = require('../config/cloudinary');
const {
  createNote,
  getNotesByClass,
  getNotesByOrg,
  getNote,
  updateNote,
  deleteAttachment,
  deleteNote,
  deleteNotesByClass
} = require('../controllers/notesController');

router.post('/create', uploadNotesFiles.array('files', 10), createNote);  // max 10 files
router.get('/class/:classId', getNotesByClass);
router.get('/org/:orgId', getNotesByOrg);
router.get('/:notesId', getNote);
router.put('/:notesId', uploadNotesFiles.array('files', 10), updateNote);
router.delete('/:notesId/attachment', deleteAttachment);
router.delete('/class/:classId/all', deleteNotesByClass);
router.delete('/:notesId', deleteNote);

module.exports = router;
