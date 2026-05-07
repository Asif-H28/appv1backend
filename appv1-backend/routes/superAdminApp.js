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

// PUBLIC ROUTES
router.get('/latest', getLatestVersion);
router.get('/', getAllVersions); // List all is now public

// PROTECTED ROUTES (Super Admin Panel)
router.use(superAdminAuth);

router.post('/', createVersion);
router.put('/:id', updateVersion);
router.delete('/:id', deleteVersion);

module.exports = router;
