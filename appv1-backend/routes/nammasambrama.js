const express = require('express');
const router = express.Router();

const {
  sendOtp,
  resendOtp,
  verifyOtp,
  login,
  me,
  listAdmins,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser
} = require('../controllers/nammasambramaAuthController');

const {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  listFoods,
  getFood,
  createFood,
  updateFood,
  deleteFood,
  uploadImage,
  deleteImage,
  dashboardStats
} = require('../controllers/nammasambramaCatalogController');

const {
  createEnquiry,
  listEnquiries,
  updateEnquiryStatus,
  deleteEnquiry
} = require('../controllers/nammasambramaEnquiryController');

const {
  getPaymentSettings,
  upsertPaymentSettings,
  deletePaymentQr,
  getPublicPayment
} = require('../controllers/nammasambramaPaymentController');

const {
  getPublicGallery,
  getAdminGallery,
  updateGallerySettings,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem
} = require('../controllers/nammasambramaGalleryController');

const nammasambramaAuth = require('../middleware/nammasambramaAuth');
const { upload } = require('../config/azureStorage');

/* ---------------- Auth (public) ---------------- */
router.post('/auth/send-otp',    sendOtp);
router.post('/auth/resend-otp',  resendOtp);
router.post('/auth/verify-otp',  verifyOtp);
router.post('/auth/login',       login);
router.get ('/auth/me',          nammasambramaAuth, me);

/* ---------------- Public site (no auth) ---------------- */
router.get ('/public/events',      listEvents);
router.get ('/public/events/:id',  getEvent);
router.get ('/public/foods',       listFoods);
router.post('/public/enquiries',   createEnquiry);
router.get ('/public/payment',     getPublicPayment);
router.get ('/public/gallery',     getPublicGallery);

/* ---------------- Admin panel (JWT required) ---------------- */
router.use('/admin', nammasambramaAuth);

router.get   ('/admin/events',      listEvents);
router.post  ('/admin/events',      createEvent);
router.get   ('/admin/events/:id',  getEvent);
router.put   ('/admin/events/:id',  updateEvent);
router.delete('/admin/events/:id',  deleteEvent);

router.get   ('/admin/foods',       listFoods);
router.post  ('/admin/foods',       createFood);
router.get   ('/admin/foods/:id',   getFood);
router.put   ('/admin/foods/:id',   updateFood);
router.delete('/admin/foods/:id',   deleteFood);

router.get   ('/admin/enquiries',             listEnquiries);
router.patch ('/admin/enquiries/:id/status',  updateEnquiryStatus);
router.delete('/admin/enquiries/:id',         deleteEnquiry);

router.get   ('/admin/dashboard/stats',  dashboardStats);

router.post  ('/admin/upload',  upload.single('file'), uploadImage);
router.delete('/admin/upload',  deleteImage);

router.get   ('/admin/payment',      getPaymentSettings);
router.put   ('/admin/payment',      upload.single('file'), upsertPaymentSettings);
router.delete('/admin/payment/qr',   deletePaymentQr);

router.get   ('/admin/gallery',               getAdminGallery);
router.put   ('/admin/gallery/settings',      updateGallerySettings);
router.post  ('/admin/gallery/items',         upload.single('file'), createGalleryItem);
router.put   ('/admin/gallery/items/:id',     upload.single('file'), updateGalleryItem);
router.delete('/admin/gallery/items/:id',     deleteGalleryItem);

router.get   ('/admin/users',         listAdmins);
router.post  ('/admin/users',         createAdminUser);
router.put   ('/admin/users/:id',     updateAdminUser);
router.delete('/admin/users/:id',     deleteAdminUser);

module.exports = router;
