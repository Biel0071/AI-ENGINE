'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const { callAI } = require('../src/execution/fenix-worker');

async function main() {
  const requests = [];
  let responseText = 'Real inference from test gateway';
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    requests.push({ path: req.url, body: JSON.parse(Buffer.concat(chunks).toString()) });
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ result: { text: responseText }, tokens: { total: 12 } }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const previous = Object.fromEntries(['GRG_AIPLATFORM_URL', 'GRG_AIPLATFORM_KEY', 'GRG_AIPLATFORM_MODEL', 'GRG_OLLAMA_DIRECT_URL', 'FENIX_OLLAMA_URL'].map((key) => [key, process.env[key]]));
  try {
    process.env.GRG_AIPLATFORM_URL = `http://127.0.0.1:${server.address().port}`;
    process.env.GRG_AIPLATFORM_KEY = 'test-only-key';
    process.env.GRG_AIPLATFORM_MODEL = 'test-model';
    delete process.env.GRG_OLLAMA_DIRECT_URL;
    delete process.env.FENIX_OLLAMA_URL;

    const success = await callAI('Analyze source', 'Project context', null, 'test');
    assert.equal(success.success, true);
    assert.equal(success.text, responseText);
    assert.equal(success.tokens, 12);
    assert.equal(success.fallback, false);
    assert.equal(requests[0].path, '/v1/chat');
    assert.match(requests[0].body.messages[0].content, /Project context/);

    responseText = '[Fallback Response] fabricated answer';
    const failure = await callAI('Analyze source', '', null, 'test');
    assert.equal(failure.success, false);
    assert.doesNotMatch(failure.text, /ENGINEERING REPORT/);
    console.log('worker provider contract: real response succeeds; fabricated response fails');
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await new Promise((resolve) => server.close(resolve));
  }
}

main().then(() => process.exit(0), (error) => { console.error(error); process.exit(1); });
