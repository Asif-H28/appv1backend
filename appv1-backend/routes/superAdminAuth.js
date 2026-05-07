const express = require('express');
const router = express.Router();
const { signup, signin, getProfile } = require('../controllers/superAdminAuthController');
const superAdminAuth = require('../middleware/superAdminAuth');

// Public Routes
router.post('/signup', signup);
router.post('/signin', signin);

// Protected Routes
router.get('/profile', superAdminAuth, getProfile);

module.exports = router;
