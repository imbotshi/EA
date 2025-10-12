import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod === 'GET') {
    try {
      // Path to podcasts.json from Netlify functions directory
      const podcastsPath = path.join(__dirname, '../../frontend/public/api/podcasts.json');
      const podcastsData = fs.readFileSync(podcastsPath, 'utf8');
      const podcasts = JSON.parse(podcastsData);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(podcasts)
      };
    } catch (error) {
      console.error('Error reading podcasts:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to load podcasts' })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};
