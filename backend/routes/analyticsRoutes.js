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
  const clientIp = req.ip; // Get client IP address
  const userAgent = req.headers['user-agent']; // Get User-Agent string

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
    const sessionQuery = 'INSERT INTO website_analytics_sessions(session_id, user_ip, user_agent, start_timestamp, site, referrer_url, interaction_type, conversion_flag, city, country, state_prov, local_time, device_type) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)';
    await pool.query(sessionQuery, [sessionId, clientIp, userAgent, new Date(), /* site, referrer_url, interaction_type, conversion_flag, */ geoInfo.city, geoInfo.country, geoInfo.state_prov, geoInfo.local_time, deviceType]);
  }

  // Store event in database
  const eventQuery = 'INSERT INTO website_analytics_events(session_id, event_type, additional_info) VALUES($1, $2, $3)';
  await pool.query(eventQuery, [sessionId, eventType, JSON.stringify(eventData)]);
};


router.post('/page_view', async (req, res) => {
  const { url, referrer } = req.body;
  await updateAnalyticsDatabaseAndSession(req, 'page_view', { url, referrer });
  res.status(200).send('Page view recorded');
});

router.post('/heartbeat', async (req, res) => {
  const { timestamp } = req.body;
  await updateAnalyticsDatabaseAndSession(req, 'heartbeat', { timestamp });
  res.status(200).send('Heartbeat recorded');
});

router.post('/interaction', async (req, res) => {
  const { trigger, event_type } = req.body;
  await updateAnalyticsDatabaseAndSession(req, 'interaction', { trigger, event_type });
  res.status(200).send('Interaction recorded');
});

router.post('/element_scrolled', async (req, res) => {
  const { trigger } = req.body;
  await updateAnalyticsDatabaseAndSession(req, 'element_scrolled', { trigger });
  res.status(200).send('Element scrolled into view recorded');
});

module.exports = router;
