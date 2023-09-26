const router = require('express').Router();
const { Pool } = require('pg');
const { getGeolocation } = require('../geolocation');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Function to update analytics database and session
const updateAnalyticsDatabaseAndSession = async (req, eventType, eventData) => {
  const clientIp = req.ip;
  const userAgent = req.headers['user-agent'];

  // Get geolocation data
  let geoInfo = await getGeolocation(clientIp);

  // Extract session ID
  const sessionId = req.sessionID;

  // Determine device type
  let deviceType = "desktop";
  if (/mobile/i.test(userAgent)) {
    deviceType = "mobile";
  } else if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
    deviceType = "tablet";
  }

  // Update sessions table if it's a new session
  if (req.session.isNew) {
    const sessionQuery = 'INSERT INTO website_analytics_sessions(session_id, user_ip, user_agent, start_timestamp, city, country, state_prov, local_time, device_type) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)';
    await pool.query(sessionQuery, [sessionId, clientIp, userAgent, new Date(), geoInfo.city, geoInfo.country, geoInfo.state_prov, geoInfo.local_time, deviceType]);
  }

  // Store event in database
  const eventQuery = 'INSERT INTO website_analytics_events(session_id, event_type, additional_info) VALUES($1, $2, $3)';
  await pool.query(eventQuery, [sessionId, eventType, JSON.stringify(eventData)]);
};

router.post('/analytics', async (req, res) => {
  const { eventType, additionalInfo } = req.body;
  await updateAnalyticsDatabaseAndSession(req, eventType, additionalInfo);
  res.status(200).send('Event recorded');
});

module.exports = router;
