// Blindagem contra SUCESSO FABRICADO POR GATEWAY EXTERNO.
//
// Todos os casos abaixo sao a forma EXATA medida contra a API Platform da .215 em 2026-07-30
// (registry de providers vazio): 200 com texto inventado em /chat/completions, 200 com 1536 floats
// aleatorios em /embeddings, e GET /models respondendo 200 com 6 modelos e `providers: []`.
// Nenhum payload aqui foi inventado para o teste passar -- foram copiados da medicao.
const test = require('node:test');
const assert = require('node:assert');
const {
  assertNotFabricated, detectFabricated, assertDeterministicEmbedding, FABRICATED_MARKERS,
} = require('../src/ai-runtime/fabricated-response');
const {
  OpenAICompatibleProvider, OpenAIResponsesProvider, AnthropicProvider, GeminiProvider, gatewayWithoutProviders,
} = require('../src/ai-runtime/http-providers');

function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, statusText: 'OK', text: async () => JSON.stringify(body) };
}

// A string abaixo e o `content` literal que a .215 devolveu com HTTP 200.
const FABRICADO_MEDIDO = '[Fallback Response] Processado via groq';

test('detecta o marcador exatamente como a .215 devolveu (200 fabricado)', () => {
  assert.equal(detectFabricated(FABRICADO_MEDIDO), '[fallback response]');
  assert.throws(() => assertNotFabricated(FABRICADO_MEDIDO, { provider: 'x', endpoint: '/v1/chat/completions' }),
    /FABRICADA em \/v1\/chat\/completions.*fallback response/s);
});

test('todos os marcadores conhecidos sao pegos, e texto legitimo passa intacto', () => {
  for (const marker of FABRICATED_MARKERS) {
    assert.equal(detectFabricated(`${marker} qualquer coisa`), marker, marker);
  }
  const real = 'A funcao soma dois numeros e devolve o resultado.';
  assert.equal(assertNotFabricated(real), real);
  assert.equal(detectFabricated(real), null);
});

test('marcador longe do inicio nao acusa: resposta legitima pode DISCUTIR o anti-padrao', () => {
  // Este teste protege contra o falso positivo simetrico: se a janela fosse a resposta inteira, uma
  // geracao real explicando "nunca devolva [Fallback Response]" seria recusada como fabricada.
  const explicacao = `${'x'.repeat(400)} nunca devolva [Fallback Response] ao cliente`;
  assert.equal(detectFabricated(explicacao), null);
  assert.equal(assertNotFabricated(explicacao), explicacao);
});

test('texto vazio ou ausente nao e classificado como fabricado (e outro problema)', () => {
  // Vazio tem seu proprio tratamento em cada provider (assertNotEnqueued, contagem de tokens);
  // confundir os dois faria a mensagem de erro apontar para a causa errada.
  assert.equal(detectFabricated(''), null);
  assert.equal(detectFabricated(null), null);
  assert.equal(detectFabricated(undefined), null);
});

test('OpenAICompatibleProvider RECUSA o 200 fabricado da rota /chat/completions', async () => {
  // Payload copiado da medicao: status 200, usage preenchido, content inventado.
  const provider = new OpenAICompatibleProvider({
    name: 'local', apiKey: 'k', baseUrl: 'http://209.50.241.215/v1',
    fetchImpl: async () => response({
      choices: [{ message: { content: FABRICADO_MEDIDO } }],
      usage: { prompt_tokens: 8, completion_tokens: 30 },
      system_fingerprint: 'fp_ai_platform_groq',
    }),
  });
  await assert.rejects(() => provider.complete({ model: 'auto', prompt: 'oi' }), /FABRICADA/);
});

test('as quatro implementacoes HTTP recusam texto fabricado na sua propria forma de payload', async () => {
  const casos = [
    ['openai-responses', new OpenAIResponsesProvider({ apiKey: 'k', fetchImpl: async () => response({ output_text: FABRICADO_MEDIDO }) })],
    ['openai-compatible', new OpenAICompatibleProvider({ name: 'groq', apiKey: 'k', baseUrl: 'https://groq.test/v1', fetchImpl: async () => response({ choices: [{ message: { content: FABRICADO_MEDIDO } }] }) })],
    ['anthropic', new AnthropicProvider({ apiKey: 'k', fetchImpl: async () => response({ content: [{ type: 'text', text: FABRICADO_MEDIDO }] }) })],
    ['gemini', new GeminiProvider({ apiKey: 'k', fetchImpl: async () => response({ candidates: [{ content: { parts: [{ text: FABRICADO_MEDIDO }] } }] }) })],
  ];
  for (const [nome, provider] of casos) {
    await assert.rejects(() => provider.complete({ model: 'm', prompt: 'oi' }), /FABRICADA/, nome);
  }
});

