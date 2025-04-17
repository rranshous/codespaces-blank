// Backend proxy server and frontend static file server
const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies
app.use(express.json());

// Apply rate limiting to API requests
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Use rate limiter for API endpoints
app.use('/api', apiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Anthropic API proxy endpoint
app.post('/api/anthropic/messages', async (req, res) => {
  try {
    // Get API key from environment variables
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'API key not configured on server' 
      });
    }
    
    // Forward request to Anthropic API
    const response = await axios({
      method: 'post',
      url: 'https://api.anthropic.com/v1/messages',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      data: req.body,
      timeout: 30000 // 30 second timeout
    });
    
    // Return the Anthropic API response
    return res.json(response.data);
  } catch (error) {
    console.error('Error proxying request to Anthropic API:', error.message);
    
    // Return appropriate error response
    if (error.response) {
      // Forward error response from Anthropic API
      return res.status(error.response.status).json(error.response.data);
    } else {
      return res.status(500).json({ 
        error: 'Proxy server error',
        message: error.message
      });
    }
  }
});

// Serve static files from the dist directory (our frontend)
app.use(express.static(path.join(__dirname, 'dist')));

// For any other routes, serve the index.html to support SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Frontend accessible at http://localhost:${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api/`);
});

module.exports = app; // For testing