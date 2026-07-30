// Testes do ops/llm-preflight.js -- o script que prova a fonte de LLM sem subir o app.
// ASCII apenas: o lexer TAP do Node 18 quebra com caractere non-ASCII na saida do teste.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { run, parseEnvFile, describeSecrets } = require('../ops/llm-preflight');

// Gateway com o contrato medido do AI Platform: x-api-key + POST /v1/text -> {result:{text}}
function fakeGateway({ key = 'k_test' } = {}) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        if (req.headers['x-api-key'] !== key) { res.writeHead(401); return res.end('{"error":"bad key"}'); }
        const payload = JSON.parse(body || '{}');
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          result: { text: payload.prompt === 'ok' ? 'ok' : 'OK' },
          model: 'qwen2.5:1.5b',
          tokens: { prompt: 11, completion: 2 },
        }));
      });
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

// Ollama com NDJSON progressivo: um token por vez, com intervalo real entre eles.
// Os prompt_eval_count/eval_count fixos aqui sao PAYLOAD DE SERVIDOR FALSO, nao metrica
// afirmada pelo FENIX: o teste verifica que o preflight repassa o que o servidor mandou.
// (O simulation-audit marca isso como hardcoded-count neste arquivo de teste, por design.)
function fakeOllama({ tokens = ['O', 'K', '!'], gapMs = 40 } = {}) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', async () => {
        const payload = JSON.parse(body || '{}');
        if (payload.stream === false) {
          res.writeHead(200, { 'content-type': 'application/json' });
          return res.end(JSON.stringify({ response: 'OK', prompt_eval_count: 11, eval_count: 2, done: true }));
        }
        res.writeHead(200, { 'content-type': 'application/x-ndjson' });
        for (const token of tokens) {
          res.write(`${JSON.stringify({ response: token, done: false })}\n`);
          await new Promise((r) => setTimeout(r, gapMs));
        }
        res.end(`${JSON.stringify({ response: '', done: true, eval_count: tokens.length })}\n`);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

test('exit 1 when the route points at a provider that is not registered', async () => {
  // Mesma condicao que app.js:109 recusa no boot: aqui aparece antes do deploy, nao como
  // restart loop em producao.
  const { report, code } = await run([]);
  const env = { NODE_ENV: 'production', FENIX_AI_DEFAULT_PROVIDER: 'aiplatform' };
  const saved = { ...process.env };
  Object.assign(process.env, env);
  const result = await run([]);
  Object.keys(env).forEach((k) => { delete process.env[k]; });
  Object.assign(process.env, saved);
  assert.equal(result.code, 1);
  assert.equal(result.report.verdict.ok, false);
  assert.equal(result.report.verdict.stage, 'config');
  assert.match(result.report.verdict.reason, /nao esta registrado/);
  // sanidade: sem env de producao o run inicial nao explode
  assert.ok(report && typeof code === 'number');
});

test('echo never counts as a real LLM even though it returns text', async () => {
  const saved = process.env.FENIX_AI_DEFAULT_PROVIDER;
  delete process.env.FENIX_AI_DEFAULT_PROVIDER;
  const { report, code } = await run([]);
  if (saved !== undefined) process.env.FENIX_AI_DEFAULT_PROVIDER = saved;
  assert.equal(report.provider.name, 'echo');
  assert.equal(report.complete.ok, true, 'echo gera texto');
  assert.equal(report.verdict.ok, false, 'mas o veredito precisa ser negativo');
  assert.equal(code, 2);
  assert.ok(report.unverified.some((item) => /echo/.test(item)));
});

test('exit 0 with measured inference through the aiplatform contract', async () => {
  const { server, port } = await fakeGateway();
  const file = path.join(os.tmpdir(), `preflight-gw-${port}.env`);
  fs.writeFileSync(file, [
    `GRG_AIPLATFORM_URL=http://127.0.0.1:${port}`,
    'GRG_AIPLATFORM_KEY=k_test',
    'FENIX_AI_DEFAULT_PROVIDER=aiplatform',
    'FENIX_AI_DEFAULT_MODEL=qwen2.5:1.5b',
  ].join('\n'));
  const { report, code } = await run(['--env', file, '--prompt', 'Responda exatamente: OK']);
  fs.unlinkSync(file);
  server.close();
  assert.equal(code, 0);
  assert.equal(report.verdict.ok, true);
  assert.equal(report.provider.name, 'aiplatform');
  assert.equal(report.available.ok, true);
  assert.equal(report.complete.text, 'OK');
  assert.equal(report.complete.promptTokens, 11);
  // o gateway nao faz stream: precisa DIZER isso, nao fingir progressividade
  assert.equal(report.stream.progressive, false);
  assert.ok(report.unverified.some((item) => /streaming nao progressivo/.test(item)));
});

