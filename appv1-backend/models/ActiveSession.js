const mongoose = require('mongoose');

const activeSessionSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true, 
    unique: true // Ensures only one active session per user ID
  },
  sessionToken: { 
    type: String, 
    required: true 
  }
}, { timestamps: true });

module.exports = mongoose.model('ActiveSession', activeSessionSchema);
