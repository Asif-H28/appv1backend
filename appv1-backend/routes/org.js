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
  rollupAcademicYear,    // ← NEW
  getOrgStats,
} = require('../controllers/orgController');

const auth = require('../middleware/auth');
const checkOrgStatus = require('../middleware/checkOrgStatus');

router.post('/create',                  createOrganization);
router.post('/admin/login',             adminLogin);
router.get ('/search',                  searchOrganization);

// Protected Routes
router.use(auth);
router.use(checkOrgStatus);
router.put ('/:orgId/profile',          updateOrganizationProfile);
router.get ('/:orgId/profile',          getOrganizationProfile);
router.get ('/list',                    getAllOrganizations);
router.get ('/:orgId/count',            getTeacherCountByOrg);
router.put ('/:orgId/fcm-token',        updateAdminFcmToken);
router.get ('/:orgId/school-details',   getSchoolDetails);    // ← NEW
router.put ('/:orgId/school-details',   updateSchoolDetails); // ← NEW
router.post('/:orgId/rollup-year',      rollupAcademicYear);  // ← NEW
router.get ('/:orgId/stats',            getOrgStats);         // ← NEW

module.exports = router;