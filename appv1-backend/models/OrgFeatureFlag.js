const mongoose = require('mongoose');

const orgFeatureFlagSchema = new mongoose.Schema({
  orgId: { type: String, required: true, unique: true, index: true },
  flags: {
    type: Map,
    of: Boolean,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('OrgFeatureFlag', orgFeatureFlagSchema);
