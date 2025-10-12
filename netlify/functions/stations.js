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
      // Path to stations.json from Netlify functions directory
      const stationsPath = path.join(__dirname, '../../frontend/public/api/stations.json');
      const stationsData = fs.readFileSync(stationsPath, 'utf8');
      const stations = JSON.parse(stationsData);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(stations)
      };
    } catch (error) {
      console.error('Error reading stations:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to load stations' })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};
