const { uuid } = require('../kernel/ids');

// V11 — LIVING CORE.
//
// O problema que este arquivo resolve: o FENIX sabia analisar, medir, organizar, governar,
// trancar e auditar — e nada disso rodava sozinho. `worker.js` tinha UM loop, e ele
// comecava com `if (!app.redis) throw new Error(...)`. Sem Redis nenhum ciclo executava,
// nenhum heartbeat era gravado, e o probe de `workers` (que exige heartbeat < 120s) ficava
// vermelho para sempre. A plataforma tinha os orgaos, nao tinha batimento.
//
// Este modulo NAO e um motor novo. E o supervisor que faz os servicos existentes rodarem
// em cadencia. Cada loop chama codigo que ja estava escrito e testado; o que nasce aqui e
// a periodicidade, o isolamento de falha e o REGISTRO do que aconteceu.
//
// Tres decisoes carregam o peso deste arquivo:
//
// 1. LIDERANCA SEM REDIS. Com Redis, RedisLease (multi-processo, o caminho de producao).
//    Sem Redis, um lease no proprio store com o mesmo contrato acquire/renew/held. Sem
//    isso a plataforma so estaria viva em producao — e um sistema que nao roda em
//    desenvolvimento nao e observado por ninguem antes de chegar la.
//
// 2. FALHA ISOLADA POR LOOP. Um loop que lanca nao pode impedir os outros. O oposto seria
//    pior que nao ter loops: uma falha silenciosa num deles pararia o organismo inteiro
//    parecendo que esta tudo bem.
//
// 3. OCIOSO E REGISTRADO, NAO DISFARCADO. O V11 diz "nunca permanecer ocioso". A leitura
//    perigosa dessa frase e inventar trabalho para parecer ocupado. A leitura honesta e
//    registrar `idle` com o motivo. `livingRuntimeTicks` e a colecao que sustenta a
//    afirmacao "o sistema esta vivo" — sem ela, seria declaracao.

const now = () => new Date().toISOString();

// Contrato de cada loop. `intervalMs` vem do V11; `timeoutMs` impede que um loop preso
// segure o tick; `criticality` decide se a ausencia dele derruba o componente
// living-runtime; `maxFailures` consecutivas suspendem o loop em vez de repetir o erro
// para sempre (e a suspensao fica registrada, com o ultimo erro).
const LOOP_DEFAULTS = { timeoutMs: 30_000, criticality: 'normal', maxFailures: 5 };

