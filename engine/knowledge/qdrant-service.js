const axios = require('axios');

function formatQdrantError(error) {
  if (!error) {
    return 'Qdrant request failed.';
  }

  const responseMessage =
    error.response && error.response.data && error.response.data.status && error.response.data.status.error
      ? String(error.response.data.status.error)
      : '';

  if (responseMessage) {
    return `Qdrant request failed: ${responseMessage}`;
  }

  if (error.code) {
    return `Qdrant request failed (${error.code}): ${String(error.message || 'unknown error')}`;
  }

  if (error.name === 'AggregateError') {
    return 'Qdrant request failed: unable to connect to Qdrant endpoint.';
  }

  return `Qdrant request failed: ${String(error.message || error)}`;
}

class QdrantService {
  constructor(options = {}) {
    this.baseUrl = String(options.baseUrl || process.env.QDRANT_URL || 'http://localhost:6333').replace(/\/$/, '');
    this.apiKey = options.apiKey || process.env.QDRANT_API_KEY || '';
    this.collectionName = options.collectionName || process.env.QDRANT_COLLECTION || 'engine';
    this.vectorSize = Number(options.vectorSize || process.env.KNOWLEDGE_EMBEDDING_DIM || 64);
  }

  headers() {
    if (!this.apiKey) {
      return {};
    }

    return {
      'api-key': this.apiKey,
    };
  }

  async ensureCollection() {
    try {
      await axios.put(
        `${this.baseUrl}/collections/${this.collectionName}`,
        {
          vectors: {
            size: this.vectorSize,
            distance: 'Cosine',
          },
        },
        {
          timeout: 20000,
          headers: this.headers(),
        },
      );

      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        warning: formatQdrantError(error),
      };
    }
  }

  async upsert(points = []) {
    if (!Array.isArray(points) || !points.length) {
      return { ok: true, count: 0 };
    }

    const collectionStatus = await this.ensureCollection();
    if (!collectionStatus.ok) {
      return {
        ok: false,
        count: 0,
        warning: collectionStatus.warning,
      };
    }

    try {
      await axios.put(
        `${this.baseUrl}/collections/${this.collectionName}/points`,
        {
          points,
        },
        {
          timeout: 30000,
          headers: this.headers(),
        },
      );

      return {
        ok: true,
        count: points.length,
      };
    } catch (error) {
      return {
        ok: false,
        count: 0,
        warning: formatQdrantError(error),
      };
    }
  }

  async search(vector = [], limit = 6, filter = null) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/collections/${this.collectionName}/points/search`,
        {
          vector,
          limit,
          with_payload: true,
          filter: filter || undefined,
        },
        {
          timeout: 30000,
          headers: this.headers(),
        },
      );

      const result = response && response.data && Array.isArray(response.data.result) ? response.data.result : [];

      return {
        ok: true,
        results: result,
      };
    } catch (error) {
      return {
        ok: false,
        results: [],
        warning: formatQdrantError(error),
      };
    }
  }

  async storeVector(id, vector, payload = {}) {
    return this.upsert([
      {
        id,
        vector,
        payload,
      },
    ]);
  }

  async searchVector(queryVector = [], limit = 5) {
    const result = await this.search(queryVector, limit, null);
    return result.ok ? result.results : [];
  }
}

module.exports = {
  storeVector: async function storeVector(id, vector, payload = {}) {
    const service = new QdrantService();
    return service.storeVector(id, vector, payload);
  },
  search: async function search(queryVector = [], limit = 5) {
    const service = new QdrantService();
    return service.searchVector(queryVector, limit);
  },
  QdrantService,
};
