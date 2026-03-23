class ContextManager {
  constructor(memory) {
    this.memory = memory;
  }

  async load(conversationId, fallback = {}) {
    if (!conversationId) {
      return { ...fallback };
    }

    const stored = await this.memory.get(conversationId);
    return {
      ...(fallback || {}),
      ...(stored || {}),
    };
  }

  async save(conversationId, patch = {}) {
    if (!conversationId) {
      return patch;
    }

    const previous = (await this.memory.get(conversationId)) || {};
    const merged = {
      ...previous,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    await this.memory.set(conversationId, merged);
    return merged;
  }
}

module.exports = {
  ContextManager,
};
