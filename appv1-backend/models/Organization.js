// models/Organization.js
const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema(
  {
    orgId:         { type: String, required: true, unique: true },
    name:          { type: String, required: true },
    adminEmail:    { type: String, required: true },
    adminPassword: { type: String, required: true },
    phone:         { type: String, default: null },
    address:       { type: String, default: null },
    city:          { type: String, default: null },
    state:         { type: String, default: null },
    country:       { type: String, default: null },
    teachers:      { type: Number, default: 0 },
    nonTeaching:   { type: Number, default: 0 },
    fcmToken:      { type: String, default: null }, // ← ADD THIS
  },
  { timestamps: true }
);

module.exports = mongoose.model("Organization", organizationSchema);