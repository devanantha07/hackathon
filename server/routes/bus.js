const express = require('express');
const router = express.Router();
const { db } = require('../db');

function parseTimeMinutes(timeStr) {
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

// GET /api/bus
router.get('/', (req, res) => {
  try {
    const routes = db.prepare('SELECT * FROM bus_routes ORDER BY id ASC').all();

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let closestBusOverall = null;
    let minDiffOverall = Infinity;

    const formattedRoutes = routes.map(route => {
      const timesList = route.timings.split(',').map(t => t.trim()).filter(Boolean);

      let nextTime = null;
      let isTomorrow = false;
      let smallestPositiveDiff = Infinity;

      for (const t of timesList) {
        const busMinutes = parseTimeMinutes(t);
        const diff = busMinutes - currentMinutes;

        if (diff >= 0 && diff < smallestPositiveDiff) {
          smallestPositiveDiff = diff;
          nextTime = t;
        }
      }

      // If all departures for today have passed, next bus is the first one tomorrow
      if (!nextTime && timesList.length > 0) {
        nextTime = timesList[0];
        isTomorrow = true;
      }

      const routeResult = {
        ...route,
        timesList,
        nextBus: nextTime,
        nextBusLabel: nextTime ? (isTomorrow ? `${nextTime} (Tomorrow)` : nextTime) : 'N/A',
        isTomorrow
      };

      if (!isTomorrow && smallestPositiveDiff < minDiffOverall) {
        minDiffOverall = smallestPositiveDiff;
        closestBusOverall = {
          route_number: route.route_number,
          destination: route.destination,
          time: nextTime,
          pickup_point: route.pickup_point,
          minutesAway: smallestPositiveDiff
        };
      }

      return routeResult;
    });

    return res.json({
      success: true,
      data: {
        routes: formattedRoutes,
        nextUpcomingBus: closestBusOverall || (formattedRoutes[0] ? {
          route_number: formattedRoutes[0].route_number,
          destination: formattedRoutes[0].destination,
          time: formattedRoutes[0].timesList[0],
          pickup_point: formattedRoutes[0].pickup_point,
          minutesAway: null,
          note: 'First morning departure'
        } : null)
      }
    });
  } catch (err) {
    console.error('Error fetching bus routes:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch bus schedules.' });
  }
});

module.exports = router;
