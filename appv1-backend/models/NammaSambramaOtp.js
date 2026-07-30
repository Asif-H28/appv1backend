const mongoose = require('mongoose');
const nammasambramaConn = require('../config/nammasambrama_db');

const NammaSambramaOtpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  otpHash: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    enum: ['signup'],
    default: 'signup'
  },
  // Pending signup payload — the admin account is only created after the OTP
  // is verified, so an unverified number never leaves a record behind.
  pendingUsername: {
    type: String,
    trim: true,
    lowercase: true
  },
  pendingPassword: {
    type: String
  },
  attempts: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, { timestamps: true });

// TTL index — Mongo removes the document once expiresAt passes
NammaSambramaOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = nammasambramaConn.model('NammaSambramaOtp', NammaSambramaOtpSchema, 'nammasambramaotps');
