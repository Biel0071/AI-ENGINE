// MEDIDO EM PRODUCAO (2026-07-29): `FENIX_MISSION_AUTOSTART=1` estava no .env.production, o
// deploy reportou sucesso, e o scheduler seguiu desligado. Motivo: o bloco `environment` do
// compose e uma ALLOWLIST -- nada chega ao container sem estar listado nele. Nenhuma variavel
// de cadencia do runtime estava na lista, entao `/proc/1/environ` do worker nao tinha UMA
// unica var de missao. Todo `FENIX_*` que o codigo le de `process.env` para decidir
// comportamento em producao era inerte, e o operador nao tinha como perceber: o .env dizia
// uma coisa e o processo via outra.
//
// Este teste le o compose como texto e cruza com o que o codigo do runtime realmente le. Nao
// prova que o Docker repassa (isso o Docker faz); prova que a lista nao ficou para tras
// quando alguem adicionar a proxima variavel.
// ASCII apenas: o lexer TAP do Node 18 quebra com caractere non-ASCII na saida do teste.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const compose = fs.readFileSync(path.join(RAIZ, 'docker-compose.enterprise.yml'), 'utf8');

// Fonte da verdade: as variaveis que o worker e o store leem para decidir comportamento.
// Se o codigo passar a ler uma nova, ela aparece aqui e o teste cobra a entrada no compose.
function envLidasPor(...arquivosRelativos) {
  const nomes = new Set();
  for (const relativo of arquivosRelativos) {
    const fonte = fs.readFileSync(path.join(RAIZ, relativo), 'utf8');
    for (const achado of fonte.matchAll(/(?:env|process\.env)\.(FENIX_[A-Z0-9_]+)/g)) nomes.add(achado[1]);
  }
  return [...nomes];
}

test('every FENIX_* the runtime reads is passed through by the compose allowlist', () => {
  // MEDIDO EM PRODUCAO (rc.22): a mesma lacuna reapareceu fora do worker.
  // cognitive-encryption le FENIX_ENCRYPTION_KEY e FENIX_PUBLIC_URL para decidir se a chave
  // e gerenciada e se ha evidencia de TLS -- nenhuma das duas estava na allowlist, entao o
  // container reportava ACTIVE_UNMANAGED_KEY por AUSENCIA DE REPASSE, nao por escolha do
  // operador. O teste cobria apenas worker+store; qualquer outro modulo que leia env ficava
  // fora. Incluir a seguranca aqui e o minimo: e onde o silencio custa mais caro.
  const lidas = envLidasPor(
    'src/runtime/worker.js',
    'src/infrastructure/database/postgres-store.js',
    'src/security/cognitive-encryption.js',
  );
  assert.ok(lidas.length >= 8, `esperava varias variaveis de runtime, achei ${lidas.length}`);
  const faltando = lidas.filter((nome) => !new RegExp(`^\\s+${nome}:`, 'm').test(compose));
  assert.deepEqual(faltando, [], `variaveis lidas pelo runtime e ausentes do compose (inertes em producao): ${faltando.join(', ')}`);
});

