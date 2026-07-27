const crypto = require('node:crypto');
const { uuid } = require('../kernel/ids');
const { ValidationError, NotFoundError, ForbiddenError } = require('../kernel/errors');
const { hashEmbedding, lexicalScore } = require('./embedding');

const KINDS = new Set(['episodic', 'semantic', 'working', 'project', 'organization']);
const CLASSIFICATIONS = new Set(['public', 'internal', 'confidential', 'restricted']);

class MemoryEngine {
  constructor({ store, bus, controlPlane, vectorStore = null, cache = null, embedding = hashEmbedding }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.vectorStore = vectorStore;
    this.cache = cache;
    this.embedding = embedding;
  }

  async remember(tenantId, actorId, input) {
    const membership = await this.cp.authorize(tenantId, actorId, 'memory:write');
    const normalized = this.validateInput(input, actorId);
    await this.validateScope(tenantId, normalized);
    if (normalized.classification === 'restricted' && !['admin', 'master_admin'].includes(membership.role)) {
      throw new ForbiddenError('restricted memory requires an administrator');
    }

    let memory;
    let outboxId;
    await this.store.update(async (state) => {
      const tenant = state.tenants.find((item) => item.id === tenantId);
      if (tenant) tenant.memoryRevision = (tenant.memoryRevision || 0) + 1;
      const existing = normalized.stableKey
        ? state.memories.find((item) => item.tenantId === tenantId && item.stableKey === normalized.stableKey && item.status === 'ACTIVE')
        : null;
      const timestamp = now();
      if (existing) {
        if (existing.classification === 'restricted' && !['admin', 'master_admin'].includes(membership.role)) {
          throw new ForbiddenError('restricted memory requires an administrator');
        }
        if (existing.kind === 'working' && existing.ownerActorId !== actorId) {
          throw new ForbiddenError('working memory belongs to another actor');
        }
        memory = existing;
        Object.assign(memory, normalized, { version: memory.version + 1, updatedAt: timestamp, updatedBy: actorId });
      } else {
        memory = {
          id: uuid(), tenantId, ...normalized, status: 'ACTIVE', version: 1,
          createdAt: timestamp, createdBy: actorId, updatedAt: timestamp, updatedBy: actorId,
        };
        state.memories.push(memory);
      }
      state.memoryVersions.push({
        id: uuid(), tenantId, memoryId: memory.id, version: memory.version,
        content: memory.content, title: memory.title, provenance: memory.provenance,
        confidence: memory.confidence, classification: memory.classification,
        recordedAt: timestamp, recordedBy: actorId,
      });
      outboxId = uuid();
      state.outbox.push({
        id: outboxId, tenantId, type: 'memory.index.requested', payload: { memoryId: memory.id },
        dedupeKey: `memory:${memory.id}:v${memory.version}`, status: 'PENDING', attempts: 0,
        availableAt: timestamp, createdAt: timestamp,
      });
      return state;
    });

    if (this.vectorStore) {
      try {
        await this.vectorStore.upsert(memory, this.embedding(`${memory.title}\n${memory.content}`));
        await this.store.update(async (state) => {
          const event = state.outbox.find((item) => item.id === outboxId);
          if (event) { event.status = 'PUBLISHED'; event.publishedAt = now(); }
          return state;
        });
      } catch (error) {
        await this.bus.emit('memory.index_failed', { tenantId, memoryId: memory.id, code: error.name });
      }
    }
    await this.bus.emit('memory.recorded', { tenantId, memoryId: memory.id, kind: memory.kind, version: memory.version, actorId });
    return memory;
  }

