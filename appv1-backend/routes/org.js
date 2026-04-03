const express = require('express');
const router = express.Router();
const { 
  createOrganization, 
  adminLogin, 
  updateOrganizationProfile,
  getOrganizationProfile,
  searchOrganization,
  getTeacherCountByOrg,          // ← NEW
  updateAdminFcmToken
} = require('../controllers/orgController');

router.post('/create', createOrganization);
router.post('/admin/login', adminLogin);
router.put('/:orgId/profile', updateOrganizationProfile);
router.get('/:orgId/profile', getOrganizationProfile);
router.get('/search', searchOrganization);               // ← NEW
router.get('/:orgId/count', getTeacherCountByOrg);
// routes/orgRoutes.js
router.put("/:orgId/fcm-token", updateAdminFcmToken);

module.exports = router;
