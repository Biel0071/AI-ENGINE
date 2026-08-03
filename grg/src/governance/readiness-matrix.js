const fs = require('node:fs');
const path = require('node:path');
const { uuid } = require('../kernel/ids');
const { measured, unknown } = require('../kernel/measurement');
const { auditTree, CLASSES } = require('./simulation-audit');

// V10 — CONTRATO DE ESTADO DOS OBJETIVOS.
//
// A regra que governa este arquivo: "nunca promover um objetivo entre estados sem
// evidencias". A tentacao obvia seria uma tabela onde alguem escreve o estado de cada
// objetivo a mao. Isso seria a mesma simulacao de sempre, com outra roupa — e a mais
// perigosa de todas, porque um relatorio de prontidao mentiroso e o unico documento
// capaz de autorizar um deploy que nao devia acontecer.
//
// Aqui nenhum estado e declarado. Cada objetivo aponta para artefatos VERIFICAVEIS e o
// estado e a consequencia do que existe no disco e no store:
//
//   SPECIFIED         o objetivo esta registrado e nada mais. Nenhum modulo o satisfaz.
//   IMPLEMENTED       os modulos existem E passam o auditor sem sinal falso.
//                     Codigo que devolve metrica inventada NAO conta como implementado.
//   VALIDATED         existe teste que exercita o caminho.
//   PRODUCTION_PROVEN existe assurance gravada com evidence.reference.
//
// A ordem e estrita: um objetivo nunca salta um nivel. Sem modulo nao ha teste que valha,
// e sem teste verde uma prova de producao nao significa nada.
const STATES = { SPECIFIED: 'SPECIFIED', IMPLEMENTED: 'IMPLEMENTED', VALIDATED: 'VALIDATED', PRODUCTION_PROVEN: 'PRODUCTION_PROVEN' };
const ORDER = [STATES.SPECIFIED, STATES.IMPLEMENTED, STATES.VALIDATED, STATES.PRODUCTION_PROVEN];

