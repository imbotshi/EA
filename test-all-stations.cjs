const https = require('https');
const http = require('http');
const fs = require('fs');

// Lire le fichier stations.json
const stations = JSON.parse(fs.readFileSync('./frontend/public/api/stations.json', 'utf8'));

console.log(`🔍 Test de ${stations.length} stations radio...\n`);

let completed = 0;
const results = [];

stations.forEach((station, i) => {
  const url = station.stream;
  const client = url.startsWith('https') ? https : http;
  
  const req = client.request(url, {
    method: 'HEAD',
    timeout: 6000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  }, (res) => {
    const status = res.statusCode;
    const contentType = res.headers['content-type'] || 'N/A';
    
    let result;
    if (status === 200) {
      result = `✅ ${station.name} (${station.city}) - OK`;
      console.log(result);
    } else if (status === 302 || status === 301) {
      result = `🔄 ${station.name} (${station.city}) - Redirect (${status})`;
      console.log(result);
    } else {
      result = `❌ ${station.name} (${station.city}) - Error (${status})`;
      console.log(result);
    }
    
    results.push({station: station.name, status, result});
    completed++;
    
    if (completed === stations.length) {
      printSummary();
    }
  });
  
  req.on('error', (e) => {
    const result = `❌ ${station.name} (${station.city}) - ${e.message}`;
    console.log(result);
    results.push({station: station.name, status: 'error', result});
    completed++;
    
    if (completed === stations.length) {
      printSummary();
    }
  });
  
  req.on('timeout', () => {
    const result = `⏱️ ${station.name} (${station.city}) - Timeout`;
    console.log(result);
    results.push({station: station.name, status: 'timeout', result});
    req.destroy();
    completed++;
    
    if (completed === stations.length) {
      printSummary();
    }
  });
  
  req.end();
});

function printSummary() {
  setTimeout(() => {
    console.log('\n📊 RÉSUMÉ:');
    const working = results.filter(r => r.status === 200).length;
    const errors = results.filter(r => r.status !== 200 && r.status !== 'timeout').length;
    const timeouts = results.filter(r => r.status === 'timeout').length;
    
    console.log(`✅ Fonctionnelles: ${working}/${stations.length}`);
    console.log(`❌ Erreurs: ${errors}`);
    console.log(`⏱️ Timeouts: ${timeouts}`);
    
    if (errors > 0 || timeouts > 0) {
      console.log('\n🔧 Stations à corriger:');
      results.filter(r => r.status !== 200).forEach(r => {
        console.log(`- ${r.station}`);
      });
    }
  }, 1000);
}
