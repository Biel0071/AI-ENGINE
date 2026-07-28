const crypto = require('node:crypto');
const { uuid } = require('../kernel/ids');
const { ValidationError, NotFoundError } = require('../kernel/errors');

class KnowledgeGenomeEngine {
  constructor({ store, bus, controlPlane, hierarchy, vectorStore }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.hierarchy = hierarchy;
    this.vectorStore = vectorStore;
  }

  async createCapsule(tenantId, actorId, input = {}) {
    await this.cp.authorize(tenantId, actorId, 'memory:write');
    if (!input.title || !input.content) {
      throw new ValidationError('Knowledge Capsule requires title and content');
    }

    const level = (input.level || 'WORKING').toUpperCase();
    const validLevels = ['WORKING', 'MISSION', 'PROJECT', 'ORGANIZATION', 'GLOBAL', 'KNOWLEDGE_GENOME'];
    if (!validLevels.includes(level)) {
      throw new ValidationError(`Invalid memory level: ${level}`);
    }

    const payload = JSON.stringify({ title: input.title, content: input.content });
    const hash = crypto.createHash('sha256').update(payload).digest('hex');

    const capsule = {
      id: uuid(),
      tenantId,
      hash,
      title: String(input.title),
      summary: String(input.summary || input.content.slice(0, 200)),
      content: String(input.content),
      level,
      entities: Array.isArray(input.entities) ? input.entities : [],
      relationships: Array.isArray(input.relationships) ? input.relationships : [],
      confidence: Number(input.confidence || 0.95),
      version: 1,
      source: input.source || 'user_interaction',
      scopeId: input.scopeId || null,
      history: [{ version: 1, promotedAt: new Date().toISOString(), level, promotedBy: actorId }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.store.update((state) => {
      state.knowledgeCapsules = state.knowledgeCapsules || [];
      state.knowledgeCapsules.push(capsule);
      return state;
    });

    if (this.vectorStore && typeof this.vectorStore.upsert === 'function') {
      try {
        await this.vectorStore.upsert(tenantId, capsule.id, capsule.summary, {
          title: capsule.title,
          level: capsule.level,
        });
      } catch {
        /* Vector store optional fallback */
      }
    }

    if (this.bus?.emit) {
      await this.bus.emit('knowledge.capsule.created', { tenantId, capsuleId: capsule.id, level, hash });
    } else if (this.bus?.publish) {
      await this.bus.publish({ tenantId, type: 'knowledge.capsule.created', data: { capsuleId: capsule.id, level, hash } });
    }

    return capsule;
  }

  async promoteCapsule(tenantId, actorId, capsuleId, targetLevel, reason = 'Volume threshold reached') {
    await this.cp.authorize(tenantId, actorId, 'memory:write');
    const validLevels = ['WORKING', 'MISSION', 'PROJECT', 'ORGANIZATION', 'GLOBAL', 'KNOWLEDGE_GENOME'];
    const newLevel = String(targetLevel || '').toUpperCase();
    if (!validLevels.includes(newLevel)) {
      throw new ValidationError(`Invalid target memory level: ${targetLevel}`);
    }

    let updated = null;
    await this.store.update((state) => {
      state.knowledgeCapsules = state.knowledgeCapsules || [];
      const capsule = state.knowledgeCapsules.find((c) => c.tenantId === tenantId && c.id === capsuleId);
      if (!capsule) throw new NotFoundError(`Knowledge Capsule not found: ${capsuleId}`);

      const nextVersion = capsule.version + 1;
      capsule.level = newLevel;
      capsule.version = nextVersion;
      capsule.updatedAt = new Date().toISOString();
      capsule.history.push({
        version: nextVersion,
        promotedAt: new Date().toISOString(),
        level: newLevel,
        promotedBy: actorId,
        reason,
      });

      updated = { ...capsule };
      return state;
    });

    if (this.bus?.emit) {
      await this.bus.emit('knowledge.capsule.promoted', { tenantId, capsuleId, newLevel, reason });
    } else if (this.bus?.publish) {
      await this.bus.publish({ tenantId, type: 'knowledge.capsule.promoted', data: { capsuleId, newLevel, reason } });
    }

    return updated;
  }

  async queryCapsules(tenantId, actorId, options = {}) {
    await this.cp.authorize(tenantId, actorId, 'memory:read');
    const state = await this.store.read();
    let capsules = (state.knowledgeCapsules || []).filter((c) => c.tenantId === tenantId);

    if (options.level) {
      capsules = capsules.filter((c) => c.level === options.level.toUpperCase());
    }
    if (options.query) {
      const q = options.query.toLowerCase();
      capsules = capsules.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.summary.toLowerCase().includes(q) ||
          c.content.toLowerCase().includes(q)
      );
    }
    if (options.limit) {
      capsules = capsules.slice(0, Number(options.limit));
    }

    return { capsules, total: capsules.length };
  }

  async autoConsolidate(tenantId, actorId, threshold = 5) {
    await this.cp.authorize(tenantId, actorId, 'memory:write');
    const { capsules } = await this.queryCapsules(tenantId, actorId, { level: 'WORKING' });
    const promoted = [];

    if (capsules.length >= threshold) {
      for (const capsule of capsules.slice(0, threshold)) {
        const item = await this.promoteCapsule(tenantId, actorId, capsule.id, 'MISSION', 'Auto consolidation');
        promoted.push(item);
      }
    }

    return { consolidated: promoted.length, capsules: promoted };
  }
}

module.exports = { KnowledgeGenomeEngine };
