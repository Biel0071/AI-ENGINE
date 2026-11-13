'use strict';
// Entrega A: chat "build/create code" -> mission (MissionPlanner, mode CODE) -> manager agent
// (Orchestrator) delegates to a sub-agent (Developer) -> runtime job `code.deliver` (claimed by the
// fenix-runtime-worker) -> local Ollama coder -> extract code -> sandbox tests -> persist on mission
// -> chat reply. No external LLM. Every failure is reported as such; nothing is simulated.
const { LocalCoderClient, extractCodeBlock } = require('../ai-runtime/local-coder-client');
const { runInSandbox } = require('./code-sandbox-runner');

const TERMINAL_JOB = new Set(['SUCCEEDED', 'FAILED', 'DEAD_LETTER', 'CANCELLED']);
const TERMINAL_MISSION = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED']);
const MAX_CODE_BYTES = 20_000;
const BUILD_CODE_RE = /\b(cri[ae]r?|escrev[ae]r?|ger[ae]r?|implement[ae]r?|programe|codifique|write|create|build|implement|generate)\b[\s\S]*\b(fun[cç][aã]o|function|c[oó]digo|code|script|algoritmo|algorithm|m[eé]todo|method)\b/i;

function isBuildCodeRequest(text) { return BUILD_CODE_RE.test(String(text || '')); }

// Task-provided tests. Supports a ```test fenced block (assert statements) or example lines such as
// "add(2, 3) => 5", "add(2,3) === 5", "add(2,3) deve retornar 5".
function parseTests(text) {
  const s = String(text || '');
  const block = s.match(/```(?:test|tests|teste|testes)[ \t]*\r?\n([\s\S]*?)```/i);
  if (block && block[1].trim()) return { kind: 'assert', source: block[1].trim() };
  const re = /([A-Za-z_$][\w$]*)\(([^()]*)\)\s*(?:={2,3}|=>|->|deve retornar|retorna|returns?)\s*('[^']*'|"[^"]*"|\[[^\]]*\]|\{[^}]*\}|[^\s,;]+)/gi;
  const cases = [];
  for (const m of s.matchAll(re)) {
    const expected = m[3].replace(/(?<=[A-Za-z\])}'"])\.$/, '');
    cases.push({ fn: m[1], args: m[2].trim(), expected });
    if (cases.length >= 20) break;
  }
  return cases.length ? { kind: 'examples', cases } : { kind: 'smoke' };
}

function buildPrompt(objective, tests) {
  const lines = [
    'You write Node.js (CommonJS) JavaScript.',
    `Task: ${objective}`,
  ];
  if (tests.kind === 'examples') {
    const names = [...new Set(tests.cases.map((c) => c.fn))];
    lines.push(`Define the function(s) ${names.join(', ')} and export them with module.exports = { ${names.join(', ')} }.`);
    lines.push('It must satisfy:', ...tests.cases.map((c) => `  ${c.fn}(${c.args}) returns ${c.expected}`));
  } else {
    lines.push('Export the function(s) with module.exports.');
  }
  lines.push('Reply with ONLY one ```javascript code block. No explanation.');
  return lines.join('\n');
}

function withAutoExports(code, tests) {
  if (tests.kind !== 'examples') return code;
  const names = [...new Set(tests.cases.map((c) => c.fn))];
  // Only bridges a declared-but-not-exported function; it never defines behaviour.
  const bridge = names.map((n) => `try { if (typeof ${n} === 'function' && !(module.exports && module.exports.${n})) module.exports.${n} = ${n}; } catch (_) {}`).join('\n');
  return `${code}\n;${bridge}\n`;
}

class CodeDelivery {
  constructor({ app, coder = null, sandbox = runInSandbox, env = process.env } = {}) {
    this.app = app;
    this.env = env;
    this.coder = coder || new LocalCoderClient({ env });
    this.sandbox = sandbox;
    if ((env.FENIX_ENV === 'production' || env.NODE_ENV === 'production') && sandbox.productionSafe !== true) {
      throw new Error('production code delivery requires an explicitly production-safe sandbox adapter');
    }
    this.waitMs = Number(env.FENIX_CODE_DELIVERY_WAIT_MS || 55_000); // leaves time for the UI timeout and mission projection
    this.claimWaitMs = Number(env.FENIX_CODE_DELIVERY_CLAIM_WAIT_MS || 5_000);
    this.projectionWaitMs = Number(env.FENIX_MISSION_PROJECTION_WAIT_MS || 5_000);
    this.inline = env.FENIX_CODE_DELIVERY_INLINE !== '0';
    this.sandboxTimeoutMs = Number(env.FENIX_SANDBOX_TIMEOUT_MS || 10_000);
  }

