const mongoose = require('mongoose');
const webappConn = require('../config/webapp_db');

const SuperAdminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Use the webapp connection to create the model
module.exports = webappConn.model('SuperAdmin', SuperAdminSchema);
