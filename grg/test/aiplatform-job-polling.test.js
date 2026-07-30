// MEDIDO EM PRODUCAO (2026-07-30, gateway da .215): sob 5 requisicoes simultaneas o
// /v1/text responde HTTP 200 na primeira e **HTTP 202 com {jobId, queue} e sem result** nas
// outras quatro -- `concurrency: 4` no gateway. O health do FENIX roda as sondas em paralelo,
// entao a sonda de LLM caia justamente no 202 e o /health reportava
// "sem provider de LLM: chat, voz e decomposicao de objetivo indisponiveis" com o gateway de pe
// gerando texto real. Recusar o 202 era honesto e incompleto: a fila e o caminho NORMAL sob
// carga, nao uma falha.
//
// O contrato de consulta foi medido antes de escrever uma linha de cliente (6 requisicoes
// simultaneas para forcar a fila, depois 5 polls do mesmo jobId):
//
//   GET /v1/jobs/:id -> chaves=success,jobId,status,populationStatus,message,result,error,
//                       durationMs,createdAt,finishedAt,queue
//   status: "active" (sem texto) -> "completed" (com texto)
//   texto : result.result.text   <- ANINHADO DUAS VEZES
//
// Os payloads abaixo sao copias dessa medicao. O servidor local existe para exercitar o
// contrato sem depender da .215 no CI -- ele nao INVENTA o contrato, reproduz o que foi lido.
// ASCII apenas: o lexer TAP do Node 18 quebra com caractere non-ASCII na saida do teste.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const {
  AIPlatformProvider, waitForJob, textoDoJob, jobWaitConfig,
} = require('../src/ai-runtime/aiplatform-provider');

// Forma exata do 202 medido.
const RESPOSTA_202 = { success: true, jobId: 'cms7lq1ph00464qmlprfancni', queue: { queue: 'ai-jobs', concurrency: 4, jobsAhead: 3 } };

// Forma exata do poll medido em "active": result presente mas SEM texto.
const JOB_ATIVO = {
  success: true, jobId: 'cms7lq1ph00464qmlprfancni', status: 'active', populationStatus: 'ready',
  message: 'job in progress', result: null, error: null, durationMs: null,
  createdAt: '2026-07-30T13:41:02.114Z', finishedAt: null, queue: { queue: 'ai-jobs', concurrency: 4 },
};

// Forma exata do poll medido em "completed": texto em result.result.text.
const JOB_PRONTO = {
  success: true, jobId: 'cms7lq1ph00464qmlprfancni', status: 'completed', populationStatus: 'ready',
  message: 'ok', durationMs: 5192, createdAt: '2026-07-30T13:41:02.114Z', finishedAt: '2026-07-30T13:41:07.306Z',
  result: {
    model: 'qwen2.5:3b', cached: false, memory: { hit: false },
    tokens: { prompt: 11, completion: 2 },
    result: { text: 'OK' },
  },
  error: null,
};

// Sobe um gateway local que fala o contrato medido. `plano` controla o que cada rota devolve,
// para que cada teste exercite um caminho sem tocar a rede externa.
async function subirGateway(plano) {
  const chamadas = { post: 0, polls: 0 };
  const servidor = http.createServer((req, res) => {
    const responder = (codigo, corpo) => {
      res.writeHead(codigo, { 'content-type': 'application/json' });
      res.end(JSON.stringify(corpo));
    };
    if (req.method === 'POST') {
      chamadas.post += 1;
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        const r = plano.post(chamadas.post, JSON.parse(body || '{}'), req.headers);
        responder(r.codigo, r.corpo);
      });
      return;
    }
    chamadas.polls += 1;
    const r = plano.poll(chamadas.polls, req.url, req.headers);
    responder(r.codigo, r.corpo);
  });
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
  const baseUrl = `http://127.0.0.1:${servidor.address().port}`;
  return { baseUrl, chamadas, fechar: () => new Promise((r) => servidor.close(r)) };
}

function providerContra(baseUrl, env = {}) {
  return new AIPlatformProvider({
    baseUrl,
    apiKey: 'chave-de-teste',
    model: 'qwen2.5:3b',
    env: { GRG_AIPLATFORM_JOB_POLL_MS: '10', ...env },
  });
}

