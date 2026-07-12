const express = require('express');
const router  = express.Router();
const C       = require('../controllers/school.controller');
const { upload } = require('../config/azureStorage');

// Public Profile Details
router.get ('/:orgId/public',  C.getPublicProfile);

// Basic Details
router.get ('/basic',          C.getBasicDetails);
router.put ('/basic',          upload.single('logo'), C.upsertBasicDetails);
router.get ('/logo/:orgId',    C.getLogo);

// Fee Structures
router.get   ('/fee',           C.getFeeStructures);
router.post  ('/fee',           C.createFeeStructure);
router.put   ('/fee/:feeId',    C.updateFeeStructure);
router.delete('/fee/:feeId',    C.deleteFeeStructure);

// Roles
router.get   ('/roles',          C.getRoles);
router.post  ('/roles',          C.createRole);
router.put   ('/roles/:roleId',  C.updateRole);
router.delete('/roles/:roleId',  C.deleteRole);

module.exports = router;