test('exit 2 when the key is rejected by a gateway that is up', async () => {
  const { server, port } = await fakeGateway({ key: 'k_right' });
  const file = path.join(os.tmpdir(), `preflight-badkey-${port}.env`);
  fs.writeFileSync(file, [
    `GRG_AIPLATFORM_URL=http://127.0.0.1:${port}`,
    'GRG_AIPLATFORM_KEY=k_wrong',
    'FENIX_AI_DEFAULT_PROVIDER=aiplatform',
  ].join('\n'));
  const { report, code } = await run(['--env', file]);
  fs.unlinkSync(file);
  server.close();
  assert.equal(code, 2);
  assert.equal(report.verdict.ok, false);
  assert.equal(report.verdict.stage, 'available');
});

test('exit 2 when the address is dead', async () => {
  const file = path.join(os.tmpdir(), 'preflight-dead.env');
  fs.writeFileSync(file, [
    'GRG_AIPLATFORM_URL=http://127.0.0.1:9',
    'GRG_AIPLATFORM_KEY=k',
    'FENIX_AI_DEFAULT_PROVIDER=aiplatform',
  ].join('\n'));
  const { report, code } = await run(['--env', file, '--timeout', '4000']);
  fs.unlinkSync(file);
  assert.equal(code, 2);
  assert.equal(report.verdict.ok, false);
});

test('ollama path honors FENIX_OLLAMA_URL and measures progressive streaming', async () => {
  // Regressao: buildProvidersFromEnv ignorava env.FENIX_OLLAMA_URL porque o DEFAULT_BASE_URL
  // do modulo e resolvido de process.env no require. O provider apontaria para 11434.
  const { server, port } = await fakeOllama();
  const file = path.join(os.tmpdir(), `preflight-ollama-${port}.env`);
  fs.writeFileSync(file, [
    'FENIX_ENABLE_OLLAMA=1',
    `FENIX_OLLAMA_URL=http://127.0.0.1:${port}`,
    'GRG_LLM_MODEL=qwen2.5:1.5b',
    'FENIX_AI_DEFAULT_PROVIDER=ollama',
  ].join('\n'));
  const { report, code } = await run(['--env', file]);
  fs.unlinkSync(file);
  server.close();
  assert.equal(code, 0);
  assert.equal(report.provider.baseUrl, `http://127.0.0.1:${port}`, 'baseUrl vem do env, nao do default');
  assert.equal(report.stream.chunks, 3);
  assert.equal(report.stream.progressive, true);
  assert.ok(report.stream.spreadMs > 0, 'tokens chegaram espacados no tempo');
});

test('secret values are never included in the report, only presence and length', async () => {
  const described = describeSecrets({ GRG_AIPLATFORM_KEY: 'super-secret-value', OPENAI_API_KEY: '' });
  assert.deepEqual(described.GRG_AIPLATFORM_KEY, { present: true, len: 18 });
  assert.deepEqual(described.OPENAI_API_KEY, { present: false });
  assert.ok(!JSON.stringify(described).includes('super-secret-value'));
});

test('report of a successful run carries no secret value anywhere', async () => {
  const { server, port } = await fakeGateway({ key: 'k_super_secret' });
  const file = path.join(os.tmpdir(), `preflight-leak-${port}.env`);
  fs.writeFileSync(file, [
    `GRG_AIPLATFORM_URL=http://127.0.0.1:${port}`,
    'GRG_AIPLATFORM_KEY=k_super_secret',
    'FENIX_AI_DEFAULT_PROVIDER=aiplatform',
  ].join('\n'));
  const { report } = await run(['--env', file]);
  fs.unlinkSync(file);
  server.close();
  assert.ok(!JSON.stringify(report).includes('k_super_secret'), 'chave nunca aparece no relatorio');
  assert.equal(report.secrets.GRG_AIPLATFORM_KEY.present, true);
});

test('env file parser ignores comments and strips one pair of quotes', async () => {
  const file = path.join(os.tmpdir(), 'preflight-parse.env');
  fs.writeFileSync(file, [
    '# comentario',
    '',
    'PLAIN=value',
    'QUOTED="quoted value"',
    "SINGLE='single'",
    'WITH_EQUALS=a=b',
    'IGNORED_NO_EQUALS',
  ].join('\n'));
  const parsed = parseEnvFile(file);
  fs.unlinkSync(file);
  assert.equal(parsed.PLAIN, 'value');
  assert.equal(parsed.QUOTED, 'quoted value');
  assert.equal(parsed.SINGLE, 'single');
  assert.equal(parsed.WITH_EQUALS, 'a=b');
  assert.equal(parsed.IGNORED_NO_EQUALS, undefined);
});