test('textoDoJob le o texto no caminho aninhado que foi medido, nao num caminho suposto', () => {
  assert.equal(textoDoJob(JOB_PRONTO), 'OK');
  // O caminho de um nivel so NAO existe no payload medido: se alguem "simplificar" o acesso
  // para result.text, este caso passa a devolver vazio e o teste acima quebra.
  assert.equal(textoDoJob(JOB_ATIVO), '');
  assert.equal(textoDoJob(null), '');
});

test('complete() resolve o 202 enfileirado ate o texto real do job', async () => {
  const g = await subirGateway({
    post: () => ({ codigo: 202, corpo: RESPOSTA_202 }),
    // Primeiro poll ainda ativo: prova que o cliente ESPERA em vez de aceitar o vazio.
    poll: (n) => ({ codigo: 200, corpo: n === 1 ? JOB_ATIVO : JOB_PRONTO }),
  });
  try {
    const r = await providerContra(g.baseUrl).complete({ prompt: 'responda OK' });
    assert.equal(r.text, 'OK');
    assert.equal(r.model, 'qwen2.5:3b');
    // Tokens vem do job, nao de estimativa por comprimento: 2 e o valor medido.
    assert.equal(r.completionTokens, 2);
    assert.ok(g.chamadas.polls >= 2, `esperava esperar o estado active, polls=${g.chamadas.polls}`);
  } finally { await g.fechar(); }
});

test('chat() resolve o 202 enfileirado ate o texto real do job', async () => {
  const g = await subirGateway({
    post: () => ({ codigo: 202, corpo: RESPOSTA_202 }),
    poll: () => ({ codigo: 200, corpo: JOB_PRONTO }),
  });
  try {
    const r = await providerContra(g.baseUrl).chat({ messages: [{ role: 'user', content: 'oi' }] });
    assert.equal(r.text, 'OK');
  } finally { await g.fechar(); }
});

test('available() deixa de reportar indisponivel quando a resposta apenas foi enfileirada', async () => {
  const g = await subirGateway({
    post: () => ({ codigo: 202, corpo: RESPOSTA_202 }),
    poll: (n) => ({ codigo: 200, corpo: n === 1 ? JOB_ATIVO : JOB_PRONTO }),
  });
  try {
    // Este e o caso EXATO que derrubava o /health: 202 na sonda paralela.
    assert.equal(await providerContra(g.baseUrl).available(), true);
  } finally { await g.fechar(); }
});

test('o polling manda a credencial na consulta do job', async () => {
  let headerVisto = null;
  const g = await subirGateway({
    post: () => ({ codigo: 202, corpo: RESPOSTA_202 }),
    poll: (n, url, headers) => { headerVisto = headers['x-api-key']; return { codigo: 200, corpo: JOB_PRONTO }; },
  });
  try {
    await providerContra(g.baseUrl).complete({ prompt: 'x' });
    assert.equal(headerVisto, 'chave-de-teste');
  } finally { await g.fechar(); }
});

test('job que falha vira erro alto com o motivo do gateway, nunca texto vazio', async () => {
  const g = await subirGateway({
    post: () => ({ codigo: 202, corpo: RESPOSTA_202 }),
    poll: () => ({ codigo: 200, corpo: { ...JOB_ATIVO, status: 'failed', error: 'NO_PROVIDER_AVAILABLE' } }),
  });
  try {
    await assert.rejects(
      () => providerContra(g.baseUrl).complete({ prompt: 'x' }),
      /falhou \(status=failed\).*NO_PROVIDER_AVAILABLE/,
    );
  } finally { await g.fechar(); }
});

test('job que nunca conclui estoura o teto como erro, nao como texto vazio', async () => {
  const g = await subirGateway({
    post: () => ({ codigo: 202, corpo: RESPOSTA_202 }),
    poll: () => ({ codigo: 200, corpo: JOB_ATIVO }),
  });
  try {
    await assert.rejects(
      () => providerContra(g.baseUrl, { GRG_AIPLATFORM_JOB_WAIT_MS: '120' }).complete({ prompt: 'x' }),
      /nao concluiu em 120ms.*active/,
    );
  } finally { await g.fechar(); }
});

test('job concluido sem texto e erro: completed vazio seria sucesso fabricado', async () => {
  const g = await subirGateway({
    post: () => ({ codigo: 202, corpo: RESPOSTA_202 }),
    poll: () => ({ codigo: 200, corpo: { ...JOB_PRONTO, result: { model: 'qwen2.5:3b', result: {} } } }),
  });
  try {
    await assert.rejects(() => providerContra(g.baseUrl).complete({ prompt: 'x' }), /completou sem texto/);
  } finally { await g.fechar(); }
});