// Os objetivos do V10. `modules` e `tests` sao caminhos relativos a raiz do grg; `proof`
// e o kind de assurance que provaria o objetivo em producao (GA_PROOFS).
//
// `risk` e `impact` sao classificacao de engenharia declarada — nao metrica. Estao
// marcados como tal na saida para ninguem confundir com medicao.
const OBJECTIVES = [
  {
    id: 'runtime',
    name: 'Runtime vivo: boot, scheduler, event bus, workers, cache, AI Gateway',
    modules: ['src/operations/operational-activation.js', 'src/runtime/job-engine.js', 'src/kernel/event-bus.js', 'src/ai-runtime/ai-gateway.js'],
    tests: ['test/operational-activation.test.js', 'test/job-engine.test.js', 'test/ai-gateway-enterprise.test.js'],
    proof: 'smoke-test',
    risk: 'HIGH',
    impact: 'Sem runtime nada periodico executa: nenhuma ativacao, nenhuma coleta, nenhum job.',
    dependencies: [],
    gaps: ['WebSocket ausente: nenhuma dependencia, nenhum server.on(upgrade), nenhum SSE — toda atualizacao de UI e polling'],
  },
  {
    id: 'observability',
    name: 'Observabilidade real: cpu, memoria, disco, health, consumo de IA',
    modules: ['src/operations/observability-center.js', 'src/operations/host-metrics.js'],
    tests: ['test/observability-real.test.js', 'test/prometheus-exporter.test.js'],
    proof: 'centralized-logs',
    risk: 'MEDIUM',
    impact: 'Sem observabilidade nenhum outro objetivo pode ser promovido: falta a fonte de evidencia.',
    dependencies: ['runtime'],
    gaps: ['nenhuma metrica de HTTP (latencia e taxa de erro por rota)'],
  },
  {
    id: 'truth-audit',
    name: 'Auditoria de simulacao: nenhum modulo devolve metrica inventada',
    modules: ['src/governance/simulation-audit.js', 'src/kernel/measurement.js'],
    tests: ['test/simulation-audit.test.js'],
    proof: 'build',
    risk: 'CRITICAL',
    impact: 'E o instrumento que sustenta todos os outros vereditos. Se ele mentir, o relatorio inteiro mente.',
    dependencies: [],
    gaps: [],
  },
  {
    id: 'governance-council',
    name: 'Conselho executivo com voto real e separacao de funcoes',
    modules: ['src/omega/cognitive-council.js', 'src/governance/approval-engine.js', 'src/governance/policy-engine.js'],
    tests: ['test/security-governance.test.js', 'test/omega-living-cognitive-operating-system.test.js'],
    proof: 'external-validation',
    risk: 'CRITICAL',
    impact: 'Um portao que sempre aprova produz rastro de auditoria falso — pior que nao ter portao.',
    dependencies: ['truth-audit'],
    gaps: ['nenhum assento ocupado por padrao: sem revisor designado o conselho nao decide'],
  },
  {
    id: 'production-lock',
    name: 'Gatekeeper: nenhuma acao critica com blocker aberto',
    modules: ['src/governance/gatekeeper.js'],
    tests: ['test/gatekeeper.test.js'],
    proof: 'external-validation',
    risk: 'CRITICAL',
    impact: 'E o unico mecanismo que impede deploy com a plataforma NOT_READY.',
    dependencies: ['truth-audit', 'observability'],
    gaps: [],
  },
  {
    id: 'backup-restore',
    name: 'Backup, restore e rollback com evidencia registrada',
    modules: ['src/operations/operational-activation.js'],
    tests: ['test/operational-activation.test.js'],
    proof: 'backup',
    risk: 'CRITICAL',
    impact: 'Sem prova de restauracao um backup e uma suposicao.',
    dependencies: ['runtime'],
    gaps: [],
  },
  {
    id: 'memory-hierarchy',
    name: 'Memoria hierarquica L0..L9 consultada antes do LLM',
    modules: ['src/memory/memory-engine.js', 'src/memory/knowledge-genome.js'],
    tests: ['test/memory-engine.test.js'],
    proof: null,
    risk: 'HIGH',
    impact: 'Sem consulta previa a memoria, toda pergunta repetida custa tokens novamente.',
    dependencies: ['runtime'],
    gaps: [
      'dois vocabularios de nivel incompativeis e nenhum com L0/L9',
      'ai-gateway.js nao importa memoria: nenhuma consulta acontece antes da chamada ao modelo',
    ],
  },
  {
    id: 'capsules-per-mission',
    name: 'Toda missao concluida gera capability, playbook, benchmark e capsule',
    modules: ['src/missions/mission-kernel.js', 'src/memory/knowledge-genome.js'],
    tests: ['test/mission-kernel.test.js'],
    proof: null,
    risk: 'MEDIUM',
    impact: 'Sem isto o sistema reaprende o que ja sabia a cada missao.',
    dependencies: ['memory-hierarchy'],
    gaps: [
      'mission.completed e publicado e tem zero assinantes: nenhum artefato nasce de missao concluida',
      'Playbook e Benchmark nao existem como entidade',
    ],
  },
  {
    id: 'mirror-runtime',
    name: 'Mirror Runtime: nove espelhos vivos por projeto',
    modules: [],
    tests: [],
    proof: null,
    risk: 'MEDIUM',
    impact: 'Espelhos sao a base do Digital Twin continuo.',
    dependencies: ['memory-hierarchy', 'observability'],
    gaps: [
      'nenhum modulo de espelho existe no repositorio',
      'o store e um documento unico reserializado a cada escrita: espelhos continuos sao multiplicador de escrita e degradariam tudo antes de mover as colecoes de alto volume',
    ],
  },
  {
    id: 'research-swarm',
    name: 'Research Swarm: pesquisa continua com benchmark, sem instalar nada',
    modules: ['src/omega/autonomous-research.js', 'src/cognitive/external-search.js'],
    tests: ['test/omega-living-cognitive-operating-system.test.js'],
    proof: null,
    risk: 'LOW',
    impact: 'Inteligencia tecnologica. Nao bloqueia operacao.',
    dependencies: ['truth-audit'],
    gaps: [
      'nenhum cliente HTTP de fonte: o motor nao consulta GitHub, NPM, PyPI nem feeds de release',
      'nenhum runner de benchmark: numeros antes/depois exigiriam executar o candidato no sandbox',
    ],
  },
  {
    id: 'fractal-engineering',
    name: 'Engenharia fractal: supervisor, agente, subagente, worker, task',
    modules: ['src/agents/agent-swarm.js', 'src/agents/autonomous-agent-ecosystem.js', 'src/cognitive/cognitive-hierarchy.js'],
    tests: ['test/autonomous-agent-ecosystem.test.js', 'test/cognitive-hierarchy.test.js'],
    proof: null,
    risk: 'MEDIUM',
    impact: 'Divisao de trabalho entre agentes. Hoje o roster e declaracao, nao processo.',
    dependencies: ['runtime'],
    gaps: [
      'nenhum agente e processo vivo: o roster e configuracao declarada',
      'sem supervisor, sem fila por agente, sem health por agente',
    ],
  },
  {
    id: 'auto-evolution',
    name: 'Auto evolucao: sandbox, benchmark, shadow runtime, comparacao, aprovacao',
    modules: ['src/evolution/evolution-engine.js', 'src/execution/sandbox-execution-engine.js', 'src/runtime/deployer.js'],
    tests: ['test/evolution.test.js', 'test/sandbox-execution.test.js'],
    proof: 'rollback',
    risk: 'HIGH',
    impact: 'Promover mudanca sem benchmark e comparacao e mudar as cegas.',
    dependencies: ['production-lock', 'governance-council'],
    gaps: ['Benchmark, Shadow Runtime e Comparacao ausentes: das 13 etapas do pipeline V10, tres nao existem'],
  },
];

