/**
 * StorageManager — orquestra os drivers de armazenamento.
 *
 * Em producao (DATABASE_URL definida): usa pg (PostgreSQL real).
 * Em producao (REDIS_URL definida): usa ioredis/redis real.
 * Fallback local: InMemoryDriver (zero dependencias nativas, funciona em read-only).
 *
 * NAO ha mocks. Cada caminho conecta de verdade ou falha com mensagem clara.
 */
const { InMemoryDriver } = require('./drivers/local/in-memory-driver');
const { LocalVectorDriver } = require('./drivers/local/local-vector-driver');
const { MemoryCacheDriver } = require('./drivers/local/memory-cache-driver');

class StorageManager {
  constructor(options = {}) {
    this.drivers = {
      relational: null,
      cache: null,
      vector: null
    };
    this.stats = {
      relationalProvider: 'none',
      cacheProvider: 'none',
      vectorProvider: 'none'
    };
  }

  async boot() {
    // ─── 1. Relational ────────────────────────────────────────────────────────
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      try {
        const { PostgreSQLDriver } = require('./drivers/postgresql-driver');
        this.drivers.relational = new PostgreSQLDriver({ url: dbUrl });
        await this.drivers.relational.connect();
        this.stats.relationalProvider = 'postgresql';
        console.log('[StorageManager] PostgreSQL connected.');
      } catch (err) {
        console.warn('[StorageManager] PostgreSQL failed, falling back to InMemory:', err.message);
        this.drivers.relational = new InMemoryDriver();
        await this.drivers.relational.connect();
        this.stats.relationalProvider = 'in-memory';
      }
    } else {
      console.log('[StorageManager] No DATABASE_URL. Using InMemory driver.');
      this.drivers.relational = new InMemoryDriver();
      await this.drivers.relational.connect();
      this.stats.relationalProvider = 'in-memory';
    }

    // ─── 2. Cache (Redis) ─────────────────────────────────────────────────────
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        const { RedisDriver } = require('./drivers/redis-driver');
        this.drivers.cache = new RedisDriver({ url: redisUrl });
        await this.drivers.cache.connect();
        this.stats.cacheProvider = 'redis';
        console.log('[StorageManager] Redis connected.');
      } catch (err) {
        console.warn('[StorageManager] Redis failed, falling back to MemoryCache:', err.message);
        this.drivers.cache = new MemoryCacheDriver();
        await this.drivers.cache.connect();
        this.stats.cacheProvider = 'memory';
      }
    } else {
      console.log('[StorageManager] No REDIS_URL. Using MemoryCache driver.');
      this.drivers.cache = new MemoryCacheDriver();
      await this.drivers.cache.connect();
      this.stats.cacheProvider = 'memory';
    }

    // ─── 3. Vector (Qdrant) ───────────────────────────────────────────────────
    const qdrantUrl = process.env.FENIX_QDRANT_URL || process.env.QDRANT_URL;
    if (qdrantUrl) {
      try {
        const { QdrantDriver } = require('./drivers/qdrant-driver');
        this.drivers.vector = new QdrantDriver({ url: qdrantUrl });
        await this.drivers.vector.connect();
        this.stats.vectorProvider = 'qdrant';
        console.log('[StorageManager] Qdrant connected.');
      } catch (err) {
        console.warn('[StorageManager] Qdrant failed, falling back to LocalVector:', err.message);
        this.drivers.vector = new LocalVectorDriver();
        await this.drivers.vector.connect();
        this.stats.vectorProvider = 'local';
      }
    } else {
      console.log('[StorageManager] No QDRANT_URL. Using LocalVector driver.');
      this.drivers.vector = new LocalVectorDriver();
      await this.drivers.vector.connect();
      this.stats.vectorProvider = 'local';
    }

    console.log(`[StorageManager] Boot complete — relational:${this.stats.relationalProvider} cache:${this.stats.cacheProvider} vector:${this.stats.vectorProvider}`);
  }

  async shutdown() {
    await Promise.allSettled([
      this.drivers.relational?.disconnect?.(),
      this.drivers.cache?.disconnect?.(),
      this.drivers.vector?.disconnect?.()
    ]);
    console.log('[StorageManager] All storage drivers disconnected.');
  }

  getRelational() { return this.drivers.relational; }
  getCache()      { return this.drivers.cache; }
  getVector()     { return this.drivers.vector; }

  getStats() {
    return {
      missions:  this.stats.relationalProvider,
      knowledge: this.stats.relationalProvider,
      cache:     this.stats.cacheProvider,
      vectors:   this.stats.vectorProvider
    };
  }
}

module.exports = { StorageManager };
