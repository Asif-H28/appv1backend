const express = require('express');
const router  = express.Router();
const C       = require('../controllers/school.controller');

// Basic Details
router.get ('/basic',          C.getBasicDetails);
router.put ('/basic',          C.upsertBasicDetails);

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