const mongoose = require('mongoose');
const nammasambramaConn = require('../config/nammasambrama_db');

// Mirrors the `EnquiryItem` type on the frontend
const EnquiryItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  isCustom: { type: Boolean, default: false }
}, { _id: false });

const NammaSambramaEnquirySchema = new mongoose.Schema({
  eventLabel: { type: String, default: '', trim: true },
  isCustomEvent: { type: Boolean, default: false },
  eventTypeId: { type: String, default: '' },
  items: { type: [EnquiryItemSchema], default: [] },
  contactName: { type: String, required: true, trim: true },
  contactPhone: { type: String, required: true, trim: true },
  guestCount: { type: String, default: '' },
  eventDate: { type: String, default: '' },
  eventTime: { type: String, default: '' },
  contactNotes: { type: String, default: '' },
  status: {
    type: String,
    enum: ['new', 'contacted', 'closed'],
    default: 'new',
    index: true
  }
}, { timestamps: true });

module.exports = nammasambramaConn.model('NammaSambramaEnquiry', NammaSambramaEnquirySchema, 'nammasambramaenquiries');
