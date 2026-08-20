// MEDIDO EM PRODUCAO (2026-07-30): o entrypoint faz `export GRG_AIPLATFORM_KEY="$AI_PROVIDER_KEY"`
// -- ele SOBRESCREVE a variavel que o compose injetou do .env. O arquivo de segredo guardava a
// chave ANTIGA e o .env.production a NOVA, entao o container mostrava a chave nova em `printenv`
// e mandava a antiga na requisicao. O gateway respondia 401 INVALID_API_KEY e o /health reportava
// "sem provider de LLM: chat, voz e decomposicao de objetivo indisponiveis" -- com o gateway de pe
// gerando texto real, e com o mesmo par (container, chave) devolvendo 200 quando eu montava o
// request a mao. Toda evidencia acessivel apontava para a chave certa; a troca acontecia num
// `export` de shell que ninguem inspeciona.
//
// A precedencia (segredo montado ganha do .env) e a correta e nao muda. O que estes testes
// travam e o resto: que a troca seja ANUNCIADA quando os dois divergem, que a chave chegue mesmo
// ao processo, e que nenhum valor de segredo apareca na saida.
//
// O entrypoint e shell, entao o teste EXECUTA o script de verdade com segredos de mentira num
// diretorio temporario -- nao le o arquivo procurando padroes. Precisa de `sh` no PATH (presente
// no Git Bash do Windows e em qualquer Linux); sem ele, os casos sao pulados com motivo explicito.
// ASCII apenas: o lexer TAP do Node 18 quebra com caractere non-ASCII na saida do teste.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ENTRYPOINT = path.join(__dirname, '..', 'ops', 'container-entrypoint.sh');
const TEM_SH = spawnSync('sh', ['-c', 'exit 0'], { encoding: 'utf8' }).status === 0;

// Cria a arvore de segredos que o entrypoint espera e roda o script de verdade. O `$1` recebe um
// `sh -c` que imprime a variavel resolvida: e assim que se mede o que o processo REALMENTE veria,
// em vez de reimplementar a logica do script dentro do teste.
function rodar({ segredos = {}, env = {}, imprimir = 'GRG_AIPLATFORM_KEY' }) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-entrypoint-'));
  const dirSegredos = path.join(base, 'secrets');
  fs.mkdirSync(dirSegredos);
  const padrao = {
    postgres_password: 'pg-de-teste',
    redis_password: 'redis-de-teste',
    minio_access_key: 'minio-id',
    minio_secret_key: 'minio-secret',
    metrics_token: 'metrics-de-teste',
  };
  for (const [nome, valor] of Object.entries({ ...padrao, ...segredos })) {
    if (valor === null) continue;
    fs.writeFileSync(path.join(dirSegredos, nome), valor, { mode: 0o600 });
  }
  // O script tem /run/secrets fixo no codigo. Reescrever o caminho para o diretorio temporario e
  // a unica adaptacao -- a logica de precedencia, o case e os avisos ficam intactos.
  const script = fs.readFileSync(ENTRYPOINT, 'utf8').split('/run/secrets').join(dirSegredos.split('\\').join('/'));
  const caminhoScript = path.join(base, 'entrypoint.sh');
  fs.writeFileSync(caminhoScript, script);
  const r = spawnSync('sh', [caminhoScript, 'sh', '-c', `printf %s "$${imprimir}"`], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH, ...env },
  });
  fs.rmSync(base, { recursive: true, force: true });
  return { status: r.status, saida: r.stdout || '', erro: r.stderr || '' };
}

test('o segredo montado prevalece sobre a chave do .env, que era o comportamento pretendido', { skip: TEM_SH ? false : 'sh ausente no PATH' }, () => {
  const r = rodar({
    segredos: { ai_provider_key: 'ap_chave_do_segredo' },
    env: { FENIX_AI_DEFAULT_PROVIDER: 'aiplatform', GRG_AIPLATFORM_KEY: 'ap_chave_do_env' },
  });
  assert.equal(r.status, 0, r.erro);
  assert.equal(r.saida, 'ap_chave_do_segredo');
});

test('a divergencia entre .env e segredo e ANUNCIADA, nunca silenciosa', { skip: TEM_SH ? false : 'sh ausente no PATH' }, () => {
  // Este e o teste que existe por causa do 401: a precedencia estava certa e o silencio custou
  // uma investigacao inteira, porque `printenv` mostrava a chave que NAO seria usada.
  const r = rodar({
    segredos: { ai_provider_key: 'ap_chave_do_segredo' },
    env: { FENIX_AI_DEFAULT_PROVIDER: 'aiplatform', GRG_AIPLATFORM_KEY: 'ap_chave_do_env' },
  });
  assert.match(r.erro, /GRG_AIPLATFORM_KEY do ambiente difere/);
  assert.match(r.erro, /o segredo montado prevalece/);
});

test('o aviso de divergencia nao imprime nenhum dos dois valores', { skip: TEM_SH ? false : 'sh ausente no PATH' }, () => {
  const r = rodar({
    segredos: { ai_provider_key: 'ap_segredo_secretissimo' },
    env: { FENIX_AI_DEFAULT_PROVIDER: 'aiplatform', GRG_AIPLATFORM_KEY: 'ap_env_secretissimo' },
  });
  assert.doesNotMatch(r.erro, /ap_segredo_secretissimo/, 'o aviso vazou o segredo montado');
  assert.doesNotMatch(r.erro, /ap_env_secretissimo/, 'o aviso vazou a chave do ambiente');
});

