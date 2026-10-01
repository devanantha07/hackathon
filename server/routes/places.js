const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

function getRelativeTime(timestamp) {
  if (!timestamp) return 'recently';
  // SQLite CURRENT_TIMESTAMP is UTC format 'YYYY-MM-DD HH:MM:SS'
  const dateUtc = new Date(timestamp + ' UTC');
  const now = new Date();
  const diffSec = Math.floor((now - dateUtc) / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays} d ago`;
}

// GET /api/places?type=
router.get('/', (req, res) => {
  try {
    const { type } = req.query;
    let places;

    if (type && type.trim()) {
      places = db.prepare(
        'SELECT * FROM places WHERE LOWER(type) = LOWER(?) ORDER BY id ASC'
      ).all(type.trim());
    } else {
      places = db.prepare('SELECT * FROM places ORDER BY type ASC, id ASC').all();
    }

    const enhanced = places.map(p => ({
      ...p,
      relative_updated: getRelativeTime(p.last_updated)
    }));

    return res.json({
      success: true,
      data: enhanced
    });
  } catch (err) {
    console.error('Error fetching places:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch campus places.' });
  }
});

// POST /api/places/:id/status
router.post('/:id/status', requireAuth, (req, res) => {
  try {
    const placeId = parseInt(req.params.id, 10);
    const { status } = req.body;

    const allowed = ['Available', 'Busy', 'Full'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${allowed.join(', ')}`
      });
    }

    const place = db.prepare('SELECT * FROM places WHERE id = ?').get(placeId);
    if (!place) {
      return res.status(404).json({ success: false, error: 'Place not found.' });
    }

    db.prepare(`
      UPDATE places
      SET status = ?, last_updated = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, placeId);

    const updated = db.prepare('SELECT * FROM places WHERE id = ?').get(placeId);
    updated.relative_updated = 'just now';

    return res.json({
      success: true,
      data: updated
    });
  } catch (err) {
    console.error('Error updating place status:', err);
    return res.status(500).json({ success: false, error: 'Failed to update place status.' });
  }
});

module.exports = router;