// A tabela do V11, traduzida para chamadas reais. Cada `run` recebe o contexto e devolve
// { ran, detail } ou { idle, reason } — nunca inventa resultado.
//
// `env` entra aqui porque os loops de execucao (jobs, schedules) tem os mesmos parametros
// de operacao que o worker sempre teve (batch, timeout, janela de job preso). Eles moraram
// em `worker.js` ate a V1.0; trazidos para ca, existe UMA tabela de cadencia e os sete
// servicos permanentes sao subconjuntos dela — nao sete motores novos.
function defaultLoops(env = process.env) {
  return [
    {
      // Consome o que os outros loops criam. A cadencia mais curta de todas, e a razao
      // pela qual o servico `worker` existe separado: uma fila que ninguem consome faz
      // todo o resto da plataforma parecer travado.
      id: 'jobs',
      intervalMs: Number(env.FENIX_JOBS_LOOP_MS || 2_000),
      timeoutMs: Number(env.FENIX_JOBS_TIMEOUT_MS || 120_000),
      criticality: 'critical',
      maxFailures: 5,
      run: async ({ app, runtime }) => {
        await app.jobs.recoverStale(Number(env.FENIX_STALE_JOB_MS || 60_000));
        const executed = await app.jobs.runBatch(runtime.workerId, Number(env.FENIX_WORKER_BATCH || 10));
        if (!executed.length) return { idle: true, reason: 'no job was queued' };
        return { ran: true, detail: { executed: executed.length } };
      },
    },
    {
      // Despacha os schedules vencidos. Separado do consumo porque sao duas falhas
      // diferentes: "ninguem cria trabalho periodico" e "ninguem executa o que existe".
      // Com um loop so, a primeira ficava invisivel atras da segunda.
      id: 'schedules',
      intervalMs: Number(env.FENIX_SCHEDULES_LOOP_MS || 5_000),
      timeoutMs: 30_000,
      criticality: 'critical',
      run: async ({ app, tenantId, actorId }) => {
        const dispatched = await app.jobs.tick(tenantId, actorId);
        if (!dispatched.length) return { idle: true, reason: 'no schedule was due' };
        return { ran: true, detail: { dispatched: dispatched.length, kinds: [...new Set(dispatched.map((item) => item.kind))] } };
      },
    },
    {
      id: 'health',
      intervalMs: 30_000,
      criticality: 'critical',
      timeoutMs: 10_000,
      // O loop mais curto tambem e o que grava o heartbeat: se ele para, o componente
      // `workers` fica vermelho por medicao, que e exatamente o comportamento correto.
      run: async ({ app, runtime }) => {
        if (!app.health?.check) return { idle: true, reason: 'health registry is not wired' };
        const result = await app.health.check();
        await runtime.heartbeat();
        return { ran: true, detail: { status: result.status, ok: result.ok === true, checks: Object.keys(result.checks || {}).length } };
      },
    },
    {
      id: 'memory',
      intervalMs: 60_000,
      criticality: 'normal',
      run: async ({ app, tenantId, actorId }) => {
        if (!app.memory) return { idle: true, reason: 'memory engine is not wired' };
        const purged = await app.memory.purgeExpired(tenantId, actorId);
        // consolidate() desiste sozinho quando nao ha episodios suficientes; o retorno
        // { consolidated: 0 } E o resultado, nao uma falha.
        const consolidated = await app.memory.consolidate(tenantId, actorId);
        if (!purged.expired && !consolidated.consolidated) {
          return { idle: true, reason: 'no expired memory and not enough episodes to consolidate' };
        }
        return { ran: true, detail: { expired: purged.expired, consolidated: consolidated.consolidated } };
      },
    },
    {
      id: 'knowledge',
      intervalMs: 120_000,
      criticality: 'normal',
      run: async ({ app, tenantId, actorId }) => {
        if (!app.selfEvolutionKernel) return { idle: true, reason: 'self evolution kernel is not wired' };
        const crystal = await app.selfEvolutionKernel.getIntelligenceCrystalState(tenantId, actorId);
        // O estado do cristal ja e medido (duplicidade por hash real, fragmentacao por
        // aresta ausente). Aqui so o exercitamos periodicamente e registramos o que veio.
        return {
          ran: true,
          detail: {
            capsules: crystal.nodesCount?.value ?? null,
            entities: crystal.entitiesCount?.value ?? null,
            orphans: crystal.orphanCapsuleIds?.length ?? null,
          },
        };
      },
    },
    {
      id: 'research',
      intervalMs: 300_000,
      criticality: 'normal',
      run: async ({ app, tenantId, actorId }) => {
        if (!app.autonomousResearch) return { idle: true, reason: 'research engine is not wired' };
        const cycle = await app.autonomousResearch.runResearchCycle(tenantId, actorId);
        // Desligado por padrao (FENIX_RESEARCH_ENABLED). O ciclo devolve NOT_IMPLEMENTED
        // e isso entra como ociosidade declarada, nao como pesquisa realizada.
        if (cycle.status === 'NOT_IMPLEMENTED') {
          return { idle: true, reason: 'research is disabled: no source client is enabled' };
        }
        // Habilitado mas nenhuma fonte aprovada respondeu: tambem e ociosidade. Contar como
        // "pesquisou" faria a metrica de pesquisa subir sem nenhum achado por tras.
        if (cycle.status === 'NO_SOURCE_RESPONDED') {
          return { idle: true, reason: `no approved research source responded (${cycle.failures?.length ?? 0} failure(s))` };
        }
        return {
          ran: true,
          detail: {
            cycleId: cycle.id, status: cycle.status, topic: cycle.topic,
            sources: cycle.findings?.sources ?? null, failed: cycle.findings?.failed ?? null,
            evaluationPlanId: cycle.evaluationPlanId ?? null,
          },
        };
      },
    },
    {
      id: 'optimization',
      intervalMs: 600_000,
      criticality: 'normal',
      run: async ({ app, tenantId, actorId }) => {
        if (!app.cognitiveOptimization?.getKnowledgeHealth) return { idle: true, reason: 'cognitive optimization engine is not wired' };
        const health = await app.cognitiveOptimization.getKnowledgeHealth(tenantId, actorId);
        // O relatorio de saude do conhecimento e medido (duplicidade por hash, confianca
        // real das capsulas) e declara unknown onde nao ha formula. Rodar periodicamente
        // e registrar o que veio; o que ele nao sabe continua nao sabido.
        return {
          ran: true,
          detail: {
            capsules: health.metrics?.capsules?.value ?? null,
            duplicationRate: health.metrics?.duplicationRate?.value ?? null,
            confidenceAverage: health.metrics?.confidenceAverage?.value ?? null,
          },
        };
      },
    },
    {
      id: 'organization',
      intervalMs: 900_000,
      criticality: 'normal',
      timeoutMs: 60_000,
      run: async ({ app, tenantId, actorId }) => {
        if (!app.continuousImprovement?.runIdleImprovementScan) {
          return { idle: true, reason: 'continuous improvement loop is not wired' };
        }
        const scan = await app.continuousImprovement.runIdleImprovementScan(tenantId, actorId);
        const found = Array.isArray(scan?.opportunities) ? scan.opportunities.length : 0;
        // Varredura sem achado e resultado, nao falha — e a varredura declara quais
        // fontes ficaram de fora, para "nada encontrado" nao ser lido como "tudo bem".
        if (!found) return { idle: true, reason: `idle scan found no improvement opportunity (${scan.sourcesMissing?.length || 0} source(s) not inspected)` };
        return { ran: true, detail: { opportunities: found, kinds: [...new Set(scan.opportunities.map((item) => item.kind))] } };
      },
    },
    {
      id: 'security',
      intervalMs: 1_800_000,
      criticality: 'critical',
      timeoutMs: 60_000,
      // O loop que faz a plataforma se auditar sozinha. Ele nao decide nada: grava o
      // veredito do auditor e do gatekeeper para que a degradacao apareca antes de
      // alguem tentar um deploy.
      run: async ({ app, tenantId, actorId }) => {
        if (!app.simulationAudit || !app.gatekeeper) return { idle: true, reason: 'audit or gatekeeper is not wired' };
        const audit = await app.simulationAudit.audit(tenantId, actorId);
        const gate = await app.gatekeeper.evaluate(tenantId, actorId, 'deploy');
        return {
          ran: true,
          detail: {
            fakeSignals: audit.totals.totalFakeSignals,
            simulated: audit.totals.byClassification.simulated,
            stub: audit.totals.byClassification.stub,
            gateAllowed: gate.allowed,
            blockers: gate.blockers.length,
          },
        };
      },
    },
    {
      // Exercita a leitura de telemetria periodicamente. Nao grava metrica nova: as
      // metricas ja saem de `livingRuntimeTicks` e do store. O que este loop prova e que
      // o caminho de LEITURA funciona — um exportador que quebrou so aparece quando
      // alguem abre o dashboard, e ai o alarme e a ausencia de dado, nao o erro.
      id: 'observability',
      intervalMs: 60_000,
      criticality: 'normal',
      timeoutMs: 30_000,
      run: async ({ app, tenantId, actorId }) => {
        if (!app.metrics?.render || !app.observabilityCenter) return { idle: true, reason: 'metrics exporter or observability center is not wired' };
        const exposition = await app.metrics.render();
        const report = await app.observabilityCenter.getMetrics(tenantId, actorId);
        return {
          ran: true,
          detail: {
            metricBytes: Buffer.byteLength(exposition),
            metricSeries: exposition.split('\n').filter((line) => line && !line.startsWith('#')).length,
            coverage: report.measurement?.ratio ?? null,
            pendencies: report.measurement?.pendencies?.length ?? null,
            alerts: report.alerts?.length ?? 0,
          },
        };
      },
    },
    {
      id: 'business',
      intervalMs: 3_600_000,
      criticality: 'normal',
      timeoutMs: 120_000,
      run: async ({ app, tenantId, actorId }) => {
        if (!app.operationalActivation) return { idle: true, reason: 'operational activation is not wired' };
        const result = await app.operationalActivation.boot(tenantId, actorId, { trigger: 'living-runtime' });
        // boot() desiste quando ja existe um run em voo. Isso e ociosidade real.
        if (result.skipped) return { idle: true, reason: result.run?.skippedReason || 'an activation run is already in flight' };
        return { ran: true, detail: { runId: result.run?.id || null, readiness: result.readiness?.status || null } };
      },
    },
  ];
}

