const https = require('https');
const http = require('http');

// URLs des principales stations à tester
const testUrls = [
  'https://mpbradio.ice.infomaniak.ch/topcongo3-128.mp3',
  'http://rs1.radiostreamer.com:8000/;stream/1',
  'https://stream.zeno.fm/cbff588f03duv',
  'http://213.136.96.14:8000/nostalgie2.mp3',
  'https://listen.radioking.com/radio/39218/stream/76118',
  'https://studio.webradio.solutions:7013/stream',
  'http://dreamsiteradiocp.com:8120/;',
  'https://listen.rba.co.rw:8008/rwanda/;'
];

console.log('🔍 Test de connectivité des flux radio...\n');

testUrls.forEach((url, i) => {
  const client = url.startsWith('https') ? https : http;
  
  const req = client.request(url, {
    method: 'HEAD',
    timeout: 8000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  }, (res) => {
    const status = res.statusCode;
    const contentType = res.headers['content-type'] || 'N/A';
    
    if (status === 200) {
      console.log(`✅ ${i+1}. ${url.split('/')[2]} - OK (${status}) - ${contentType}`);
    } else if (status === 302 || status === 301) {
      console.log(`🔄 ${i+1}. ${url.split('/')[2]} - Redirect (${status}) -> ${res.headers.location}`);
    } else {
      console.log(`❌ ${i+1}. ${url.split('/')[2]} - Error (${status})`);
    }
  });
  
  req.on('error', (e) => {
    console.log(`❌ ${i+1}. ${url.split('/')[2]} - Connection Error: ${e.message}`);
  });
  
  req.on('timeout', () => {
    console.log(`⏱️ ${i+1}. ${url.split('/')[2]} - Timeout (8s)`);
    req.destroy();
  });
  
  req.end();
});

setTimeout(() => {
  console.log('\n✨ Test terminé');
}, 10000);
