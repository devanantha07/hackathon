const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

function getRelativeTime(timestamp) {
  if (!timestamp) return 'recently';
  const dateUtc = new Date(timestamp + ' UTC');
  const now = new Date();
  const diffSec = Math.floor((now - dateUtc) / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

// GET /api/lostfound
router.get('/', optionalAuth, (req, res) => {
  try {
    const { type, category, q } = req.query;

    let sql = `
      SELECT lf.*, u.name AS reporter_name
      FROM lost_found lf
      LEFT JOIN users u ON lf.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (type && (type === 'Lost' || type === 'Found')) {
      sql += ' AND lf.type = ?';
      params.push(type);
    }

    if (category && category.trim()) {
      sql += ' AND LOWER(lf.category) = LOWER(?)';
      params.push(category.trim());
    }

    if (q && q.trim()) {
      sql += ' AND (lf.title LIKE ? OR lf.description LIKE ? OR lf.location LIKE ?)';
      const term = `%${q.trim()}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY lf.created_at DESC';

    const items = db.prepare(sql).all(...params);

    const formatted = items.map(item => ({
      ...item,
      relative_created: getRelativeTime(item.created_at),
      is_owner: req.user ? (req.user.id === item.user_id || req.user.role === 'admin') : false
    }));

    return res.json({
      success: true,
      data: formatted
    });
  } catch (err) {
    console.error('Error fetching lost and found:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch lost & found items.' });
  }
});

// POST /api/lostfound (multipart)
router.post('/', requireAuth, upload.single('photo'), (req, res) => {
  try {
    const { type, title, category, description, location, contact_info } = req.body;

    if (!type || !['Lost', 'Found'].includes(type)) {
      return res.status(400).json({ success: false, error: "Type must be either 'Lost' or 'Found'." });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Item title is required.' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, error: 'Category is required.' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, error: 'Description is required.' });
    }
    if (!location || !location.trim()) {
      return res.status(400).json({ success: false, error: 'Location where lost/found is required.' });
    }
    if (!contact_info || !contact_info.trim()) {
      return res.status(400).json({ success: false, error: 'Contact info (phone or email) is required.' });
    }

    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const result = db.prepare(`
      INSERT INTO lost_found (type, title, category, description, location, photo_url, contact_info, status, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Open', ?)
    `).run(
      type,
      title.trim(),
      category.trim(),
      description.trim(),
      location.trim(),
      photoUrl,
      contact_info.trim(),
      req.user.id
    );

    const newItem = db.prepare(`
      SELECT lf.*, u.name AS reporter_name
      FROM lost_found lf
      LEFT JOIN users u ON lf.user_id = u.id
      WHERE lf.id = ?
    `).get(result.lastInsertRowid);

    newItem.relative_created = 'just now';
    newItem.is_owner = true;

    return res.status(201).json({
      success: true,
      data: newItem
    });
  } catch (err) {
    console.error('Error posting lost/found item:', err);
    return res.status(500).json({ success: false, error: 'Failed to post lost & found item.' });
  }
});

// PATCH /api/lostfound/:id/resolve
router.patch('/:id/resolve', requireAuth, (req, res) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    const item = db.prepare('SELECT * FROM lost_found WHERE id = ?').get(itemId);

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found.' });
    }

    if (item.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only the poster or an administrator can mark this item as resolved.'
      });
    }

    db.prepare(`
      UPDATE lost_found
      SET status = 'Returned / Claimed'
      WHERE id = ?
    `).run(itemId);

    const updated = db.prepare(`
      SELECT lf.*, u.name AS reporter_name
      FROM lost_found lf
      LEFT JOIN users u ON lf.user_id = u.id
      WHERE lf.id = ?
    `).get(itemId);

    updated.relative_created = getRelativeTime(updated.created_at);
    updated.is_owner = true;

    return res.json({
      success: true,
      data: updated
    });
  } catch (err) {
    console.error('Error resolving lost/found item:', err);
    return res.status(500).json({ success: false, error: 'Failed to resolve item.' });
  }
});

module.exports = router;