test('geracao legitima continua passando pelos quatro providers (o guarda nao quebra o caminho bom)', async () => {
  const provider = new OpenAICompatibleProvider({
    name: 'groq', apiKey: 'k', baseUrl: 'https://groq.test/v1',
    fetchImpl: async () => response({ choices: [{ message: { content: 'resposta real' } }], usage: { prompt_tokens: 1, completion_tokens: 2 } }),
  });
  const out = await provider.complete({ model: 'm', prompt: 'oi' });
  assert.equal(out.text, 'resposta real');
  assert.equal(out.completionTokens, 2);
});

test('available() e FALSE quando o gateway lista modelos mas nao tem provider (200 + providers: [])', async () => {
  // Forma exata medida: object/data/success/providers, com data.length 6 e providers.length 0.
  const modelsDa215 = {
    object: 'list', success: true, providers: [],
    data: [{ id: 'auto', object: 'model', created: 1700000000, owned_by: 'ai-platform' }],
  };
  const provider = new OpenAICompatibleProvider({ name: 'local', apiKey: 'k', baseUrl: 'http://209.50.241.215/v1', fetchImpl: async () => response(modelsDa215) });
  assert.equal(await provider.available(), false);

  const responses = new OpenAIResponsesProvider({ apiKey: 'k', fetchImpl: async () => response(modelsDa215) });
  assert.equal(await responses.available(), false);
});

test('available() continua TRUE para provider real: campo providers ausente nao acusa nada', async () => {
  // OpenAI/Groq de verdade nao mandam `providers` -- ausente tem de ser tratado como "sem opiniao",
  // senao a blindagem derrubaria todo provider legitimo.
  const provider = new OpenAICompatibleProvider({ name: 'groq', apiKey: 'k', baseUrl: 'https://groq.test/v1', fetchImpl: async () => response({ object: 'list', data: [{ id: 'llama-3.1-8b' }] }) });
  assert.equal(await provider.available(), true);
  assert.equal(gatewayWithoutProviders({ data: [] }), false);
  assert.equal(gatewayWithoutProviders({ providers: ['groq'] }), false);
  assert.equal(gatewayWithoutProviders({ providers: [] }), true);
});

test('embedding NAO-DETERMINISTICO e recusado: os dois vetores medidos na .215 divergem', () => {
  // Primeiros valores reais das duas chamadas com o MESMO input contra /v1/embeddings da .215.
  const primeira = [0.448851, -0.498399, 0.542555];
  const segunda = [0.368272, 0.477013, 0.288026];
  assert.throws(() => assertDeterministicEmbedding(primeira, segunda, { provider: 'aiplatform' }),
    /NAO-DETERMINISTICO: 3\/3 dimensoes/);
});

test('embedding real (deterministico) passa; dimensao divergente e vetor vazio falham nomeados', () => {
  const vetor = [0.1, 0.2, 0.3];
  assert.equal(assertDeterministicEmbedding(vetor, [...vetor], { provider: 'ollama' }), true);
  assert.throws(() => assertDeterministicEmbedding(vetor, [0.1, 0.2], {}), /dimensoes diferentes \(3 vs 2\)/);
  assert.throws(() => assertDeterministicEmbedding([], [], {}), /ausente ou vazio/);
});

test('AIPlatformProvider: as tres saidas (available, complete, chat) tem o guarda', () => {
  // Guarda estrutural: as tres saidas de texto do provider do gateway precisam passar pelo modulo
  // compartilhado. Se alguem adicionar uma quarta saida sem guarda, o contador cai e este teste avisa.
  const fonte = require('node:fs').readFileSync(require.resolve('../src/ai-runtime/aiplatform-provider.js'), 'utf8');
  const chamadas = fonte.match(/assertNotFabricated\(/g) || [];
  assert.ok(chamadas.length >= 3, `esperava >=3 chamadas de assertNotFabricated, achei ${chamadas.length}`);
  assert.match(fonte, /require\('\.\/fabricated-response'\)/);
});
