const express = require('express');
const { 
  createOrganization, 
  adminLogin, 
  updateOrganizationProfile,
  getOrganizationProfile      // ← NEW
} = require('../controllers/orgController');

const router = express.Router();

router.post('/create', createOrganization);
router.post('/admin/login', adminLogin);
router.put('/:orgId/profile', updateOrganizationProfile);
router.get('/:orgId/profile', getOrganizationProfile);   // ← NEW

module.exports = router;
