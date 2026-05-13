const express = require('express');
const router = express.Router();
const {
  addTransportCoordinator,
  getTransportCoordinators,
  removeTransportCoordinator,
  createVehicle,
  getOrgVehicles,
  updateVehicle,
  deleteVehicle,
  setupOrgPin,
  getVehicleByDriver
} = require('../controllers/transportController');

const auth = require('../middleware/auth');
const checkOrgStatus = require('../middleware/checkOrgStatus');

// PUBLIC ROUTES (No Auth Required)
router.post('/driver/login', getVehicleByDriver); // Driver gets vehicle by Phone + PIN

// PROTECTED ROUTES (Requires Token)
router.use(auth);
router.use(checkOrgStatus);

// PIN Management
router.post('/setup-pin', setupOrgPin); // Coordinator/Admin sets org PIN

// Coordinator Management
router.post('/coordinators', addTransportCoordinator); // Admin adds coordinator
router.get('/coordinators/:orgId', getTransportCoordinators); // List coordinators
router.delete('/coordinators/:orgId/:teacherId', removeTransportCoordinator); // Remove coordinator

// Vehicle Management
router.post('/vehicles', createVehicle); // Coordinator adds vehicle
router.get('/vehicles/:orgId', getOrgVehicles); // List vehicles
router.put('/vehicles/:vehicleId', updateVehicle); // Update vehicle
router.delete('/vehicles/:vehicleId', deleteVehicle); // Delete vehicle

module.exports = router;
