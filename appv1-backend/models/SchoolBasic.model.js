const mongoose = require('mongoose');

const SchoolBasicSchema = new mongoose.Schema({
  orgId:          { type: String, required: true, unique: true },
  schoolName:     { type: String, default: '' },
  campusAddress:  { type: String, default: '' },
  schoolEmail:    { type: String, default: '' },
  primaryContact: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('SchoolBasic', SchoolBasicSchema);