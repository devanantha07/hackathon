const express = require('express');
const router = express.Router();
const { db } = require('../db');

// GET /api/contacts
router.get('/', (req, res) => {
  try {
    const contacts = db.prepare('SELECT * FROM emergency_contacts ORDER BY id ASC').all();
    return res.json({
      success: true,
      data: contacts
    });
  } catch (err) {
    console.error('Error fetching emergency contacts:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch emergency contacts.' });
  }
});

module.exports = router;
