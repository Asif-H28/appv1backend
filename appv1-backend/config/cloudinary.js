const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Image storage
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'appv1/images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 1000, quality: 'auto' }]
  }
});

// PDF storage
const pdfStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'appv1/pdfs',
    allowed_formats: ['pdf'],
    resource_type: 'raw'
  }
});

// Any file (image + pdf)
const anyStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isPdf = file.mimetype === 'application/pdf';
    return {
      folder: isPdf ? 'appv1/pdfs' : 'appv1/images',
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'webp'],
      resource_type: isPdf ? 'raw' : 'image'
    };
  }
});

// Multer upload instances
const uploadImage = multer({ 
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const uploadPdf = multer({ 
  storage: pdfStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const uploadAny = multer({ 
  storage: anyStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// ADD this at the bottom of config/cloudinary.js

const noticeStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isPdf = file.mimetype === 'application/pdf';
    return {
      folder: isPdf ? 'appv1/notices/pdfs' : 'appv1/notices/images',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
      resource_type: isPdf ? 'raw' : 'image'
    };
  }
});

const uploadNoticeFiles = multer({
  storage: noticeStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB per file
});

module.exports = { cloudinary, uploadImage, uploadPdf, uploadAny, uploadNoticeFiles };


