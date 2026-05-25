const mongoose = require('mongoose');

const homeworkSchema = new mongoose.Schema({
  homeworkId: { type: String, required: true, unique: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  subject: { type: String, required: true, trim: true },
  subjectId: { type: String, required: true, trim: true },
  createdBy: { type: String, required: true, trim: true }, // teacherId or creator
  createdByName: { type: String, default: '' },
  deadline: { type: Date, required: true },
  orgId: { type: String, required: true },
  classId: { type: String, required: true },
  className: { type: String, required: true },
  attachments: [
    {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
      type: { type: String, enum: ['image', 'pdf'], required: true },
      filename: { type: String }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Homework', homeworkSchema);
