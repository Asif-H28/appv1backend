const mongoose = require('mongoose');
const webappConn = require('../config/webapp_db');

const AppVersionSchema = new mongoose.Schema({
  downloadUrl: {
    type: String,
    required: true,
    trim: true
  },
  version: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  deployedDate: {
    type: Date,
    default: Date.now
  },
  lastUpdatedDate: {
    type: Date,
    default: Date.now
  },
  isLatest: {
    type: Boolean,
    default: true
  },
  notes: String
});

module.exports = webappConn.model('AppVersion', AppVersionSchema);
