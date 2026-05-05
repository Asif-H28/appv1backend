const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const {
  createOrganization,
  adminLogin,
  updateOrganizationProfile,
  getOrganizationProfile,
  searchOrganization,
  getAllOrganizations,
  getTeacherCountByOrg,
  updateAdminFcmToken,
  getSchoolDetails,      // ← NEW
  updateSchoolDetails,   // ← NEW
} = require('../controllers/orgController');

// Public routes
router.post('/create',                  createOrganization);
router.post('/admin/login',             adminLogin);
router.get ('/search',                  searchOrganization);
router.get ('/list',                    getAllOrganizations);

// Protected routes
router.use(protect);
router.put ('/:orgId/profile',          updateOrganizationProfile);
router.get ('/:orgId/profile',          getOrganizationProfile);
router.get ('/:orgId/count',            getTeacherCountByOrg);
router.put ('/:orgId/fcm-token',        updateAdminFcmToken);
router.get ('/:orgId/school-details',   getSchoolDetails);    // ← NEW
router.put ('/:orgId/school-details',   updateSchoolDetails); // ← NEW

module.exports = router;