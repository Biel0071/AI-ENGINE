const http = require('http');

async function test(path) {
  return new Promise(resolve => {
    http.get('http://127.0.0.1:3000' + path, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ path, status: res.statusCode, body: d.slice(0, 150) }));
    }).on('error', e => resolve({ path, error: e.message }));
  });
}

async function run() {
  const eps = [
    '/api/v2/knowledge',
    '/api/v2/observatory/summary',
    '/api/v2/observatory/twins/project',
    '/api/v2/observatory/twins/screen',
    '/api/v2/observatory/visual-dna',
    '/api/v2/observatory/unknowns',
    '/api/v2/observatory/gaps',
    '/api/v2/observatory/evolution'
  ];
  for (const ep of eps) {
    const r = await test(ep);
    console.log(ep, '-->', r.status, r.body || r.error);
  }
}

run();
