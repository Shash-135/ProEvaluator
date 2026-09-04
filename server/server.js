const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('passport');
require('dotenv').config();

const connectDB = require('./config/db');
const initPassport = require('./config/passport');
const { apiRateLimiter } = require('./middleware/rateLimiter');

// Import Route Handlers
const authRoutes = require('./routes/auth.routes');
const batchRoutes = require('./routes/batch.routes');
const teamRoutes = require('./routes/team.routes');
const joinRequestRoutes = require('./routes/joinRequest.routes');
const milestoneRoutes = require('./routes/milestone.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin');
const teacherRoutes = require('./routes/teacher');
const externalRoutes = require('./routes/external');
const studentRoutes = require('./routes/student');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Initialize Passport
initPassport();

// Core Express Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS Configuration
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all for development flexibility
      }
    },
    credentials: true
  })
);

app.use(passport.initialize());
app.use('/api/', apiRateLimiter);

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/external', externalRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/join-requests', joinRequestRoutes);
app.use('/api/milestones', milestoneRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'College Project Evaluation & Tracking System API',
    timestamp: new Date()
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.url}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`[Server] Express API server running on port ${PORT}`);
});

module.exports = app;
