// frontend/src/tether.js

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
    // Analytics script has loaded, now load the chat bundle
    const chatElement = document.querySelector('[embed-element="native-chat"]');
    if (chatElement) {
      // Load the native chat bundle asynchronously
      loadScript('https://chatwidget-production.up.railway.app/frontend/dist/native.bundle.js');
    }
  });
})();
