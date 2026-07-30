const mongoose = require('mongoose');
const nammasambramaConn = require('../config/nammasambrama_db');

// Mirrors the `Line` type on the frontend
const LineSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, default: '' }
}, { _id: false });

const NammaSambramaEventSchema = new mongoose.Schema({
  eventType: { type: String, required: true, trim: true },
  eventTitle: { type: String, default: '', trim: true },
  eventDescription: { type: String, default: '' },
  eventIcon: { type: String, default: '' },
  // Azure Blob URL
  eventImage: { type: String, default: '' },
  eventImageId: { type: String, default: '' },
  eventVideo: { type: String, default: '' },
  foodMenu: { type: [LineSchema], default: [] },
  eventDesign: { type: [LineSchema], default: [] },
  createdBy: { type: String, default: '' }
}, { timestamps: true });

module.exports = nammasambramaConn.model('NammaSambramaEvent', NammaSambramaEventSchema, 'nammasambramaevents');
