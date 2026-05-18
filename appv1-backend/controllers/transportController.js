const TransportCoordinator = require('../models/TransportCoordinator');
const Vehicle = require('../models/Vehicle');
const Teacher = require('../models/Teacher');
const Organization = require('../models/Organization');
const VehiclePin = require('../models/VehiclePin');
const VehicleLocation = require('../models/VehicleLocation');

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

    // 2. Check if a vehicle with the same driver phone number already exists
    const existingVehicleWithPhone = await Vehicle.findOne({ driverPhoneNumber });
    if (existingVehicleWithPhone) {
      return res.status(400).json({ success: false, error: 'Phone number is already assigned to a vehicle' });
    }

    // 3. Generate unique vehicleId
    let vehicleId = generateVehicleId();
    while (await Vehicle.findOne({ vehicleId })) {
      vehicleId = generateVehicleId();
    }

    // 4. Create Vehicle
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

    // Check if phone number is already assigned to another vehicle
    if (driverPhoneNumber) {
      const existingVehicle = await Vehicle.findOne({ driverPhoneNumber, vehicleId: { $ne: vehicleId } });
      if (existingVehicle) {
        return res.status(400).json({ success: false, error: 'Phone number is already assigned to another vehicle' });
      }
    }

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

    // Delete location data from vehiclelocations collection
    await VehicleLocation.deleteOne({ vehicleId });

    res.json({
      success: true,
      message: 'Vehicle deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// SETUP ORGANIZATION VEHICLE PIN (Auth Required)
exports.setupOrgPin = async (req, res) => {
  try {
    const { orgId, pin } = req.body;

    if (!orgId || !pin) {
      return res.status(400).json({ success: false, error: 'orgId and 4-digit pin are required' });
    }

    if (pin.length !== 4) {
      return res.status(400).json({ success: false, error: 'PIN must be exactly 4 digits' });
    }

    const updatedPin = await VehiclePin.findOneAndUpdate(
      { orgId },
      { $set: { pin } },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Organization vehicle PIN setup successfully',
      data: updatedPin
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET VEHICLE BY DRIVER (Public - No Auth Required)
exports.getVehicleByDriver = async (req, res) => {
  try {
    const { phoneNumber, pin } = req.body;

    if (!phoneNumber || !pin) {
      return res.status(400).json({ success: false, error: 'phoneNumber and pin are required' });
    }

    // 1. Find the organization that has this PIN
    // Note: Since PINs are org-wide, there might be multiple orgs with same PIN, 
    // but the driver's phone number + PIN combination should ideally be unique enough.
    // However, the best way is to find the PIN entry first.
    const pinEntries = await VehiclePin.find({ pin });
    if (pinEntries.length === 0) {
      return res.status(404).json({ success: false, error: 'Invalid PIN' });
    }

    const orgIds = pinEntries.map(e => e.orgId);

    // 2. Find vehicle matching phone number within those organizations
    const vehicle = await Vehicle.findOne({ 
      driverPhoneNumber: phoneNumber, 
      orgId: { $in: orgIds } 
    });

    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'No vehicle found for this phone number and PIN combination' });
    }

    res.json({
      success: true,
      vehicle: {
        vehicleId: vehicle.vehicleId,
        orgId: vehicle.orgId,
        vehicleName: vehicle.vehicleName,
        vehicleNumber: vehicle.vehicleNumber,
        driverName: vehicle.driverName,
        driverPhoneNumber: vehicle.driverPhoneNumber,
        coordinatorName: vehicle.coordinatorName,
        routeId: vehicle.routeId
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// UPDATE VEHICLE LOCATION (Driver Pushes)
exports.updateLocation = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { orgId, latitude, longitude, vehicleName, vehicleNumber, driverName } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, error: 'Latitude and Longitude are required' });
    }

    await VehicleLocation.updateOne(
      { vehicleId },
      { 
        $set: { 
          orgId, 
          latitude, 
          longitude,
          vehicleName, 
          vehicleNumber,
          driverName, 
          isActive: true,
          updatedAt: new Date() 
        } 
      },
      { upsert: true }
    );

    res.json({ success: true, message: 'Location updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// STOP ROUTE (Driver Stops)
exports.stopRoute = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const result = await VehicleLocation.updateOne(
      { vehicleId },
      { $set: { isActive: false, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: 'Vehicle location entry not found' });
    }

    res.json({ success: true, message: 'Route stopped' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET ACTIVE LOCATIONS FOR ORG (Viewer Fetch)
exports.getActiveLocations = async (req, res) => {
  try {
    const { orgId } = req.params;

    const vehicles = await VehicleLocation.find({
      orgId,
      isActive: true
    });

    res.json({ success: true, vehicles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET SPECIFIC VEHICLE LOCATION
exports.getVehicleLocation = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const vehicle = await VehicleLocation.findOne({ vehicleId });

    if (!vehicle) {
      return res.status(404).json({ success: false, error: 'Vehicle location not found' });
    }

    res.json({ success: true, vehicle });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
