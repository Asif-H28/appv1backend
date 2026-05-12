const mongoose = require('mongoose');

const globalConfigSchema = new mongoose.Schema({
  key: { type: String, required: true },
  orgId: { type: String, default: null }, // null means system-wide global default
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  description: { type: String }
}, { timestamps: true });

// Ensure unique configuration per key per organization (or global)
globalConfigSchema.index({ key: 1, orgId: 1 }, { unique: true });

module.exports = mongoose.model('GlobalConfig', globalConfigSchema);
