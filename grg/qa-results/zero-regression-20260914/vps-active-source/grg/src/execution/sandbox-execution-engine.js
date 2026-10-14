const crypto = require('node:crypto');
const { uuid } = require('../kernel/ids');
const { ValidationError, NotFoundError } = require('../kernel/errors');
const { assertNoSecrets } = require('../eventing/event-store');
const { stable } = require('../governance/approval-engine');

class SandboxExecutionEngine {
  constructor({ store, controlPlane, tools, scripts, adapter, approvals, audit, events, hierarchy = null }) { this.store = store; this.cp = controlPlane; this.tools = tools; this.scripts = scripts; this.adapter = adapter; this.approvals = approvals; this.audit = audit; this.events = events; this.hierarchy = hierarchy; }
  async execute(tenantId, actorId, input) {
    await this.cp.authorize(tenantId, actorId, 'runtime:execute'); assertNoSecrets(input.params || {}); assertNoSecrets(input.environment || {});
    if (input.scopeId && this.hierarchy) await this.hierarchy.authorizeScope(tenantId, actorId, input.scopeId, 'write');
    const script = await this.scripts.resolve(tenantId, input.scriptId, input.version); const tool = await this.tools.getInternal(tenantId, script.manifest.toolId);
    if (tool.status !== 'HEALTHY') throw new ValidationError(`tool is not healthy: ${tool.toolId}`);
    const environmentName = String(input.environmentName || 'inspection');
    if (!['inspection', 'test', 'preview', 'staging', 'production'].includes(environmentName)) throw new ValidationError('invalid sandbox environment');
    const resource = approvalResource(script, input, environmentName);
    if (environmentName === 'production') { if (!input.approvalId) throw new ValidationError('production sandbox execution requires approval'); await this.approvals.consume(tenantId, actorId, input.approvalId, { action: 'sandbox.execute.production', resource }); }
    const execution = { id: uuid(), tenantId, scopeId: input.scopeId || null, projectId: input.projectId || null, scriptId: script.scriptId, scriptVersion: script.version, manifestHash: script.manifestHash, toolId: tool.toolId, toolVersion: tool.version, image: tool.image, environmentName, paramsHash: hash(input.params || {}), limits: normalizeLimits(input.limits), network: String(input.network || 'none'), status: 'RUNNING', requestedBy: actorId, startedAt: now(), correlationId: input.correlationId || uuid() };
    await this.store.update((state) => { state.sandboxExecutions.push(execution); timeline(state, execution, 'EXECUTION_STARTED', { manifestHash: execution.manifestHash, image: execution.image }); return state; });
    await this.audit.record({ tenantId, actorId, action: 'sandbox.execution.started', resource: { executionId: execution.id, scriptId: execution.scriptId, environment: environmentName } });
    await this.events.publish({ tenantId, stream: `execution:${execution.id}`, type: 'sandbox.execution.started', source: 'sandbox-engine', subject: execution.id, data: { scriptId: execution.scriptId, environment: environmentName, status: 'RUNNING' }, idempotencyKey: `sandbox:start:${execution.id}` });
    try {
      const argv = this.scripts.render(script, input.params || {}); const result = await this.adapter.run({ executionId: execution.id, tool, argv, workspacePath: input.workspacePath, limits: execution.limits, network: execution.network, environment: input.environment || {} });
      await this.#finish(execution, actorId, 'SUCCEEDED', result); return this.get(tenantId, actorId, execution.id);
    } catch (error) { await this.#finish(execution, actorId, 'FAILED', error.sandboxOutput || { exitCode: 1, stderr: error.message }); throw error; }
  }
  async #finish(execution, actorId, status, output) { const safe = sanitizeOutput(output); await this.store.update((state) => { const current = state.sandboxExecutions.find((item) => item.id === execution.id); current.status = status; current.completedAt = now(); current.durationMs = Date.parse(current.completedAt) - Date.parse(current.startedAt); current.result = safe; timeline(state, current, `EXECUTION_${status}`, { exitCode: safe.exitCode, durationMs: current.durationMs }); return state; }); await this.audit.record({ tenantId: execution.tenantId, actorId, action: `sandbox.execution.${status.toLowerCase()}`, resource: { executionId: execution.id }, outcome: status }); await this.events.publish({ tenantId: execution.tenantId, stream: `execution:${execution.id}`, type: `sandbox.execution.${status.toLowerCase()}`, source: 'sandbox-engine', subject: execution.id, data: { status, exitCode: safe.exitCode }, idempotencyKey: `sandbox:${status}:${execution.id}` }); }
  async get(tenantId, actorId, executionId) { await this.cp.authorize(tenantId, actorId, 'runtime:read'); const state = await this.store.read(); const execution = state.sandboxExecutions.find((item) => item.tenantId === tenantId && item.id === executionId); if (!execution) throw new NotFoundError(`sandbox execution not found: ${executionId}`); return { ...execution, timeline: state.executionTimeline.filter((item) => item.tenantId === tenantId && item.executionId === executionId) }; }
  async list(tenantId, actorId) { await this.cp.authorize(tenantId, actorId, 'runtime:read'); const state = await this.store.read(); return state.sandboxExecutions.filter((item) => item.tenantId === tenantId).slice().reverse(); }
}
function normalizeLimits(input = {}) { const value = { timeoutMs: Number(input.timeoutMs || 300_000), memoryMb: Number(input.memoryMb || 512), cpuUnits: Number(input.cpuUnits || 1000), pids: Number(input.pids || 128) }; if (!Number.isInteger(value.timeoutMs) || value.timeoutMs < 100 || value.timeoutMs > 3_600_000 || !Number.isInteger(value.memoryMb) || value.memoryMb < 64 || value.memoryMb > 8192 || !Number.isInteger(value.cpuUnits) || value.cpuUnits < 100 || value.cpuUnits > 8000 || !Number.isInteger(value.pids) || value.pids < 16 || value.pids > 1024) throw new ValidationError('invalid sandbox limits'); return value; }
function approvalResource(script, input, environmentName) { return { scriptId: script.scriptId, version: script.version, manifestHash: script.manifestHash, projectId: input.projectId || null, scopeId: input.scopeId || null, environment: environmentName, paramsHash: hash(input.params || {}) }; }
function hash(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }
function sanitizeOutput(value = {}) { return { exitCode: Number(value.exitCode ?? 1), stdout: redact(String(value.stdout || '')).slice(0, 1_000_000), stderr: redact(String(value.stderr || '')).slice(0, 1_000_000), sandbox: value.sandbox || null }; }
function redact(value) { return value.replace(/(password|secret|token|api[_-]?key)\s*[=:]\s*[^\s]+/gi, '$1=[REDACTED]').replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]'); }
function timeline(state, execution, type, data) { state.executionTimeline.push({ id: uuid(), tenantId: execution.tenantId, executionId: execution.id, type, data, occurredAt: now() }); }
function now() { return new Date().toISOString(); }
module.exports = { SandboxExecutionEngine, normalizeLimits, approvalResource, sanitizeOutput };
