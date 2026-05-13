const mongoose = require('mongoose');

const transportCoordinatorSchema = new mongoose.Schema({
  teacherId: { type: String, required: true },
  orgId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true }
}, { timestamps: true });

// Ensure a teacher is only added once as a coordinator in an org
transportCoordinatorSchema.index({ teacherId: 1, orgId: 1 }, { unique: true });

module.exports = mongoose.model('TransportCoordinator', transportCoordinatorSchema);
