// frontend/src/tether.js

// Function to load additional scripts asynchronously
function loadScript(src) {
  var script = document.createElement('script');
  script.async = true;
  script.src = src;
  document.body.appendChild(script);
}

// Main function to handle tracking and dynamic script loading
(function() {
  // Check for data attributes for chat embedding and widgets
  const chatElement = document.querySelector('[embed-element="native-chat"]');
  if (chatElement) {
    // Load the native chat bundle asynchronously
    loadScript('https://chatwidget-production.up.railway.app/frontend/dist/native.bundle.js');
  }

  // Load the analytics script asynchronously
  loadScript('https://chatwidget-production.up.railway.app/frontend/dist/WebsiteAnalyticsClientSide.bundle.js');
  

})();
