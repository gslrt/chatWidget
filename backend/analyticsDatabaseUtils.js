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
    const sessionId = req.sessionID;

    // Validate if sessionID exists
    if (!sessionId) {
      console.error("Session ID is missing. Exiting function.");
      return;
    }

    // Handle heartbeat events to update time_spent_on_page
    if (eventType === 'heartbeat') {
      const updateQuery = 'UPDATE website_analytics_visited_pages SET time_spent_on_page = time_spent_on_page + 1 WHERE session_id = $1';
      await pool.query(updateQuery, [sessionId]);
      return;
    }

    // Handle page_view events to insert into website_analytics_visited_pages
    if (eventType === 'page_view') {
      const pageViewQuery = 'INSERT INTO website_analytics_visited_pages(session_id, url, time_spent_on_page) VALUES($1, $2, $3)';
      const url = eventData.url || 'Unknown'; 
      const timeSpent = 0;
      await pool.query(pageViewQuery, [sessionId, url, timeSpent]);
    }

    // SQL query to insert the event into the analytics database
    const eventQuery = 'INSERT INTO website_analytics_events(session_id, event_type, additional_info) VALUES($1, $2, $3)';
    
    // Execute the query
    await pool.query(eventQuery, [sessionId, eventType, JSON.stringify(eventData)]);

  } catch (error) {
    console.error(`Error in updateAnalyticsDatabaseAndSession: ${error}`);
  }
};

module.exports = { updateAnalyticsDatabaseAndSession };

