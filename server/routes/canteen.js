const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

function computeCrowdLevel() {
  const votes = db.prepare(`
    SELECT level, COUNT(*) as count
    FROM canteen_votes
    WHERE created_at >= datetime('now', '-30 minutes')
    GROUP BY level
  `).all();

  let lowVotes = 0;
  let medVotes = 0;
  let highVotes = 0;

  votes.forEach(v => {
    if (v.level === 'Low') lowVotes = v.count;
    if (v.level === 'Medium') medVotes = v.count;
    if (v.level === 'High') highVotes = v.count;
  });

  const totalVotes = lowVotes + medVotes + highVotes;

  if (totalVotes === 0) {
    // Fallback based on time of day
    const currentHour = new Date().getHours();
    let defaultLevel = 'Low';
    let waitTime = '5 - 10 mins';

    if (currentHour >= 12 && currentHour <= 14) {
      defaultLevel = 'Medium';
      waitTime = '15 - 20 mins';
    } else if (currentHour >= 17 && currentHour <= 18) {
      defaultLevel = 'Medium';
      waitTime = '15 - 20 mins';
    }

    return {
      level: defaultLevel,
      waitTime: waitTime,
      totalVotes: 0,
      breakdown: { low: 0, medium: 0, high: 0 },
      isEstimated: true,
      lastUpdated: 'Live estimate'
    };
  }

  // Weight scores: Low = 1, Medium = 2, High = 3
  const weightedSum = (lowVotes * 1) + (medVotes * 2) + (highVotes * 3);
  const avg = weightedSum / totalVotes;

  let computedLevel = 'Low';
  let waitTime = '5 - 10 mins';

  if (avg > 2.2) {
    computedLevel = 'High';
    waitTime = '25 - 35 mins';
  } else if (avg > 1.4) {
    computedLevel = 'Medium';
    waitTime = '12 - 20 mins';
  }

  return {
    level: computedLevel,
    waitTime: waitTime,
    totalVotes: totalVotes,
    breakdown: {
      low: lowVotes,
      medium: medVotes,
      high: highVotes
    },
    isEstimated: false,
    lastUpdated: 'Updated in last 30m'
  };
}

// GET /api/canteen/menu
router.get('/menu', (req, res) => {
  try {
    const menu = db.prepare('SELECT * FROM canteen_menu ORDER BY id ASC').all();
    return res.json({
      success: true,
      data: menu
    });
  } catch (err) {
    console.error('Error fetching canteen menu:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch canteen menu.' });
  }
});

// PATCH /api/canteen/menu/:id (admin)
router.patch('/menu/:id', requireAdmin, (req, res) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    const { available, price, item, category } = req.body;

    const existing = db.prepare('SELECT * FROM canteen_menu WHERE id = ?').get(itemId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Menu item not found.' });
    }

    const newAvailable = available !== undefined ? (available ? 1 : 0) : existing.available;
    const newPrice = price !== undefined ? parseFloat(price) : existing.price;
    const newItem = item !== undefined ? item.trim() : existing.item;
    const newCategory = category !== undefined ? category.trim() : existing.category;

    db.prepare(`
      UPDATE canteen_menu
      SET available = ?, price = ?, item = ?, category = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newAvailable, newPrice, newItem, newCategory, itemId);

    const updated = db.prepare('SELECT * FROM canteen_menu WHERE id = ?').get(itemId);

    return res.json({
      success: true,
      data: updated
    });
  } catch (err) {
    console.error('Error updating menu item:', err);
    return res.status(500).json({ success: false, error: 'Failed to update menu item.' });
  }
});

// GET /api/canteen/crowd
router.get('/crowd', (req, res) => {
  try {
    const crowdInfo = computeCrowdLevel();
    return res.json({
      success: true,
      data: crowdInfo
    });
  } catch (err) {
    console.error('Error computing crowd level:', err);
    return res.status(500).json({ success: false, error: 'Failed to get canteen crowd level.' });
  }
});

// POST /api/canteen/crowd
router.post('/crowd', requireAuth, (req, res) => {
  try {
    const { level } = req.body;
    const allowed = ['Low', 'Medium', 'High'];

    if (!level || !allowed.includes(level)) {
      return res.status(400).json({
        success: false,
        error: `Crowd level must be one of: ${allowed.join(', ')}`
      });
    }

    db.prepare(`
      INSERT INTO canteen_votes (user_id, level)
      VALUES (?, ?)
    `).run(req.user.id, level);

    const crowdInfo = computeCrowdLevel();

    return res.json({
      success: true,
      data: {
        ...crowdInfo,
        message: `Thanks for voting! Marked canteen as ${level}.`
      }
    });
  } catch (err) {
    console.error('Error recording crowd vote:', err);
    return res.status(500).json({ success: false, error: 'Failed to record crowd vote.' });
  }
});

module.exports = router;
