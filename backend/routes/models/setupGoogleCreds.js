const fs = require('fs');
const path = require('path');

function setupGoogleCredentials() {
  const creds = process.env.GOOGLE_CREDENTIALS_JSON;
  const credsObj = JSON.parse(creds);
  const credsPath = path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'google-creds.json');
  fs.writeFileSync(credsPath, JSON.stringify(credsObj, null, 2));
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credsPath;
}

module.exports = setupGoogleCredentials;
