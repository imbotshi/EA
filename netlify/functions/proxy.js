import fetch from 'node-fetch';

export const handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    const { url } = event.queryStringParameters || {};
    
    if (!url) {
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'URL parameter is required' })
      };
    }

    try {
      // Decode the URL
      const targetUrl = decodeURIComponent(url);
      
      // Fetch the audio stream
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'audio/*,*/*;q=0.9',
          'Accept-Language': 'en-US,en;q=0.5',
          'Cache-Control': 'no-cache'
        },
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Get the content type
      const contentType = response.headers.get('content-type') || 'audio/mpeg';
      
      // Stream the response
      const buffer = await response.buffer();
      
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=300',
          'Accept-Ranges': 'bytes'
        },
        body: buffer.toString('base64'),
        isBase64Encoded: true
      };
      
    } catch (error) {
      console.error('Proxy error:', error);
      return {
        statusCode: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Failed to proxy request',
          details: error.message 
        })
      };
    }
  }

  return {
    statusCode: 405,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};