// V1.0 — OS SETE SERVICOS PERMANENTES.
//
// O prompt pede sete processos permanentes. A tentacao seria escrever sete motores; o que
// existe de fato sao sete RECORTES da mesma tabela de cadencia, cada um num processo com
// seu proprio ciclo de vida, restart e log. O ganho e operacional e real: o loop de
// pesquisa nao compete pelo mesmo event loop que a fila de jobs, e um deles caindo aparece
// como um container reiniciando em vez de um loop suspenso dentro de outro processo.
//
// `api` nao aparece aqui porque nao e um recorte de loops: e o servidor HTTP (server.js).
// Cada role declara os loops que roda; um role que ficasse sem loop seria um processo de
// pe sem trabalho, e por isso `loopsForRole` recusa nome desconhecido em vez de devolver
// lista vazia.
const RUNTIME_ROLES = Object.freeze({
  // Tudo num processo: o padrao para single-node e desenvolvimento. Sem isto, rodar o
  // FENIX localmente exigiria seis terminais.
  all: null,
  // A fila. O unico role que consome trabalho.
  worker: ['jobs'],
  // O despachante do que e periodico.
  scheduler: ['schedules'],
  // O organismo cognitivo: memoria, conhecimento, otimizacao, auto-organizacao, negocio.
  'living-runtime': ['memory', 'knowledge', 'optimization', 'organization', 'business'],
  // Pesquisa isolada porque e o unico loop que fala com a rede externa.
  research: ['research'],
  // Leitura de telemetria + auditoria periodica de simulacao e gate.
  observability: ['observability', 'security'],
  // O batimento. Processo dedicado para o heartbeat nao depender de nenhum outro loop.
  health: ['health'],
});

