// keep-alive.js - Railway optimized
const https = require('https');

const BACKEND_URL = process.env.RAILWAY_PUBLIC_DOMAIN 
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : null;

function keepAlive() {
  if (process.env.NODE_ENV !== 'production' || !BACKEND_URL) {
    console.log('⏸️  Keep-alive disabled (not in production)');
    return;
  }

  console.log('🚂 Railway Keep-alive service started');
  console.log(`📍 Pinging: ${BACKEND_URL}/health`);

  // Railway doesn't have strict timeouts like Render
  // Ping every 10 minutes to keep connections fresh
  setInterval(() => {
    const url = `${BACKEND_URL}/health`;
    
    https.get(url, (res) => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`✅ [${timestamp}] Keep-alive: ${res.statusCode}`);
    }).on('error', (err) => {
      const timestamp = new Date().toLocaleTimeString();
      console.error(`❌ [${timestamp}] Keep-alive error:`, err.message);
    });
  }, 10 * 60 * 1000); // 10 minutes

  // Initial ping
  setTimeout(() => {
    https.get(`${BACKEND_URL}/health`, (res) => {
      console.log(`✅ Initial keep-alive: ${res.statusCode}`);
    }).on('error', (err) => {
      console.error(`❌ Initial keep-alive error:`, err.message);
    });
  }, 60 * 1000);
}

module.exports = { keepAlive };