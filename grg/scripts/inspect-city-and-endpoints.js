const fs = require('fs');
const http = require('http');

const html = fs.readFileSync('/opt/fenix-os/public/index.html', 'utf8');

// 1. showView full body
const showViewIdx = html.indexOf('window.showView =');
if (showViewIdx !== -1) {
  console.log('=== SHOWVIEW BODY (first 2500 chars) ===');
  console.log(html.slice(showViewIdx, showViewIdx + 2500));
}

// 2. view-city container HTML
const viewCityIdx = html.indexOf('id="view-city"');
if (viewCityIdx !== -1) {
  console.log('=== VIEW-CITY CONTAINER (first 1500 chars) ===');
  console.log(html.slice(viewCityIdx, viewCityIdx + 1500));
}

// 3. Test backend endpoints
function testEndpoint(path) {
  return new Promise(resolve => {
    const req = http.get({
      host: '127.0.0.1',
      port: 3000,
      path: path,
      headers: { 'Accept': 'application/json' }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ path, status: res.statusCode, body: data.slice(0, 300) });
      });
    });
    req.on('error', err => resolve({ path, error: err.message }));
    req.setTimeout(3000, () => { req.destroy(); resolve({ path, timeout: true }); });
  });
}

async function run() {
  const eps = [
    '/api/v2/city/state',
    '/api/v2/living-city/state',
    '/api/v2/living-city/agents',
    '/api/v2/city/agents',
    '/api/v2/runtime/full-status',
    '/api/v2/knowledge',
    '/api/v2/ide/tree',
    '/api/v2/ide/file',
    '/api/v2/terminal/exec',
    '/api/v2/terminal/status',
    '/api/v2/workspace/tree'
  ];
  console.log('=== TESTING ENDPOINTS ON 127.0.0.1:3000 ===');
  for (const ep of eps) {
    const res = await testEndpoint(ep);
    console.log(ep, '->', res.status, res.body ? res.body.slice(0, 100) : res.error || 'timeout');
  }
}

run();
