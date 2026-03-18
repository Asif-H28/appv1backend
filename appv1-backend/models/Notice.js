const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  noticeId: { type: String, required: true, unique: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  createdBy: { type: String, required: true, trim: true }, // teacher name
  classroomId: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attachments: [
    {
      url: { type: String },
      publicId: { type: String },
      type: { type: String, enum: ['image', 'pdf'] }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Notice', noticeSchema);
