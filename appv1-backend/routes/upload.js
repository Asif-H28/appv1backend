const express = require('express');
const router = express.Router();
const { upload } = require('../config/azureStorage');
const { 
  uploadImage,
  uploadPdf,
  uploadAny,
  deleteFile
} = require('../controllers/uploadController');

router.post('/image', upload.single('file'), uploadImage);
router.post('/pdf', upload.single('file'), uploadPdf);
router.post('/any', upload.single('file'), uploadAny);
router.delete('/delete', deleteFile);

module.exports = router;
