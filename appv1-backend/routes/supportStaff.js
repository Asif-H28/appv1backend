const express = require('express');
const router = express.Router();
const { inviteStaff, registerStaff, listStaff } = require('../controllers/supportStaffController');
const auth = require('../middleware/auth');
const checkOrgStatus = require('../middleware/checkOrgStatus');

// Public route for registration
router.post('/register', registerStaff);

// Protected routes for Org Admin
router.use(auth);
router.use(checkOrgStatus);
router.post('/invite', inviteStaff);
router.get('/list', listStaff);

module.exports = router;
