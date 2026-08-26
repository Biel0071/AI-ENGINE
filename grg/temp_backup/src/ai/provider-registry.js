const { resolveSecret, resolveAIPlatformUrl, resolveAIProviderKey } = require('../security/secret-resolver');

class ProviderRegistry {
  constructor() {
    this.providers = new Map();
    this.activeRoles = {
      primary: 'qwen2.5:3b',
      coding: 'deepseek-coder',
      planning: 'qwen2.5:3b',
      fallback: 'qwen2.5:1.5b'
    };

    this.initProviders();
  }

  async initProviders() {
    // 1. Qwen Provider (VPS)
    const vpsUrl = resolveAIPlatformUrl();
    const vpsKey = resolveAIProviderKey();
    this.providers.set('QWEN', {
      id: 'QWEN',
      name: 'AI Platform VPS',
      endpoint: vpsUrl,
      key: vpsKey,
      apiKeyConfigured: !!vpsKey,
      models: ['qwen2.5:3b', 'deepseek-coder', 'llama3:8b', 'qwen2.5:1.5b'],
      status: 'DISCOVERING'
    });

    // 2. OpenAI Provider
    const openaiKey = resolveSecret('openai_api_key') || process.env.OPENAI_API_KEY;
    this.providers.set('OPENAI', {
      id: 'OPENAI',
      name: 'OpenAI Cloud Provider',
      endpoint: 'https://api.openai.com/v1',
      key: openaiKey,
      apiKeyConfigured: !!openaiKey,
      models: ['gpt-4o', 'gpt-4o-mini', 'o1-mini'],
      status: openaiKey ? 'DISCOVERING' : 'UNCONFIGURED'
    });

    await this.healthCheckAll();
  }

  async healthCheckAll() {
    for (const [id, provider] of this.providers.entries()) {
      if (provider.status === 'UNCONFIGURED') continue;

      try {
        const start = Date.now();
        let isHealthy = false;
        
        if (id === 'QWEN') {
          // Ollama style health check
          const res = await fetch(provider.endpoint + '/api/tags', { signal: AbortSignal.timeout(5000) });
          isHealthy = res.ok;
          if (isHealthy) {
             const data = await res.json();
             provider.discoveredModels = data.models ? data.models.map(m => m.name) : provider.models;
          }
        } else if (id === 'OPENAI') {
          // OpenAI health check
          const res = await fetch(provider.endpoint + '/models', { 
             headers: { 'Authorization': 'Bearer ' + provider.key },
             signal: AbortSignal.timeout(5000)
          });
          isHealthy = res.ok;
        }

        provider.latency = Date.now() - start;
        provider.status = isHealthy ? 'AVAILABLE' : 'DEGRADED';
      } catch (err) {
        provider.status = 'OFFLINE';
      }
    }
  }

  resolveModelForTask(role) {
     return this.activeRoles[role] || 'qwen2.5:3b';
  }

  getPublicProviderSummary() {
    return Array.from(this.providers.values()).map(p => ({
      id: p.id,
      name: p.name,
      endpoint: p.endpoint,
      status: p.status,
      apiKeyConfigured: p.apiKeyConfigured,
      latency: p.latency,
      availableModels: p.discoveredModels || p.models
    }));
  }
}

module.exports = { ProviderRegistry };
