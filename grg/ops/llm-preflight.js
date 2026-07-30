#!/usr/bin/env node
// llm-preflight: prova que a fonte de LLM configurada por env FUNCIONA, sem subir o FENIX.
//
// Por que existe: o unico jeito de saber se o LLM responde era subir o app inteiro, que exige
// Postgres, Redis, Qdrant, MinIO e Keycloak de pe. Isso torna impossivel validar so a conexao
// -- e um health verde nao provava inferencia (era ping). Este script carrega EXATAMENTE o
// mesmo codigo que o app carrega (buildProvidersFromEnv + loadRoutes) e exercita o caminho
// completo: resolucao de rota -> available() -> complete() -> stream().
//
// Nao imprime chave nenhuma: so presenca (SET/absent) e o tamanho, nunca o valor.
//
// Uso:
//   node ops/llm-preflight.js                    # le o process.env atual
//   node ops/llm-preflight.js --env .env.production
//   node ops/llm-preflight.js --json             # saida legivel por maquina
//   node ops/llm-preflight.js --prompt "Responda exatamente: OK"
//
// Exit codes (fail-closed: silencio nunca conta como sucesso):
//   0  provider resolvido e INFERENCIA REAL medida
//   1  configuracao invalida (rota aponta para provider inexistente, env faltando)
//   2  provider configurado mas nao respondeu (rede, chave, modelo descarregado)
//   3  erro inesperado do proprio preflight

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const { buildProvidersFromEnv, loadRoutes } = require(path.join(ROOT, 'src/ai-runtime/provider-registry'));

const KEY_VARS = [
  'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'GROQ_API_KEY',
  'GRG_AIPLATFORM_KEY', 'FENIX_OPENAI_COMPATIBLE_KEY',
];
const URL_VARS = [
  'GRG_AIPLATFORM_URL', 'GRG_AIPLATFORM_MODEL', 'FENIX_OLLAMA_URL', 'GRG_OLLAMA_DIRECT_URL',
  'FENIX_OPENAI_COMPATIBLE_URL', 'FENIX_ENABLE_OLLAMA',
  'FENIX_AI_DEFAULT_PROVIDER', 'FENIX_AI_DEFAULT_MODEL', 'FENIX_AI_ROUTES_JSON',
];

function parseArgs(argv) {
  const out = { json: false, envFile: null, prompt: 'Responda exatamente: OK', route: 'default', timeoutMs: 60000 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') out.json = true;
    else if (arg === '--env') out.envFile = argv[++i];
    else if (arg === '--prompt') out.prompt = argv[++i];
    else if (arg === '--route') out.route = argv[++i];
    else if (arg === '--timeout') out.timeoutMs = Number(argv[++i]);
  }
  return out;
}

// Parser deliberadamente conservador: KEY=VALUE, ignora comentario e linha vazia, remove um
// par de aspas. Nao expande variavel nem executa nada -- um .env nao e script.
function parseEnvFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  const env = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

// Presenca medida, valor nunca. `len` existe para diferenciar chave vazia de chave truncada.
function describeSecrets(env) {
  const out = {};
  for (const name of KEY_VARS) {
    out[name] = env[name] ? { present: true, len: String(env[name]).length } : { present: false };
  }
  return out;
}

function describeUrls(env) {
  const out = {};
  for (const name of URL_VARS) if (env[name]) out[name] = env[name];
  return out;
}

async function withTimeout(promise, ms, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_resolve, reject) => { timer = setTimeout(() => reject(new Error(`${label}: timeout apos ${ms}ms`)), ms); }),
    ]);
  } finally { clearTimeout(timer); }
}

