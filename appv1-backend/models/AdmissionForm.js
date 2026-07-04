const mongoose = require('mongoose');

const admissionFormSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true },

    // ── Mandatory Default Fields ───────────
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    gender: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, default: 'India' },
    admissionDate: { type: Date, required: true },
    schoolName: { type: String, required: true },
    studentClass: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    tutorId: { type: String, required: true },
    tutorName: { type: String, required: true },

    // ── Dynamic Custom Fields ───────────
    customFields: [
      {
        title: { type: String, required: true },
        value: { type: String, required: true }
      }
    ],

    // ── Selected Payment Info ───────────
    feeTitle: { type: String, required: true },
    feeAmount: { type: Number, required: true },
    upiTitle: { type: String, required: true },
    upiBankingName: { type: String, required: true },
    upiId: { type: String, required: true }, // Encrypted

    // ── Audit Info ───────────
    filledByUserId: { type: String, required: true },
    filledByRole: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdmissionForm', admissionFormSchema);