function loopsForRole(role, env = process.env) {
  const ids = RUNTIME_ROLES[role];
  if (ids === undefined) {
    throw new Error(`unknown living runtime role '${role}': expected one of ${Object.keys(RUNTIME_ROLES).join(', ')}`);
  }
  const loops = defaultLoops(env);
  if (ids === null) return loops;
  const byId = new Map(loops.map((loop) => [loop.id, loop]));
  return ids.map((id) => byId.get(id));
}

// Lease local para quando nao ha Redis. Mesmo contrato do RedisLease, para o supervisor
// nao precisar saber qual dos dois esta usando.
//
// Nao substitui o Redis: com dois processos gravando no mesmo documento, o vencedor e o
// ultimo a escrever. Serve para o caso de UM processo — desenvolvimento e single-node —
// e o proprio registro declara isso, para ninguem confundir com exclusao mutua real.
class StoreLease {
  constructor({ store, key = 'living-runtime', ttlMs = 15_000, ownerId = uuid(), clock = Date }) {
    this.store = store; this.key = key; this.ttlMs = ttlMs; this.ownerId = ownerId; this.clock = clock;
    this.held = false;
    this.mutualExclusion = false;
  }

  async #claim(requireOwnership) {
    const deadline = this.clock.now() + this.ttlMs;
    let acquired = false;
    await this.store.update((state) => {
      state.livingRuntimeLeases = state.livingRuntimeLeases || [];
      const current = state.livingRuntimeLeases.find((item) => item.key === this.key);
      const expired = !current || Date.parse(current.expiresAt) <= this.clock.now();
      const mine = current?.ownerId === this.ownerId;
      if (requireOwnership && !mine) return state;
      if (!expired && !mine) return state;
      const record = { key: this.key, ownerId: this.ownerId, expiresAt: new Date(deadline).toISOString(), updatedAt: now() };
      state.livingRuntimeLeases = state.livingRuntimeLeases.filter((item) => item.key !== this.key);
      state.livingRuntimeLeases.push(record);
      acquired = true;
      return state;
    });
    this.held = acquired;
    return acquired;
  }

  acquire() { return this.#claim(false); }
  renew() { return this.#claim(true); }

  async release() {
    await this.store.update((state) => {
      state.livingRuntimeLeases = (state.livingRuntimeLeases || []).filter((item) => !(item.key === this.key && item.ownerId === this.ownerId));
      return state;
    });
    this.held = false;
    return true;
  }
}

class LivingRuntime {
  constructor({ app, lease = null, loops = null, role = 'all', tenantResolver = null, clock = Date, tickIntervalMs = 2_000, workerId = null }) {
    if (!app?.store) throw new Error('LivingRuntime requires the app composition root');
    this.app = app;
    this.clock = clock;
    this.role = role;
    this.tickIntervalMs = Number(tickIntervalMs);
    this.workerId = workerId || `${role}-${uuid().slice(0, 8)}`;
    // A chave do lease inclui o ROLE. Com uma chave unica os sete servicos permanentes
    // disputariam a mesma lideranca e SEIS ficariam permanentemente de pe sem executar
    // nada — um sistema que parece rodar sete processos e roda um. Exclusao mutua e por
    // conjunto de loops, nao por processo.
    this.leaseKey = `living-runtime:${role}`;
    // Sem lease injetado: Redis quando existe, store quando nao. A escolha e explicita
    // aqui e nao se espalha pelo resto do modulo.
    this.lease = lease || (app.redis?.client
      ? new (require('./redis-lease').RedisLease)({ client: app.redis.client, key: `fenix:runtime:leader:${role}`, ownerId: this.workerId })
      : new StoreLease({ store: app.store, key: this.leaseKey, ownerId: this.workerId, clock }));
    this.loops = (loops || defaultLoops()).map((loop) => ({
      ...LOOP_DEFAULTS,
      ...loop,
      lastRunAt: null,
      consecutiveFailures: 0,
      suspended: false,
      suspendedReason: null,
    }));
    this.tenantResolver = tenantResolver || defaultTenantResolver;
    this.timer = null;
    this.running = false;
    this.stopping = false;
    this.ticks = 0;
  }

  loopState() {
    return this.loops.map((loop) => ({
      id: loop.id,
      intervalMs: loop.intervalMs,
      criticality: loop.criticality,
      lastRunAt: loop.lastRunAt,
      consecutiveFailures: loop.consecutiveFailures,
      suspended: loop.suspended,
      suspendedReason: loop.suspendedReason,
    }));
  }

  // Heartbeat no MESMO formato que o probe de `workers` le, para o componente ficar
  // ACTIVE por medicao em vez de por configuracao.
  async heartbeat() {
    await this.app.store.update((state) => {
      state.workerHeartbeats = state.workerHeartbeats || [];
      let worker = state.workerHeartbeats.find((item) => item.workerId === this.workerId);
      if (!worker) { worker = { workerId: this.workerId, startedAt: now() }; state.workerHeartbeats.push(worker); }
      worker.lastSeenAt = now();
      worker.activeJobs = 0;
      // O role e o que permite dizer QUAL servico permanente parou. Com todos gravando
      // 'living-runtime', sete processos produziriam sete heartbeats indistinguiveis e o
      // silencio de um deles ficaria escondido atras do batimento dos outros.
      worker.role = this.role === 'all' ? 'living-runtime' : `living-runtime:${this.role}`;
      worker.loops = this.loops.filter((loop) => !loop.suspended).length;
      return state;
    });
  }

  #due(loop) {
    if (loop.suspended) return false;
    if (!loop.lastRunAt) return true;
    return this.clock.now() - Date.parse(loop.lastRunAt) >= loop.intervalMs;
  }

  // Um loop. Erro NUNCA escapa: virá registro com `error`, e o proximo loop roda.
  async #runLoop(loop, context) {
    const started = this.clock.now();
    const record = { loop: loop.id, criticality: loop.criticality, startedAt: now() };
    let timer;
    try {
      const outcome = await Promise.race([
        loop.run(context),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`loop ${loop.id} timed out after ${loop.timeoutMs}ms`)), loop.timeoutMs); }),
      ]);
      clearTimeout(timer);
      loop.lastRunAt = now();
      loop.consecutiveFailures = 0;
      if (outcome?.idle) {
        // Ociosidade com motivo. E o unico jeito honesto de responder "nao havia
        // trabalho" sem inventar trabalho para parecer ocupado.
        return { ...record, status: 'IDLE', idle: true, reason: String(outcome.reason || 'no work available'), durationMs: this.clock.now() - started, completedAt: now() };
      }
      return { ...record, status: 'RAN', idle: false, detail: outcome?.detail ?? null, durationMs: this.clock.now() - started, completedAt: now() };
    } catch (error) {
      clearTimeout(timer);
      loop.lastRunAt = now();
      loop.consecutiveFailures += 1;
      // Falha repetida suspende o loop em vez de repetir o mesmo erro para sempre. A
      // suspensao e visivel: entra no estado e na metrica.
      if (loop.consecutiveFailures >= loop.maxFailures) {
        loop.suspended = true;
        loop.suspendedReason = `suspended after ${loop.consecutiveFailures} consecutive failures: ${String(error.message || error).slice(0, 300)}`;
      }
      return {
        ...record,
        status: 'FAILED',
        idle: false,
        error: String(error.message || error).slice(0, 1_000),
        consecutiveFailures: loop.consecutiveFailures,
        suspended: loop.suspended,
        durationMs: this.clock.now() - started,
        completedAt: now(),
      };
    }
  }

  // Um tick: roda todo loop vencido, para cada tenant com dono. Devolve o registro
  // gravado — os testes leem isso, e nao um efeito colateral.
  async tick() {
    const leader = this.lease.held ? await this.lease.renew() : await this.lease.acquire();
    if (!leader) {
      return { id: null, leader: false, skipped: 'another process holds the living-runtime lease', loops: [] };
    }

    // Batimento por TICK, nao por loop de saude. Com sete processos, so o role `health`
    // roda o loop de saude: os outros seis girariam sem nunca se registrar, e um processo
    // que ninguem ve nao pode ser declarado vivo. O heartbeat pertence ao supervisor.
    await this.heartbeat();

    const tenants = await this.tenantResolver(this.app);
    const due = this.loops.filter((loop) => this.#due(loop));
    const results = [];

    for (const loop of due) {
      for (const tenant of tenants) {
        results.push({
          ...(await this.#runLoop(loop, { app: this.app, runtime: this, tenantId: tenant.tenantId, actorId: tenant.actorId })),
          tenantId: tenant.tenantId,
        });
      }
      // Sem tenant nao ha o que rodar, e isso tambem e um fato registrado: o sistema
      // esta vivo e nao tem trabalho, o que e diferente de estar parado.
      if (!tenants.length) {
        loop.lastRunAt = now();
        results.push({ loop: loop.id, criticality: loop.criticality, status: 'IDLE', idle: true, reason: 'no tenant has an active master_admin owner', durationMs: 0, startedAt: now(), completedAt: now(), tenantId: null });
      }
    }

    this.ticks += 1;
    const tick = {
      id: uuid(),
      workerId: this.workerId,
      role: this.role,
      leader: true,
      tenants: tenants.length,
      loopsDue: due.length,
      ran: results.filter((item) => item.status === 'RAN').length,
      idle: results.filter((item) => item.status === 'IDLE').length,
      failed: results.filter((item) => item.status === 'FAILED').length,
      loops: results,
      recordedAt: now(),
    };

    // Uma escrita por tick, nao uma por loop: o store e um documento unico reserializado
    // a cada update, e um supervisor que escreve 8 vezes por tick seria o maior gerador
    // de custo de escrita da plataforma.
    await this.app.store.update((state) => {
      state.livingRuntimeTicks = state.livingRuntimeTicks || [];
      state.livingRuntimeTicks.push(tick);
      return state;
    });

    if (this.app.bus?.emit) {
      await this.app.bus.emit('runtime.living.tick', { workerId: this.workerId, role: this.role, ran: tick.ran, idle: tick.idle, failed: tick.failed });
    }

    return tick;
  }

  // Um tick por vez: o anterior nao terminado faz o proximo desistir. Sem isso, ticks
  // sobrepostos disputariam o mesmo documento — a causa raiz do travamento que a
  // ativacao operacional ja sofreu em producao.
  async guardedTick() {
    if (this.running || this.stopping) return null;
    this.running = true;
    try { return await this.tick(); }
    finally { this.running = false; }
  }

  start() {
    if (this.timer) return this;
    this.timer = setInterval(() => {
      this.guardedTick().catch((error) => process.stderr.write(`${JSON.stringify({ level: 'error', component: 'living-runtime', message: String(error.message || error) })}\n`));
    }, this.tickIntervalMs);
    this.timer.unref();
    return this;
  }

  async stop() {
    if (this.stopping) return;
    this.stopping = true;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.lease.held) await this.lease.release();
  }
}

// Um loop precisa de um ator com permissao. O dono do tenant e quem o criou como
// master_admin — o mesmo criterio que server.js usa para a ativacao operacional.
async function defaultTenantResolver(app) {
  const state = await app.store.read();
  const out = [];
  for (const tenant of state.tenants || []) {
    const owner = (state.memberships || []).find((item) => item.tenantId === tenant.id && item.status === 'active' && item.role === 'master_admin');
    if (owner) out.push({ tenantId: tenant.id, actorId: owner.userId });
  }
  return out;
}

module.exports = { LivingRuntime, StoreLease, defaultLoops, defaultTenantResolver, loopsForRole, RUNTIME_ROLES, LOOP_DEFAULTS };
