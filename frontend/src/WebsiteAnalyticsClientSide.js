

// frontend/src/tether.js

// Function to load additional scripts asynchronously
function loadScript(src) {
  var script = document.createElement('script');
  script.async = true;
  script.src = src;
  document.body.appendChild(script);
}
