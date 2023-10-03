// backend/routes/analyticsRoutes.js

const express = require('express');
const router = express.Router();
const { updateAnalyticsDatabaseAndSession } = require('../analyticsDatabaseUtils');
const { initiateNewSession } = require('../WebsiteAnalyticsServerSide');



router.post('/initiate-session', async (req, res) => {
  try {
    const sessionId = await initiateNewSession(req);
    console.log("Sending sessionId:", sessionId);
    res.status(200).json({ sessionId });
  } catch (error) {
    console.error("Error in /initiate-session:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.post('/analytics', async (req, res) => {
  const { eventType, additionalInfo } = req.body;
  
  req.sessionID = req.headers["x-session-id"];
  
  await updateAnalyticsDatabaseAndSession(req, eventType, additionalInfo);
  res.status(200).send('Event recorded');
});


module.exports = router;
