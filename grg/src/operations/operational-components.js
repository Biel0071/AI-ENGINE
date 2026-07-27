const pkg = require('../../package.json');
const { assuranceProbe } = require('./operational-activation');

function createOperationalComponents(context, tenantId) {
  const { store, health, aiGateway, redis, queues, objects, vectorStore, sandboxConfigured, sandboxProductionSafe, policy, metrics } = context;
  const stateProbe = (selector) => async () => ({ ok: true, version: pkg.version, evidence: selector(await store.read()) });
  return [
    component('runtime', ['job-engine', 'workers'], stateProbe((state) => ({ jobs: scoped(state.runtimeJobs, tenantId).length, schedules: scoped(state.runtimeSchedules, tenantId).length })), true),
    component('job-engine', ['state-store'], stateProbe((state) => ({ queued: scoped(state.runtimeJobs, tenantId).filter((item) => item.status === 'QUEUED').length, deadLetters: scoped(state.deadLetters, tenantId).length })), true),
    component('sandbox', ['docker-rootless', 'tool-registry', 'script-library'], async () => ({ ok: sandboxConfigured, configured: sandboxConfigured, version: pkg.version, evidence: { configured: sandboxConfigured, productionSafe: sandboxProductionSafe } }), false, true),
    component('ai-gateway', [], async () => { const providers = await aiGateway.providerHealth(); const candidates = aiGateway.candidates('default'); const ok = candidates.some((item) => providers[item.provider]?.ok); return { ok, version: pkg.version, evidence: { route: candidates.map((item) => ({ provider: item.provider, model: item.model })), providers } }; }, true),
    component('postgresql', [], externalProbe(store, Boolean(context.databaseConfigured), 'state-store'), false, true),
    component('redis', [], externalProbe(redis, Boolean(redis), 'redis'), false, true),
    component('qdrant', [], externalProbe(vectorStore, Boolean(vectorStore), 'vector-store'), false, true),
    component('minio', [], externalProbe(objects, Boolean(objects), 'object-storage'), false, true),
    component('docker-rootless', [], async () => ({ ok: sandboxConfigured && sandboxProductionSafe, configured: sandboxConfigured, version: 'rootless', evidence: { productionSafe: sandboxProductionSafe } }), false, true),
    component('version-engine', ['event-store'], stateProbe((state) => ({ versions: scoped(state.resourceVersions, tenantId).length, rollbackProposals: scoped(state.rollbackProposals, tenantId).length })), true),
    component('capability-registry', ['service-registry'], stateProbe((state) => ({ definitions: scoped(state.capabilityDefinitions, tenantId).length, versions: scoped(state.capabilityVersions, tenantId).length })), true),
    component('knowledge-graph', ['state-store'], stateProbe((state) => ({ entities: scoped(state.knowledgeEntities, tenantId).length, relationships: scoped(state.knowledgeRelationships, tenantId).length })), true),
    component('memory-engine', ['knowledge-graph'], stateProbe((state) => ({ active: scoped(state.memories, tenantId).filter((item) => item.status === 'ACTIVE').length, versions: scoped(state.memoryVersions, tenantId).length })), true),
    component('digital-twin', ['knowledge-graph'], stateProbe((state) => ({ projectTwins: scoped(state.digitalTwins, tenantId).filter((item) => item.current).length, operationalTwins: scoped(state.operationalTwins, tenantId).filter((item) => item.current).length })), true),
    component('ai-city', ['event-store', 'digital-twin'], stateProbe((state) => ({ nodes: scoped(state.cityNodes, tenantId).length, projection: state.cityProjectionStates.find((item) => item.tenantId === tenantId) || null })), true),
    component('internal-apis', ['state-store', 'security-plane'], async () => { const result = await health.check(); return { ok: result.ok, version: pkg.version, evidence: { status: result.status, checks: result.checks } }; }, true),
    component('workers', ['redis', 'job-engine'], async () => { const state = await store.read(); const workers = state.workerHeartbeats || []; const latest = workers.slice().sort((a, b) => String(b.lastSeenAt || '').localeCompare(String(a.lastSeenAt || '')))[0] || null; const fresh = latest && Date.now() - Date.parse(latest.lastSeenAt) < 120_000; return { ok: Boolean(fresh), configured: Boolean(queues), version: pkg.version, lastHeartbeat: latest?.lastSeenAt || null, evidence: { workers: workers.length, fresh: Boolean(fresh) } }; }, false, true),
    component('audit-and-policies', ['state-store'], async () => ({ ok: policy.evaluate('agent.execute.red').approvalRequired === true, version: pkg.version, evidence: { redApprovalRequired: policy.evaluate('agent.execute.red').approvalRequired } }), true),
    component('metrics', ['state-store'], async () => { const output = await metrics.render(); return { ok: output.includes('fenix_runtime_jobs'), version: 'prometheus', evidence: { format: 'prometheus', bytes: Buffer.byteLength(output) } }; }, true),
    component('backup-proof', ['state-store'], assuranceProbe(store, tenantId, 'backup'), false, true),
    component('restore-proof', ['backup-proof'], assuranceProbe(store, tenantId, 'restore'), false, true),
    component('rollback-proof', ['version-engine'], assuranceProbe(store, tenantId, 'rollback'), false, true),
    component('centralized-logs', ['internal-apis'], assuranceProbe(store, tenantId, 'centralized-logs'), false, true),
  ];
}

function component(id, dependencies, check, critical = false, productionCritical = false) { return { id, label: id, dependencies, check, critical, productionCritical, version: pkg.version }; }
function scoped(items = [], tenantId) { return items.filter((item) => item.tenantId === tenantId); }
function externalProbe(adapter, configured, label) { return async () => { if (!configured) return { ok: false, configured: false, evidence: { adapter: label, reason: 'not configured' } }; if (typeof adapter.health === 'function') { const detail = await adapter.health(); return { ...detail, configured: true, evidence: { adapter: label, ...detail } }; } if (typeof adapter.read === 'function') { await adapter.read(); return { ok: true, configured: true, evidence: { adapter: label, contract: 'read' } }; } return { ok: true, configured: true, evidence: { adapter: label, contract: 'configured' } }; }; }

module.exports = { createOperationalComponents, externalProbe };
