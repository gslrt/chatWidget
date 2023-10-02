const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const { getGeolocation } = require('./geolocation');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Function to initiate a new session and update the analytics database
const initiateNewSession = async (req) => {
  try {
    // Capture the site and referrer from the request payload or headers
    const site = req.body.site || req.headers.host || 'Unknown';
    const referrerUrl = req.body.referrer || req.headers.referer || 'Unknown'; // Capture the referrer

    // Generate a unique session ID using UUID
    const sessionId = uuidv4();

    // Use the X-Forwarded-For header to get the real client IP
    const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress || 
                     req.connection.socket.remoteAddress || 
                     "Unknown";

    // Get user agent from headers
    const userAgent = req.headers['user-agent'];

    // Fetch geolocation data
    let geoInfo = await getGeolocation(clientIp);

    // Check for null geolocation info
    if (!geoInfo) {
      console.error('Failed to get geolocation: Geolocation API returned null');
      return null;
    }

    // Prepare data for database insertion
    const city = geoInfo.city || null;
    const country = geoInfo.country_name || null;
    const state_prov = geoInfo.state_prov || null;
    const localTime = geoInfo.date_time ? new Date(geoInfo.date_time).toISOString() : new Date().toISOString();
    const countryFlag = geoInfo.country_flag || null;

    let deviceType = "desktop";
    if (/mobile/i.test(userAgent)) {
      deviceType = "mobile";
    } else if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      deviceType = "tablet";
    }

    // SQL query to insert the session into the database, now including referrerUrl
    const sessionQuery = 'INSERT INTO website_analytics_sessions(session_id, user_ip, user_agent, start_timestamp, city, country, state_prov, local_time, device_type, country_flag, site, referrer_url) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)';
    const queryParams = [sessionId, clientIp, userAgent, new Date(), city, country, state_prov, localTime, deviceType, countryFlag, site, referrerUrl];

    // Execute the query
    await pool.query(sessionQuery, queryParams);

    return sessionId; // Return the sessionId back to the caller
  } catch (error) {
    console.error(`Error in initiateNewSession: ${error}`);
    return null;
  }
};

module.exports = { initiateNewSession };
