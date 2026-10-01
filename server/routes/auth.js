const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { generateToken, requireAuth } = require('../middleware/auth');

// POST /api/auth/signup
router.post('/signup', (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Name is required.' });
    }
    if (!email || !email.trim() || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email address is required.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // Check existing
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
    ).run(cleanName, cleanEmail, hashedPassword, 'student');

    const newUser = {
      id: result.lastInsertRowid,
      name: cleanName,
      email: cleanEmail,
      role: 'student'
    };

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      data: {
        user: newUser,
        token
      }
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    const token = generateToken(safeUser);

    return res.json({
      success: true,
      data: {
        user: safeUser,
        token
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error during login.' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  return res.json({
    success: true,
    data: {
      user: req.user
    }
  });
});

module.exports = router;
