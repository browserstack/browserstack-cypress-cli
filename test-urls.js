const axios = require('axios');
const https = require('https');
const dns = require('dns').promises;

const urls = [
  // Test various hostname patterns
  "https://api-cloud.bsstag.com",          // Works - remote AWS
  "https://api-cloud-dev.bsstag.com",      // Testing
  "https://dev-api-cloud.bsstag.com",      // Testing
  "https://apicloud-dev.bsstag.com",       // Testing
  "https://dev.api-cloud.bsstag.com",      // Testing
  "https://apidev.bsstag.com",             // Already know this fails
  "https://local.bsstag.com",              // Works - local
];

const httpsAgent = new https.Agent({
  rejectUnauthorized: false // Ignore SSL errors
});

async function testUrl(url) {
  try {
    const response = await axios.get(url, { 
      httpsAgent,
      timeout: 5000
    });
    console.log(`✅ ${url} - Status: ${response.status}`);
    return true;
  } catch (error) {
    if (error.code === 'ENOTFOUND') {
      console.log(`❌ ${url} - DNS NOT FOUND (hostname doesn't resolve)`);
    } else if (error.response) {
      console.log(`⚠️  ${url} - Status: ${error.response.status} (server responded but with error)`);
    } else {
      console.log(`❌ ${url} - Error: ${error.code || error.message}`);
    }
    return false;
  }
}

(async () => {
  console.log('Testing URLs and DNS resolution...\n');
  
  // First, check DNS for each unique hostname
  const hostnames = [...new Set(urls.map(url => new URL(url).hostname))];
  console.log('=== DNS RESOLUTION ===');
  for (const hostname of hostnames) {
    try {
      const addresses = await dns.resolve4(hostname);
      const isLocal = addresses.some(ip => 
        ip.startsWith('127.') || 
        ip.startsWith('192.168.') || 
        ip.startsWith('10.') || 
        ip.startsWith('172.')
      );
      console.log(`${hostname} → ${addresses.join(', ')} ${isLocal ? '🏠 (LOCAL)' : '🌍 (REMOTE)'}`);
    } catch (error) {
      console.log(`${hostname} → ❌ DNS FAILED (${error.code})`);
    }
  }
  
  console.log('\n=== ENDPOINT TESTS ===');
  for (const url of urls) {
    await testUrl(url);
  }
})();
