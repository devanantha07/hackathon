const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { optionalAuth, requireAuth, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const campusConfig = require('../campusConfig');

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

// GET /api/issues
router.get('/', optionalAuth, (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;

    const issues = db.prepare(`
      SELECT 
        i.*,
        u.name AS reporter_name,
        (SELECT COUNT(*) FROM issue_votes iv WHERE iv.issue_id = i.id) AS upvotes,
        CASE
          WHEN ? IS NOT NULL AND EXISTS (
            SELECT 1 FROM issue_votes iv WHERE iv.issue_id = i.id AND iv.user_id = ?
          ) THEN 1
          ELSE 0
        END AS has_voted
      FROM issues i
      LEFT JOIN users u ON i.user_id = u.id
      ORDER BY upvotes DESC, i.created_at DESC
    `).all(userId, userId);

    const formatted = issues.map(iss => ({
      ...iss,
      has_voted: Boolean(iss.has_voted),
      relative_created: getRelativeTime(iss.created_at),
      relative_updated: getRelativeTime(iss.updated_at)
    }));

    return res.json({
      success: true,
      data: formatted
    });
  } catch (err) {
    console.error('Error fetching issues:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch issues.' });
  }
});

// GET /api/issues/mine (must be defined before /:id routes)
router.get('/mine', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;

    const issues = db.prepare(`
      SELECT 
        i.*,
        u.name AS reporter_name,
        (SELECT COUNT(*) FROM issue_votes iv WHERE iv.issue_id = i.id) AS upvotes,
        1 AS has_voted
      FROM issues i
      LEFT JOIN users u ON i.user_id = u.id
      WHERE i.user_id = ?
      ORDER BY i.created_at DESC
    `).all(userId);

    const formatted = issues.map(iss => ({
      ...iss,
      has_voted: true,
      relative_created: getRelativeTime(iss.created_at),
      relative_updated: getRelativeTime(iss.updated_at)
    }));

    return res.json({
      success: true,
      data: formatted
    });
  } catch (err) {
    console.error('Error fetching user issues:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch your reports.' });
  }
});

// POST /api/issues (multipart with optional photo)
router.post('/', requireAuth, upload.single('photo'), (req, res) => {
  try {
    const { block, category, description } = req.body;

    if (!block || !block.trim()) {
      return res.status(400).json({ success: false, error: 'Campus block/building is required.' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ success: false, error: 'Issue category is required.' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, error: 'Issue description is required.' });
    }

    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const result = db.prepare(`
      INSERT INTO issues (block, category, description, photo_url, status, user_id)
      VALUES (?, ?, ?, ?, 'Reported', ?)
    `).run(block.trim(), category.trim().toLowerCase(), description.trim(), photoUrl, req.user.id);

    const newIssue = db.prepare(`
      SELECT i.*, u.name AS reporter_name, 0 AS upvotes, 0 AS has_voted
      FROM issues i
      LEFT JOIN users u ON i.user_id = u.id
      WHERE i.id = ?
    `).get(result.lastInsertRowid);

    newIssue.relative_created = 'just now';
    newIssue.relative_updated = 'just now';
    newIssue.has_voted = false;

    return res.status(201).json({
      success: true,
      data: newIssue
    });
  } catch (err) {
    console.error('Error creating issue:', err);
    return res.status(500).json({ success: false, error: 'Failed to report issue.' });
  }
});

// POST /api/issues/:id/upvote
router.post('/:id/upvote', requireAuth, (req, res) => {
  try {
    const issueId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    const issue = db.prepare('SELECT id FROM issues WHERE id = ?').get(issueId);
    if (!issue) {
      return res.status(404).json({ success: false, error: 'Issue not found.' });
    }

    const existingVote = db.prepare(
      'SELECT id FROM issue_votes WHERE issue_id = ? AND user_id = ?'
    ).get(issueId, userId);

    if (existingVote) {
      return res.status(400).json({
        success: false,
        error: 'You have already upvoted this issue (+1 per user).'
      });
    }

    db.prepare('INSERT INTO issue_votes (issue_id, user_id) VALUES (?, ?)').run(issueId, userId);

    const upvotes = db.prepare('SELECT COUNT(*) as count FROM issue_votes WHERE issue_id = ?').get(issueId).count;

    return res.json({
      success: true,
      data: {
        issueId,
        upvotes,
        has_voted: true,
        message: 'Upvote recorded successfully!'
      }
    });
  } catch (err) {
    console.error('Error upvoting issue:', err);
    return res.status(500).json({ success: false, error: 'Failed to record upvote.' });
  }
});

// PATCH /api/issues/:id/status (admin)
router.patch('/:id/status', requireAdmin, (req, res) => {
  try {
    const issueId = parseInt(req.params.id, 10);
    const { status } = req.body;

    const allowed = ['Reported', 'In Progress', 'Resolved'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Allowed values: ${allowed.join(', ')}`
      });
    }

    const issue = db.prepare('SELECT id FROM issues WHERE id = ?').get(issueId);
    if (!issue) {
      return res.status(404).json({ success: false, error: 'Issue not found.' });
    }

    db.prepare(`
      UPDATE issues
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, issueId);

    const updated = db.prepare(`
      SELECT i.*, u.name AS reporter_name,
        (SELECT COUNT(*) FROM issue_votes iv WHERE iv.issue_id = i.id) AS upvotes
      FROM issues i
      LEFT JOIN users u ON i.user_id = u.id
      WHERE i.id = ?
    `).get(issueId);

    updated.relative_created = getRelativeTime(updated.created_at);
    updated.relative_updated = 'just now';

    return res.json({
      success: true,
      data: updated
    });
  } catch (err) {
    console.error('Error updating issue status:', err);
    return res.status(500).json({ success: false, error: 'Failed to update issue status.' });
  }
});

module.exports = router;
