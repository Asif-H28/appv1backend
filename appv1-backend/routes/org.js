const express = require('express');
const { createOrganization, adminLogin } = require('../controllers/orgController');
const router = express.Router();

router.post('/create', createOrganization);
router.post('/admin/login', adminLogin);

module.exports = router;
