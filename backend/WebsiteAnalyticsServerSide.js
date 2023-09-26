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

  // Use the X-Forwarded-For header to get the real client IP
  const clientIp = (req.headers['x-forwarded-for'] || '').split(',').pop().trim() ||
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress || 
                   req.connection.socket.remoteAddress || 
                   "Unknown";

  if (clientIp === "Unknown" || clientIp.startsWith("192.168.")) {
    console.error('IP address is not set or internal.');
    return;
  }

  const userAgent = req.headers['user-agent'];

  // Get geolocation data
  let geoInfo = await getGeolocation(clientIp);

  if (!geoInfo) {
    console.error("Failed to get geolocation: Geolocation API returned null");
    return;
  }

  const city = geoInfo.city || "Unknown";
  const country = geoInfo.country_name || "Unknown";
  const state_prov = geoInfo.state_prov || "Unknown";
  const localTime = geoInfo.time_zone ? geoInfo.time_zone.current_time : "Unknown";

  // Determine device type
  let deviceType = "desktop";
  if (/mobile/i.test(userAgent)) {
    deviceType = "mobile";
  } else if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
    deviceType = "tablet";
  }

  // SQL query to insert into the sessions table
  const sessionQuery = 'INSERT INTO website_analytics_sessions(session_id, user_ip, user_agent, start_timestamp, city, country, state_prov, local_time, device_type) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)';
  await pool.query(sessionQuery, [sessionId, clientIp, userAgent, new Date(), city, country, state_prov, localTime, deviceType]);

  return sessionId;
};


module.exports = { initiateNewSession };
