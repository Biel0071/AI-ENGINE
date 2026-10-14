class BaseStore {
  constructor(provider, collectionName) {
    this.provider = provider;
    this.collection = collectionName;
  }
  async get(id) { return this.provider.get(id, this.collection); }
  async set(id, data) { return this.provider.set(id, data, this.collection); }
  async delete(id) { return this.provider.delete(id, this.collection); }
  async find(query) { return this.provider.find(query, this.collection); }
}

class MissionStore extends BaseStore {
  constructor(provider) { super(provider, 'missions'); }
}

class ConversationStore extends BaseStore {
  constructor(provider) { super(provider, 'conversations'); }
}

class KnowledgeStore extends BaseStore {
  constructor(provider) { super(provider, 'knowledge'); }
}

class MemoryStore extends BaseStore {
  constructor(provider) { super(provider, 'memory'); }
}

class ArtifactStore extends BaseStore {
  constructor(provider) { super(provider, 'artifacts'); }
}

class VectorStore extends BaseStore {
  constructor(provider) { super(provider, 'vectors'); }
  async semanticSearch(text, limit = 5) {
    const results = await this.find({ text });
    return results.slice(0, limit);
  }
}

class CacheStore extends BaseStore {
  constructor(provider) { super(provider, 'cache'); }
}

class ExperienceStore extends BaseStore {
  constructor(provider) { super(provider, 'experience'); }
}

class PatternStore extends BaseStore {
  constructor(provider) { super(provider, 'patterns'); }
}

class ProjectStore extends BaseStore {
  constructor(provider) { super(provider, 'projects'); }
}

module.exports = {
  MissionStore,
  ConversationStore,
  KnowledgeStore,
  MemoryStore,
  ArtifactStore,
  VectorStore,
  CacheStore,
  ExperienceStore,
  PatternStore,
  ProjectStore
};
