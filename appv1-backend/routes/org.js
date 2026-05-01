const express = require('express');
const router  = express.Router();
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

router.post('/create',                  createOrganization);
router.post('/admin/login',             adminLogin);
router.put ('/:orgId/profile',          updateOrganizationProfile);
router.get ('/:orgId/profile',          getOrganizationProfile);
router.get ('/search',                  searchOrganization);
router.get ('/list',                    getAllOrganizations);
router.get ('/:orgId/count',            getTeacherCountByOrg);
router.put ('/:orgId/fcm-token',        updateAdminFcmToken);
router.get ('/:orgId/school-details',   getSchoolDetails);    // ← NEW
router.put ('/:orgId/school-details',   updateSchoolDetails); // ← NEW

module.exports = router;