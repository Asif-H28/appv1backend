const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const orgSettingsController = require('../controllers/orgSettingsController');

// Routes for payment settings (UPI IDs and Custom Fees)
// Protected by 'auth' middleware which ensures the user belongs to the org
router.get('/payment', auth, orgSettingsController.getPaymentSettings);
router.put('/payment', auth, orgSettingsController.updatePaymentSettings);

module.exports = router;
