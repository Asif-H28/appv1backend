const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  orgId: { type: String, required: true, unique: true, uppercase: true },
  name: { type: String, required: true, trim: true, unique: true },
  adminEmail: { type: String, required: true, lowercase: true, unique: true },
  adminPassword: { type: String, required: true, minlength: 6 }
}, { timestamps: true });

module.exports = mongoose.model('Organization', organizationSchema);
