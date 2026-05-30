const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema({
  previousStatus: {
    type: String,
    enum: ['pending', 'follow_up', 'documents_submitted', 'enrolled', 'rejected', null],
    default: null
  },
  newStatus: {
    type: String,
    enum: ['pending', 'follow_up', 'documents_submitted', 'enrolled', 'rejected'],
    required: true
  },
  changedBy: {
    type: String,
    required: true // adminEmail or staffId
  },
  changedByName: {
    type: String,
    required: true // name of the admin or staff
  },
  note: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const followUpNoteSchema = new mongoose.Schema({
  note: {
    type: String,
    required: true
  },
  addedBy: {
    type: String,
    required: true // adminEmail or staffId
  },
  addedByName: {
    type: String,
    required: true // name of the admin or staff
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: true }); // Keep _id for notes so they can be deleted/updated if needed later

const admissionEnquirySchema = new mongoose.Schema({
  enquiryId: {
    type: String,
    required: true,
    unique: true
  },
  orgId: {
    type: String,
    required: true,
    index: true
  },
  
  // Student basic info
  student: {
    fullName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true }
  },

  // Parent/Guardian info
  guardian: {
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    email: { type: String, default: '' },
    relationship: { type: String, required: true }
  },

  // Academic info
  academic: {
    classAppliedFor: { type: String, required: true },
    academicYear: { type: String, required: true }
  },

  // Enquiry metadata
  metadata: {
    dateOfEnquiry: { type: Date, default: Date.now },
    source: { type: String, enum: ['walk-in', 'phone', 'website', 'referral', 'other'], default: 'walk-in' }
  },

  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'follow_up', 'documents_submitted', 'enrolled', 'rejected'],
    default: 'pending',
    index: true
  },

  statusHistory: [statusHistorySchema],
  followUpNotes: [followUpNoteSchema]

}, {
  timestamps: true
});

module.exports = mongoose.model('AdmissionEnquiry', admissionEnquirySchema);
