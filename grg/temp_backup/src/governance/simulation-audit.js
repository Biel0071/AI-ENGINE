const fs = require('node:fs');
const path = require('node:path');

// FASE 1 — Auditoria automatica de simulacao.
// Varre src/ e classifica cada modulo por evidencia no proprio codigo, em vez de
// depender de alguem ler os arquivos. Detecta a assinatura de stub do FENIX:
// `authorize(...)` seguido de `return { ...literais... }` sem tocar em nenhuma fonte real.

const CLASSES = { PRODUCTION: 'production', IMPLEMENTED: 'implemented', PARTIAL: 'partial', STUB: 'stub', SIMULATED: 'simulated' };

// Sinais de trabalho real: I/O, rede, cripto, processo, medicao declarada.
const REAL_SIGNALS = [
  { id: 'filesystem', rx: /require\(['"]node:fs['"]\)|fs\.(readFile|writeFile|existsSync|readdir|statfs|createReadStream)/ },
  { id: 'http-client', rx: /require\(['"]node:(https?)['"]\)|\bfetch\(/ },
  { id: 'child-process', rx: /require\(['"]node:child_process['"]\)|execSync|spawn\(/ },
  { id: 'crypto', rx: /require\(['"]node:crypto['"]\)|createHash|randomBytes|scrypt|timingSafeEqual/ },
  { id: 'os-metrics', rx: /require\(['"]node:os['"]\)|process\.(memoryUsage|uptime|cpuUsage)/ },
  { id: 'store-read', rx: /this\.store\.(read|update)\(/ },
  { id: 'external-driver', rx: /require\(['"](pg|redis|bullmq|jose|@aws-sdk)/ },
  { id: 'measurement', rx: /require\(['"].*kernel\/measurement['"]\)|\bmeasured\(|\bunknown\(|\bcollect\(/ },
];

// Sinais de simulacao: numeros e status de saude inventados no proprio literal.
//
// Os quatro ultimos padroes foram adicionados depois que o auditor deixou passar
// cognitive-laws-engine.js — o pior modulo do lote, que devolvia law001Compliant:
// true incondicional e nove ganhos percentuais inventados como STRING ('+14.2%',
// '-40.0%'). Nenhum dos padroes originais casava com aquilo. Metrica falsa em string
// e booleano de aprovacao fixo eram pontos cegos.
const FAKE_SIGNALS = [
  // Selo de saude/verificacao escrito a mao. Estes NAO sao resultado de operacao: sao
  // afirmacoes sobre o estado do mundo ('esta saudavel', 'foi verificado'), e so podem
  // vir de um probe. O prefixo negativo e excluido de proposito — 'UNVERIFIED' e
  // 'NOT_VERIFIED' sao exatamente a resposta honesta que a Regra 2 exige, e antes desta
  // exclusao o auditor punia quem escrevia a verdade (keos/universal-adapters.js).
  { id: 'hardcoded-status', rx: /status:\s*['"](?!UN|NOT_|NO_)(HEALTHY|ALL_[A-Z_]*PASSED|GREEN_PASS|[A-Z_]*SUCCESSFUL|[A-Z_]*OPERATIONAL|[A-Z_]*VERIFIED)['"]/g },
  // Estado TERMINAL de uma execucao (COMPLETED/PASSED/SUCCEEDED). Diferente do selo
  // acima, este e legitimo quando escrito DEPOIS de a operacao ter rodado — e o que
  // qualquer maquina de estado faz. O discriminador e estrutural: um modulo que grava
  // sucesso e tambem grava FAILED/ERROR tem os dois ramos, logo o valor decorre do
  // resultado. Quem so sabe dizer "sucesso" esta declarando, nao observando.
  { id: 'hardcoded-outcome', rx: /status:\s*['"](COMPLETED|PASSED|SUCCEEDED)['"]/g, unlessFailureBranch: true },
  // score/indice/percentual com valor fixo
  { id: 'hardcoded-score', rx: /(Score|Index|Pct|Percent|Percentage|Ratio|Rate)\w*:\s*\d+(\.\d+)?/g },
  // contadores inventados. Zero e excluido de proposito: `fakeSignalCount: 0` e um
  // acumulador comecando vazio, e contagem zero nunca e uma alegacao inflada.
  // Tambem excluido: um `count: 1` isolado num modulo que faz `.count += 1` — ali o
  // valor e o estado inicial de um contador VIVO (o rate limiter de security-plane.js),
  // nao uma contagem reportada. A exclusao vale so para o valor 1: `count: 15` continua
  // sendo alegacao, mesmo num modulo que incrementa.
  { id: 'hardcoded-count', rx: /(total|count|Count|active|idle|passed|failed)\w*:\s*[1-9]\d*/g, dropIfIncremented: /:\s*1$/ },
  // aleatoriedade apresentada como medicao
  { id: 'random-as-metric', rx: /Math\.random\(\)/g },
  // percentual formatado como string: '+14.2%', '-40.0%'. Escapa de hardcoded-score
  // porque o valor nao e numerico.
  { id: 'hardcoded-percent-string', rx: /:\s*['"][+-]\s*\d+(\.\d+)?\s*%['"]/g },
  // aprovacao/conformidade/validade afirmada como literal true
  { id: 'hardcoded-verdict', rx: /\b\w*(Compliant|Approved|Verified|Valid|Passed|Healthy|Ready|Success)\w*:\s*true\b/g },
  // ganho/delta/melhoria com valor fixo — a metrica que justifica uma decisao
  { id: 'hardcoded-delta', rx: /\b\w*(Gain|Delta|Reduced|Improvement|Savings|Saved)\w*:\s*['"]?[+-]?\d+(\.\d+)?/g },
  // Confianca/precisao ALTA fixa: confidence: 0.96, accuracy: 0.99. O limite de 0.9
  // e deliberado — `confidence: 0.5` como valor inicial de uma entidade nova e um
  // default honesto ("nao sei"), enquanto 0.95+ afirma certeza que ninguem mediu.
  { id: 'hardcoded-confidence', rx: /\b(confidence|accuracy|precision|probability|certainty)\w*:\s*(0\.9[1-9]\d*|1\.0+|0\.9{2,})\b/gi },
  // Os quatro padroes abaixo entraram depois que autonomous-research.js, external-search.js
  // e cognitive-council.js passaram LIMPOS pelo auditor. Eram os piores modulos vivos e
  // nenhum sinal existente casava com eles.
  //
  // Vazao/TTFB escritos a mao: throughputRps 12500. Estes nomes so existem como
  // resultado de execucao — ao contrario de `durationMs` ou `timeoutMs`, que sao
  // ENTRADAS legitimas (estimativa de plano, timeout, intervalo de agendamento).
  // A distincao importa: incluir nomes de entrada faria o auditor punir a tabela
  // ESTIMATES do mission-planner, e todo falso positivo pressiona o codigo a mentir.
  { id: 'hardcoded-benchmark', rx: /\b\w*(throughput|ttfb|Rps|Qps|OpsPerSec)\w*:\s*\d+(\.\d+)?/g },
  // A assinatura de um benchmark inventado: o par antes/depois. `latencyBeforeMs: 140`
  // nao pode ser configuracao — "latencia antes" so existe se alguem cronometrou antes.
  { id: 'hardcoded-benchmark-delta', rx: /\b\w*(latency|duration|elapsed|response|memory|cpu)(Before|After|Baseline|Optimized)\w*:\s*\d+(\.\d+)?/gi },
  // Promocao/publicacao afirmada como literal true. `promotedToGenome: true` dizia que a
  // capsule foi promovida num modulo que nunca chamou o genoma. Diferente de
  // hardcoded-verdict (que cobre aprovacao), este cobre EFEITO COLATERAL declarado.
  // A lista e curta de proposito: `alreadyInstalled: true` derivado de um registro lido
  // no store e um fato, nao uma alegacao.
  //
  // `dropIfNegated` aplica aqui a mesma logica estrutural de `unlessFailureBranch`: quem
  // devolve `reused: true` num ramo e `reused: false` no outro esta reportando o
  // resultado de uma consulta (repository-intelligence.js faz exatamente isso com o
  // snapshot ja existente). Quem so sabe dizer `true` esta declarando.
  { id: 'hardcoded-side-effect', rx: /\b\w*(promoted|published|distilled|synthesized|reused)\w*:\s*true\b/gi, dropIfNegated: true },
  // Confiabilidade/relevancia de fonte alta fixa: reliability 0.98, relevance 0.95.
  // Mesmo limite de 0.9 e mesma razao do hardcoded-confidence.
  { id: 'hardcoded-reliability', rx: /\b(reliability|relevance|trust|quality|fidelity)\w*:\s*(0\.9[1-9]\d*|1\.0+)\b/gi },
  // Voto ou consenso fixo. Um portao de governanca que sempre aprova produz rastro de
  // auditoria falso — e pior que nao ter portao. `unanimous: true` num literal significa
  // que ninguem foi consultado.
  { id: 'hardcoded-vote', rx: /\bvote:\s*['"](APPROVED|APPROVE|YES|PASS)['"]|\bunanimous:\s*true\b/g },
];

function listJsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listJsFiles(full));
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

// Remove comentarios antes de procurar sinais falsos. Sem isto, documentar um padrao
// conta como comete-lo: este proprio arquivo era flagrado pelos exemplos que cita
// ('+14.2%', confidence: 0.96), e todo comentario explicando uma metrica removida
// virava uma violacao nova.
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function auditFile(filePath, source) {
  // Sinais REAIS sao buscados no fonte completo (requires e chamadas nunca estao em
  // comentario relevante); sinais FALSOS apenas no codigo executavel.
  const code = stripComments(source);
  const real = REAL_SIGNALS.filter((s) => s.rx.test(source)).map((s) => s.id);
  // Um modulo que tambem grava FAILED/ERROR/REJECTED tem os dois ramos: ali o estado
  // terminal decorre do resultado da operacao, nao de uma escolha do autor.
  // Ramo nao-bem-sucedido: falha (FAILED/ERROR) ou conclusao incompleta declarada
  // honestamente (PARTIAL/SKIPPED/NOT_EXECUTED/BLOCKED). Os segundos entram porque um
  // modulo que sabe dizer "so 2 de 6 estagios rodaram" esta derivando o status do
  // estado observado — foi o caso de autonomous-agent-ecosystem, onde
  // `provided === stages.length ? 'COMPLETED' : 'PARTIAL'` era lido como literal fixo.
  const NEGATIVE_STATUS = /(FAILED|ERROR|FAILURE|REJECTED|CANCELLED|TIMEOUT|PARTIAL|SKIPPED|NOT_EXECUTED|BLOCKED)/;
  const hasFailureBranch = new RegExp(`status:\\s*['"]${NEGATIVE_STATUS.source}['"]|status\\s*=\\s*['"]${NEGATIVE_STATUS.source}['"]|\\?\\s*['"][A-Z_]+['"]\\s*:\\s*['"]${NEGATIVE_STATUS.source}['"]`).test(code);
  // Contador vivo: o modulo incrementa o campo em algum lugar.
  const incrementsCounter = /\.(count|total)\w*\s*(\+=|\+\+)/.test(code);
  const fake = [];
  for (const signal of FAKE_SIGNALS) {
    if (signal.unlessFailureBranch && hasFailureBranch) continue;
    let matches = code.match(signal.rx);
    if (matches && signal.dropIfIncremented && incrementsCounter) {
      matches = matches.filter((sample) => !signal.dropIfIncremented.test(sample));
      if (!matches.length) matches = null;
    }
    // Mesmo campo devolvido tambem como `false` em outro ponto do arquivo: sao os dois
    // ramos de uma consulta, nao uma alegacao. `reused: true` / `reused: false` em
    // repository-intelligence.js decorre de achar ou nao um snapshot no store.
    if (matches && signal.dropIfNegated) {
      matches = matches.filter((sample) => {
        const field = sample.split(':')[0].trim();
        return !new RegExp(`\\b${field}:\\s*false\\b`).test(code);
      });
      if (!matches.length) matches = null;
    }
    if (matches) fake.push({ id: signal.id, occurrences: matches.length, samples: matches.slice(0, 3) });
  }

  // A assinatura classica: autoriza e devolve literal, sem ler nada.
  const authorizeThenLiteral = /authorize\([^)]*\);\s*return\s*\{/.test(source);
  const usesMeasurement = real.includes('measurement');
  const fakeCount = fake.reduce((sum, f) => sum + f.occurrences, 0);

  let classification;
  if (usesMeasurement && fakeCount === 0) classification = CLASSES.PRODUCTION;
  else if (authorizeThenLiteral && real.length === 0) classification = CLASSES.SIMULATED;
  else if (real.length === 0 && fakeCount > 0) classification = CLASSES.STUB;
  else if (fakeCount > 0 && real.length > 0) classification = CLASSES.PARTIAL;
  else if (real.length > 0) classification = CLASSES.IMPLEMENTED;
  else classification = CLASSES.PARTIAL;

  return {
    file: filePath,
    classification,
    realSignals: real,
    fakeSignals: fake,
    fakeSignalCount: fakeCount,
    authorizeThenLiteral,
    lines: source.split('\n').length,
  };
}

// Pior classificacao manda: um modulo com um arquivo simulado nao e "implementado".
const SEVERITY = [CLASSES.PRODUCTION, CLASSES.IMPLEMENTED, CLASSES.PARTIAL, CLASSES.STUB, CLASSES.SIMULATED];

function auditTree(srcDir) {
  const files = listJsFiles(srcDir).map((full) => auditFile(path.relative(srcDir, full).replace(/\\/g, '/'), fs.readFileSync(full, 'utf8')));

  const modules = new Map();
  for (const result of files) {
    const moduleName = result.file.includes('/') ? result.file.split('/')[0] : '(root)';
    if (!modules.has(moduleName)) modules.set(moduleName, { module: moduleName, files: [], fakeSignalCount: 0 });
    const entry = modules.get(moduleName);
    entry.files.push(result);
    entry.fakeSignalCount += result.fakeSignalCount;
  }

  const moduleReports = [...modules.values()].map((entry) => {
    const worst = entry.files.reduce((acc, f) => (SEVERITY.indexOf(f.classification) > SEVERITY.indexOf(acc) ? f.classification : acc), CLASSES.PRODUCTION);
    return {
      module: entry.module,
      classification: worst,
      fileCount: entry.files.length,
      fakeSignalCount: entry.fakeSignalCount,
      // Arquivos que puxam a nota do modulo para baixo — a lista de trabalho real.
      offenders: entry.files
        .filter((f) => f.classification === CLASSES.STUB || f.classification === CLASSES.SIMULATED)
        .map((f) => ({ file: f.file, fakeSignals: f.fakeSignals.map((s) => s.id), count: f.fakeSignalCount }))
        .sort((a, b) => b.count - a.count),
      // Todo arquivo com sinal falso, mesmo dentro de um modulo PARTIAL. `offenders` so
      // lista os que ja sao STUB/SIMULATED, e foi por essa fenda que 20 metricas
      // inventadas sobreviveram ao Sprint A: os modulos tinham saido da lista negra,
      // os arquivos nao. Aqui vai a amostra, para a mensagem de falha ser acionavel.
      dirtyFiles: entry.files
        .filter((f) => f.fakeSignalCount)
        .map((f) => ({ file: f.file, count: f.fakeSignalCount, signals: f.fakeSignals.map((s) => `${s.id}=${s.samples[0]}`) }))
        .sort((a, b) => b.count - a.count),
    };
  }).sort((a, b) => b.fakeSignalCount - a.fakeSignalCount);

  const byClass = {};
  for (const c of SEVERITY) byClass[c] = moduleReports.filter((m) => m.classification === c).length;

  return {
    scannedAt: new Date().toISOString(),
    srcDir,
    totals: {
      modules: moduleReports.length,
      files: files.length,
      byClassification: byClass,
      totalFakeSignals: files.reduce((sum, f) => sum + f.fakeSignalCount, 0),
    },
    modules: moduleReports,
  };
}

class SimulationAuditService {
  constructor({ store, bus, controlPlane, srcDir = path.join(__dirname, '..') }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.srcDir = srcDir;
  }

  async audit(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    const report = auditTree(this.srcDir);
    if (this.bus?.emit) {
      await this.bus.emit('governance.simulation.audited', {
        tenantId,
        modules: report.totals.modules,
        simulated: report.totals.byClassification.simulated,
        stub: report.totals.byClassification.stub,
      });
    }
    return report;
  }
}

module.exports = { SimulationAuditService, auditTree, auditFile, CLASSES };
