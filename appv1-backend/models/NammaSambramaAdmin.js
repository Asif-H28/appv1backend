const mongoose = require('mongoose');
const nammasambramaConn = require('../config/nammasambrama_db');

const NammaSambramaAdminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Use the nammasambrama connection to create the model
module.exports = nammasambramaConn.model('NammaSambramaAdmin', NammaSambramaAdminSchema, 'nammasambramaadmins');
