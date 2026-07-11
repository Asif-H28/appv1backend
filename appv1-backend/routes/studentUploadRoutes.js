const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const studentUploadController = require('../controllers/studentUploadController');

// All routes are protected by auth
router.post('/', auth, studentUploadController.createUpload);
router.get('/', auth, studentUploadController.getUploads);
router.get('/:id', auth, studentUploadController.getUploadById);
router.put('/:id', auth, studentUploadController.updateUpload);
router.delete('/:id', auth, studentUploadController.deleteUpload);

module.exports = router;
