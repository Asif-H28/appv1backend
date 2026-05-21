require('dotenv').config();

// --- STARTUP ENV CHECK ---
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'GROQ_API_KEY'];
console.log('--- Checking Environment Variables ---');
requiredEnvVars.forEach(key => {
  if (!process.env[key]) {
    console.error(`❌ MISSING: ${key}`);
  } else {
    console.log(`✅ ${key} loaded (Length: ${process.env[key].length})`);
  }
});
console.log('--------------------------------------');

const express = require('express');
require('./config/firebase');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

require('./sockets/chatSocket')(io);
require('./sockets/notificationSocket').init(io);

// Attach io to request for use in routes if needed
app.set('io', io);

// ✅ Trust Render's reverse proxy
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
    message: 'Appv1 Backend Running with Socket.IO!', 
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
app.use('/api/auth', require('./routes/authForgotPassword'));

// Org routes (Public creation/login)
app.use('/api/org', require('./routes/org'));
app.use('/api/org/school', require('./routes/school.routes'));

// Teacher routes
app.use('/api/teacher', require('./routes/teacher'));

// Classroom routes
app.use('/api/classroom', require('./routes/classroom'));

// Student routes
app.use('/api/student', require('./routes/student'));

// Chat routes
app.use('/api/chat', require('./routes/chat'));

// Feature routes
app.use('/api/upload', require('./routes/upload'));
app.use('/api/notice', require('./routes/notice'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/test', require('./routes/test'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/timetable', require('./routes/timetable'));
app.use('/api/join', require('./routes/classJoin'));
app.use('/api/notification', require('./routes/notification'));
app.use('/api/notification-studio', require('./routes/notificationStudio'));
app.use('/api/leave', require('./routes/leave'));
app.use('/api/achievement', require('./routes/achievement'));
app.use('/api/admin-notices', require('./routes/adminNoticeRoutes'));
app.use('/api/comprehensive-assessment', require('./routes/comprehensiveAssessmentRoutes'));
app.use('/api/comprehensive-result', require('./routes/comprehensiveResultRoutes'));

// Super Admin Authentication Routes (isolated to 'webapp' DB)
app.use('/api/super-admin/app', require('./routes/superAdminApp'));
app.use('/api/super-admin', require('./routes/superAdminAuth'));

// License Key Request Routes
app.use('/api/license-request', require('./routes/licenseRequestRoutes'));

// Quiz Routes
app.use('/api/quiz', require('./routes/quiz'));

// Transport Routes
app.use('/api/transport', require('./routes/transport'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Vercel Support
let handler;
if (process.env.VERCEL) {
  const serverless = require('serverless-http');
  handler = serverless(app);
  module.exports = app;
} else {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
  module.exports = { app, server, io };
}
