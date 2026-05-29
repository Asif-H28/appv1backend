const mongoose = require('mongoose');

const staffInvitationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  orgId: {
    type: String,
    required: true,
    ref: 'Organization'
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // Automatically delete document when it reaches expiresAt
  }
}, {
  timestamps: true
});

// Create a compound unique index on email and orgId if we only want one active invite per email per org
// Or just unique on email if an email can only be invited once globally
staffInvitationSchema.index({ email: 1, orgId: 1 }, { unique: true });

module.exports = mongoose.model('StaffInvitation', staffInvitationSchema);
