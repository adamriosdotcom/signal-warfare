// ECHO ZERO - Server
// Express server for serving the application and proxying Claude API requests

const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const fetch = (...args) => 
  import('node-fetch').then(({default: fetch}) => fetch(...args));

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Parse JSON request bodies
app.use(express.json());

// Serve static files with proper caching headers
app.use(express.static(path.join(__dirname, './'), {
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Set more permissive CORS headers for static assets
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Add cache control for better performance
    if (path.endsWith('.js') || path.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); // Force refresh during development
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Handle CORS for API requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Proxy endpoint for Claude API
app.post('/api/claude', async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not found in environment variables' });
    }
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json(errorData);
    }
    
    const data = await response.json();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`ECHO ZERO server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});