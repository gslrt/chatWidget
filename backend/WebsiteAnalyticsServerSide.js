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
  try {
    // Generate a unique session ID using UUID
    const sessionId = uuidv4();
    console.log(`Generated UUID: ${sessionId}`);

    // Get the client IP from headers or request object
    const clientIp = (req.headers['x-forwarded-for'] || '').split(',').pop().trim() || req.connection.remoteAddress || "Unknown";
    console.log(`Client IP: ${clientIp}`);

    // If the IP is unknown or internal, log and return
    if (clientIp === "Unknown" || clientIp.startsWith("192.168.")) {
      console.error(`IP address is not set or internal: ${clientIp}`);
      return null;
    }

    // Get user agent from headers
    const userAgent = req.headers['user-agent'];
    console.log(`User Agent: ${userAgent}`);

    // Fetch geolocation data
    let geoInfo = await getGeolocation(clientIp);
    console.log(`Geolocation Info: ${JSON.stringify(geoInfo)}`);

    // Check for null geolocation info
    if (!geoInfo) {
      console.error('Failed to get geolocation: Geolocation API returned null');
      return null;
    }

    // Prepare data for database insertion
    const city = geoInfo.city || "Unknown";
    const country = geoInfo.country_name || "Unknown";
    const state_prov = geoInfo.state_prov || "Unknown";
    const localTime = geoInfo.time_zone ? geoInfo.time_zone.current_time : "Unknown";
    let deviceType = "desktop";
    if (/mobile/i.test(userAgent)) {
      deviceType = "mobile";
    } else if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      deviceType = "tablet";
    }

    // SQL query to insert into the sessions table
    const sessionQuery = 'INSERT INTO website_analytics_sessions(session_id, user_ip, user_agent, start_timestamp, city, country, state_prov, local_time, device_type) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)';
    const queryParams = [sessionId, clientIp, userAgent, new Date(), city, country, state_prov, localTime, deviceType];
    console.log(`Executing query: ${sessionQuery}`);
    console.log(`With values: ${JSON.stringify(queryParams)}`);

    // Execute the query
    await pool.query(sessionQuery, queryParams);

    return sessionId;
  } catch (error) {
    console.error(`Error in initiateNewSession: ${error}`);
    return null;
  }
};

module.exports = { initiateNewSession };

