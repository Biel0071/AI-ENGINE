'use strict';

// Read-only gateway probe. Never prints credentials or generated content.
const { execFileSync } = require('node:child_process');

async function main() {
  const processes = JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8', timeout: 5000 }));
  const backend = processes.find((entry) => entry.name === 'fenix-backend');
  const env = backend?.pm2_env || {};
  const key = env.GRG_AIPLATFORM_KEY || env.AI_PROVIDER_KEY || env.FENIX_AI_KEY;
  const baseUrl = env.GRG_AIPLATFORM_URL || 'http://209.50.241.22:3001';
  if (!key) {
    console.log(JSON.stringify({ configured: false, inference: 'unverified', reason: 'PM2 backend has no API key in its environment' }));
    process.exitCode = 2;
    return;
  }

  const headers = { 'content-type': 'application/json', 'x-api-key': key, authorization: `Bearer ${key}` };
  const deadline = Date.now() + 25000;
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/chat`, {
    method: 'POST', headers,
    body: JSON.stringify({ messages: [{ role: 'user', content: 'Responda apenas: FENIX_PROBE_OK' }], model: process.argv[2] || env.GRG_AIPLATFORM_MODEL || 'qwen2.5:3b', max_tokens: 16 }),
    signal: AbortSignal.timeout(15000)
  });
  let payload = await response.json();
  let status = response.status;
  while (status === 202 && payload.jobId && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const polled = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/jobs/${encodeURIComponent(payload.jobId)}`, { headers, signal: AbortSignal.timeout(3000) });
    status = polled.status;
    payload = await polled.json();
    if (payload.status === 'completed' || payload.status === 'failed') break;
    status = 202;
  }
  const text = payload.result?.result?.text || payload.result?.text || payload.result?.message?.content || payload.text || '';
  const fabricated = /\[fallback response\]|resilient engineering report/i.test(text);
  const success = status >= 200 && status < 300 && status !== 202 && Boolean(text.trim()) && !fabricated;
  console.log(JSON.stringify({ configured: true, httpStatus: status, jobStatus: payload.status || null, realText: success, textLength: text.length, fabricated }));
  if (!success) process.exitCode = 2;
}

main().catch((error) => {
  console.error(JSON.stringify({ inference: 'failed', error: error.name === 'TimeoutError' ? 'timeout' : String(error.message || error).slice(0, 180) }));
  process.exitCode = 2;
});
