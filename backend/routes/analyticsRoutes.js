// backend/routes/analyticsRoutes.js

const express = require('express');
const router = express.Router();
const { initiateNewSession, updateAnalyticsDatabaseAndSession } = require('../analyticsDatabaseUtils');

// Endpoint to initiate a new session
// backend/routes/analyticsRoutes.js

router.post('/initiate-session', async (req, res) => {
  console.log("Inside /initiate-session route handler"); 
  try {
    const sessionId = await initiateNewSession(req);
    res.status(200).json({ sessionId });
  } catch (error) {
    console.error("Error in /initiate-session:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post('/analytics', async (req, res) => {
  console.log("Inside /analytics route handler");  
  const { eventType, additionalInfo } = req.body;
  await updateAnalyticsDatabaseAndSession(req, eventType, additionalInfo);
  res.status(200).send('Event recorded');
});


module.exports = router;
