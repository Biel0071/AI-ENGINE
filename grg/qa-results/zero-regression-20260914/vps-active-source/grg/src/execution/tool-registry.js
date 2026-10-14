const { uuid } = require('../kernel/ids');
const { ValidationError, NotFoundError, ConflictError } = require('../kernel/errors');

const SAFE_ID = /^[a-z][a-z0-9._-]{2,80}$/;
const SAFE_COMMAND = /^(?:\/[a-zA-Z0-9._-]+)+$|^[a-zA-Z0-9._-]+$/;
const PINNED_IMAGE = /^[a-z0-9./_-]+@sha256:[a-f0-9]{64}$/;

class ToolRegistry {
  constructor({ store, controlPlane, bus }) { this.store = store; this.cp = controlPlane; this.bus = bus; this.executors = new Map(); }
  async registerNative(tenantId, input, executor) {
    if (!input?.toolId || typeof executor !== 'function') throw new ValidationError('native tool requires toolId and executor');
    const tool = normalizeToolDescriptor({ ...input, id: uuid(), tenantId, kind: 'native', source: input.source || 'grg-native', status: 'HEALTHY', createdAt: now() });
    await this.store.update((state) => {
      const existing = state.toolDefinitions.find((item) => item.tenantId === tenantId && item.toolId === tool.toolId && item.status !== 'RETIRED');
      if (!existing) state.toolDefinitions.push(tool);
      return state;
    });
    this.executors.set(`${tenantId}:${tool.toolId}`, executor);
    return tool;
  }
  async execute(tenantId, actorId, toolId, input = {}, context = {}) {
    await this.cp.authorize(tenantId, actorId, 'runtime:execute');
    const tool = await this.getInternal(tenantId, toolId);
    const executor = this.executors.get(`${tenantId}:${toolId}`);
    if (!executor) throw new ValidationError(`tool executor unavailable: ${toolId}`);
    const startedAt = now();
    await this.bus?.emit('execution.tool.started', { tenantId, actorId, toolId, startedAt, jobId: context.jobId || null });
    try {
      const result = await Promise.race([Promise.resolve(executor(input, context)), timeout(tool.timeoutMs)]);
      await this.bus?.emit('execution.tool.completed', { tenantId, actorId, toolId, startedAt, completedAt: now(), jobId: context.jobId || null });
      return { toolId, status: 'SUCCEEDED', result };
    } catch (error) {
      await this.bus?.emit('execution.tool.failed', { tenantId, actorId, toolId, startedAt, failedAt: now(), jobId: context.jobId || null, error: String(error.message || error).slice(0, 500) });
      throw error;
    }
  }
  async register(tenantId, actorId, input) {
    await this.cp.authorize(tenantId, actorId, 'runtime:admin');
    const id = String(input?.id || ''); const command = String(input?.command || ''); const image = String(input?.image || '');
    if (!SAFE_ID.test(id) || !SAFE_COMMAND.test(command) || !PINNED_IMAGE.test(image)) throw new ValidationError('tool requires a safe id, command and digest-pinned image');
    const tool = normalizeToolDescriptor({ id: uuid(), tenantId, toolId: id, version: String(input.version || 'unknown').slice(0, 80), command, image, capabilities: unique(input.capabilities), permissions: unique(input.permissions), requirements: unique(input.requirements), allowedNetworks: unique(input.allowedNetworks || ['none']), inputSchema: input.inputSchema, timeoutMs: input.timeoutMs, retryPolicy: input.retryPolicy, source: input.source, status: 'HEALTHY', createdBy: actorId, createdAt: now() });
    await this.store.update((state) => { if (state.toolDefinitions.some((item) => item.tenantId === tenantId && item.toolId === id && item.status !== 'RETIRED')) throw new ConflictError(`tool already registered: ${id}`); state.toolDefinitions.push(tool); return state; });
    await this.bus.emit('execution.tool.registered', { tenantId, actorId, toolId: id, version: tool.version }); return tool;
  }
  async get(tenantId, actorId, toolId) { await this.cp.authorize(tenantId, actorId, 'runtime:read'); return this.getInternal(tenantId, toolId); }
  async getInternal(tenantId, toolId) { const state = await this.store.read(); const tool = state.toolDefinitions.find((item) => item.tenantId === tenantId && item.toolId === toolId && item.status !== 'RETIRED'); if (!tool) throw new NotFoundError(`tool not found: ${toolId}`); return tool; }
  async list(tenantId, actorId) { await this.cp.authorize(tenantId, actorId, 'runtime:read'); const state = await this.store.read(); return state.toolDefinitions.filter((item) => item.tenantId === tenantId && item.status !== 'RETIRED'); }
}
function unique(values = []) { return [...new Set(values.map((item) => String(item).slice(0, 120)))].slice(0, 100); }
function normalizeToolDescriptor(input = {}) {
  const timeoutMs = Number(input.timeoutMs ?? 300_000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 3_600_000) throw new ValidationError('tool timeoutMs must be an integer between 100 and 3600000');
  const retryPolicy = input.retryPolicy && typeof input.retryPolicy === 'object' ? { maxAttempts: Number(input.retryPolicy.maxAttempts ?? 1), backoffMs: Number(input.retryPolicy.backoffMs ?? 250) } : { maxAttempts: 1, backoffMs: 250 };
  if (!Number.isInteger(retryPolicy.maxAttempts) || retryPolicy.maxAttempts < 1 || retryPolicy.maxAttempts > 5 || !Number.isInteger(retryPolicy.backoffMs) || retryPolicy.backoffMs < 0 || retryPolicy.backoffMs > 60_000) throw new ValidationError('invalid tool retryPolicy');
  const inputSchema = input.inputSchema == null ? { type: 'object', additionalProperties: true } : input.inputSchema;
  if (!inputSchema || typeof inputSchema !== 'object' || Array.isArray(inputSchema) || inputSchema.type !== 'object') throw new ValidationError('tool inputSchema must be a JSON object schema');
  return { ...input, kind: input.kind || (input.mcpServerId ? 'mcp' : 'native'), inputSchema, timeoutMs, retryPolicy, audit: input.audit !== false, source: input.source || (input.mcpServerId ? `mcp:${input.mcpServerId}` : 'grg-native') };
}
function now() { return new Date().toISOString(); }
function timeout(ms) { return new Promise((_, reject) => setTimeout(() => reject(new Error(`tool timeout after ${ms}ms`)), ms)); }
module.exports = { ToolRegistry, SAFE_ID, SAFE_COMMAND, PINNED_IMAGE, normalizeToolDescriptor };
