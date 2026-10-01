const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { optionalAuth, requireAuth, requireAdmin } = require('../middleware/auth');

function formatYMD(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getGroupTag(eventDateStr) {
  const now = new Date();
  const todayStr = formatYMD(now);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = formatYMD(tomorrow);

  if (eventDateStr === todayStr) return 'Today';
  if (eventDateStr === tomorrowStr) return 'Tomorrow';
  if (eventDateStr > tomorrowStr) return 'Later';
  return 'Past';
}

// GET /api/events
router.get('/', optionalAuth, (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;

    const events = db.prepare(`
      SELECT e.*,
        (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id) AS registration_count,
        CASE
          WHEN ? IS NOT NULL AND EXISTS (
            SELECT 1 FROM event_registrations er WHERE er.event_id = e.id AND er.user_id = ?
          ) THEN 1
          ELSE 0
        END AS is_registered
      FROM events e
      ORDER BY e.event_date ASC, e.event_time ASC
    `).all(userId, userId);

    const enriched = events.map(ev => ({
      ...ev,
      is_registered: Boolean(ev.is_registered),
      group_tag: getGroupTag(ev.event_date)
    }));

    return res.json({
      success: true,
      data: enriched
    });
  } catch (err) {
    console.error('Error fetching events:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch campus events.' });
  }
});

// POST /api/events (admin)
router.post('/', requireAdmin, (req, res) => {
  try {
    const { title, category, location, event_date, event_time, description } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Event title is required.' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, error: 'Event category is required.' });
    }
    if (!location || !location.trim()) {
      return res.status(400).json({ success: false, error: 'Event location is required.' });
    }
    if (!event_date || !event_date.trim()) {
      return res.status(400).json({ success: false, error: 'Event date is required (YYYY-MM-DD).' });
    }
    if (!event_time || !event_time.trim()) {
      return res.status(400).json({ success: false, error: 'Event time is required.' });
    }

    const result = db.prepare(`
      INSERT INTO events (title, category, location, event_date, event_time, description, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      title.trim(),
      category.trim(),
      location.trim(),
      event_date.trim(),
      event_time.trim(),
      description ? description.trim() : '',
      req.user.id
    );

    const newEvent = db.prepare(`
      SELECT e.*, 0 AS registration_count, 0 AS is_registered
      FROM events e WHERE e.id = ?
    `).get(result.lastInsertRowid);

    newEvent.is_registered = false;
    newEvent.group_tag = getGroupTag(newEvent.event_date);

    return res.status(201).json({
      success: true,
      data: newEvent
    });
  } catch (err) {
    console.error('Error creating event:', err);
    return res.status(500).json({ success: false, error: 'Failed to create event.' });
  }
});

// DELETE /api/events/:id (admin)
router.delete('/:id', requireAdmin, (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    const existing = db.prepare('SELECT id FROM events WHERE id = ?').get(eventId);

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Event not found.' });
    }

    db.prepare('DELETE FROM events WHERE id = ?').run(eventId);

    return res.json({
      success: true,
      data: { message: 'Event successfully deleted.' }
    });
  } catch (err) {
    console.error('Error deleting event:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete event.' });
  }
});

// POST /api/events/:id/register
router.post('/:id/register', requireAuth, (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found.' });
    }

    const alreadyRegistered = db.prepare(
      'SELECT id FROM event_registrations WHERE event_id = ? AND user_id = ?'
    ).get(eventId, userId);

    if (alreadyRegistered) {
      return res.status(400).json({
        success: false,
        error: 'You have already registered for this event.'
      });
    }

    db.prepare('INSERT INTO event_registrations (event_id, user_id) VALUES (?, ?)').run(eventId, userId);

    const count = db.prepare('SELECT COUNT(*) as count FROM event_registrations WHERE event_id = ?').get(eventId).count;

    return res.json({
      success: true,
      data: {
        eventId,
        registration_count: count,
        is_registered: true,
        message: 'Successfully registered for event!'
      }
    });
  } catch (err) {
    console.error('Error registering for event:', err);
    return res.status(500).json({ success: false, error: 'Failed to register for event.' });
  }
});

module.exports = router;
