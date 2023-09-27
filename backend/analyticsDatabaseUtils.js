// /backend/analyticsDatabaseUtils.js

const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const { getGeolocation } = require('./geolocation');

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

  // Extract session ID
  const sessionId = req.sessionID;

  // Store event in database
  const eventQuery = 'INSERT INTO website_analytics_events(session_id, event_type, additional_info) VALUES($1, $2, $3)';
  await pool.query(eventQuery, [sessionId, eventType, JSON.stringify(eventData)]);
};

module.exports = { updateAnalyticsDatabaseAndSession };
