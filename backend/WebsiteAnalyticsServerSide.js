// /backend/WebsiteAnalyticsServerSide.js


const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Function to create a new website session
const createWebsiteSession = async (ipAddress, userAgent, site) => {
    const query = 'INSERT INTO website_analytics_sessions (ip_address, user_agent, site) VALUES ($1, $2, $3) RETURNING session_id';
    const values = [ipAddress, userAgent, site];
    const result = await pool.query(query, values);
    return result.rows[0].session_id;
};

// Function to update session details
const updateWebsiteSession = async (sessionId, additionalInfo) => {
    const query = 'UPDATE website_analytics_sessions SET additional_info = $2 WHERE session_id = $1';
    const values = [sessionId, JSON.stringify(additionalInfo)];
    await pool.query(query, values);
};

// Function to log website events
const logWebsiteEvent = async (sessionId, eventType, additionalInfo) => {
    const query = 'INSERT INTO website_analytics_events (session_id, event_type, additional_info) VALUES ($1, $2, $3)';
    const values = [sessionId, eventType, JSON.stringify(additionalInfo)];
    await pool.query(query, values);
};

module.exports = {
    createWebsiteSession,
    updateWebsiteSession,
    logWebsiteEvent
};
