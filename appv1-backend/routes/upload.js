const express = require('express');
const router = express.Router();
const { uploadImage, uploadPdf, uploadAny } = require('../config/cloudinary');
const { 
  uploadImage: uploadImageCtrl,
  uploadPdf: uploadPdfCtrl,
  uploadAny: uploadAnyCtrl,
  deleteFile
} = require('../controllers/uploadController');

router.post('/image', uploadImage.single('file'), uploadImageCtrl);
router.post('/pdf', uploadPdf.single('file'), uploadPdfCtrl);
router.post('/any', uploadAny.single('file'), uploadAnyCtrl);
router.delete('/delete', deleteFile);

module.exports = router;
