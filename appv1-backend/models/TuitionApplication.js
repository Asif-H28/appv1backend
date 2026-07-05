const mongoose = require('mongoose');

const tuitionApplicationSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true },

    // ── Form Fields ───────────
    preferredTuition: { 
      type: String, 
      enum: ['Home Tuition', 'Tuition Centre'],
      required: true 
    },
    studentName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    classOrGrade: { type: String, required: true },
    boardOrSyllabus: { 
      type: String, 
      enum: ['State', 'CBSE', 'ICSE', 'IGCSE'],
      required: true 
    },
    schoolOrCollegeName: { type: String, required: true },
    mediumOfStudy: { 
      type: String, 
      enum: ['Kannada', 'English', 'Hindi/Urdu'],
      required: true 
    },
    parentOrGuardianName: { type: String, required: true },
    email: { type: String, default: '' },
    contactNumber: { type: String, required: true },
    address: { type: String, required: true },
    preferredTime: { 
      type: String, 
      enum: ['Morning', 'Evening', 'Both'],
      required: true 
    },

    // ── Admin Added Fields ───────────
    feeAmount: { type: Number, default: null },
    upiId: { type: String, default: null }, // Encrypted
    tutorId: { type: String, default: null },
    tutorName: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TuitionApplication', tuitionApplicationSchema);
