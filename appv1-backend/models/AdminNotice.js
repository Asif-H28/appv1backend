const mongoose = require('mongoose');

const adminNoticeSchema = new mongoose.Schema({
  noticeId:    { type: String, required: true, unique: true },
  orgId:       { type: String, required: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  createdBy:   { type: String, required: true },   // admin orgId or name

  // ── AUDIENCE ──────────────────────────────────────
  audience: {
    type: String,
    enum: ['teachers_only', 'teachers_and_students'],
    required: true
  },

  // Only used when audience = 'teachers_and_students'
  targetScope: {
    type: String,
    enum: ['all_classes', 'selected_classes'],
    default: null
  },

  // Populated when targetScope = 'selected_classes'
  targetClassIds: [{ type: String }],

  attachments: [
    {
      url:      { type: String },
      publicId: { type: String },
      type:     { type: String, enum: ['image', 'pdf'] }
    }
  ],

  expiresAt: { type: Date, default: null }   // optional expiry

}, { timestamps: true });

module.exports = mongoose.model('AdminNotice', adminNoticeSchema);