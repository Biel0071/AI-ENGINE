/**
 * StorageManager — orquestra os drivers de armazenamento com suporte multi-tier
 * resiliente (PostgreSQL, Redis, Qdrant e SQLite).
 *
 * Em producao:
 * - Relacional: PostgreSQL Primário -> PostgreSQL Secundário -> SQLite Real -> InMemory (Degradado)
 * - Cache: Redis Primário -> Redis Secundário -> MemoryCache (Degradado)
 * - Vetorial: Qdrant Primário -> Qdrant Secundário -> LocalVector (Degradado)
 *
 * NAO ha mocks. Reporta honestamente 'HEALTHY' ou 'DEGRADED' com razoes claras.
 */
const { InMemoryDriver } = require('./drivers/local/in-memory-driver');
const { LocalVectorDriver } = require('./drivers/local/local-vector-driver');
const { MemoryCacheDriver } = require('./drivers/local/memory-cache-driver');

class StorageManager {
  constructor(options = {}) {
    this.eventBus = options.eventBus || null;
    this.drivers = {
      relational: null,
      cache: null,
      vector: null
    };
    this.stats = {
      relationalProvider: 'none',
      cacheProvider: 'none',
      vectorProvider: 'none',
      persistenceState: 'INIT',
      degradedReasons: []
    };
  }

  async boot() {
    this.stats.degradedReasons = [];

    // ─── 1. Relational Multi-Tier ─────────────────────────────────────────────
    const relationalCandidates = [
      { type: 'postgresql', url: process.env.DATABASE_URL, label: 'primary' },
      { type: 'postgresql', url: process.env.DATABASE_URL_SECONDARY, label: 'secondary' }
    ].filter(c => Boolean(c.url));

    let relationalConnected = false;
    for (const cand of relationalCandidates) {
      try {
        const { PostgreSQLDriver } = require('./drivers/postgresql-driver');
        const driver = new PostgreSQLDriver({ url: cand.url });
        await driver.connect();
        this.drivers.relational = driver;
        this.stats.relationalProvider = 'postgresql';
        relationalConnected = true;
        console.log(`[StorageManager] PostgreSQL (${cand.label}) connected.`);
        break;
      } catch (err) {
        console.warn(`[StorageManager] PostgreSQL (${cand.label}) connection failed:`, err.message);
      }
    }

    if (!relationalConnected) {
      const sqlitePath = process.env.FENIX_KNOWLEDGE_SQLITE_PATH;
      if (sqlitePath) {
        try {
          const { SQLiteDriver } = require('./drivers/local/sqlite-driver');
          const driver = new SQLiteDriver({ dbPath: sqlitePath });
          await driver.connect();
          this.drivers.relational = driver;
          this.stats.relationalProvider = 'sqlite';
          relationalConnected = true;
          console.log('[StorageManager] SQLite knowledge store connected at', sqlitePath);
        } catch (err) {
          console.warn('[StorageManager] SQLite connection failed:', err.message);
        }
      }
    }

    if (!relationalConnected) {
      console.warn('[StorageManager] No persistent database reachable. Relational storage degraded to in-memory.');
      this.drivers.relational = new InMemoryDriver();
      await this.drivers.relational.connect();
      this.stats.relationalProvider = 'in-memory';
      this.stats.degradedReasons.push('Relational database running in-memory (loss of persistence on restart)');
    }

    // ─── 2. Cache (Redis Multi-Tier) ──────────────────────────────────────────
    const redisCandidates = [
      { url: process.env.REDIS_URL, label: 'primary' },
      { url: process.env.REDIS_URL_SECONDARY, label: 'secondary' }
    ].filter(c => Boolean(c.url));

    let cacheConnected = false;
    for (const cand of redisCandidates) {
      try {
        const { RedisDriver } = require('./drivers/redis-driver');
        const driver = new RedisDriver({ url: cand.url });
        await driver.connect();
        this.drivers.cache = driver;
        this.stats.cacheProvider = 'redis';
        cacheConnected = true;
        console.log(`[StorageManager] Redis (${cand.label}) connected.`);
        break;
      } catch (err) {
        console.warn(`[StorageManager] Redis (${cand.label}) connection failed:`, err.message);
      }
    }

    if (!cacheConnected) {
      console.warn('[StorageManager] No Redis reachable. Cache storage running in memory.');
      this.drivers.cache = new MemoryCacheDriver();
      await this.drivers.cache.connect();
      this.stats.cacheProvider = 'memory';
      this.stats.degradedReasons.push('Redis cache unavailable (running memory cache)');
    }

    // ─── 3. Vector (Qdrant Multi-Tier) ────────────────────────────────────────
    const qdrantCandidates = [
      { url: process.env.FENIX_QDRANT_URL || process.env.QDRANT_URL, label: 'primary' },
      { url: process.env.QDRANT_URL_SECONDARY, label: 'secondary' }
    ].filter(c => Boolean(c.url));

    let vectorConnected = false;
    for (const cand of qdrantCandidates) {
      try {
        const { QdrantDriver } = require('./drivers/qdrant-driver');
        const driver = new QdrantDriver({ url: cand.url });
        await driver.connect();
        this.drivers.vector = driver;
        this.stats.vectorProvider = 'qdrant';
        vectorConnected = true;
        console.log(`[StorageManager] Qdrant (${cand.label}) connected.`);
        break;
      } catch (err) {
        console.warn(`[StorageManager] Qdrant (${cand.label}) connection failed:`, err.message);
      }
    }

    if (!vectorConnected) {
      console.warn('[StorageManager] No Qdrant reachable. Vector storage running locally.');
      this.drivers.vector = new LocalVectorDriver();
      await this.drivers.vector.connect();
      this.stats.vectorProvider = 'local';
      this.stats.degradedReasons.push('Qdrant vector store unreachable (running local fallback)');
    }

    // Avaliação geral de persistência
    const isDegraded = this.stats.relationalProvider === 'in-memory' ||
                       this.stats.cacheProvider === 'memory' ||
                       this.stats.vectorProvider === 'local';

    this.stats.persistenceState = isDegraded ? 'PERSISTENCE DEGRADED' : 'HEALTHY';

    console.log(`[StorageManager] Boot complete — state:${this.stats.persistenceState} relational:${this.stats.relationalProvider} cache:${this.stats.cacheProvider} vector:${this.stats.vectorProvider}`);

    if (this.eventBus) {
      this.eventBus.emit('persistence:status', {
        state: this.stats.persistenceState,
        stats: this.getStats(),
        reasons: this.stats.degradedReasons
      });
    }
  }

  async checkHealth() {
    const health = {
      relational: { ok: false, provider: this.stats.relationalProvider },
      cache: { ok: false, provider: this.stats.cacheProvider },
      vector: { ok: false, provider: this.stats.vectorProvider },
      state: this.stats.persistenceState,
      reasons: this.stats.degradedReasons
    };

    try {
      if (this.drivers.relational?.isConnected) {
        health.relational.ok = true;
      }
    } catch (_) {}

    try {
      if (this.drivers.cache?.isConnected) {
        health.cache.ok = true;
      }
    } catch (_) {}

    try {
      if (this.drivers.vector?.isConnected) {
        health.vector.ok = true;
      }
    } catch (_) {}

    return health;
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
      vectors:   this.stats.vectorProvider,
      state:     this.stats.persistenceState,
      degraded:  this.stats.persistenceState === 'PERSISTENCE DEGRADED',
      reasons:   this.stats.degradedReasons
    };
  }
}

module.exports = { StorageManager };