// MEDIDO EM PRODUCAO (2026-07-30): a lacuna reapareceu numa variavel que o teste acima NAO PODIA
// pegar -- ele so varre nomes `FENIX_*`, e o provider do gateway le `GRG_AIPLATFORM_*`. A URL
// estava na allowlist, a KEY nao. `AIPlatformProvider.available()` comeca com
// `if (!this.baseUrl || !this.#apiKey) return false`, entao o FENIX reportava
// "sem provider de LLM: chat, voz e decomposicao de objetivo indisponiveis" com o gateway de pe,
// gerando texto real -- sem NUNCA emitir um request. Falha silenciosa de configuracao, nao de rede.
test('every provider env the AI runtime reads is passed through by the compose allowlist', () => {
  const fontes = [
    'src/ai-runtime/provider-registry.js',
    'src/ai-runtime/aiplatform-provider.js',
    'src/ai-runtime/ollama-provider.js',
    'src/security/secret-resolver.js',
  ];
  const nomes = new Set();
  for (const relativo of fontes) {
    const caminho = path.join(RAIZ, relativo);
    if (!fs.existsSync(caminho)) continue;
    const fonte = fs.readFileSync(caminho, 'utf8');
    // Nomes de provider externo: GRG_* e FENIX_* lidos de env/process.env.
    for (const achado of fonte.matchAll(/(?:env|process\.env)\.((?:GRG|FENIX)_[A-Z0-9_]+)/g)) nomes.add(achado[1]);
    // O secret-resolver usa uma allowlist de nomes para suportar env e arquivos
    // montados; esses nomes continuam sendo parte do contrato do container.
    for (const achado of fonte.matchAll(/['"](GRG_AIPLATFORM_[A-Z0-9_]+)['"]/g)) nomes.add(achado[1]);
  }
  assert.ok(nomes.size >= 4, `esperava varias variaveis de provider, achei ${nomes.size}`);
  // A chave e o par indissociavel da URL: sem ela o provider nunca tenta.
  assert.ok(nomes.has('GRG_AIPLATFORM_KEY'), 'o resolvedor canonico deveria ler GRG_AIPLATFORM_KEY');
  const faltando = [...nomes].filter((nome) => !new RegExp(`^\\s+${nome}:`, 'm').test(compose));
  assert.deepEqual(faltando, [], `env de provider lida pelo codigo e ausente do compose (inerte em producao): ${faltando.join(', ')}`);
});

test('container liveness is lightweight and deep provider health remains separate', () => {
  const apiSection = compose.match(/\r?\n  api:\r?\n([\s\S]*?)\r?\n  worker:\r?\n/)?.[1] || '';
  assert.match(apiSection, /\/api\/system\/boot-status/, 'a liveness da API deve medir processo e kernel');
  assert.doesNotMatch(apiSection, /fetch\(['"]http:\/\/127\.0\.0\.1:4400\/health/, 'a liveness nao deve aguardar inferencia externa');
});

test('the retention knobs that dominate document bytes are tunable without a rebuild', () => {
  // O custo de TODA escrita cresce com o tamanho do documento (reserializado inteiro sob
  // SERIALIZABLE: 5,4 MB -> ~0,9 s por update no-op). `kernel/retention.js` ja le
  // FENIX_RETENTION_<COLECAO>, mas sem estar no compose o ajuste nao chega ao processo -- e
  // baixar um teto passa a exigir rebuild+deploy em vez de um restart.
  // As colecoes abaixo sao as que dominaram os bytes na medicao de producao.
  for (const colecao of ['AUDIT_EVENTS', 'DOMAIN_EVENTS', 'RUNTIME_JOBS', 'RESOURCE_VERSIONS']) {
    assert.match(compose, new RegExp(`^\\s+FENIX_RETENTION_${colecao}:`, 'm'), `FENIX_RETENTION_${colecao} nao chega ao container`);
  }
});

test('the worker inherits the same environment block as the api', () => {
  // O worker usa o ancora do api (`*fenix-environment`). Se alguem der um bloco proprio ao
  // worker, a divergencia volta pela porta de tras: API com a variavel, worker sem.
  assert.match(compose, /worker:[\s\S]*?environment: \*fenix-environment/);
});

// MEDIDO EM PRODUCAO (2026-07-29, imediatamente apos a correcao acima): repassar a variavel
// pelo compose com `${VAR:-}` faz uma variavel AUSENTE no .env chegar ao container como STRING
// VAZIA em vez de nao existir. `RedisLease` define `ownerId = crypto.randomUUID()` como default
// de PARAMETRO -- que so vale para `undefined`. A string vazia atravessou, virou o id do worker,
// e o job-engine passou a recusar cada ciclo com "workerId is required": fila parada.
// A defesa e no consumidor (`|| undefined`), nao no compose: e o consumidor que sabe se vazio
// e um valor legitimo.
test('env vars forwarded raw to a default parameter are normalized, not passed empty', () => {
  const fonte = fs.readFileSync(path.join(RAIZ, 'src/runtime/worker.js'), 'utf8');
  // Repasse "cru" = a env vai direto para um argumento, sem `||`, `??` ou `Number(...)` que
  // ja tratariam o vazio. Cada um desses e um default de parametro esperando ser furado.
  // O nome da env precisa ser consumido inteiro antes do lookahead: `[A-Z0-9_]+` e guloso mas
  // recua, e sem a fronteira `\b` o lookahead casava DENTRO do nome (`FENIX_WORKER_I` + `D`),
  // acusando exatamente a linha ja corrigida. Comparacao (`===`) tambem e tratamento: `'' === '1'`
  // e false, que e o default correto.
  const crus = [...fonte.matchAll(/(\w+):\s*env\.(FENIX_[A-Z0-9_]+)\b(?!\s*(?:\|\||\?\?|===|!==|==|!=))/g)]
    .map((achado) => `${achado[1]}: env.${achado[2]}`);
  assert.deepEqual(crus, [], `env repassada crua para argumento (vazio != ausente): ${crus.join(', ')}`);
});

test('runtime tuning variables are optional, never required', () => {
  // `${VAR:?...}` derruba o compose inteiro quando a variavel falta. Cadencia tem default no
  // codigo: exigir no compose transformaria um ajuste opcional em requisito de deploy.
  for (const nome of ['FENIX_MISSION_AUTOSTART', 'FENIX_WORKER_POLL_MS', 'FENIX_STORE_RETRY_BASE_MS']) {
    const linha = new RegExp(`^\\s+${nome}: (.*)$`, 'm').exec(compose);
    assert.ok(linha, `${nome} ausente do compose`);
    assert.doesNotMatch(linha[1], /:\?/, `${nome} nao pode ser obrigatoria no compose`);
  }
});
