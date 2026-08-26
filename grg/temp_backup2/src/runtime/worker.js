const { createApp } = require('../app');
const { loadInfrastructureConfig } = require('../infrastructure/config');
const { loadSecurityConfig } = require('../security/config');
const { RedisLease } = require('./redis-lease');

async function startWorker(options = {}) {
  const env = options.env || process.env; const securityConfig = loadSecurityConfig(env); const infra = loadInfrastructureConfig(env, { requireExternal: securityConfig.production });
  // `options` (menos `env`, que ja foi lido acima) sobrepoe a config de infra: e o unico jeito de
  // exercitar o ciclo real do worker sem um Redis de verdade na maquina. Sem isso, o unico teste
  // possivel seria testar as pecas separadas e ACREDITAR que o ciclo as chama na ordem certa.
  const { env: _env, ...overrides } = options;
  const app = await createApp({ ...infra, securityConfig, env, ...overrides });
  if (!app.redis) throw new Error('runtime worker requires Redis');
  // `ownerId` no RedisLease e default de PARAMETRO (`= crypto.randomUUID()`): ele so entra
  // quando o valor e undefined. String vazia atravessa e vira o id do worker -- e job-engine
  // recusa com "workerId is required" a cada ciclo, com a fila parada. Isso aconteceu de fato
  // quando o compose passou a repassar FENIX_WORKER_ID: uma variavel ausente no .env chega ao
  // container como '' em vez de nao existir. `|| undefined` devolve o default ao seu lugar.
  const lease = new RedisLease({ client: app.redis.client, ttlMs: Number(env.FENIX_LEADER_LEASE_MS || 15_000), ownerId: env.FENIX_WORKER_ID || undefined });
  const intervalMs = Number(env.FENIX_WORKER_POLL_MS || 2_000); let stopping = false; let running = false;
  // Cadencia propria do health-check de conexao (FLUXO 8); 0 forca o primeiro check ja no 1o ciclo.
  const nowMs = () => Date.now(); let lastConnectionCheck = 0; let lastObservabilitySample = 0;
  const cycle = async () => {
    const leader = lease.held ? await lease.renew() : await lease.acquire();
    if (leader) { const state = await app.store.read(); const dueTenants = [...new Set(state.runtimeSchedules.filter((item) => item.enabled).map((item) => item.tenantId))]; for (const tenantId of dueTenants) { const actor = state.runtimeSchedules.find((item) => item.tenantId === tenantId)?.createdBy; if (actor) await app.jobs.tick(tenantId, actor); } }
    // MEDIDO em producao: o worker cuidava de JOBS e ninguem cuidava de MISSOES. O ciclo de
    // missao so avancava por evento de job, entao missao com job morto ficava orfa (4 missoes
    // RUNNING e 17 steps PLANNED presos, progresso 0). Reconciliar aqui e no mesmo lugar onde
    // ja se tem o lease de lider -- sem lease, dois workers despachariam o mesmo step.
    // So o lider reconcilia, e so para tenants com missao ativa (evita escrita desnecessaria
    // no documento unico, cujo custo por escrita e o gargalo conhecido do FENIX).
    if (leader && env.FENIX_MISSION_RECONCILE !== '0') {
      const state = await app.store.read();
      const TERMINAIS = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED']);
      const tenantsComMissaoAtiva = [...new Set(state.missions.filter((item) => !TERMINAIS.has(item.status)).map((item) => item.tenantId))];
      for (const tenantId of tenantsComMissaoAtiva) {
        // Ator: quem pediu a missao. Reconciliacao exige runtime:admin, e atribuir a acao a um
        // ator real mantem a trilha de auditoria honesta (nao existe "ator sistema" aqui).
        const actor = state.missions.find((item) => item.tenantId === tenantId && !TERMINAIS.has(item.status))?.requestedBy;
        if (!actor) continue;
        // autoStart e o SCHEDULER que executive-brain.js:107 pressupoe e que nunca existiu.
        // Default DESLIGADO: iniciar missao sozinho e decisao do dono da plataforma, nao um
        // efeito colateral de subir o worker. Com FENIX_MISSION_AUTOSTART=1 o FENIX passa a
        // levar ao fim, sozinho, o que ele mesmo planejou -- respeitando as aprovacoes RED.
        try {
          const relatorio = await app.missions.reconcile(tenantId, actor, {
            autoStart: env.FENIX_MISSION_AUTOSTART === '1',
            maxConcurrent: Number(env.FENIX_MISSION_MAX_CONCURRENT || 2),
          });
          // Log APENAS quando houve acao ou recusa. Um ciclo de 2 s que loga "nada a fazer"
          // afoga o log onde justamente se procura o que aconteceu. A recusa de start() e o
          // caso que mais importa: sem ela, "o scheduler esta desligado" e "o scheduler
          // tentou e a politica recusou" se pareciam identicos de fora.
          const agiu = relatorio.orfaosResolvidos || relatorio.despachados || relatorio.iniciadas || relatorio.naoIniciadas?.length;
          if (agiu) process.stdout.write(`${JSON.stringify({ level: 'info', component: 'runtime-worker', message: 'mission reconcile', tenantId, ...relatorio })}\n`);
        }
        catch (error) { process.stderr.write(`${JSON.stringify({ level: 'warn', component: 'runtime-worker', message: `mission reconcile failed for ${tenantId}: ${error.message}` })}\n`); }
      }
    }
    // FLUXO 8 — health-check periodico da conexao com servicos externos (API Platform). So o
    // lider checa, e com cadencia PROPRIA (FENIX_CONNECTION_CHECK_MS, default 30s) -- nao a cada
    // ciclo de 2s: cada check pode escrever no documento unico (custo conhecido) e a conexao nao
    // muda a cada 2s. O estado OFFLINE/ONLINE fica sempre atualizado para o Digital Twin e alertas.
    if (leader && app.apiConnection && env.FENIX_CONNECTION_CHECK !== '0') {
      const checkEveryMs = Number(env.FENIX_CONNECTION_CHECK_MS || 30_000);
      if (nowMs() - lastConnectionCheck >= checkEveryMs) {
        lastConnectionCheck = nowMs();
        try { await app.apiConnection.check('aiplatform'); }
        catch (error) { process.stderr.write(`${JSON.stringify({ level: 'warn', component: 'runtime-worker', message: `connection check failed: ${error.message}` })}\n`); }
      }
    }
    // SERIE TEMPORAL MEDIDA — amostragem periodica das metricas do runtime.
    //
    // MEDIDO (2026-07-30): o coletor nasceu ligado ao loop `observability` do
    // `src/runtime/living-runtime.js`. So que `LivingRuntime` NAO TEM CHAMADOR: nenhum processo
    // o instancia (nem server, nem worker, nem ops, nem teste) -- as 557 linhas do supervisor de
    // 11 loops nunca subiram. Ligar a serie ali seria escrever um coletor que jamais amostra e
    // um sparkline que nunca sai de "nao medido", com o painel parecendo correto.
    // Entao a amostragem roda AQUI, no unico processo periodico que de fato existe, e sob o
    // MESMO lease de lider: dois workers amostrando dobrariam as escritas no documento unico
    // (cujo custo por escrita e o gargalo conhecido) e duplicariam cada ponto do grafico.
    // Cadencia propria (FENIX_OBSERVABILITY_SAMPLE_MS, default 60s): a cada 2 s a serie encheria
    // o teto de retencao (720 amostras) em 24 min de historico em vez de 12 h.
    if (leader && app.observabilitySeries && env.FENIX_OBSERVABILITY_SAMPLE !== '0') {
      const sampleEveryMs = Number(env.FENIX_OBSERVABILITY_SAMPLE_MS || 60_000);
      if (nowMs() - lastObservabilitySample >= sampleEveryMs) {
        lastObservabilitySample = nowMs();
        // Ator: o dono do schedule do tenant. `getMetrics` exige runtime:admin, e a serie e
        // por tenant -- sem tenant real nao ha o que amostrar (nao se inventa um ator sistema).
        const state = await app.store.read();
        const alvos = [...new Set(state.runtimeSchedules.filter((item) => item.enabled).map((item) => item.tenantId))];
        for (const tenantId of alvos) {
          const actor = state.runtimeSchedules.find((item) => item.tenantId === tenantId && item.enabled)?.createdBy;
          if (!actor) continue;
          try { await app.observabilitySeries.sample(tenantId, actor, { trigger: 'runtime-worker' }); }
          catch (error) { process.stderr.write(`${JSON.stringify({ level: 'warn', component: 'runtime-worker', message: `observability sample failed for ${tenantId}: ${error.message}` })}\n`); }
        }
      }
    }
    await app.jobs.recoverStale(Number(env.FENIX_STALE_JOB_MS || 60_000)); await app.jobs.runBatch(lease.ownerId, Number(env.FENIX_WORKER_BATCH || 10));
  };
  const guardedCycle = async () => { if (running) return; running = true; try { await cycle(); } finally { running = false; } };
  const timer = setInterval(() => guardedCycle().catch((error) => process.stderr.write(`${JSON.stringify({ level: 'error', component: 'runtime-worker', message: error.message })}\n`)), intervalMs); timer.unref();
  const stop = async () => { if (stopping) return; stopping = true; clearInterval(timer); if (lease.held) await lease.release(); await app.close(); };
  return { app, lease, cycle: guardedCycle, stop };
}

if (require.main === module) { startWorker().catch((error) => { process.stderr.write(`${error.stack || error}\n`); process.exitCode = 1; }); }
module.exports = { startWorker };
