const mongoose = require('mongoose');

const vehiclePinSchema = new mongoose.Schema({
  orgId: { type: String, required: true, unique: true },
  pin: { type: String, required: true, minlength: 4, maxlength: 4 }
}, { timestamps: true });

module.exports = mongoose.model('VehiclePin', vehiclePinSchema);