  // Runtime job handler for `code.deliver` (runs inside whichever process claims the job).
  async handleJob(payload = {}, ctx = {}) {
    const registry = this.app.agentRegistry;
    const objective = String(payload.objective || '').slice(0, 4000);
    const tests = payload.tests && payload.tests.kind ? payload.tests : { kind: 'smoke' };
    const subAgentId = payload.subAgentId || null;
    const started = Date.now();
    if (registry && subAgentId) registry.setAvailability(subAgentId, 'BUSY', { taskId: ctx.jobId, currentMissionId: payload.missionId || null });
    await ctx.stage?.('generating', 10, { model: this.coder.model });
    const gen = await this.coder.generate(buildPrompt(objective, tests), { signal: ctx.signal });
    let result;
    if (!gen.ok) {
      result = { deliveryStatus: 'MODEL_UNAVAILABLE', stepOutcome: 'FAILED', reason: gen.reason, breaker: gen.breaker || null, code: null, sandbox: null };
    } else {
      const extracted = extractCodeBlock(gen.text);
      if (!extracted) {
        result = { deliveryStatus: 'NO_CODE_EXTRACTED', stepOutcome: 'FAILED', reason: 'model reply contained no fenced code block', rawHead: gen.text.slice(0, 500), code: null, sandbox: null };
      } else {
        await ctx.stage?.('testing', 60, { testKind: tests.kind });
        const code = extracted.slice(0, MAX_CODE_BYTES);
        const sandbox = await this.sandbox({ code: withAutoExports(code, tests), tests, timeoutMs: this.sandboxTimeoutMs, env: this.env });
        const passed = sandbox.passed;
        result = {
          deliveryStatus: passed ? 'TESTS_PASSED' : 'TESTS_FAILED',
          // A smoke-only run proves the module loads, not that it is correct: say so.
          stepOutcome: passed ? 'SUCCEEDED' : 'FAILED',
          code, sandbox,
        };
      }
    }
    const summary = {
      ...result,
      jobId: ctx.jobId || null,
      workerId: ctx.job?.workerId || null,
      managerAgentId: payload.managerAgentId || null,
      subAgentId,
      model: gen.model, modelUrl: gen.url, modelOk: !!gen.ok,
      testKind: tests.kind,
      metrics: { tokens: gen.tokens ?? null, costUsd: 0, modelDurationMs: gen.durationMs ?? null, totalDurationMs: Date.now() - started, ollama: gen.ollama || null },
      completedAt: new Date().toISOString(),
    };
    if (registry && subAgentId) {
      registry.recordTaskResult(subAgentId, { taskId: ctx.jobId, success: summary.stepOutcome === 'SUCCEEDED', durationMs: summary.metrics.totalDurationMs, tokensUsed: gen.tokens || 0, costUsd: 0 });
      registry.setAvailability(subAgentId, 'AVAILABLE', { taskId: null, currentMissionId: null });
    }
    if (payload.missionId && this.app.store) {
      await this.app.store.update((state) => {
        const mission = (state.missions || []).find((m) => m.id === payload.missionId);
        if (mission) { mission.delivery = summary; mission.updatedAt = new Date().toISOString(); }
        return state;
      });
    }
    return summary;
  }

  async requestFromChat(tenantId, actorId, text) {
    const app = this.app;
    const objective = String(text).trim().slice(0, 3900);
    const tests = parseTests(objective);
    const registry = app.agentRegistry;
    const manager = registry?.get('Orchestrator') || null;
    const sub = registry?.get('Developer') || registry?.findForTask(objective) || null;
    if (!manager || !sub) throw new Error('agent registry has no Orchestrator/Developer agent to delegate to');
    const { mission, plan } = await app.missionPlanner.plan(tenantId, actorId, {
      objective, title: `Código: ${objective}`.slice(0, 200), mode: 'CODE',
      context: { tests, managerAgentId: manager.id, subAgentId: sub.id },
      policy: { maxTokens: 50_000, maxCostUsd: 0 },
    });
    if (!mission) return { deliveryStatus: 'PLAN_NEEDS_INPUT', planId: plan?.id || null, questions: plan?.questions || [] };
    const step = (mission.steps || []).find((s) => s.key === 'code');
    const jobId = step?.jobId || null;
    if (!jobId) return { deliveryStatus: 'NOT_DISPATCHED', missionId: mission.id, missionStatus: mission.status, managerAgentId: manager.id, subAgentId: sub.id };
    const job = await this.#awaitJob(tenantId, jobId);
    const latest = await this.#awaitMissionProjection(tenantId, actorId, mission.id);
    const state = await app.store.read();
    const delivery = (state.missions || []).find((m) => m.id === mission.id)?.delivery || job?.result || null;
    return {
      missionId: mission.id, missionStatus: latest?.status || mission.status,
      jobId, jobStatus: job?.status || 'UNKNOWN', workerId: job?.workerId || job?.lastWorkerId || null,
      managerAgentId: manager.id, subAgentId: sub.id,
      model: delivery?.model || this.coder.model, modelOk: delivery ? delivery.modelOk : null,
      metrics: delivery?.metrics || null,
      deliveryStatus: delivery?.deliveryStatus || (TERMINAL_JOB.has(job?.status) ? 'JOB_FAILED' : 'RUNNING'),
      reason: delivery?.reason || job?.error?.message || null,
      testKind: tests.kind,
      tests: delivery?.sandbox ? { passed: delivery.sandbox.passed, total: delivery.sandbox.total, passedCount: delivery.sandbox.passedCount, results: delivery.sandbox.results, isolation: delivery.sandbox.isolation } : null,
      code: delivery?.code || null,
    };
  }

