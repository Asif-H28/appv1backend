const mongoose = require('mongoose');

const passwordResetSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,        // Only one active reset per email at a time
    lowercase: true,
    trim: true,
  },

  // Stage 1: OTP verification
  otpHash:   { type: String },  // SHA-256 hash of the 4-digit OTP
  otpExpiry: { type: Date },    // OTP valid for 10 minutes

  // Stage 2: Password reset (after OTP verified)
  resetToken:       { type: String },  // Random 32-byte hex token
  resetTokenExpiry: { type: Date },    // Reset token valid for 10 minutes

  createdAt: {
    type: Date,
    default: Date.now,
    expires: 1800,  // MongoDB TTL — auto-deletes after 30 minutes regardless
  },
});

module.exports = mongoose.model('PasswordReset', passwordResetSchema);
