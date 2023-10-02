// frontend/src/WebsiteAnalyticsClientSide.js






// Right before the fetch in initiateNewSession()
console.log("Current URL in initiateNewSession: ", window.location.href);
console.log("Document Referrer in initiateNewSession: ", document.referrer);



// Function to initiate a new session and get a session ID from the server
async function initiateNewSession() {
  console.log("Initiating new session");  // Added debug log
  
  // Check if session ID already exists in sessionStorage
  let sessionId = sessionStorage.getItem("sessionId");
  console.log("Session ID from sessionStorage:", sessionId);  // Added debug log
  
  const site = window.location.hostname;
  const referrerUrl = document.referrer || "Direct";

  if (sessionId) {
    // If session ID exists, no need to create a new one
    console.log("Session ID exists, no need to create a new one.");  // Added debug log
    return sessionId;
  }

  const SERVICE_URL = process.env.SERVICE_URL;
  try {
    const response = await fetch(`${SERVICE_URL}/analytics/initiate-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ site, referrer: referrerUrl })  
    });
    
    if (response.ok) {
      const { sessionId } = await response.json();
      console.log("Received session ID from server:", sessionId);  // Added debug log
      sessionStorage.setItem("sessionId", sessionId);
      console.log("Set session ID in sessionStorage:", sessionId);  // Added debug log
      initializeSocketConnection(sessionId);
      return sessionId;
    } else {
      console.log("Server returned an error while initiating session:", response.status);  // Added debug log
      return null;
    }
  } catch (error) {
    console.log("Error while initiating session:", error);  // Added debug log
    return null;
  }
}



// Right before the fetch in sendAnalyticsData()
console.log("Current URL in sendAnalyticsData: ", window.location.href);
console.log("Document Referrer in sendAnalyticsData: ", document.referrer);

const sessionId = sessionStorage.getItem("sessionId");
console.log("Session ID before Socket initialization:", sessionId);  // Add this line


function sendAnalyticsData(eventType, additionalInfo) {
  const SERVICE_URL = process.env.SERVICE_URL;
  const sessionId = sessionStorage.getItem("sessionId");
  const site = window.location.hostname;  // Capture the site

  fetch(`${SERVICE_URL}/analytics/analytics`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": sessionId
    },
    body: JSON.stringify({
      eventType,
      site,  // Include the site
      additionalInfo
    })
  }).then(response => {
    // Handle response here
  });
}

// Initialize a new session and run analytics logic
initiateNewSession().then((sessionId) => {
  if (!sessionId) {
    console.error("Failed to initialize session.");
    return;
  }

  // Emit syncSessionId event to sync the session ID with the server
  socket.emit('syncSessionId', sessionId);

  const referrerUrl = document.referrer || "Direct";
  
  // Track initial page view
  sendAnalyticsData("page_view", { url: window.location.href, referrer: referrerUrl });

  // Heartbeat logic
  let elapsedTime = 0;
  function heartbeat() {
    sendAnalyticsData("heartbeat", { timestamp: new Date().toISOString(), url: window.location.href });
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

