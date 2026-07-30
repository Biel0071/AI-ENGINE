class HealthRegistry {
  constructor({ timeoutMs = 2_000 } = {}) {
    this.timeoutMs = timeoutMs;
    this.probes = new Map();
  }

  // options.timeoutMs: teto por probe. Um probe que faz retry com backoff (qdrant: 2s+4s)
  // nao cabe no teto global de 2s -- o race cortaria antes da segunda tentativa, tornando
  // o retry inutil. Sem o override o comportamento e identico ao anterior.
  register(name, probe, options = {}) {
    if (!name || typeof probe !== 'function') throw new Error('health probe requires name and function');
    this.probes.set(name, {
      probe,
      critical: options.critical !== false,
      timeoutMs: Number.isFinite(options.timeoutMs) ? options.timeoutMs : this.timeoutMs,
    });
    return this;
  }

  async check() {
    const checks = {};
    await Promise.all([...this.probes.entries()].map(async ([name, definition]) => {
      let timer;
      try {
        const timeout = new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('health probe timed out')), definition.timeoutMs);
        });
        const detail = await Promise.race([definition.probe(), timeout]);
        checks[name] = { ok: detail?.ok !== false, critical: definition.critical, ...detail };
      } catch (error) {
        checks[name] = { ok: false, critical: definition.critical, error: error.message };
      } finally {
        clearTimeout(timer);
      }
    }));
    const ready = Object.values(checks).every((item) => item.ok || !item.critical);
    return { ok: ready, status: ready ? 'ready' : 'degraded', checks, checkedAt: new Date().toISOString() };
  }
}

module.exports = { HealthRegistry };
