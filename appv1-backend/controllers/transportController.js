const TransportCoordinator = require('../models/TransportCoordinator');
const Vehicle = require('../models/Vehicle');
const Teacher = require('../models/Teacher');
const Organization = require('../models/Organization');

const generateVehicleId = () => `VEH_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

// ADMIN: ADD TEACHER AS TRANSPORT COORDINATOR
exports.addTransportCoordinator = async (req, res) => {
  try {
    const { teacherId, orgId } = req.body;

    if (!teacherId || !orgId) {
      return res.status(400).json({ success: false, error: 'teacherId and orgId are required' });
    }

    // 1. Check if teacher exists and belongs to the org
    const teacher = await Teacher.findOne({ teacherId, orgId });
    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found in this organization' });
    }

    // 2. Check current count of coordinators for this org
    const count = await TransportCoordinator.countDocuments({ orgId });
    if (count >= 5) {
      return res.status(400).json({ success: false, error: 'Maximum limit of 5 transport coordinators reached for this organization' });
    }

    // 3. Check if already a coordinator
    const existing = await TransportCoordinator.findOne({ teacherId, orgId });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Teacher is already a transport coordinator' });
    }

    // 4. Create coordinator entry
    const coordinator = await TransportCoordinator.create({
      teacherId,
      orgId,
      name: teacher.name,
      email: teacher.email
    });

    // 5. Update Teacher model flag
    await Teacher.findOneAndUpdate({ teacherId, orgId }, { $set: { isTransportCoordinator: true } });

    res.status(201).json({
      success: true,
      message: 'Transport coordinator added successfully',
      coordinator
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET ALL TRANSPORT COORDINATORS FOR AN ORG
exports.getTransportCoordinators = async (req, res) => {
  try {
    const { orgId } = req.params;
    const coordinators = await TransportCoordinator.find({ orgId });
    res.json({ success: true, count: coordinators.length, coordinators });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// REMOVE TRANSPORT COORDINATOR
exports.removeTransportCoordinator = async (req, res) => {
  try {
    const { teacherId, orgId } = req.params;
    const deleted = await TransportCoordinator.findOneAndDelete({ teacherId, orgId });
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Coordinator not found' });
    }

    // Update Teacher model flag back to false
    await Teacher.findOneAndUpdate({ teacherId, orgId }, { $set: { isTransportCoordinator: false } });
    res.json({ success: true, message: 'Transport coordinator removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// COORDINATOR: CREATE VEHICLE
exports.createVehicle = async (req, res) => {
  try {
    const { vehicleName, vehicleNumber, driverName, driverPhoneNumber, orgId, coordinatorId } = req.body;

    if (!vehicleName || !vehicleNumber || !driverName || !driverPhoneNumber || !orgId || !coordinatorId) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    // 1. Verify if the person creating is a coordinator for this org
    const coordinator = await TransportCoordinator.findOne({ teacherId: coordinatorId, orgId });
    if (!coordinator) {
      return res.status(403).json({ success: false, error: 'Only a registered transport coordinator can create vehicles' });
    }

    // 2. Generate unique vehicleId
    let vehicleId = generateVehicleId();
    while (await Vehicle.findOne({ vehicleId })) {
      vehicleId = generateVehicleId();
    }

    // 3. Create Vehicle
    const vehicle = await Vehicle.create({
      vehicleId,
      orgId,
      vehicleName,
      vehicleNumber,
      driverName,
      driverPhoneNumber,
      coordinatorId: coordinator.teacherId,
      coordinatorName: coordinator.name,
      routeId: "" // Initially empty
    });

    res.status(201).json({
      success: true,
      message: 'Vehicle created successfully',
      vehicle
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET ALL VEHICLES FOR AN ORG
exports.getOrgVehicles = async (req, res) => {
  try {
    const { orgId } = req.params;
    const vehicles = await Vehicle.find({ orgId });
    res.json({ success: true, count: vehicles.length, vehicles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// UPDATE VEHICLE
exports.updateVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { vehicleName, vehicleNumber, driverName, driverPhoneNumber, routeId } = req.body;

    const updatedVehicle = await Vehicle.findOneAndUpdate(
      { vehicleId },
      { 
        $set: { 
          vehicleName, 
          vehicleNumber, 
          driverName, 
          driverPhoneNumber, 
          routeId 
        } 
      },
      { new: true }
    );

    if (!updatedVehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    res.json({
      success: true,
      message: 'Vehicle updated successfully',
      vehicle: updatedVehicle
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE VEHICLE
exports.deleteVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const deletedVehicle = await Vehicle.findOneAndDelete({ vehicleId });

    if (!deletedVehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle not found' });
    }

    res.json({
      success: true,
      message: 'Vehicle deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
