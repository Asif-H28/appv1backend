const express = require('express');
const router = express.Router();
const {
  createVersion,
  getAllVersions,
  getLatestVersion,
  updateVersion,
  deleteVersion
} = require('../controllers/appVersionController');
const superAdminAuth = require('../middleware/superAdminAuth');

// PUBLIC ROUTE (For Flutter App to check updates)
router.get('/latest', getLatestVersion);

// PROTECTED ROUTES (Super Admin Panel)
router.use(superAdminAuth);

router.post('/', createVersion);
router.get('/', getAllVersions);
router.put('/:id', updateVersion);
router.delete('/:id', deleteVersion);

module.exports = router;
