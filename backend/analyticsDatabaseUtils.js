// /backend/analyticsDatabaseUtils.js

const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});


// Function to update analytics database and session
const updateAnalyticsDatabaseAndSession = async (req, eventType, eventData) => {
  try {
    // Exclude 'heartbeat' events from being recorded
    if (eventType === 'heartbeat') {
      console.log("Ignoring heartbeat event");
      return;
    }

    const sessionId = req.sessionID;

    // Validate if sessionID exists
    if (!sessionId) {
      console.error("Session ID is missing. Exiting function.");
      return;
    }

    // Debugging: Log the session ID
    console.log(`Session ID for updateAnalyticsDatabaseAndSession: ${sessionId}`);

    // SQL query to insert the event into the analytics database
    const eventQuery = 'INSERT INTO website_analytics_events(session_id, event_type, additional_info) VALUES($1, $2, $3)';
    
    // Execute the query
    await pool.query(eventQuery, [sessionId, eventType, JSON.stringify(eventData)]);

    console.log(`Successfully inserted event ${eventType} for session ${sessionId}`);

  } catch (error) {
    console.error(`Error in updateAnalyticsDatabaseAndSession: ${error}`);
  }
};

module.exports = { updateAnalyticsDatabaseAndSession };

