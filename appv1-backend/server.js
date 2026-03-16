const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection (FIXED - modern Mongoose)
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000
})
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err.message);
});

// Test routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Appv1 Backend Running!', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Test DB connection
app.get('/test-db', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({ 
      status: 'success', 
      db: 'Connected!',
      model: mongoose.connection.readyState === 1 ? 'Ready' : 'Not Ready'
    });
  } catch (err) {
    res.status(500).json({ error: 'DB not connected', details: err.message });
  }
});

// Auth routes
app.use('/api/auth', require('./routes/auth'));

// 404 handler (FIXED syntax)
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Test: http://localhost:${PORT}/`);
  console.log(`🔍 DB Test: http://localhost:${PORT}/test-db`);
});
