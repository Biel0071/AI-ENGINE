class QdrantVectorStore {
  #apiKey;
  constructor({ baseUrl = 'http://127.0.0.1:6333', apiKey = null, collection = 'fenix_memory', dimensions = 64, fetchImpl = fetch } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.#apiKey = apiKey;
    this.collection = collection;
    this.dimensions = dimensions;
    this.fetchImpl = fetchImpl;
  }

  async request(path, options = {}) {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        accept: 'application/json', 'content-type': 'application/json',
        ...(this.#apiKey ? { 'api-key': this.#apiKey } : {}), ...(options.headers || {}),
      },
    });
    const body = await response.text();
    const data = body ? JSON.parse(body) : {};
    if (!response.ok) { const error = new Error(`Qdrant request failed (${response.status})`); error.status = response.status; throw error; }
    return data;
  }

  async initialize() {
    try {
      await this.request(`/collections/${encodeURIComponent(this.collection)}`, { method: 'GET' });
    } catch (error) {
      if (error.status !== 404) throw error;
      await this.request(`/collections/${encodeURIComponent(this.collection)}`, {
        method: 'PUT', body: JSON.stringify({ vectors: { size: this.dimensions, distance: 'Cosine' } }),
      });
    }
    return this;
  }

  async upsert(memory, vector) {
    await this.request(`/collections/${encodeURIComponent(this.collection)}/points?wait=true`, {
      method: 'PUT',
      body: JSON.stringify({ points: [{
        id: memory.id, vector,
        payload: {
          tenantId: memory.tenantId, memoryId: memory.id, kind: memory.kind,
          projectId: memory.projectId || null, orgId: memory.orgId || null,
          classification: memory.classification, status: memory.status,
        },
      }] }),
    });
  }

  async search(tenantId, vector, options = {}) {
    const must = [{ key: 'tenantId', match: { value: tenantId } }, { key: 'status', match: { value: 'ACTIVE' } }];
    if (options.projectId) must.push({ key: 'projectId', match: { value: options.projectId } });
    if (options.orgId) must.push({ key: 'orgId', match: { value: options.orgId } });
    const data = await this.request(`/collections/${encodeURIComponent(this.collection)}/points/query`, {
      method: 'POST', body: JSON.stringify({ query: vector, filter: { must }, limit: Number(options.limit || 20), with_payload: true }),
    });
    const points = data.result?.points || data.result || [];
    return points.map((point) => ({ id: point.payload?.memoryId || point.id, score: point.score || 0 }));
  }

  async delete(id) {
    await this.request(`/collections/${encodeURIComponent(this.collection)}/points/delete?wait=true`, {
      method: 'POST', body: JSON.stringify({ points: [id] }),
    });
  }

  // Uma sonda unica derruba o check critico quando o boot esta pesado: o qdrant responde,
  // mas depois do timeout do HealthRegistry. Medido em producao (v32): container
  // "Up 41 hours (healthy)" e /health degradado por "health probe timed out", verde na
  // re-sondagem seguinte. O retry com backoff (2s/4s) distingue "esta subindo" de "caiu".
  // O erro da ultima tentativa e propagado -- nunca engolido: qdrant fora do ar continua
  // derrubando o health, que e o comportamento correto para um check critico.
  async health(attempts = 3, sleep = (ms) => new Promise((r) => setTimeout(r, ms))) {
    let lastError = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        await this.request(`/collections/${encodeURIComponent(this.collection)}`, { method: 'GET' });
        return { ok: true, adapter: 'qdrant', collection: this.collection, attempts: attempt };
      } catch (error) {
        lastError = error;
        if (attempt < attempts) await sleep(2000 * attempt);
      }
    }
    throw lastError;
  }
}

module.exports = { QdrantVectorStore };
