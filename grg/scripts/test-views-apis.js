const http = require('http');

function test(path, method = 'GET', body = null) {
  return new Promise(resolve => {
    const postData = body ? JSON.stringify(body) : null;
    const req = http.request({
      host: '127.0.0.1',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Accept': 'application/json',
        ...(postData ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) } : {})
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ path, status: res.statusCode, body: data.slice(0, 200) }));
    });
    req.on('error', err => resolve({ path, error: err.message }));
    req.setTimeout(4000, () => { req.destroy(); resolve({ path, timeout: true }); });
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  const tests = [
    ['/api/v2/projects/fenix-os/tree'],
    ['/api/v2/projects/fenix-os/file?path=%2Fopt%2Ffenix-os%2Fgrg%2Fsrc%2Fserver.js'],
    ['/api/v2/projects/fenix-os/terminal', 'POST', { command: 'uptime' }],
    ['/api/v2/graph/data'],
    ['/api/v2/patterns'],
    ['/api/v2/memory/system'],
    ['/api/v2/memory/drift'],
    ['/api/v2/reality/summary'],
    ['/api/v2/city/state'],
    ['/api/v2/living-city/state'],
    ['/api/v2/living-city/agents']
  ];

  for (const [p, m, b] of tests) {
    const r = await test(p, m || 'GET', b);
    console.log(m || 'GET', p, '==>', r.status, r.body || r.error);
  }
}

run();
