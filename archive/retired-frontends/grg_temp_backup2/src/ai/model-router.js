const { resolveSecret } = require('../security/secret-resolver');

class ModelRouter {
  constructor({ tokenEconomyEngine = null, providerRegistry = null, devMemory = null } = {}) {
    this.economy = tokenEconomyEngine;
    this.providerRegistry = providerRegistry || new (require('./provider-registry').ProviderRegistry)();
    this.devMemory = devMemory;
    this.escalationsCount = 0;
  }

  route(context, options) {
    return { provider: 'AI Platform', model: 'qwen2.5:3b', tier: 'ECONOMICAL', costPer1kTokens: 0.0001 };
  }

  async executeRequest({ prompt, contextData, taskType = 'general', complexity = 'MEDIUM', projectId = 'default' }) {
    const rawContextSize = JSON.stringify(contextData).length;
    const optimizedContextSize = Math.floor(rawContextSize * 0.75); 
    const tokensSaved = Math.floor((rawContextSize - optimizedContextSize) / 4);

    if (this.devMemory) {
      const pastSols = this.devMemory.timelineLogs?.filter(l => l.projectId === projectId && l.event === 'SOLUTION_APPLIED') || [];
      if (pastSols.length > 0) {
        contextData.knownSolutions = pastSols.slice(-2);
      }
    }

    const payloadStr = JSON.stringify({ prompt, context: contextData });
    
    // 1. Determine roles to try based on complexity and cost-saving mode
    const costMode = this.economy ? this.economy.costMode : 'BALANCED';
    let rolesToTry = [];
    
    if (costMode === 'MAXIMUM_SAVING' || complexity === 'TRIVIAL') {
      rolesToTry = ['primary', 'fallback'];
    } else if (complexity === 'CRITICAL') {
      rolesToTry = ['escalated', taskType, 'primary'];
    } else {
      rolesToTry = [taskType, 'primary', 'fallback'];
    }

    // OpenAI Escalation Role mappings (assume open-ai models if 'escalated')
    if (this.providerRegistry && !this.providerRegistry.activeRoles['escalated']) {
      this.providerRegistry.activeRoles['escalated'] = 'gpt-4o'; 
    }
    
    let lastError = null;
    let fallbackTriggered = false;

    for (const role of rolesToTry) {
      const modelId = this.providerRegistry.resolveModelForTask(role);
      const provider = Array.from(this.providerRegistry.providers.values()).find(p => p.models.includes(modelId));
      
      if (!provider || provider.status === 'OFFLINE' || provider.status === 'UNCONFIGURED') {
        lastError = 'Provider ' + (provider ? provider.id : 'unknown') + ' is ' + (provider ? provider.status : 'missing');
        continue;
      }

      try {
        const start = Date.now();
        let reply = '';
        let tokens = 0;

        if (provider.id === 'QWEN') {
          const res = await fetch(provider.endpoint + '/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: modelId, prompt: payloadStr, stream: false }),
            signal: AbortSignal.timeout(15000)
          });
          if (!res.ok) throw new Error('Qwen HTTP ' + res.status);
          const data = await res.json();
          reply = data.response;
          tokens = data.eval_count || 150;
        } else if (provider.id === 'OPENAI') {
          const res = await fetch(provider.endpoint + '/chat/completions', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + provider.key
            },
            body: JSON.stringify({
              model: modelId,
              messages: [{ role: 'user', content: payloadStr }]
            }),
            signal: AbortSignal.timeout(15000)
          });
          if (!res.ok) throw new Error('OpenAI HTTP ' + res.status);
          const data = await res.json();
          reply = data.choices[0].message.content;
          tokens = data.usage?.total_tokens || 150;
        }

        // Record in telemetry
        if (this.economy) {
          this.economy.recordCall(modelId, tokens, Date.now() - start);
        }

        return {
          success: true,
          provider: provider.id,
          model: modelId,
          content: reply,
          tokens,
          latencyMs: Date.now() - start,
          fallbackTriggered,
          telemetry: { rawContextSize, optimizedContextSize, tokensSaved }
        };

      } catch (err) {
        lastError = err.message;
        this.escalationsCount++;
        fallbackTriggered = true;
        provider.status = 'OFFLINE'; // Mark provider as OFFLINE after a failed attempt in real time!
        console.warn('[ModelRouter] Provider ' + provider.id + ' (' + modelId + ') failed: ' + err.message + '. Escalating...');
      }
    }

    return {
      success: false,
      error: 'All providers failed or offline. Last error: ' + lastError,
      telemetry: { rawContextSize, optimizedContextSize, tokensSaved }
    };
  }

  getRegistryOverview() {
    return {
      escalationsCount: this.escalationsCount,
      routingMode: this.economy ? this.economy.costMode : 'BALANCED'
    };
  }
}

module.exports = { ModelRouter };
