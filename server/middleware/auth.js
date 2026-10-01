const jwt = require('jsonwebtoken');
const { db } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-campus-companion-jwt-key-2025';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
  let token = null;

  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      token = authHeader;
    }
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(decoded.id);
    req.user = user || null;
  } catch (err) {
    req.user = null;
  }
  next();
}

function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['x-auth-token'];
  let token = null;

  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      token = authHeader;
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User no longer exists.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session token. Please log in again.' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied. Administrator privileges required.' });
    }
    next();
  });
}

module.exports = {
  JWT_SECRET,
  generateToken,
  optionalAuth,
  requireAuth,
  requireAdmin
};
