const http = require('node:http');

async function main() {
  const apiKey = process.env.GRG_AIPLATFORM_KEY;
  if (!apiKey) { console.error('Set GRG_AIPLATFORM_KEY in the environment.'); process.exitCode = 1; return; }
console.log('1. Testing VPS Health: http://209.50.241.22:3001/health ...');
  const health = await new Promise((resolve) => {
    http.get('http://209.50.241.22:3001/health', { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', err => resolve({ error: err.message }));
  });
  console.log('Health:', health.status, health.body ? JSON.parse(health.body).status : health.error);

  console.log('2. Testing Chat via API Platform (qwen2.5:0.5b) ...');
  const payload = JSON.stringify({
    model: 'qwen2.5:0.5b',
    messages: [{ role: 'user', content: 'Say hello in 3 words' }],
    max_tokens: 20
  });

  const chat = await new Promise((resolve) => {
    const req = http.request({
      hostname: '209.50.241.22',
      port: 3001,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 120000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', err => resolve({ error: err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout' }); });
    req.write(payload);
    req.end();
  });
  console.log('Chat Result:', chat.status, chat.body ? chat.body.slice(0, 300) : chat.error);
}

main().catch(console.error);
