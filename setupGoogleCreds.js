// setupGoogleCreds.js


const fs = require('fs');
const path = require('path');

function setupGoogleCredentials() {
  const creds = process.env.GOOGLE_CREDENTIALS_JSON;
  
  if (!creds) {
    console.error("GOOGLE_CREDENTIALS_JSON is not set. Exiting.");
    return;
  }

  const credsObj = JSON.parse(creds);
  const credsPath = path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'google-creds.json');
  
  fs.writeFileSync(credsPath, JSON.stringify(credsObj, null, 2));

  if (!fs.existsSync(credsPath)) {
    console.error("Failed to write the credentials file. Exiting.");
    return;
  }
  
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credsPath;
}

module.exports = setupGoogleCredentials;