test('texto fabricado que chega pelo job e recusado igual ao que chega direto', async () => {
  // O gateway e outro produto e evolui sem aviso: se um dia ele enfileirar a resposta
  // fabricada em vez de devolve-la na hora, a blindagem tem de continuar valendo.
  const g = await subirGateway({
    post: () => ({ codigo: 202, corpo: RESPOSTA_202 }),
    poll: () => ({ codigo: 200, corpo: { ...JOB_PRONTO, result: { ...JOB_PRONTO.result, result: { text: '[Fallback Response] Processado via groq' } } } }),
  });
  try {
    await assert.rejects(() => providerContra(g.baseUrl).complete({ prompt: 'x' }), /Fallback Response|fabricad/i);
  } finally { await g.fechar(); }
});

test('resposta 200 com result segue o caminho direto, sem nenhum poll', async () => {
  const g = await subirGateway({
    post: () => ({ codigo: 200, corpo: { success: true, result: { text: 'direto', tokens: { prompt: 3, completion: 1 } }, model: 'qwen2.5:3b' } }),
    poll: () => ({ codigo: 500, corpo: { erro: 'nao deveria ter sido consultado' } }),
  });
  try {
    const r = await providerContra(g.baseUrl).complete({ prompt: 'x' });
    assert.equal(r.text, 'direto');
    assert.equal(g.chamadas.polls, 0, 'o caminho sincrono nao deve consultar job');
  } finally { await g.fechar(); }
});

test('com o polling desligado a recusa alta do 202 volta a valer', async () => {
  // GRG_AIPLATFORM_JOB_WAIT_MS=0 e a valvula do operador. Desligado, o comportamento correto
  // e o anterior: erro nomeado com o jobId, nunca texto vazio em silencio.
  const g = await subirGateway({
    post: () => ({ codigo: 202, corpo: RESPOSTA_202 }),
    poll: () => ({ codigo: 200, corpo: JOB_PRONTO }),
  });
  try {
    const p = providerContra(g.baseUrl, { GRG_AIPLATFORM_JOB_WAIT_MS: '0' });
    await assert.rejects(() => p.complete({ prompt: 'x' }), /enfileirou a requisicao \(jobId=cms7lq1ph00464qmlprfancni/);
    assert.equal(await p.available(), false);
    assert.equal(g.chamadas.polls, 0);
  } finally { await g.fechar(); }
});

test('falha transitoria na consulta do job nao aborta a espera', async () => {
  const g = await subirGateway({
    post: () => ({ codigo: 202, corpo: RESPOSTA_202 }),
    // 503 no primeiro poll: gateway sob carga nao e job perdido.
    poll: (n) => (n === 1 ? { codigo: 503, corpo: { error: 'busy' } } : { codigo: 200, corpo: JOB_PRONTO }),
  });
  try {
    const r = await providerContra(g.baseUrl).complete({ prompt: 'x' });
    assert.equal(r.text, 'OK');
  } finally { await g.fechar(); }
});

test('a cadencia do polling e ajustavel por env, com default medido', () => {
  assert.deepEqual(jobWaitConfig({}), { waitMs: 120000, intervalMs: 1000 });
  assert.deepEqual(jobWaitConfig({ GRG_AIPLATFORM_JOB_WAIT_MS: '5000', GRG_AIPLATFORM_JOB_POLL_MS: '250' }), { waitMs: 5000, intervalMs: 250 });
  // Vazio (o que o compose entrega com `${VAR:-}`) nao pode virar NaN e zerar a espera.
  assert.deepEqual(jobWaitConfig({ GRG_AIPLATFORM_JOB_WAIT_MS: '', GRG_AIPLATFORM_JOB_POLL_MS: '' }), { waitMs: 120000, intervalMs: 1000 });
});

test('waitForJob exige o jobId na URL consultada', async () => {
  let urlVista = null;
  const g = await subirGateway({
    post: () => ({ codigo: 202, corpo: RESPOSTA_202 }),
    poll: (n, url) => { urlVista = url; return { codigo: 200, corpo: JOB_PRONTO }; },
  });
  try {
    await waitForJob(g.baseUrl, 'chave-de-teste', RESPOSTA_202.jobId, { waitMs: 2000, intervalMs: 10 });
    assert.equal(urlVista, `/v1/jobs/${RESPOSTA_202.jobId}`);
  } finally { await g.fechar(); }
});
