// backend/geolocation.js

const fetch = require('node-fetch');

async function getGeolocation(ipAddress) {
  console.log(`Fetching geolocation for IP: ${ipAddress}`);
  const apiKey = process.env.GEOLOCATOR_API_KEY;
  const url = `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}&ip=${ipAddress}`;

  try {
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      console.error('Failed to fetch geolocation:', response.status, response.statusText);
      return null;
    }
  } catch (error) {
    console.error('An error occurred while fetching geolocation:', error);
    return null;
  }
}


module.exports = {
  getGeolocation
};
