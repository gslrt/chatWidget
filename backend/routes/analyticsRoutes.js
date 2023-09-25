const express = require('express');
const router = express.Router();
const { createWebsiteSession, updateWebsiteSession, logWebsiteEvent } = require('../WebsiteAnalyticsServerSide');

router.post('/trackTimeOnPage', async (req, res) => {
    const { timeSpent } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');
    const site = 'example.com';  // Get this from request if possible

    const sessionId = await createWebsiteSession(ipAddress, userAgent, site);
    await logWebsiteEvent(sessionId, 'time_spent_on_page', { timeSpent });

    res.status(200).json({ message: 'Time spent on page logged' });
});

// Add more endpoints as needed

module.exports = router;
