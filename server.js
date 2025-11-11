// WhatsApp Message Sender Backend with WebSocket Support
// Install required packages:
// npm install @wppconnect-team/wppconnect express ws

const wppconnect = require('@wppconnect-team/wppconnect');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

// Configuration
const SESSION_NAME = 'my-whatsapp-session';
const PORT = 3000;
const TOKENS_PATH = path.join(__dirname, 'tokens');

// Initialize Express app and WebSocket server
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let whatsappClient = null;
let connectedClients = new Set();
let isLoggingOut = false;

// Serve the HTML file from the same directory
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Broadcast message to all connected WebSocket clients
function broadcast(data) {
  const message = JSON.stringify(data);
  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Initialize WhatsApp client
async function initializeWhatsApp() {
  try {
    console.log('Initializing WhatsApp client...');
    broadcast({ type: 'status', message: 'Initializing WhatsApp client...' });

    whatsappClient = await wppconnect.create({
      session: SESSION_NAME,
      catchQR: (base64Qr, asciiQR) => {
        console.log('QR Code received');
        // Send QR code to frontend
        broadcast({ 
          type: 'qr', 
          qr: base64Qr 
        });
      },
      statusFind: (statusSession, session) => {
        console.log('Status:', statusSession);
        broadcast({ 
          type: 'status', 
          message: `Status: ${statusSession}` 
        });

        // When authenticated and ready
        if (statusSession === 'inChat' || statusSession === 'qrReadSuccess') {
          broadcast({ 
            type: 'ready',
            message: 'WhatsApp connected successfully!' 
          });
        }
      },
      headless: true,
      devtools: false,
      useChrome: true,
      debug: false,
      logQR: false, // Don't log QR in console since we're sending to frontend
      browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
      autoClose: 0, // Don't auto close
      disableWelcome: true,
    });

    console.log('=== WHATSAPP CLIENT CREATED ===');
    console.log('Client initialized successfully!');
    
    // Set up message listener
    whatsappClient.onMessage(async (message) => {
      console.log('Received message:', message.body);
    });

    return whatsappClient;

  } catch (error) {
    console.error('=== ERROR INITIALIZING WHATSAPP ===');
    console.error('Error details:', error);
    broadcast({ 
      type: 'error', 
      message: `Failed to initialize: ${error.message}` 
    });
    throw error;
  }
}

// Send text message
async function sendMessage(phoneNumber, message) {
  try {
    if (isLoggingOut) {
      throw new Error('Cannot send message: Logout in progress');
    }

    if (!whatsappClient) {
      throw new Error('WhatsApp client not initialized');
    }

    // Format phone number
    const chatId = `${phoneNumber}@c.us`;
    
    await whatsappClient.sendText(chatId, message);
    console.log(`Message sent to ${phoneNumber}`);
    
    return { success: true };

  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

// Logout and clear session
async function logout() {
  try {
    console.log('Logging out...');
    isLoggingOut = true;
    
    // Notify all clients that logout is starting
    broadcast({ 
      type: 'logout-started',
      message: 'Logout initiated' 
    });
    
    if (whatsappClient) {
      await whatsappClient.logout();
      await whatsappClient.close();
      whatsappClient = null;
    }

    // Delete session tokens folder
    const sessionPath = path.join(TOKENS_PATH, SESSION_NAME);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log('Session tokens deleted');
    }

    broadcast({ 
      type: 'logged-out',
      message: 'Logged out successfully' 
    });

    // Reset logout flag before reinitializing
    isLoggingOut = false;

    // Reinitialize WhatsApp client to get new QR code
    setTimeout(() => {
      initializeWhatsApp();
    }, 2000);

    return { success: true };

  } catch (error) {
    console.error('Error during logout:', error);
    isLoggingOut = false;
    throw error;
  }
}

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');
  connectedClients.add(ws);

  // Send current status to new client
  if (whatsappClient) {
    ws.send(JSON.stringify({ 
      type: 'ready',
      message: 'WhatsApp is already connected' 
    }));
  }

  // Handle incoming messages from client
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);

      if (message.type === 'send-message') {
        const { phoneNumber, message: text } = message;
        
        try {
          await sendMessage(phoneNumber, text);
          ws.send(JSON.stringify({ 
            type: 'message-sent',
            to: phoneNumber
          }));
        } catch (error) {
          ws.send(JSON.stringify({ 
            type: 'message-error',
            error: error.message
          }));
        }
      } else if (message.type === 'logout') {
        try {
          await logout();
        } catch (error) {
          ws.send(JSON.stringify({ 
            type: 'logout-error',
            error: error.message
          }));
        }
      }

    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      ws.send(JSON.stringify({ 
        type: 'error',
        message: error.message
      }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    connectedClients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    connectedClients.delete(ws);
  });
});

// Start server
async function startServer() {
  try {
    console.log('=== STARTING SERVER ===');
    
    // Start HTTP/WebSocket server
    server.listen(PORT, () => {
      console.log('=== SERVER STARTED ===');
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Open your browser and navigate to http://localhost:${PORT}`);
    });

    // Initialize WhatsApp client
    console.log('=== STARTING WHATSAPP INITIALIZATION ===');
    await initializeWhatsApp();
    console.log('=== WHATSAPP INITIALIZATION COMPLETED ===');

  } catch (error) {
    console.error('=== ERROR STARTING SERVER ===');
    console.error('Error details:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  
  if (whatsappClient) {
    try {
      await whatsappClient.close();
      console.log('WhatsApp client closed');
    } catch (error) {
      console.error('Error closing WhatsApp client:', error);
    }
  }
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start the application
startServer();