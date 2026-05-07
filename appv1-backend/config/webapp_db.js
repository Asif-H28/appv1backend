const mongoose = require('mongoose');

// Connection URI for the 'webapp' database
// We use the same base URI but change the database name to 'webapp'
const baseUri = process.env.MONGODB_URI.split('?')[0];
const webappUri = baseUri.substring(0, baseUri.lastIndexOf('/') + 1) + 'webapp' + (process.env.MONGODB_URI.includes('?') ? '?' + process.env.MONGODB_URI.split('?')[1] : '');

const webappConn = mongoose.createConnection(webappUri, {
  serverSelectionTimeoutMS: 30000
});

webappConn.on('connected', () => {
  console.log('✅ Connected to WebApp Database');
});

webappConn.on('error', (err) => {
  console.error('❌ WebApp Database Connection Error:', err);
});

module.exports = webappConn;
