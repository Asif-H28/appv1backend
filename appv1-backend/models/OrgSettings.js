const mongoose = require('mongoose');

const orgSettingsSchema = new mongoose.Schema({
  orgId: { type: String, required: true, unique: true },
  tutorCheckInRestrictionTime: { type: String, default: null } // Storing time in 24-hour format like "18:30"
}, { timestamps: true });

module.exports = mongoose.model('OrgSettings', orgSettingsSchema);
