const express = require('express');
const router = express.Router();
const { login } = require('../controllers/webDashboardController');

router.post('/login', login);

module.exports = router;
