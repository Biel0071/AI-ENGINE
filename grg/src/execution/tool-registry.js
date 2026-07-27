const { uuid } = require('../kernel/ids');
const { ValidationError, NotFoundError, ConflictError } = require('../kernel/errors');

const SAFE_ID = /^[a-z][a-z0-9._-]{2,80}$/;
const SAFE_COMMAND = /^(?:\/[a-zA-Z0-9._-]+)+$|^[a-zA-Z0-9._-]+$/;
const PINNED_IMAGE = /^[a-z0-9./_-]+@sha256:[a-f0-9]{64}$/;

class ToolRegistry {
  constructor({ store, controlPlane, bus }) { this.store = store; this.cp = controlPlane; this.bus = bus; }
  async register(tenantId, actorId, input) {
    await this.cp.authorize(tenantId, actorId, 'runtime:admin');
    const id = String(input?.id || ''); const command = String(input?.command || ''); const image = String(input?.image || '');
    if (!SAFE_ID.test(id) || !SAFE_COMMAND.test(command) || !PINNED_IMAGE.test(image)) throw new ValidationError('tool requires a safe id, command and digest-pinned image');
    const tool = { id: uuid(), tenantId, toolId: id, version: String(input.version || 'unknown').slice(0, 80), command, image, capabilities: unique(input.capabilities), permissions: unique(input.permissions), requirements: unique(input.requirements), allowedNetworks: unique(input.allowedNetworks || ['none']), status: 'HEALTHY', createdBy: actorId, createdAt: now() };
    await this.store.update((state) => { if (state.toolDefinitions.some((item) => item.tenantId === tenantId && item.toolId === id && item.status !== 'RETIRED')) throw new ConflictError(`tool already registered: ${id}`); state.toolDefinitions.push(tool); return state; });
    await this.bus.emit('execution.tool.registered', { tenantId, actorId, toolId: id, version: tool.version }); return tool;
  }
  async get(tenantId, actorId, toolId) { await this.cp.authorize(tenantId, actorId, 'runtime:read'); return this.getInternal(tenantId, toolId); }
  async getInternal(tenantId, toolId) { const state = await this.store.read(); const tool = state.toolDefinitions.find((item) => item.tenantId === tenantId && item.toolId === toolId && item.status !== 'RETIRED'); if (!tool) throw new NotFoundError(`tool not found: ${toolId}`); return tool; }
  async list(tenantId, actorId) { await this.cp.authorize(tenantId, actorId, 'runtime:read'); const state = await this.store.read(); return state.toolDefinitions.filter((item) => item.tenantId === tenantId && item.status !== 'RETIRED'); }
}
function unique(values = []) { return [...new Set(values.map((item) => String(item).slice(0, 120)))].slice(0, 100); }
function now() { return new Date().toISOString(); }
module.exports = { ToolRegistry, SAFE_ID, SAFE_COMMAND, PINNED_IMAGE };
