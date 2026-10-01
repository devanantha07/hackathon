const express = require('express');
const router = express.Router();
const { db } = require('../db');

// GET /api/search?q=
router.get('/', (req, res) => {
  try {
    const q = req.query.q ? req.query.q.trim() : '';

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: {
          query: q,
          places: [],
          events: [],
          lost_found: [],
          totalResults: 0
        }
      });
    }

    const term = `%${q}%`;

    const places = db.prepare(`
      SELECT id, name, type, building, floor, description, status, route_directions
      FROM places
      WHERE name LIKE ? OR description LIKE ? OR building LIKE ? OR type LIKE ?
      LIMIT 10
    `).all(term, term, term, term);

    const events = db.prepare(`
      SELECT id, title, category, location, event_date, event_time, description
      FROM events
      WHERE title LIKE ? OR description LIKE ? OR location LIKE ? OR category LIKE ?
      LIMIT 10
    `).all(term, term, term, term);

    const lostItems = db.prepare(`
      SELECT id, type, title, category, description, location, status, photo_url
      FROM lost_found
      WHERE title LIKE ? OR description LIKE ? OR location LIKE ? OR category LIKE ?
      LIMIT 10
    `).all(term, term, term, term);

    return res.json({
      success: true,
      data: {
        query: q,
        places,
        events,
        lost_found: lostItems,
        totalResults: places.length + events.length + lostItems.length
      }
    });
  } catch (err) {
    console.error('Error during search:', err);
    return res.status(500).json({ success: false, error: 'Failed to execute search.' });
  }
});

module.exports = router;
