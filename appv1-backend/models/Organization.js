const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  orgId: { type: String, required: true, unique: true, uppercase: true },
  name: { type: String, required: true, trim: true, unique: true },
  adminEmail: { type: String, required: true, lowercase: true, unique: true },
  adminPassword: { type: String, required: true, minlength: 6 },
  
  // NEW FIELDS
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  country: { type: String, default: 'India' },
  teachers: { type: Number, default: 0 },
  nonTeaching: { type: Number, default: 0 },
  fcmToken:      { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Organization', organizationSchema);
