const { SystemModule } = require('../../kernel/module');
const { STATE_MACHINE } = require('../../kernel/states');

/**
 * AIGateway v2.0
 * Router autônomo com consumo REAL de LLM.
 * Suporta Ollama (Local) e OpenAI (Remoto via Vault).
 */
class AIGateway extends SystemModule {
  constructor(vault, eventBus) {
    super('ai_gateway', '2.0.0');
    this.vault = vault;
    this.eventBus = eventBus;
    this.status = STATE_MACHINE.BOOT;
    this.providers = new Map();
  }

  async start() {
    this.status = STATE_MACHINE.READY;
    console.log('[AIGateway] Inicializando Motor de Inferência Neural...');
    
    // Provedores (Local First)
    this.registerProvider('ollama', { endpoint: 'http://localhost:11434/api/generate', cost: 0, isLocal: true });
    this.registerProvider('openai', { endpoint: 'https://api.openai.com/v1/chat/completions', cost: 0.5, isLocal: false });

    this.status = STATE_MACHINE.ONLINE;
    this.startTime = Date.now();
  }

  registerProvider(id, metadata) {
    this.providers.set(id, { ...metadata, active: true });
  }

  async routeAndExecute(request, context) {
    if (this.status !== STATE_MACHINE.ONLINE) throw new Error('AIGateway is not ONLINE');
    
    // Tenta primeiro Ollama para custo zero, depois OpenAI
    const preferredOrder = ['ollama', 'openai'];
    let lastError = null;

    for (const providerId of preferredOrder) {
      try {
        const response = await this._execute(providerId, request, context);
        console.log(`[AIGateway] Inferência bem sucedida usando ${providerId}`);
        return response;
      } catch (err) {
        console.warn(`[AIGateway] Falha ao conectar em ${providerId}: ${err.message}. Buscando fallback...`);
        lastError = err;
      }
    }

    throw new Error(`AIGateway: Falha crítica na inferência. Todos os provedores falharam. Último erro: ${lastError?.message}`);
  }

  async _execute(providerId, request, context) {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Provider ${providerId} not found`);

    const prompt = `System Context: ${JSON.stringify(context || {})}\n\nTask: ${request.taskType}\nGoal: ${request.prompt}`;

    if (providerId === 'ollama') {
      const res = await fetch(provider.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: request.model || 'llama3', prompt, stream: false })
      });
      if (!res.ok) throw new Error(`Ollama HTTP Error: ${res.status}`);
      const data = await res.json();
      return { text: data.response, provider: providerId, model: request.model || 'llama3' };
    } 
    
    if (providerId === 'openai') {
      const apiKey = await this.vault.retrieve('OPENAI_API_KEY');
      if (!apiKey) throw new Error('OPENAI_API_KEY não encontrada no Vault.');
      
      const res = await fetch(provider.endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: request.model || 'gpt-4o-mini',
          messages: [{ role: 'system', content: 'Você é o Kernel Cognitivo do FÊNIX OS.' }, { role: 'user', content: prompt }]
        })
      });
      
      if (!res.ok) throw new Error(`OpenAI HTTP Error: ${res.status}`);
      const data = await res.json();
      return { text: data.choices[0].message.content, provider: providerId, model: request.model || 'gpt-4o-mini' };
    }
  }

  async health() {
    return {
      ok: this.status === STATE_MACHINE.ONLINE,
      status: this.status,
      details: {
        activeProviders: Array.from(this.providers.keys())
      }
    };
  }
}

module.exports = { AIGateway };
