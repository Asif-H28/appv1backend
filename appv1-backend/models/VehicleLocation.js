const mongoose = require('mongoose');

const vehicleLocationSchema = new mongoose.Schema({
  vehicleId: { type: String, required: true, unique: true }, // VEH_XXXXXX
  orgId: { type: String, required: true },
  vehicleName: String,
  vehicleNumber: String,
  driverName: String,
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  isActive: { type: Boolean, default: false }, // true = route started
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('VehicleLocation', vehicleLocationSchema);
