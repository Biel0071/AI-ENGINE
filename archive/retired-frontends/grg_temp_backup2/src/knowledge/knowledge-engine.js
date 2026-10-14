const { 
  MissionStore, 
  ConversationStore, 
  KnowledgeStore, 
  MemoryStore, 
  VectorStore,
  ExperienceStore,
  PatternStore,
  ProjectStore
} = require('../storage/stores');

const { LearningEngine } = require('./learning-engine');
const { DecisionEngine } = require('./decision-engine');

class KnowledgeEngine {
  constructor({ storageManager, eventBus, aiRouter }) {
    this.storageManager = storageManager;
    this.eventBus = eventBus;
    this.aiRouter = aiRouter;
    
    // Wire up domain stores
    const relational = storageManager.getRelational();
    const vector = storageManager.getVector();
    
    this.missionStore = new MissionStore(relational);
    this.conversationStore = new ConversationStore(relational);
    this.knowledgeStore = new KnowledgeStore(relational);
    this.memoryStore = new MemoryStore(relational);
    this.vectorStore = new VectorStore(vector);
    this.experienceStore = new ExperienceStore(relational);
    this.patternStore = new PatternStore(relational);
    this.projectStore = new ProjectStore(relational);
    
    // Sub-systems mapping
    this.shortTermMemory = new ShortTermMemory(this.conversationStore);
    this.longTermMemory = new LongTermMemory(this.knowledgeStore);
    this.semanticMemory = new SemanticMemory(this.vectorStore);
    this.episodicMemory = new EpisodicMemory(this.missionStore, this.eventBus);
    
    // Phase 3.5: Active Learning Loop
    this.learningEngine = new LearningEngine(this.experienceStore, this.patternStore, this.eventBus, this.aiRouter);
    this.decisionEngine = new DecisionEngine(this.experienceStore, this.patternStore, this.vectorStore);
  }

  getMetrics() {
    return {
      status: 'online',
      subsystems: {
        shortTerm: 'active',
        longTerm: 'active',
        semantic: 'active',
        episodic: 'active',
        learning: 'active',
        decision: 'active',
        project: 'active'
      }
    };
  }
}

// Concept: Ephemeral / Session state
class ShortTermMemory {
  constructor(conversationStore) {
    this.store = conversationStore;
  }
  async addContext(sessionId, message) {
    let session = await this.store.get(sessionId) || { messages: [] };
    session.messages.push(message);
    // Trim to context limit (e.g., last 20)
    if (session.messages.length > 20) session.messages.shift();
    await this.store.set(sessionId, session);
  }
  async getContext(sessionId) {
    return await this.store.get(sessionId);
  }
}

// Concept: Extracted Facts and Rules
class LongTermMemory {
  constructor(knowledgeStore) {
    this.store = knowledgeStore;
  }
  async learnFact(topic, fact) {
    let current = await this.store.get(topic) || { facts: [] };
    current.facts.push(fact);
    await this.store.set(topic, current);
  }
  async recall(topic) {
    return await this.store.get(topic);
  }
}

// Concept: Vector Embeddings / Similarity
class SemanticMemory {
  constructor(vectorStore) {
    this.store = vectorStore;
  }
  async memorize(id, text, embeddingData) {
    await this.store.set(id, { text, ...embeddingData });
  }
  async search(text) {
    return await this.store.semanticSearch(text);
  }
}

// Concept: Timeline of actions and events (Missions)
class EpisodicMemory {
  constructor(missionStore, eventBus) {
    this.store = missionStore;
    if (eventBus) {
      eventBus.on('MissionCompleted', async (data) => {
        await this.store.set(data.mission.id, data.mission);
      });
    }
  }
  async recordEpisode(id, missionData) {
    await this.store.set(id, missionData);
  }
  async retrieveEpisode(id) {
    return await this.store.get(id);
  }
}

module.exports = { KnowledgeEngine };