  async #awaitJob(tenantId, jobId) {
    const jobs = this.app.jobs;
    const deadline = Date.now() + this.waitMs;
    const claimDeadline = Date.now() + this.claimWaitMs;
    let job = await jobs.getInternal(tenantId, jobId);
    while (!TERMINAL_JOB.has(job?.status) && Date.now() < deadline) {
      // No worker claimed the job in time (e.g. no Redis/worker in this environment): run it in this
      // process through the same JobEngine path. The job's workerId records who actually ran it.
      if (this.inline && job?.status === 'QUEUED' && Date.now() >= claimDeadline) {
        await jobs.run(tenantId, jobId, `inline:${process.pid}`);
      } else {
        await new Promise((r) => setTimeout(r, 250));
      }
      job = await jobs.getInternal(tenantId, jobId);
    }
    return job;
  }

  async #awaitMissionProjection(tenantId, actorId, missionId) {
    const deadline = Date.now() + this.projectionWaitMs;
    let mission = await this.app.missions.get(tenantId, actorId, missionId).catch(() => null);
    while (!TERMINAL_MISSION.has(mission?.status) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      mission = await this.app.missions.get(tenantId, actorId, missionId).catch(() => null);
    }
    return mission;
  }
}

function renderDeliveryReply(f) {
  if (!f) return 'Não consegui criar a missão de código.';
  if (f.deliveryStatus === 'PLAN_NEEDS_INPUT') return `A missão precisa de mais informação: ${(f.questions || []).map((q) => q.question).join(' ')}`;
  const head = [`Missão ${f.missionId} (${f.missionStatus}) · job ${f.jobId || '—'} (${f.jobStatus || '—'}) · executado por ${f.workerId || '—'}`,
    `Gerente: ${f.managerAgentId} → subagente: ${f.subAgentId} · modelo: ${f.model}`];
  switch (f.deliveryStatus) {
    case 'MODEL_UNAVAILABLE': return [...head, `Modelo local indisponível: ${f.reason}. Nenhum código foi gerado.`].join('\n');
    case 'NO_CODE_EXTRACTED': return [...head, 'O modelo respondeu, mas sem bloco de código. Nada foi testado.'].join('\n');
    case 'RUNNING': return [...head, 'Ainda em execução no worker; o resultado será gravado na missão.'].join('\n');
    case 'TESTS_PASSED':
    case 'TESTS_FAILED': {
      const t = f.tests || {};
      const kind = f.testKind === 'smoke' ? 'smoke (só verifica que carrega e exporta uma função — não prova correção)' : f.testKind === 'examples' ? 'exemplos fornecidos no pedido' : 'asserções fornecidas no pedido';
      const failed = (t.results || []).filter((r) => !r.passed).map((r) => `✗ ${r.name}: ${r.error || ''}`);
      return [...head, `Teste em sandbox (${kind}): ${t.passedCount}/${t.total} ${f.deliveryStatus === 'TESTS_PASSED' ? 'passaram' : 'passaram — FALHOU'}`, ...failed, '```javascript', f.code || '', '```'].join('\n');
    }
    default: return [...head, `Resultado: ${f.deliveryStatus}${f.reason ? ` — ${f.reason}` : ''}`].join('\n');
  }
}

module.exports = { CodeDelivery, isBuildCodeRequest, parseTests, buildPrompt, renderDeliveryReply, withAutoExports };
