const express = require('express');
const router = express.Router();
const { signup, signin, getProfile } = require('../controllers/superAdminAuthController');
const { getGlobalConfigs, updateGlobalConfig } = require('../controllers/globalConfigController');
const superAdminAuth = require('../middleware/superAdminAuth');

// Public Routes
router.post('/signup', signup);
router.post('/signin', signin);

// Protected Routes
router.use(superAdminAuth);
router.get('/profile', getProfile);

// Global Config Management
router.get('/config', getGlobalConfigs);
router.post('/config', updateGlobalConfig);

module.exports = router;