async function run(argv) {
  const args = parseArgs(argv);
  const env = args.envFile
    ? { ...process.env, ...parseEnvFile(path.resolve(args.envFile)) }
    : process.env;

  const report = {
    envFile: args.envFile ? path.resolve(args.envFile) : null,
    production: env.NODE_ENV === 'production' || env.FENIX_PRODUCTION === '1',
    config: describeUrls(env),
    secrets: describeSecrets(env),
    route: null,
    provider: null,
    available: null,
    complete: null,
    stream: null,
    verdict: null,
    unverified: [],
  };

  // 1. Rota e registry vindos do MESMO codigo do app -- se divergir aqui, divergiria no boot.
  let routes;
  let providers;
  try {
    routes = loadRoutes(env, { production: report.production });
    providers = buildProvidersFromEnv(env, { production: report.production });
  } catch (error) {
    report.verdict = { ok: false, stage: 'config', reason: error.message };
    return { report, code: 1 };
  }

  const route = routes[args.route];
  if (!route) {
    report.verdict = { ok: false, stage: 'config', reason: `rota "${args.route}" nao existe (rotas: ${Object.keys(routes).join(', ')})` };
    return { report, code: 1 };
  }
  report.route = { name: args.route, provider: route.provider, model: route.model || null };
  report.registered = Object.keys(providers).sort();

  const provider = providers[route.provider];
  if (!provider) {
    // Exatamente a condicao que app.js:109 recusa em producao. Aqui o erro chega antes do deploy.
    report.verdict = {
      ok: false,
      stage: 'config',
      reason: `rota "${args.route}" aponta para provider "${route.provider}" que nao esta registrado`,
      hint: `registrados: ${report.registered.join(', ') || '(nenhum)'} -- falta URL ou chave no env`,
    };
    return { report, code: 1 };
  }
  report.provider = {
    name: provider.name,
    baseUrl: provider.baseUrl || null,
    model: provider.model || route.model || null,
  };
  if (provider.name === 'echo') report.unverified.push('provider echo: deterministico, NAO prova LLM real');

  // 2. available() -- nos providers reais isto FAZ inferencia minima, nao ping. Nem todo
  // provider implementa (o echo nao): ausencia do metodo nao e indisponibilidade, e falta de
  // contrato. Confundir os dois daria um motivo de falha enganoso ("nao respondeu" para algo
  // que nunca foi perguntado), entao o passo e declarado skipped e complete() decide.
  if (typeof provider.available !== 'function') {
    report.available = { supported: false, reason: 'provider nao implementa available()' };
    report.unverified.push(`available(): provider "${provider.name}" nao implementa; disponibilidade inferida de complete()`);
  } else {
    const startedAvailable = process.hrtime.bigint();
    try {
      const availableOk = await withTimeout(provider.available(), args.timeoutMs, 'available');
      report.available = {
        supported: true,
        ok: Boolean(availableOk),
        latencyMs: Number((process.hrtime.bigint() - startedAvailable) / 1000000n),
      };
    } catch (error) {
      report.available = { supported: true, ok: false, error: error.message };
    }
    if (!report.available.ok) {
      report.verdict = {
        ok: false,
        stage: 'available',
        reason: report.available.error
          ? `available() de "${provider.name}" falhou: ${report.available.error}`
          : `provider "${provider.name}" configurado mas nao respondeu`,
        hint: 'verifique alcance de rede, validade da chave e se o modelo esta baixado/carregado',
      };
      return { report, code: 2 };
    }
  }

  // 3. complete() -- a prova que conta: geracao real com prompt do operador.
  const startedComplete = process.hrtime.bigint();
  try {
    const result = await withTimeout(
      provider.complete({ model: report.provider.model, prompt: args.prompt }),
      args.timeoutMs, 'complete',
    );
    const text = String(result?.text ?? '');
    report.complete = {
      ok: text.length > 0,
      latencyMs: Number((process.hrtime.bigint() - startedComplete) / 1000000n),
      model: result?.model || report.provider.model,
      promptTokens: result?.promptTokens ?? null,
      completionTokens: result?.completionTokens ?? null,
      text: text.slice(0, 400),
    };
  } catch (error) {
    report.complete = { ok: false, error: error.message };
  }
  if (!report.complete.ok) {
    report.verdict = { ok: false, stage: 'complete', reason: report.complete.error || 'geracao devolveu texto vazio' };
    return { report, code: 2 };
  }

  // 4. stream() -- o chat de voz depende de token a token. Ausencia nao reprova o preflight,
  // mas fica registrada: degradar para uma emissao unica e honesto, fingir stream nao seria.
  if (typeof provider.stream !== 'function') {
    report.stream = { supported: false, reason: 'provider nao implementa stream()' };
    report.unverified.push('streaming token a token: provider nao implementa stream()');
  } else {
    const chunks = [];
    const startedStream = process.hrtime.bigint();
    try {
      const result = await withTimeout(
        provider.stream({
          model: report.provider.model,
          prompt: args.prompt,
          onToken: (token) => chunks.push({ atMs: Number((process.hrtime.bigint() - startedStream) / 1000000n), len: String(token).length }),
        }),
        args.timeoutMs, 'stream',
      );
      // Progressividade medida, nao assumida: 1 chunk = resposta inteira de uma vez.
      const spreadMs = chunks.length > 1 ? chunks.at(-1).atMs - chunks[0].atMs : 0;
      report.stream = {
        supported: true,
        ok: String(result?.text ?? '').length > 0,
        streamed: result?.streamed === true,
        chunks: chunks.length,
        spreadMs,
        progressive: chunks.length > 1 && spreadMs > 0,
        latencyMs: Number((process.hrtime.bigint() - startedStream) / 1000000n),
        firstTokenMs: chunks.length ? chunks[0].atMs : null,
        reason: result?.reason || null,
      };
      if (!report.stream.progressive) {
        report.unverified.push(`streaming nao progressivo (${chunks.length} chunk(s)): resposta chega inteira, chat de voz sem efeito ao vivo`);
      }
    } catch (error) {
      report.stream = { supported: true, ok: false, error: error.message };
      report.unverified.push(`stream() falhou: ${error.message}`);
    }
  }

  // O echo gera texto e passaria por "geracao real" -- e exatamente o falso positivo que este
  // preflight existe para impedir. verdict.ok acompanha o exit code: nunca ok com echo.
  const isEcho = provider.name === 'echo';
  report.verdict = isEcho
    ? {
      ok: false,
      stage: 'complete',
      provider: provider.name,
      reason: 'provider echo responde deterministicamente: nao ha LLM real configurado',
      hint: 'defina FENIX_AI_DEFAULT_PROVIDER com aiplatform/ollama/openai e a URL+chave correspondente',
    }
    : {
      ok: true,
      stage: 'complete',
      provider: provider.name,
      model: report.complete.model,
      latencyMs: report.complete.latencyMs,
      note: 'inferencia real medida',
    };
  return { report, code: isEcho ? 2 : 0 };
}

