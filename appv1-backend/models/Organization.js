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
    fcmToken:      { type: String, default: null },

    // ── School Basic Details (4 new fields) ───────────
    schoolName:     { type: String, default: '' },
    campusAddress:  { type: String, default: '' },
    schoolEmail:    { type: String, default: '' },
    primaryContact: { type: String, default: '' },

    // ── License & Status ───────────
    licenseKey:     { type: String, default: null },
    isActive:       { type: Boolean, default: false },

    // ── Academic Year Details ───────────
    currentAcademicYear: { type: String, default: null },
    academicYearStartDate: { type: Date, default: null },

    // ── Payment Settings ───────────
    upiIds: [
      {
        title: { type: String, required: true },
        bankingName: { type: String, required: true, default: 'Unknown' },
        upiId: { type: String, required: true } // Encrypted string
      }
    ],
    customFees: [
      {
        title: { type: String, required: true },
        amount: { type: Number, required: true }
      }
    ],

    // ── Admission Form Template ────
    admissionFormTemplate: [
      {
        title: { type: String, required: true },
        placeholder: { type: String, required: true }
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Organization", organizationSchema);