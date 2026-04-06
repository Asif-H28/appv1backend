const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
  orgId:      { type: String, required: true, index: true },
  position:   { type: String, default: '' },
  assignedTo: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Role', RoleSchema);