// Um objetivo declarado sem artefato e SPECIFIED — nao ha o que promover.
function hasArtifacts(objective) {
  return objective.modules.length > 0;
}

// Estado derivado. A ordem dos ifs e a hierarquia: cada nivel exige o anterior.
function classifyObjective(objective, { root, auditByFile, assurances }) {
  const evidence = [];
  const blockers = [];

  const modules = objective.modules.map((relative) => {
    const exists = fs.existsSync(path.join(root, relative));
    const audit = auditByFile.get(relative.replace(/^src\//, ''));
    return { path: relative, exists, classification: audit?.classification || null, fakeSignalCount: audit?.fakeSignalCount ?? null };
  });
  const missingModules = modules.filter((item) => !item.exists);
  // Modulo que devolve metrica inventada nao conta como implementacao. Esta e a juncao
  // entre o auditor e a matriz: sem ela um objetivo poderia ser promovido por codigo que
  // apenas finge fazer o trabalho.
  const dirtyModules = modules.filter((item) => item.exists && (item.fakeSignalCount > 0 || item.classification === CLASSES.STUB || item.classification === CLASSES.SIMULATED));

  const tests = objective.tests.map((relative) => ({ path: relative, exists: fs.existsSync(path.join(root, relative)) }));
  const missingTests = tests.filter((item) => !item.exists);

  const proof = objective.proof ? assurances[objective.proof] || null : null;

  if (!hasArtifacts(objective)) {
    blockers.push('no module implements this objective');
    for (const gap of objective.gaps) blockers.push(gap);
    return {
      state: STATES.SPECIFIED,
      evidence,
      blockers,
      modules,
      tests,
      proof: objective.proof ? unknown(`no ${objective.proof} assurance recorded`, `record a ${objective.proof} assurance once the objective is implemented`) : null,
    };
  }

  for (const item of modules.filter((entry) => entry.exists)) {
    evidence.push({ kind: 'module', reference: item.path, classification: item.classification, fakeSignalCount: item.fakeSignalCount });
  }
  for (const item of missingModules) blockers.push(`module missing: ${item.path}`);
  for (const item of dirtyModules) blockers.push(`module presents invented metrics: ${item.path} (${item.fakeSignalCount} fake signals)`);
  for (const gap of objective.gaps) blockers.push(gap);

  if (missingModules.length || dirtyModules.length) {
    return { state: STATES.SPECIFIED, evidence, blockers, modules, tests, proof: proofEntry(objective, proof) };
  }

  for (const item of tests.filter((entry) => entry.exists)) {
    evidence.push({ kind: 'test', reference: item.path });
  }
  for (const item of missingTests) blockers.push(`test missing: ${item.path}`);

  // Uma lacuna conhecida impede promocao acima de IMPLEMENTED: o codigo existe e e
  // honesto, mas o objetivo nao esta cumprido.
  if (objective.gaps.length) {
    return { state: STATES.IMPLEMENTED, evidence, blockers, modules, tests, proof: proofEntry(objective, proof) };
  }
  if (missingTests.length || !tests.length) {
    return { state: STATES.IMPLEMENTED, evidence, blockers, modules, tests, proof: proofEntry(objective, proof) };
  }

  if (!objective.proof) {
    blockers.push('no production proof is defined for this objective');
    return { state: STATES.VALIDATED, evidence, blockers, modules, tests, proof: null };
  }
  if (!proof) {
    blockers.push(`no ${objective.proof} assurance recorded`);
    return { state: STATES.VALIDATED, evidence, blockers, modules, tests, proof: proofEntry(objective, proof) };
  }

  evidence.push({ kind: 'assurance', reference: proof.evidence.reference, assuranceId: proof.id, recordedAt: proof.recordedAt });
  return { state: STATES.PRODUCTION_PROVEN, evidence, blockers, modules, tests, proof: proofEntry(objective, proof) };
}

function proofEntry(objective, proof) {
  if (!objective.proof) return null;
  return proof
    ? measured(proof.evidence.reference, 'store:operationalAssurances', { kind: objective.proof, assuranceId: proof.id, recordedAt: proof.recordedAt })
    : unknown(`no valid ${objective.proof} assurance recorded`, `run ops/${objective.proof}.sh and record the assurance via POST /api/operations/assurances`);
}

class ReadinessMatrixService {
  constructor({ store, bus, controlPlane, root = path.join(__dirname, '..', '..'), srcDir = path.join(__dirname, '..') }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.root = root;
    this.srcDir = srcDir;
  }

  async build(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    const state = await this.store.read();

    const audit = auditTree(this.srcDir);
    const auditByFile = new Map();
    for (const module of audit.modules) {
      for (const file of module.dirtyFiles) auditByFile.set(file.file, { classification: null, fakeSignalCount: file.count });
    }
    // A varredura por modulo nao devolve o resultado de cada arquivo limpo; reaudita o
    // arquivo apontado por cada objetivo para saber sua classificacao individual.
    const { auditFile } = require('./simulation-audit');
    for (const objective of OBJECTIVES) {
      for (const relative of objective.modules) {
        const key = relative.replace(/^src\//, '');
        const full = path.join(this.root, relative);
        if (!fs.existsSync(full)) continue;
        const result = auditFile(key, fs.readFileSync(full, 'utf8'));
        auditByFile.set(key, { classification: result.classification, fakeSignalCount: result.fakeSignalCount });
      }
    }

    const assurances = {};
    for (const item of (state.operationalAssurances || []).filter((entry) => entry.tenantId === tenantId && entry.status === 'VERIFIED')) {
      if (item.validUntil && Date.parse(item.validUntil) <= Date.now()) continue;
      assurances[item.kind] = item;
    }

    const objectives = OBJECTIVES.map((objective) => {
      const derived = classifyObjective(objective, { root: this.root, auditByFile, assurances });
      return {
        id: objective.id,
        name: objective.name,
        state: derived.state,
        // Risco e impacto sao classificacao de engenharia, nao medicao. Rotulados para
        // que ninguem os leia como telemetria.
        risk: measured(objective.risk, 'config:OBJECTIVES', { note: 'declared engineering classification, not a measurement' }),
        impact: objective.impact,
        dependencies: objective.dependencies,
        evidence: derived.evidence,
        blockers: derived.blockers,
        modules: derived.modules,
        tests: derived.tests,
        productionProof: derived.proof,
        // "Ultima validacao" e o instante do artefato mais recente que sustenta o estado,
        // nao a hora em que este relatorio rodou.
        lastValidatedAt: derived.evidence.filter((item) => item.kind === 'assurance').at(-1)?.recordedAt
          || (derived.state === STATES.SPECIFIED ? null : latestMtime(this.root, derived.modules)),
      };
    });

    // Dependencia nao satisfeita rebaixa o dependente: um objetivo nao pode estar mais
    // maduro que aquilo de que depende.
    const byId = new Map(objectives.map((item) => [item.id, item]));
    for (const objective of objectives) {
      for (const dependencyId of objective.dependencies) {
        const dependency = byId.get(dependencyId);
        if (!dependency) continue;
        if (ORDER.indexOf(dependency.state) < ORDER.indexOf(objective.state)) {
          objective.blockers.push(`dependency ${dependencyId} is only ${dependency.state}`);
          objective.state = dependency.state;
          objective.cappedBy = dependencyId;
        }
      }
    }

    const byState = {};
    for (const value of ORDER) byState[value] = objectives.filter((item) => item.state === value).length;

    const matrix = {
      id: uuid(),
      tenantId,
      objectives,
      totals: {
        objectives: objectives.length,
        byState,
        withBlockers: objectives.filter((item) => item.blockers.length).length,
        productionProven: byState[STATES.PRODUCTION_PROVEN],
      },
      audit: {
        modules: audit.totals.modules,
        files: audit.totals.files,
        fakeSignals: audit.totals.totalFakeSignals,
        simulated: audit.totals.byClassification[CLASSES.SIMULATED],
        stub: audit.totals.byClassification[CLASSES.STUB],
      },
      generatedBy: actorId,
      generatedAt: new Date().toISOString(),
    };

    await this.store.update((next) => {
      next.objectiveStates = (next.objectiveStates || []).filter((item) => item.tenantId !== tenantId);
      for (const objective of objectives) {
        next.objectiveStates.push({
          id: uuid(), tenantId, objectiveId: objective.id, state: objective.state,
          blockerCount: objective.blockers.length, evidenceCount: objective.evidence.length,
          recordedAt: matrix.generatedAt,
        });
      }
      return next;
    });

    if (this.bus?.emit) {
      await this.bus.emit('governance.readiness.matrix.built', {
        tenantId, objectives: objectives.length, productionProven: matrix.totals.productionProven, withBlockers: matrix.totals.withBlockers,
      });
    }

    return matrix;
  }
}

function latestMtime(root, modules) {
  const stamps = modules
    .filter((item) => item.exists)
    .map((item) => {
      try { return fs.statSync(path.join(root, item.path)).mtime.toISOString(); } catch { return null; }
    })
    .filter(Boolean)
    .sort();
  return stamps.at(-1) || null;
}

module.exports = { ReadinessMatrixService, OBJECTIVES, STATES, ORDER, classifyObjective };