test('sem divergencia nao ha aviso: ruido em todo boot treina o operador a ignorar', { skip: TEM_SH ? false : 'sh ausente no PATH' }, () => {
  const r = rodar({
    segredos: { ai_provider_key: 'ap_mesma_chave' },
    env: { FENIX_AI_DEFAULT_PROVIDER: 'aiplatform', GRG_AIPLATFORM_KEY: 'ap_mesma_chave' },
  });
  assert.equal(r.status, 0, r.erro);
  assert.doesNotMatch(r.erro, /difere/);
});

test('.env vazio nao gera aviso: ausente nao e divergencia', { skip: TEM_SH ? false : 'sh ausente no PATH' }, () => {
  // O compose repassa `${VAR:-}`, entao a variavel chega VAZIA quando o .env nao a define.
  // Vazio significa "sem opiniao" -- avisar aqui seria acusar o caso normal.
  const r = rodar({
    segredos: { ai_provider_key: 'ap_chave_do_segredo' },
    env: { FENIX_AI_DEFAULT_PROVIDER: 'aiplatform', GRG_AIPLATFORM_KEY: '' },
  });
  assert.equal(r.status, 0, r.erro);
  assert.equal(r.saida, 'ap_chave_do_segredo');
  assert.doesNotMatch(r.erro, /difere/);
});

test('provider remoto sem arquivo de segredo falha alto, nao sobe sem credencial', { skip: TEM_SH ? false : 'sh ausente no PATH' }, () => {
  // Sem esta recusa o container subiria e descobriria a falta de chave na primeira inferencia --
  // e o /health reportaria provider indisponivel sem dizer que a causa e de configuracao.
  const r = rodar({
    segredos: { ai_provider_key: null },
    env: { FENIX_AI_DEFAULT_PROVIDER: 'aiplatform', GRG_AIPLATFORM_KEY: 'ap_chave_do_env' },
  });
  assert.notEqual(r.status, 0, 'deveria ter falhado sem o arquivo de segredo');
  assert.match(r.erro, /requires .*ai_provider_key/);
});

test('cada provider remoto recebe a chave na variavel que o seu proprio cliente le', { skip: TEM_SH ? false : 'sh ausente no PATH' }, () => {
  // Exportar na variavel errada e uma falha silenciosa identica ao 401: o registry nao constroi
  // o provider (ou constroi sem credencial) e o health diz "sem provider" sem apontar o motivo.
  for (const [provider, variavel] of [
    ['openai', 'OPENAI_API_KEY'],
    ['codex', 'FENIX_CODEX_API_KEY'],
    ['groq', 'GROQ_API_KEY'],
    ['anthropic', 'ANTHROPIC_API_KEY'],
    ['gemini', 'GEMINI_API_KEY'],
    ['local', 'FENIX_OPENAI_COMPATIBLE_KEY'],
    ['aiplatform', 'GRG_AIPLATFORM_KEY'],
  ]) {
    const r = rodar({
      segredos: { ai_provider_key: 'ap_chave_do_segredo' },
      env: { FENIX_AI_DEFAULT_PROVIDER: provider },
      imprimir: variavel,
    });
    assert.equal(r.status, 0, `${provider}: ${r.erro}`);
    assert.equal(r.saida, 'ap_chave_do_segredo', `${provider} nao exportou em ${variavel}`);
  }
});

test('ollama nao exige chave mas exige endereco explicito', { skip: TEM_SH ? false : 'sh ausente no PATH' }, () => {
  // Dentro do container 127.0.0.1 e o proprio container, onde nao ha Ollama: o default do modulo
  // seria errado por construcao, entao o endereco e obrigatorio.
  const semUrl = rodar({ segredos: { ai_provider_key: null }, env: { FENIX_AI_DEFAULT_PROVIDER: 'ollama' } });
  assert.notEqual(semUrl.status, 0);
  assert.match(semUrl.erro, /requires FENIX_OLLAMA_URL/);

  const comUrl = rodar({
    segredos: { ai_provider_key: null },
    env: { FENIX_AI_DEFAULT_PROVIDER: 'ollama', FENIX_OLLAMA_URL: 'http://ollama:11434' },
    imprimir: 'FENIX_ENABLE_OLLAMA',
  });
  assert.equal(comUrl.status, 0, comUrl.erro);
  assert.equal(comUrl.saida, '1');
});

test('provider ausente ou desconhecido derruba o boot em vez de escolher por conta', { skip: TEM_SH ? false : 'sh ausente no PATH' }, () => {
  const ausente = rodar({ segredos: { ai_provider_key: 'ap_x' }, env: {} });
  assert.notEqual(ausente.status, 0);
  assert.match(ausente.erro, /FENIX_AI_DEFAULT_PROVIDER is required/);

  const invalido = rodar({ segredos: { ai_provider_key: 'ap_x' }, env: { FENIX_AI_DEFAULT_PROVIDER: 'inventado' } });
  assert.notEqual(invalido.status, 0);
  assert.match(invalido.erro, /unsupported FENIX_AI_DEFAULT_PROVIDER/);
});
