const mongoose = require('mongoose');
const nammasambramaConn = require('../config/nammasambrama_db');

const NammaSambramaGallerySettingsSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NammaSambramaAdmin',
    required: true,
    unique: true
  },
  enableGallery: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const NammaSambramaGalleryItemSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NammaSambramaAdmin',
    required: true
  },
  type: {
    type: String,
    enum: ['photo', 'video'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  imageUrl: {
    type: String,
    default: ''
  },
  imageId: {
    type: String,
    default: ''
  },
  youtubeUrl: {
    type: String,
    default: ''
  },
  youtubeId: {
    type: String,
    default: ''
  },
  eventType: {
    type: String,
    default: 'General',
    trim: true
  },
  showInPublic: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

const NammaSambramaGallerySettings = nammasambramaConn.model(
  'NammaSambramaGallerySettings',
  NammaSambramaGallerySettingsSchema,
  'nammasambramagallerysettings'
);

const NammaSambramaGalleryItem = nammasambramaConn.model(
  'NammaSambramaGalleryItem',
  NammaSambramaGalleryItemSchema,
  'nammasambramagalleryitems'
);

module.exports = {
  NammaSambramaGallerySettings,
  NammaSambramaGalleryItem
};
