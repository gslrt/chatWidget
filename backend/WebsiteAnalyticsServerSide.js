// /backend/WebsiteAnalyticsServerSide.js


const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const { getGeolocation } = require('../geolocation');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Function to initiate a new session and update the analytics database
const initiateNewSession = async (req) => {
  // Generate a unique session ID using UUID
  const sessionId = uuidv4();

  // Get the client IP address and user-agent from the request headers
  const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];

  // Check for valid IP and user-agent
  if (!clientIp || !userAgent) {
    throw new Error("Invalid client IP or user-agent");
  }

  // Get geolocation data
  let geoInfo;
  try {
    geoInfo = await getGeolocation(clientIp);
  } catch (error) {
    console.error(`Failed to fetch geolocation for IP: ${clientIp}`, error);
    geoInfo = {};  // Default empty object if geolocation fetch fails
  }

  // Determine device type
  let deviceType = "desktop";
  if (/mobile/i.test(userAgent)) {
    deviceType = "mobile";
  } else if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
    deviceType = "tablet";
  }

  // SQL query to insert into the sessions table
  const sessionQuery = 'INSERT INTO website_analytics_sessions(session_id, user_ip, user_agent, start_timestamp, city, country, state_prov, local_time, device_type) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)';
  await pool.query(sessionQuery, [sessionId, clientIp, userAgent, new Date(), geoInfo.city, geoInfo.country, geoInfo.state_prov, geoInfo.local_time, deviceType]);

  return sessionId;
};

module.exports = { initiateNewSession };
