const mongoose = require('mongoose');

// Connection URI for the 'nammasambrama' database
// We use the same base URI but change the database name to 'nammasambrama'
const baseUri = process.env.MONGODB_URI.split('?')[0];
const nammasambramaUri = baseUri.substring(0, baseUri.lastIndexOf('/') + 1) + 'nammasambrama' + (process.env.MONGODB_URI.includes('?') ? '?' + process.env.MONGODB_URI.split('?')[1] : '');

const nammasambramaConn = mongoose.createConnection(nammasambramaUri, {
  serverSelectionTimeoutMS: 30000
});

nammasambramaConn.on('connected', () => {
  console.log('✅ Connected to NammaSambrama Database');
});

nammasambramaConn.on('error', (err) => {
  console.error('❌ NammaSambrama Database Connection Error:', err);
});

module.exports = nammasambramaConn;
