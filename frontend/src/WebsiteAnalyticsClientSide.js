// /frontend/src/WebsiteAnalyticsClientSide.js

// Function to initiate a new session and get a session ID from the server
async function initiateNewSession() {
  const SERVICE_URL = "http://localhost:3000"; // Replace with your actual service URL
  const response = await fetch(`${SERVICE_URL}/initiate-session`, { method: "POST" });
  const { sessionId } = await response.json();
  sessionStorage.setItem("sessionId", sessionId);
}

// Function to send analytics data to the backend
function sendAnalyticsData(eventType, additionalInfo) {
const SERVICE_URL = process.env.SERVICE_URL || "http://localhost:3000"; // Fallback to localhost
  const sessionId = sessionStorage.getItem("sessionId");
  fetch(`${SERVICE_URL}/analytics`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      sessionId,
      eventType,
      additionalInfo
    })
  }).then(response => {
    // Handle response here
  });
}

// Initialize a new session and run analytics logic
initiateNewSession().then(() => {
  // Track initial page view
  sendAnalyticsData("page_view", { url: window.location.href });

  // Heartbeat logic
  let elapsedTime = 0;
  function heartbeat() {
    sendAnalyticsData("heartbeat", { timestamp: new Date().toISOString() });
    let interval;

    if (elapsedTime < 10) {
      interval = 1000;
    } else if (elapsedTime < 60) {
      interval = 2000;
    } else if (elapsedTime < 120) {
      interval = 10000;
    } else if (elapsedTime < 240) {
      interval = 20000;
    } else {
      interval = 30000;
    }

    setTimeout(heartbeat, interval);
    elapsedTime += interval / 1000;
  }

  // Start the heartbeat
  heartbeat();

  // Supported event types
  const eventTypes = ["click", "mouseover", "focus", "mouseleave", "keydown"];

  // Attach event listeners
  eventTypes.forEach((eventType) => {
    document.addEventListener(eventType, function(event) {
      const expectedEventType = event.target.getAttribute("data-analytics-event-type");
      if (expectedEventType && eventType !== expectedEventType) {
        return;
      }

      const trigger = event.target.getAttribute("data-analytics-event-trigger");
      if (trigger) {
        sendAnalyticsData(eventType, { trigger: trigger });
      }
    });
  });

  // Intersection Observer for 'element scrolled into view'
  const observer = new IntersectionObserver(function(entries, observer) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const trigger = entry.target.getAttribute("data-analytics-event-trigger");
        if (trigger) {
          sendAnalyticsData("element_scrolled_into_view", { trigger: trigger });
        }
        observer.unobserve(entry.target);
      }
    });
  });

  // Observe elements with 'data-analytics-event-trigger' attribute
  document.querySelectorAll('[data-analytics-event-trigger]').forEach(element => {
    observer.observe(element);
  });
});
