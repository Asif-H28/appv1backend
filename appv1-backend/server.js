require('dotenv').config();
const express = require('express');
const serverless = require('serverless-http');
require('./config/firebase');   // ← ADD THIS at top
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// ✅ Trust Render's reverse proxy — required for express-rate-limit to work correctly
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection Caching for Serverless
let isConnected;
const connectDB = async () => {
  if (isConnected) return;
  const db = await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000
  });
  isConnected = db.connections[0].readyState;
  console.log('✅ MongoDB Connected Successfully');
};

// Middleware to ensure DB is connected before processing requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    res.status(500).json({ error: "Database connection failed" });
  }
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
    if (mongoose.connection.readyState !== 1) {
      return res.json({ 
        status: 'connecting', 
        readyState: mongoose.connection.readyState,
        message: 'MongoDB still connecting...'
      });
    }
    
    await mongoose.connection.db.admin().ping();
    res.json({ 
      status: 'success', 
      db: 'Connected!',
      readyState: mongoose.connection.readyState,
      collections: (await mongoose.connection.db.listCollections().toArray()).map(c => c.name)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Auth routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/auth', require('./routes/authForgotPassword')); // ← forgot-password / verify-otp / reset-password

app.use('/api/org', require('./routes/org'));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/org', require('./routes/org'));
app.use('/api/teacher', require('./routes/teacher'));   // ← ADD THIS


app.use('/api/auth', require('./routes/auth'));
app.use('/api/org', require('./routes/org'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/classroom', require('./routes/classroom'));  // ← ADD THIS

app.use('/api/auth', require('./routes/auth'));
app.use('/api/org', require('./routes/org'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/classroom', require('./routes/classroom'));
app.use('/api/upload', require('./routes/upload'));   // ← ADD THIS

app.use('/api/notice', require('./routes/notice'));  // ← ADD THIS

app.use('/api/notes', require('./routes/notes'));  // ← ADD THIS

app.use('/api/test', require('./routes/test'));  // ← ADD THIS


app.use('/api/attendance', require('./routes/attendance'));  // ← ADD THIS

app.use('/api/timetable', require('./routes/timetable'));  // ← ADD THIS

app.use('/api/student', require('./routes/student'));
app.use('/api/join', require('./routes/classJoin'));


app.use('/api/notification', require('./routes/notification'));
const leaveRoutes = require('./routes/leave');  // ← ADD THIS
app.use('/api/leave', leaveRoutes);

const achievementRoutes = require('./routes/achievement');
app.use('/api/achievement', achievementRoutes);

const adminNoticeRoutes = require('./routes/adminNoticeRoutes');
app.use('/api/admin-notices', adminNoticeRoutes);

app.use('/api/org/school', require('./routes/school.routes'));
app.use('/api/comprehensive-assessment', require('./routes/comprehensiveAssessmentRoutes'));
app.use('/api/comprehensive-result', require('./routes/comprehensiveResultRoutes'));


// 404 handler (FIXED syntax)
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

if (process.env.NODE_ENV !== 'lambda') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Test: http://localhost:${PORT}/`);
    console.log(`🔍 DB Test: http://localhost:${PORT}/test-db`);
  });
}

module.exports.handler = serverless(app);
