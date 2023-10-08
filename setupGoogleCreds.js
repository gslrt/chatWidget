const fs = require('fs');
const path = require('path');

function setupGoogleCredentials() {
  const creds = process.env.GOOGLE_CREDENTIALS_JSON;
  console.log("GOOGLE_CREDENTIALS_JSON exists:", !!creds);
  
  const credsObj = JSON.parse(creds);
  const credsPath = path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'google-creds.json');
  console.log("Generated credsPath:", credsPath);
  
  fs.writeFileSync(credsPath, JSON.stringify(credsObj, null, 2));
  
  if (fs.existsSync(credsPath)) {
      console.log("Credentials file exists.");
      console.log("File content:", fs.readFileSync(credsPath, 'utf8'));
  } else {
      console.log("Credentials file does not exist.");
  }
  
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credsPath;
}

module.exports = setupGoogleCredentials;
