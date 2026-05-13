const express = require('express');
const router = express.Router();
const {
  addTransportCoordinator,
  getTransportCoordinators,
  removeTransportCoordinator,
  createVehicle,
  getOrgVehicles
} = require('../controllers/transportController');

const auth = require('../middleware/auth');
const checkOrgStatus = require('../middleware/checkOrgStatus');

// All transport routes are protected
router.use(auth);
router.use(checkOrgStatus);

// Coordinator Management
router.post('/coordinators', addTransportCoordinator); // Admin adds coordinator
router.get('/coordinators/:orgId', getTransportCoordinators); // List coordinators
router.delete('/coordinators/:orgId/:teacherId', removeTransportCoordinator); // Remove coordinator

// Vehicle Management
router.post('/vehicles', createVehicle); // Coordinator adds vehicle
router.get('/vehicles/:orgId', getOrgVehicles); // List vehicles

module.exports = router;
