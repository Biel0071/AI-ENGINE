const crypto = require('node:crypto');
const { uuid } = require('../kernel/ids');
const { stable } = require('../governance/approval-engine');
const { ValidationError, NotFoundError, ConflictError } = require('../kernel/errors');
const { SAFE_ID, SAFE_COMMAND } = require('./tool-registry');

class ScriptLibrary {
  constructor({ store, controlPlane, tools, bus }) { this.store = store; this.cp = controlPlane; this.tools = tools; this.bus = bus; }
  async registerSigner(tenantId, actorId, input) {
    await this.cp.authorize(tenantId, actorId, 'security:manage');
    const signerId = String(input?.signerId || ''); const publicKey = String(input?.publicKey || '');
    if (!SAFE_ID.test(signerId)) throw new ValidationError('invalid signer id');
    let key; try { key = crypto.createPublicKey(publicKey); } catch { throw new ValidationError('invalid signer public key'); }
    if (key.asymmetricKeyType !== 'ed25519') throw new ValidationError('script signer must use Ed25519');
    const signer = { id: uuid(), tenantId, signerId, publicKey, fingerprint: crypto.createHash('sha256').update(key.export({ type: 'spki', format: 'der' })).digest('hex'), status: 'ACTIVE', createdBy: actorId, createdAt: now() };
    await this.store.update((state) => { if (state.scriptSigners.some((item) => item.tenantId === tenantId && item.signerId === signerId && item.status === 'ACTIVE')) throw new ConflictError(`signer already registered: ${signerId}`); state.scriptSigners.push(signer); return state; }); return signer;
  }
  async register(tenantId, actorId, input) {
    await this.cp.authorize(tenantId, actorId, 'runtime:admin');
    const manifest = normalizeManifest(input?.manifest); const tool = await this.tools.getInternal(tenantId, manifest.toolId);
    if (manifest.entrypoint !== tool.command) throw new ValidationError('script entrypoint must match its registered tool command');
    const state = await this.store.read(); const signer = state.scriptSigners.find((item) => item.tenantId === tenantId && item.signerId === input.signerId && item.status === 'ACTIVE');
    if (!signer) throw new NotFoundError(`script signer not found: ${input.signerId}`);
    const signature = Buffer.from(String(input.signature || ''), 'base64');
    if (!signature.length || !crypto.verify(null, Buffer.from(canonical(manifest)), signer.publicKey, signature)) throw new ValidationError('script signature is invalid');
    const script = { id: uuid(), tenantId, scriptId: manifest.id, version: manifest.version, manifest, manifestHash: crypto.createHash('sha256').update(canonical(manifest)).digest('hex'), signerId: signer.signerId, signerFingerprint: signer.fingerprint, signature: input.signature, status: 'ACTIVE', createdBy: actorId, createdAt: now() };
    await this.store.update((draft) => { if (draft.scriptDefinitions.some((item) => item.tenantId === tenantId && item.scriptId === script.scriptId && item.version === script.version)) throw new ConflictError(`script version already registered: ${script.scriptId}@${script.version}`); draft.scriptDefinitions.push(script); return draft; });
    await this.bus.emit('execution.script.registered', { tenantId, actorId, scriptId: script.scriptId, version: script.version, manifestHash: script.manifestHash }); return script;
  }
  async resolve(tenantId, scriptId, version) { const state = await this.store.read(); const candidates = state.scriptDefinitions.filter((item) => item.tenantId === tenantId && item.scriptId === scriptId && item.status === 'ACTIVE' && (!version || item.version === version)); const script = candidates.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]; if (!script) throw new NotFoundError(`authorized script not found: ${scriptId}${version ? `@${version}` : ''}`); return script; }
  render(script, params = {}) { const allowed = new Map(script.manifest.parameters.map((item) => [item.name, item])); for (const key of Object.keys(params)) if (!allowed.has(key)) throw new ValidationError(`unknown script parameter: ${key}`); return [script.manifest.entrypoint, ...script.manifest.args.map((arg) => arg.replace(/\{\{([a-z][a-z0-9_]*)\}\}/g, (_, name) => validateParameter(name, params[name], allowed.get(name))))]; }
}
function normalizeManifest(value = {}) { const manifest = { id: String(value.id || ''), version: String(value.version || ''), toolId: String(value.toolId || ''), entrypoint: String(value.entrypoint || ''), args: (value.args || []).map(String), parameters: (value.parameters || []).map((item) => ({ name: String(item.name || ''), pattern: String(item.pattern || '^[a-zA-Z0-9._:/@-]{1,200}$'), required: item.required !== false })), description: String(value.description || '').slice(0, 1000) }; if (!SAFE_ID.test(manifest.id) || !manifest.version || !SAFE_ID.test(manifest.toolId) || !SAFE_COMMAND.test(manifest.entrypoint) || manifest.args.length > 100 || manifest.args.some((item) => item.length > 500 || /[;&|`$<>\n\r]/.test(item))) throw new ValidationError('invalid signed script manifest'); for (const parameter of manifest.parameters) { if (!/^[a-z][a-z0-9_]{0,40}$/.test(parameter.name) || parameter.pattern.length > 200 || /\\[1-9]|\(\?[=!<]/.test(parameter.pattern)) throw new ValidationError('invalid script parameter schema'); try { new RegExp(parameter.pattern); } catch { throw new ValidationError('invalid script parameter pattern'); } } return manifest; }
function validateParameter(name, value, schema) { if (!schema) throw new ValidationError(`unsigned parameter placeholder: ${name}`); if ((value === undefined || value === null) && schema.required) throw new ValidationError(`script parameter is required: ${name}`); const normalized = String(value ?? ''); if (normalized.length > 500 || !new RegExp(schema.pattern).test(normalized)) throw new ValidationError(`script parameter is invalid: ${name}`); return normalized; }
function canonical(value) { return JSON.stringify(stable(value)); }
function now() { return new Date().toISOString(); }
module.exports = { ScriptLibrary, normalizeManifest, canonical };
