// keep-alive.js
const https = require('https');

const BACKEND_URL = process.env.RENDER_EXTERNAL_URL;

function keepAlive() {
  // Only run in production
  if (process.env.NODE_ENV !== 'production' || !BACKEND_URL) {
    console.log('⏸️  Keep-alive disabled (not in production)');
    return;
  }

  console.log('🔄 Keep-alive service started');
  console.log(`📍 Pinging: ${BACKEND_URL}/health`);

  // Ping every 14 minutes (before Render's 15-minute timeout)
  setInterval(() => {
    const url = `${BACKEND_URL}/health`;
    
    https.get(url, (res) => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`✅ [${timestamp}] Keep-alive ping successful: ${res.statusCode}`);
    }).on('error', (err) => {
      const timestamp = new Date().toLocaleTimeString();
      console.error(`❌ [${timestamp}] Keep-alive error:`, err.message);
    });
  }, 14 * 60 * 1000); // 14 minutes

  // Initial ping after 1 minute
  setTimeout(() => {
    https.get(`${BACKEND_URL}/health`, (res) => {
      console.log(`✅ Initial keep-alive ping: ${res.statusCode}`);
    }).on('error', (err) => {
      console.error(`❌ Initial keep-alive error:`, err.message);
    });
  }, 60 * 1000);
}

module.exports = { keepAlive };