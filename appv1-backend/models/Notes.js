const mongoose = require('mongoose');

const notesSchema = new mongoose.Schema({
  notesId: { type: String, required: true, unique: true },
  title: { type: String, required: true, trim: true },
  notesSharedBy: { type: String, required: true, trim: true }, // teacher name
  classId: { type: String, required: true },
  orgId: { type: String, required: true },
  attachments: [
    {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
      type: { type: String, enum: ['image', 'pdf'], required: true },
      filename: { type: String }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Notes', notesSchema);
