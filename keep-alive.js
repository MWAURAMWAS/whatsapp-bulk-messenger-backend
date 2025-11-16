// keep-alive.js - Fly.io optimized
const https = require('https');

const BACKEND_URL = process.env.FLY_APP_NAME 
  ? `https://${process.env.FLY_APP_NAME}.fly.dev`
  : null;

function keepAlive() {
  if (!BACKEND_URL) {
    console.log('⏸️  Keep-alive disabled');
    return;
  }

  console.log('✈️  Fly.io Keep-alive started');
  console.log(`📍 Pinging: ${BACKEND_URL}/health`);

  setInterval(() => {
    https.get(`${BACKEND_URL}/health`, (res) => {
      console.log(`✅ Keep-alive: ${res.statusCode}`);
    }).on('error', (err) => {
      console.error(`❌ Keep-alive error:`, err.message);
    });
  }, 10 * 60 * 1000);

  setTimeout(() => {
    https.get(`${BACKEND_URL}/health`, (res) => {
      console.log(`✅ Initial keep-alive: ${res.statusCode}`);
    }).on('error', (err) => {
      console.error(`❌ Initial keep-alive error:`, err.message);
    });
  }, 60 * 1000);
}

module.exports = { keepAlive };