class ConversationMemory {
  constructor() {
    this.store = new Map();
  }

  async get(conversationId) {
    return this.store.get(String(conversationId || '')) || null;
  }

  async set(conversationId, data) {
    this.store.set(String(conversationId || ''), data || {});
  }
}

module.exports = {
  ConversationMemory,
};
