const fetch = globalThis.fetch;

async function testDirect() {
  const apiKey = process.env.GRG_AIPLATFORM_KEY;
  if (!apiKey) { console.error('Set GRG_AIPLATFORM_KEY in the environment.'); process.exitCode = 1; return; }
console.log('Testing direct to VPS 209.50.241.22:3001 with ollama/qwen2.5:3b...');
  const t0 = Date.now();
  try {
    const res = await fetch('http://209.50.241.22:3001/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        model: 'ollama/qwen2.5:3b',
        messages: [{ role: 'user', content: 'Diga ola em 3 palavras.' }],
        max_tokens: 15
      })
    });
    console.log('Direct status:', res.status, `(${Date.now() - t0}ms)`);
    const data = await res.json();
    console.log('Direct response:', JSON.stringify(data));
  } catch (err) {
    console.error('Direct error:', err.message);
  }
}

testDirect();
