const OpenAI = require('openai');
const crypto = require('crypto');

function clampVector(vector = [], dimensions = 64) {
  const next = Array.from({ length: dimensions }, (_, index) => Number(vector[index] || 0));
  return next;
}

function fallbackEmbedding(text = '', dimensions = 64) {
  const normalized = String(text || '').trim();
  if (!normalized) {
    return Array.from({ length: dimensions }, () => 0);
  }

  const vector = Array.from({ length: dimensions }, () => 0);
  const hash = crypto.createHash('sha256').update(normalized).digest();

  for (let i = 0; i < dimensions; i += 1) {
    const byte = hash[i % hash.length];
    vector[i] = (byte / 255) * 2 - 1;
  }

  return vector;
}

class EmbeddingService {
  constructor(options = {}) {
    this.dimensions = Number(options.dimensions || process.env.KNOWLEDGE_EMBEDDING_DIM || 64);
    this.openaiApiKey = options.openaiApiKey || process.env.OPENAI_KEY || process.env.OPENAI_API_KEY || '';
    this.openaiEmbeddingModel = options.openaiEmbeddingModel || process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    this.client = this.openaiApiKey ? new OpenAI({ apiKey: this.openaiApiKey }) : null;
  }

  async generateEmbedding(text = '') {
    if (!this.openaiApiKey) {
      return {
        provider: 'fallback-hash',
        vector: fallbackEmbedding(text, this.dimensions),
      };
    }

    try {
      const response = await this.client.embeddings.create({
        model: this.openaiEmbeddingModel,
        input: String(text || '').slice(0, 12000),
      });

      const embedding = response && Array.isArray(response.data) && response.data[0] ? response.data[0].embedding : null;

      if (!Array.isArray(embedding) || !embedding.length) {
        throw new Error('OpenAI embedding response did not contain a valid vector.');
      }

      return {
        provider: 'openai',
        vector: clampVector(embedding, this.dimensions),
      };
    } catch (error) {
      return {
        provider: 'fallback-hash',
        warning: String(error && error.message ? error.message : error),
        vector: fallbackEmbedding(text, this.dimensions),
      };
    }
  }
}

module.exports = {
  embed: async function embed(text) {
    const service = new EmbeddingService();
    const response = await service.generateEmbedding(text);
    return response.vector;
  },
  EmbeddingService,
};
