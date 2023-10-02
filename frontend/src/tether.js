// Function to load additional scripts asynchronously
function loadScript(src, callback) {
  var script = document.createElement('script');
  script.async = true;
  script.src = src;

  // Run the callback when the script is loaded
  script.onload = function() {
    if (callback) callback();
  };

  document.body.appendChild(script);
}

// Main function to handle tracking and dynamic script loading
(function() {
  // Load the analytics script first
  loadScript('https://chatwidget-production.up.railway.app/frontend/dist/analytics.bundle.js', function() {
    // Analytics script has loaded, check for session ID
    const checkForSessionId = setInterval(function() {
      const sessionId = sessionStorage.getItem("sessionId");
      if (sessionId) {
        clearInterval(checkForSessionId);
        
        // Session ID is available, now load the native chat bundle
        const chatElement = document.querySelector('[embed-element="native-chat"]');
        if (chatElement) {
          loadScript('https://chatwidget-production.up.railway.app/frontend/dist/native.bundle.js');
        }
      }
    }, 100);
  });
})();