  validateInput(input, actorId) {
    const kind = String(input?.kind || 'episodic');
    const classification = String(input?.classification || 'internal');
    const content = String(input?.content || '').trim();
    if (!KINDS.has(kind)) throw new ValidationError(`unsupported memory kind: ${kind}`);
    if (!CLASSIFICATIONS.has(classification)) throw new ValidationError(`unsupported classification: ${classification}`);
    if (!content || content.length > 100_000) throw new ValidationError('memory content is required and must be at most 100000 characters');
    if (!input?.provenance?.type || !input?.provenance?.reference) throw new ValidationError('memory provenance type and reference are required');
    const confidence = Number(input.confidence ?? 0.5);
    if (confidence < 0 || confidence > 1) throw new ValidationError('memory confidence must be between 0 and 1');
    if (kind === 'working' && input.ownerActorId && input.ownerActorId !== actorId) throw new ForbiddenError('working memory can only be created for the current actor');
    return {
      kind, classification, content, confidence,
      title: String(input.title || kind).slice(0, 300),
      stableKey: input.stableKey ? String(input.stableKey).slice(0, 300) : null,
      projectId: input.projectId || null, orgId: input.orgId || null,
      ownerActorId: kind === 'working' ? actorId : (input.ownerActorId || null),
      tags: [...new Set((input.tags || []).map((tag) => String(tag).toLowerCase().slice(0, 64)))].slice(0, 32),
      provenance: {
        type: String(input.provenance.type).slice(0, 80),
        reference: String(input.provenance.reference).slice(0, 1000),
        evidence: (input.provenance.evidence || []).map((item) => String(item).slice(0, 1000)).slice(0, 50),
      },
      retentionUntil: input.retentionUntil || null,
    };
  }

  async validateScope(tenantId, memory) {
    const state = await this.store.read();
    if (memory.kind === 'project' || memory.projectId) {
      if (!memory.projectId || !state.projects.some((item) => item.tenantId === tenantId && item.id === memory.projectId)) {
        throw new ValidationError('project memory requires an existing tenant project');
      }
    }
    if (memory.kind === 'organization' || memory.orgId) {
      if (!memory.orgId || !state.orgs.some((item) => item.tenantId === tenantId && item.id === memory.orgId)) {
        throw new ValidationError('organization memory requires an existing tenant organization');
      }
    }
  }

  canAccessScope(memory, actorId, role) {
    if (memory.kind === 'working' && memory.ownerActorId !== actorId) return false;
    if (memory.classification === 'restricted' && !['admin', 'master_admin'].includes(role)) return false;
    return true;
  }

  canRead(memory, actorId, role) {
    return memory.status === 'ACTIVE' && this.canAccessScope(memory, actorId, role);
  }

