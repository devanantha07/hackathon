require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const { initDb } = require('./db');

// Initialize Database schema and auto-seed if needed
initDb();

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/places', require('./routes/places'));
app.use('/api/events', require('./routes/events'));
app.use('/api/issues', require('./routes/issues'));
app.use('/api/lostfound', require('./routes/lostfound'));
app.use('/api/canteen', require('./routes/canteen'));
app.use('/api/bus', require('./routes/bus'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/search', require('./routes/search'));
app.use('/api/today', require('./routes/today'));

// College config info endpoint
const campusConfig = require('./campusConfig');
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    data: campusConfig
  });
});

// Single Page Application fallback - Send index.html for unknown web paths
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    const indexPath = path.join(__dirname, '..', 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    } else {
      return res.send('Campus Companion API is running. Public frontend loading...');
    }
  }
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, error: 'API endpoint not found.' });
  }
  next();
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'File size exceeds limit of 5MB.' });
    }
    return res.status(400).json({ success: false, error: err.message });
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'An unexpected internal server error occurred.'
  });
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` Campus Companion server running on port ${PORT}`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`===============================================`);
});

module.exports = app;
