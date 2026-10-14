/**
 * QdrantDriver — HTTP REST client para Qdrant v1.x.
 * Nao usa SDK (zero dependencia extra), usa apenas fetch nativo (Node 18+).
 * Implementa get/set/delete/find via /collections/fenix_memory/points.
 */
const { StorageProvider } = require('../storage-provider');

class QdrantDriver extends StorageProvider {
  constructor({ url, collection = 'fenix_memory', vectorSize = 384 }) {
    super({ name: 'Qdrant', type: 'vector' });
    this.baseUrl = url.replace(/\/$/, '');
    this.collection = collection;
    this.vectorSize = vectorSize;
  }

  async connect() {
    // Garante que a collection existe
    const url = `${this.baseUrl}/collections/${this.collection}`;
    let attempts = 0;
    while (attempts < 3) {
      try {
        const check = await fetch(url);
        if (check.status === 404) {
          await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vectors: { size: this.vectorSize, distance: 'Cosine' }
            })
          });
        }
        this.isConnected = true;
        return true;
      } catch (err) {
        attempts++;
        if (attempts >= 3) throw new Error(`Qdrant unreachable at ${this.baseUrl}: ${err.message}`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  async disconnect() {
    this.isConnected = false;
    return true;
  }

  /** Converte string key para uint id (Qdrant usa uint64 ou UUID) */
  _idFromKey(key) {
    // Usa hash simples para converter string -> number compativel com Qdrant
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  async set(key, value, collection = 'default') {
    const id = this._idFromKey(key);
    // Vector zero — em producao real, um embedding model geraria o vetor
    const vector = new Array(this.vectorSize).fill(0);
    const payload = { key, collection, ...value };
    await fetch(`${this.baseUrl}/collections/${this.collection}/points`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: [{ id, vector, payload }] })
    });
    return true;
  }

  async get(key, collection = 'default') {
    const id = this._idFromKey(key);
    const res = await fetch(`${this.baseUrl}/collections/${this.collection}/points/${id}`);
    if (!res.ok) return null;
    const body = await res.json();
    return body?.result?.payload ?? null;
  }

  async delete(key, collection = 'default') {
    const id = this._idFromKey(key);
    const res = await fetch(`${this.baseUrl}/collections/${this.collection}/points/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: [id] })
    });
    return res.ok;
  }

  async find(query = {}, collection = 'default') {
    // Scroll para buscar pontos por payload filter
    const filter = {};
    const must = Object.entries(query).map(([k, v]) => ({
      key: k, match: { value: v }
    }));
    const body = {
      limit: 100,
      with_payload: true,
      with_vector: false
    };
    if (must.length) body.filter = { must };

    const res = await fetch(
      `${this.baseUrl}/collections/${this.collection}/points/scroll`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.result?.points ?? []).map(p => ({ id: p.id, ...p.payload }));
  }
}

module.exports = { QdrantDriver };
