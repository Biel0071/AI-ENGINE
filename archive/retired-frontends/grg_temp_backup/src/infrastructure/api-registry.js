const { SystemModule } = require('../kernel/module');
const { STATE_MACHINE } = require('../kernel/states');

/**
 * APIRegistry v2.0
 * Ponto único de saída para chamadas externas. Nenhum módulo do Kernel ou Plugin
 * deve ter URLs "hardcoded". O registry resolve, injeta autenticação via Vault
 * e passa o tráfego via camada de rede (axios/fetch).
 */
class APIRegistry extends SystemModule {
  constructor(vault, eventBus) {
    super('api_registry', '2.0.0');
    this.vault = vault;
    this.eventBus = eventBus;
    this.endpoints = new Map();
    this.status = STATE_MACHINE.BOOT;
  }

  async start() {
    this.status = STATE_MACHINE.READY;
    console.log('[APIRegistry] Inicializando roteamento de endpoints externos...');
    
    // Na V2 real, leríamos as definições de um arquivo JSON central ou do KnowledgeGraph
    this.register('openai.chat', { url: 'https://api.openai.com/v1/chat/completions', method: 'POST', authKey: 'OPENAI_API_KEY' });
    this.register('stripe.charge', { url: 'https://api.stripe.com/v1/charges', method: 'POST', authKey: 'STRIPE_SECRET_KEY' });
    
    this.status = STATE_MACHINE.ONLINE;
    this.startTime = Date.now();
  }

  register(apiId, config) {
    this.endpoints.set(apiId, config);
  }

  /**
   * Invoca uma API externa por nome.
   */
  async invoke(apiId, payload = {}, headers = {}) {
    if (this.status !== STATE_MACHINE.ONLINE) throw new Error('APIRegistry is not ONLINE');
    
    const config = this.endpoints.get(apiId);
    if (!config) throw new Error(`Endpoint não registrado no APIRegistry: ${apiId}`);

    console.log(`[APIRegistry] Invocando externamente: ${apiId} -> ${config.url}`);
    
    let token = null;
    if (config.authKey && this.vault) {
      token = await this.vault.retrieve(config.authKey);
      if (!token) console.warn(`[APIRegistry] AuthKey ${config.authKey} não encontrada no Vault para a API ${apiId}.`);
    }

    const finalHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };

    if (token) {
      finalHeaders['Authorization'] = `Bearer ${token}`; // Simplificação
    }

    try {
      const startTime = Date.now();
      
      const fetchOptions = {
        method: config.method || 'GET',
        headers: finalHeaders
      };

      if (config.method !== 'GET' && config.method !== 'HEAD' && payload) {
        fetchOptions.body = JSON.stringify(payload);
      }

      const response = await fetch(config.url, fetchOptions);
      const data = await response.json().catch(() => ({})); // fallback se não for JSON
      
      this.eventBus?.publish('api.invoked', { apiId, latencyMs: Date.now() - startTime, status: response.status }, 4 /* BACKGROUND */);
      
      if (!response.ok) {
        throw new Error(`API ${apiId} falhou com status ${response.status}: ${JSON.stringify(data)}`);
      }
      
      return { status: response.status, data };
    } catch (err) {
      this.eventBus?.publish('api.failed', { apiId, error: err.message }, 1 /* HIGH */);
      throw err;
    }
  }

  async health() {
    return {
      ok: this.status === STATE_MACHINE.ONLINE,
      status: this.status,
      details: {
        registeredEndpoints: this.endpoints.size
      }
    };
  }
}

module.exports = { APIRegistry };
