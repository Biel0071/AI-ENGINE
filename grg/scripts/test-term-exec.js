const http = require('http');

function post(port, path, body) {
  return new Promise(resolve => {
    const postData = JSON.stringify(body);
    const req = http.request({
      host: '127.0.0.1',
      port,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ port, status: res.statusCode, body: data }));
    });
    req.on('error', e => resolve({ port, error: e.message }));
    req.write(postData);
    req.end();
  });
}

async function run() {
  const b = { command: 'echo hello_fenix' };
  console.log('Testing port 4410 directly:');
  console.log(await post(4410, '/api/v2/terminal/exec', b));

  console.log('\nTesting port 3000 (gateway):');
  console.log(await post(3000, '/api/v2/terminal/exec', b));
}

run();
