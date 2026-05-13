const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  vehicleId: { type: String, required: true, unique: true },
  orgId: { type: String, required: true },
  vehicleName: { type: String, required: true },
  vehicleNumber: { type: String, required: true },
  driverName: { type: String, required: true },
  driverPhoneNumber: { type: String, required: true },
  coordinatorId: { type: String, required: true },
  coordinatorName: { type: String, required: true },
  routeId: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