function printHuman(report, code) {
  const line = (label, value) => console.log(`  ${label.padEnd(18)} ${value}`);
  console.log('\nFENIX LLM PREFLIGHT');
  console.log('===================');
  if (report.envFile) line('env', report.envFile);
  line('production', String(report.production));
  console.log('\nconfig (valores de URL/modelo):');
  const cfg = Object.entries(report.config);
  if (!cfg.length) console.log('  (nenhuma variavel de LLM definida)');
  for (const [k, v] of cfg) line(k, v);
  console.log('\nchaves (presenca, valor nunca impresso):');
  for (const [k, v] of Object.entries(report.secrets)) line(k, v.present ? `SET (${v.len} chars)` : 'absent');
  if (report.route) {
    console.log('\nrota:');
    line('nome', report.route.name);
    line('provider', report.route.provider);
    line('model', report.route.model || '(default do provider)');
    line('registrados', (report.registered || []).join(', ') || '(nenhum)');
  }
  if (report.provider) {
    console.log('\nprovider resolvido:');
    line('name', report.provider.name);
    line('baseUrl', report.provider.baseUrl || '(n/a)');
  }
  if (report.available) {
    console.log('\navailable() (inferencia minima, nao ping):');
    if (report.available.supported === false) line('suportado', `false -- ${report.available.reason}`);
    else {
      line('ok', String(report.available.ok));
      if (report.available.latencyMs != null) line('latencia', `${report.available.latencyMs} ms`);
      if (report.available.error) line('erro', report.available.error);
    }
  }
  if (report.complete) {
    console.log('\ncomplete() (geracao real):');
    line('ok', String(report.complete.ok));
    if (report.complete.latencyMs != null) line('latencia', `${report.complete.latencyMs} ms`);
    if (report.complete.model) line('model', report.complete.model);
    if (report.complete.promptTokens != null) line('tokens', `${report.complete.promptTokens} prompt / ${report.complete.completionTokens} completion`);
    if (report.complete.text) line('texto', JSON.stringify(report.complete.text));
    if (report.complete.error) line('erro', report.complete.error);
  }
  if (report.stream) {
    console.log('\nstream() (token a token):');
    if (!report.stream.supported) line('suportado', `false -- ${report.stream.reason}`);
    else {
      line('ok', String(report.stream.ok));
      line('chunks', String(report.stream.chunks ?? 0));
      line('progressivo', String(report.stream.progressive ?? false));
      if (report.stream.firstTokenMs != null) line('1o token', `${report.stream.firstTokenMs} ms`);
      if (report.stream.spreadMs != null) line('spread', `${report.stream.spreadMs} ms`);
      if (report.stream.reason) line('nota', report.stream.reason);
      if (report.stream.error) line('erro', report.stream.error);
    }
  }
  console.log('\nveredito:');
  line('ok', String(report.verdict?.ok));
  if (report.verdict?.stage) line('estagio', report.verdict.stage);
  if (report.verdict?.reason) line('motivo', report.verdict.reason);
  if (report.verdict?.hint) line('dica', report.verdict.hint);
  if (report.verdict?.note) line('nota', report.verdict.note);
  if (report.unverified.length) {
    console.log('\nNAO VERIFICADO / degradado:');
    for (const item of report.unverified) console.log(`  - ${item}`);
  }
  console.log(`\nexit ${code}\n`);
}

if (require.main === module) {
  run(process.argv.slice(2))
    .then(({ report, code }) => {
      if (parseArgs(process.argv.slice(2)).json) console.log(JSON.stringify(report, null, 2));
      else printHuman(report, code);
      process.exit(code);
    })
    .catch((error) => {
      console.error(`preflight falhou: ${error.stack || error.message}`);
      process.exit(3);
    });
}

module.exports = { run, parseEnvFile, describeSecrets };
