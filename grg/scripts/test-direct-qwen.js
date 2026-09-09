const http = require('http');

const payload = JSON.stringify({
  model: 'qwen2.5:3b',
  messages: [
    { role: 'user', content: 'Say one word: FENIX' }
  ],
  stream: false,
  options: {
    num_predict: 3,
    temperature: 0
  }
});

console.log('Sending request to Ollama on VPS CPU...');
const startTime = Date.now();

const req = http.request({
  host: '172.20.0.7',
  port: 11434,
  path: '/api/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      const elapsed = Date.now() - startTime;
      console.log('=== REAL QWEN INFERENCE COMPLETED ===');
      console.log('QWEN_RESPONSE:', parsed.message?.content);
      console.log('PROMPT_TOKENS:', parsed.prompt_eval_count);
      console.log('COMPLETION_TOKENS:', parsed.eval_count);
      console.log('ELAPSED_MS:', elapsed);
      console.log('MODEL:', parsed.model);
    } catch(e) {
      console.error('PARSE_ERROR:', body);
    }
  });
});

req.on('error', (e) => console.error('REQ_ERROR:', e.message));
req.setTimeout(180000, () => {
  req.destroy(new Error('Timeout after 180s'));
});
req.write(payload);
req.end();
