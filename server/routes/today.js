const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { optionalAuth } = require('../middleware/auth');
const campusConfig = require('../campusConfig');

function parseTimeMinutes(timeStr) {
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function formatYMD(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// GET /api/today
router.get('/', optionalAuth, (req, res) => {
  try {
    const todayStr = formatYMD(new Date());

    // 1. Next upcoming event
    const nextEvent = db.prepare(`
      SELECT e.*,
        (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id) AS registration_count
      FROM events e
      WHERE e.event_date >= ?
      ORDER BY e.event_date ASC, e.event_time ASC
      LIMIT 1
    `).get(todayStr);

    // 2. Canteen crowd level
    const votes = db.prepare(`
      SELECT level, COUNT(*) as count
      FROM canteen_votes
      WHERE created_at >= datetime('now', '-30 minutes')
      GROUP BY level
    `).all();

    let low = 0, med = 0, high = 0;
    votes.forEach(v => {
      if (v.level === 'Low') low = v.count;
      if (v.level === 'Medium') med = v.count;
      if (v.level === 'High') high = v.count;
    });
    const totalVotes = low + med + high;

    let crowdLevel = 'Low';
    let waitTime = '5 - 10 mins';

    if (totalVotes > 0) {
      const avg = ((low * 1) + (med * 2) + (high * 3)) / totalVotes;
      if (avg > 2.2) {
        crowdLevel = 'High';
        waitTime = '25 - 35 mins';
      } else if (avg > 1.4) {
        crowdLevel = 'Medium';
        waitTime = '12 - 20 mins';
      }
    } else {
      const hr = new Date().getHours();
      if ((hr >= 12 && hr <= 14) || (hr >= 17 && hr <= 18)) {
        crowdLevel = 'Medium';
        waitTime = '15 - 20 mins';
      }
    }

    // 3. Next bus
    const routes = db.prepare('SELECT * FROM bus_routes ORDER BY id ASC').all();
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let closestBus = null;
    let minDiff = Infinity;

    for (const route of routes) {
      const times = route.timings.split(',').map(t => t.trim());
      for (const t of times) {
        const m = parseTimeMinutes(t);
        const diff = m - currentMinutes;
        if (diff >= 0 && diff < minDiff) {
          minDiff = diff;
          closestBus = {
            route_number: route.route_number,
            destination: route.destination,
            time: t,
            pickup_point: route.pickup_point,
            minutesAway: diff
          };
        }
      }
    }

    if (!closestBus && routes.length > 0) {
      const firstRoute = routes[0];
      const firstTime = firstRoute.timings.split(',')[0].trim();
      closestBus = {
        route_number: firstRoute.route_number,
        destination: firstRoute.destination,
        time: `${firstTime} (Tomorrow)`,
        pickup_point: firstRoute.pickup_point,
        minutesAway: null
      };
    }

    // 4. Open issues count for current user
    let myOpenIssuesCount = 0;
    if (req.user) {
      myOpenIssuesCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM issues
        WHERE user_id = ? AND status != 'Resolved'
      `).get(req.user.id).count;
    }

    return res.json({
      success: true,
      data: {
        college: {
          name: campusConfig.collegeName,
          shortName: campusConfig.shortName,
          tagline: campusConfig.tagline
        },
        nextEvent: nextEvent || null,
        canteen: {
          level: crowdLevel,
          waitTime: waitTime,
          totalVotes
        },
        nextBus: closestBus,
        myOpenIssuesCount: myOpenIssuesCount,
        isLoggedIn: Boolean(req.user)
      }
    });
  } catch (err) {
    console.error('Error fetching today summary:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch today feed.' });
  }
});

module.exports = router;