  async query(tenantId, actorId, query, options = {}) {
    const membership = await this.cp.authorize(tenantId, actorId, 'memory:read');
    const text = String(query || '').trim();
    if (!text) throw new ValidationError('memory query is required');
    const state = await this.store.read();
    const revision = state.tenants.find((item) => item.id === tenantId)?.memoryRevision || 0;
    const cacheId = crypto.createHash('sha256').update(JSON.stringify({ actorId, text, options, revision })).digest('hex');
    if (this.cache) {
      const cached = await this.cache.get(tenantId, 'memory-query', cacheId);
      if (cached) return { ...cached, cached: true };
    }

    const candidates = state.memories.filter((memory) =>
      memory.tenantId === tenantId && this.canRead(memory, actorId, membership.role)
      && (!options.kind || memory.kind === options.kind)
      && (!options.projectId || memory.projectId === options.projectId)
      && (!options.orgId || memory.orgId === options.orgId)
      && (!options.tags?.length || options.tags.every((tag) => memory.tags.includes(String(tag).toLowerCase()))));
    const vectorScores = new Map();
    if (this.vectorStore) {
      try {
        const hits = await this.vectorStore.search(tenantId, this.embedding(text), options);
        for (const hit of hits) vectorScores.set(hit.id, hit.score);
      } catch (error) {
        await this.bus.emit('memory.vector_search_failed', { tenantId, code: error.name });
      }
    }
    const limit = Math.min(100, Math.max(1, Number(options.limit || 20)));
    const results = candidates.map((memory) => ({
      memory,
      score: Number((0.55 * lexicalScore(text, `${memory.title} ${memory.content}`) + 0.35 * (vectorScores.get(memory.id) || 0) + 0.1 * memory.confidence).toFixed(6)),
    })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
    const response = { results, totalCandidates: candidates.length, cached: false };
    if (this.cache) await this.cache.set(tenantId, 'memory-query', cacheId, response, 60);
    await this.bus.emit('memory.queried', { tenantId, actorId, resultCount: results.length });
    return response;
  }

  async forget(tenantId, actorId, memoryId, reason) {
    const membership = await this.cp.authorize(tenantId, actorId, 'memory:write');
    let memory;
    await this.store.update(async (state) => {
      const tenant = state.tenants.find((item) => item.id === tenantId);
      if (tenant) tenant.memoryRevision = (tenant.memoryRevision || 0) + 1;
      memory = state.memories.find((item) => item.id === memoryId && item.tenantId === tenantId);
      if (!memory) throw new NotFoundError(`Memory not found: ${memoryId}`);
      if (!this.canRead(memory, actorId, membership.role)) throw new NotFoundError(`Memory not found: ${memoryId}`);
      memory.status = 'DELETED'; memory.deletedAt = now(); memory.deletedBy = actorId; memory.deletionReason = String(reason || 'requested').slice(0, 500);
      state.memoryVersions.push({ id: uuid(), tenantId, memoryId, version: memory.version + 1, tombstone: true, recordedAt: now(), recordedBy: actorId });
      return state;
    });
    if (this.vectorStore) await this.vectorStore.delete(memoryId);
    await this.bus.emit('memory.forgotten', { tenantId, actorId, memoryId, reason: memory.deletionReason });
    return { id: memoryId, status: 'DELETED' };
  }

  async purgeExpired(tenantId, actorId, at = now()) {
    await this.cp.authorize(tenantId, actorId, 'memory:write');
    const state = await this.store.read();
    const expired = state.memories.filter((item) => item.tenantId === tenantId && item.status === 'ACTIVE' && item.retentionUntil && item.retentionUntil <= at);
    for (const memory of expired) await this.forget(tenantId, actorId, memory.id, 'retention-expired');
    return { expired: expired.length };
  }

  async consolidate(tenantId, actorId, options = {}) {
    await this.cp.authorize(tenantId, actorId, 'memory:write');
    const state = await this.store.read();
    const episodes = state.memories.filter((item) =>
      item.tenantId === tenantId && item.status === 'ACTIVE' && item.kind === 'episodic'
      && (!options.projectId || item.projectId === options.projectId)
      && (!options.orgId || item.orgId === options.orgId)
      && !item.consolidatedInto);
    const minimum = Math.max(2, Number(options.minimum || 3));
    if (episodes.length < minimum) return { consolidated: 0, memory: null };
    const ordered = episodes.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(0, Number(options.limit || 50));
    const fingerprint = crypto.createHash('sha256').update(ordered.map((item) => `${item.id}:v${item.version}`).join('|')).digest('hex').slice(0, 24);
    const projectId = options.projectId || (ordered.every((item) => item.projectId === ordered[0].projectId) ? ordered[0].projectId : null);
    const orgId = options.orgId || (ordered.every((item) => item.orgId === ordered[0].orgId) ? ordered[0].orgId : null);
    const classificationOrder = ['public', 'internal', 'confidential', 'restricted'];
    const classification = ordered.reduce((highest, item) =>
      classificationOrder.indexOf(item.classification) > classificationOrder.indexOf(highest) ? item.classification : highest, 'public');
    const consolidated = await this.remember(tenantId, actorId, {
      kind: projectId ? 'project' : (orgId ? 'organization' : 'semantic'),
      projectId, orgId, classification,
      title: `Consolidated knowledge from ${ordered.length} episodes`,
      content: ordered.map((item) => `- ${item.title}: ${item.content}`).join('\n').slice(0, 100_000),
      stableKey: `consolidation:${fingerprint}`,
      confidence: ordered.reduce((sum, item) => sum + item.confidence, 0) / ordered.length,
      tags: [...new Set(ordered.flatMap((item) => item.tags))],
      provenance: {
        type: 'memory-consolidation', reference: `episodes:${fingerprint}`,
        evidence: ordered.map((item) => `memory:${item.id}:v${item.version}`),
      },
    });
    await this.store.update(async (draft) => {
      for (const source of draft.memories) {
        if (ordered.some((item) => item.id === source.id)) source.consolidatedInto = consolidated.id;
      }
      return draft;
    });
    await this.bus.emit('memory.consolidated', { tenantId, actorId, memoryId: consolidated.id, sources: ordered.length });
    return { consolidated: ordered.length, memory: consolidated };
  }

  async history(tenantId, actorId, memoryId) {
    const membership = await this.cp.authorize(tenantId, actorId, 'memory:read');
    const state = await this.store.read();
    const memory = state.memories.find((item) => item.tenantId === tenantId && item.id === memoryId);
    if (!memory || !this.canAccessScope(memory, actorId, membership.role)) throw new NotFoundError(`Memory not found: ${memoryId}`);
    return state.memoryVersions.filter((item) => item.tenantId === tenantId && item.memoryId === memoryId).sort((a, b) => a.version - b.version);
  }
}

function now() { return new Date().toISOString(); }

module.exports = { MemoryEngine, KINDS, CLASSIFICATIONS };
