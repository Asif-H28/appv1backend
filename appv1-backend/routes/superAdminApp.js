const express = require('express');
const router = express.Router();
const {
  createVersion,
  getAllVersions,
  getLatestVersion,
  updateVersion,
  deleteVersion
} = require('../controllers/appVersionController');
const {
  getOrganizationByOrgId,
  updateOrganizationStatus
} = require('../controllers/orgController');
const {
  getGlobalConfigs,
  updateGlobalConfig
} = require('../controllers/globalConfigController');
const superAdminAuth = require('../middleware/superAdminAuth');

// PUBLIC ROUTES
router.get('/latest', getLatestVersion);
router.get('/', getAllVersions); // List all is now public

// PROTECTED ROUTES (Super Admin Panel)
router.use(superAdminAuth);

router.post('/', createVersion);
router.put('/:id', updateVersion);
router.delete('/:id', deleteVersion);

// Organization Management
router.get('/org/:orgId', getOrganizationByOrgId);
router.patch('/org/:orgId/status', updateOrganizationStatus);

// Global Config Management
router.get('/config', getGlobalConfigs);
router.post('/config', updateGlobalConfig);

module.exports = router;
