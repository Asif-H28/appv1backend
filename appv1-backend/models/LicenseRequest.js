const mongoose = require('mongoose');
const webappConn = require('../config/webapp_db');

const licenseRequestSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  workEmail: {
    type: String,
    required: [true, 'Work email is required'],
    trim: true,
    lowercase: true
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    trim: true
  },
  schoolName: {
    type: String,
    required: [true, 'School name is required'],
    trim: true
  },
  cityTown: {
    type: String,
    required: [true, 'City/Town is required'],
    trim: true
  },
  studentCount: {
    type: String,
    required: [true, 'Student count is required'],
    trim: true
  },
  additionalNotes: {
    type: String,
    trim: true
  },
  requestReviewed: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'rejected'],
    default: 'pending'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiryDate: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = webappConn.model('LicenseRequest', licenseRequestSchema);
