const express = require('express');
const router = express.Router();
const {
  createFeatureDefinition,
  getFeatureDefinitions,
  toggleOrgFeatureFlag,
  getOrgFeatureFlags
} = require('../controllers/featureFlagController');

const auth = require('../middleware/auth');
const checkOrgStatus = require('../middleware/checkOrgStatus');

// Definition management (Protected by basic auth, controller checks for admin/superadmin)
router.post('/definition', auth, createFeatureDefinition);
router.get('/definition', auth, getFeatureDefinitions);

// Super admin toggles a flag for an organization
router.post('/org/:orgId/toggle', auth, toggleOrgFeatureFlag);

// Flutter app (authenticated user) fetches its organization's flags
router.get('/org/:orgId', auth, checkOrgStatus, getOrgFeatureFlags);

module.exports = router;
