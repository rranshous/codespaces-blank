# Sparklings Backend Proxy

This is a lightweight backend proxy server for the Sparklings Neural Energy Simulation. It's required to bypass CORS restrictions when making API calls to Anthropic's Claude API.

## Setup Instructions

1. Install the necessary dependencies:
   ```
   npm install
   ```

2. Set up your environment variables:
   - Copy `.env` to `.env.local` (which won't be checked into source control)
   - Add your Anthropic API key to `.env.local`:
     ```
     ANTHROPIC_API_KEY=your_actual_api_key_here
     ```

3. Start the proxy server:
   ```
   npm run server
   ```

4. In a separate terminal, start the frontend:
   ```
   npm start
   ```

5. Alternatively, start both at once with:
   ```
   npm run start:full
   ```

## Configuration

The proxy server includes:

- Rate limiting (100 requests per 15 minutes per IP)
- CORS protection
- Error handling
- Request forwarding to Anthropic API

## Frontend Integration

In the simulation, you can toggle between:
1. Using the proxy server (recommended for production)
2. Using direct API calls (not recommended due to CORS)
3. Using mock inference (no API calls, good for development)

## Security Considerations

- Never expose your API key in frontend code
- The proxy server keeps your API key secure on the server side
- For production deployments, consider adding authentication to the proxy

## Troubleshooting

If you encounter issues:

1. Check the proxy server logs for errors
2. Verify your API key is correct
3. Make sure the proxy server is running (check http://localhost:3000/health)
4. Ensure the frontend is configured to use the correct proxy URL
5. Check browser console for any network or CORS errors