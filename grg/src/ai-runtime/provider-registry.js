class ProviderRegistry {
  constructor() {
    this.providers = new Map();
  }

  registerProvider(name, providerInstance, capabilities = [], options = {}) {
    const meta = {
      name,
      instance: providerInstance,
      capabilities: Array.isArray(capabilities) ? capabilities : [],
      maxContext: options.maxContext || 8192,
      // Telemetry
      health: options.health !== undefined ? options.health : true,
      status: 'IDLE', // IDLE, BUSY, OFFLINE
      latency: 0,     // avg ms
      cost: 0,        // accumulated $
      requests: 0,
      errors: 0
    };
    
    this.providers.set(name, meta);
  }

  getProvider(name) {
    return this.providers.get(name)?.instance;
  }
  
  getProviderMeta(name) {
    return this.providers.get(name);
  }

  getProvidersByCapability(capability) {
    const matches = [];
    for (const [name, meta] of this.providers.entries()) {
      if (meta.capabilities.includes(capability) && meta.health) {
        matches.push(meta);
      }
    }
    // Simple load balancing / lowest latency priority
    return matches.sort((a, b) => a.latency - b.latency).map(m => m.instance);
  }

  getAllMetrics() {
    const metrics = {};
    for (const [name, meta] of this.providers.entries()) {
      metrics[name] = {
        capabilities: meta.capabilities,
        maxContext: meta.maxContext,
        health: meta.health,
        status: meta.status,
        avgLatencyMs: meta.latency,
        totalCostUSD: meta.cost,
        requestsServed: meta.requests,
        errorRate: meta.requests > 0 ? meta.errors / (meta.requests + meta.errors) : 0
      };
    }
    return metrics;
  }
  
  recordTelemetry(name, durationMs, costDelta, error = false) {
    const meta = this.providers.get(name);
    if (!meta) return;
    
    if (error) {
      meta.errors++;
    } else {
      meta.requests++;
      meta.cost += costDelta;
      // Rolling average latency
      meta.latency = (meta.latency * (meta.requests - 1) + durationMs) / meta.requests;
    }
  }
}

module.exports = { ProviderRegistry };
