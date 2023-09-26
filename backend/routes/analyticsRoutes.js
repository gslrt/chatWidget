// backend/routes/analyticsRoutes.js

const express = require('express');
const router = express.Router();
const { initiateNewSession, updateAnalyticsDatabaseAndSession } = require('../analyticsDatabaseUtils');

// Endpoint to initiate a new session
router.post('/initiate-session', async (req, res) => {
  console.log("Received request to /initiate-session"); // <-- Add this line
  try {
    const sessionId = await initiateNewSession(req);
res.status(200).json({ sessionId });
  } catch (error) {
    console.error("Error in /initiate-session:", error); // <-- Add this line
    res.status(500).send("Internal Server Error");
  }
});


// Endpoint for tracking analytics events
router.post('/analytics', async (req, res) => {
  const { eventType, additionalInfo } = req.body;
  await updateAnalyticsDatabaseAndSession(req, eventType, additionalInfo);
  res.status(200).send('Event recorded');
});

module.exports = router;
