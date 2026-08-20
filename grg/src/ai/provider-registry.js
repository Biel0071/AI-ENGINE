/**
 * FÊNIX OS — MULTI-PROVIDER AI REGISTRY & MODEL ORCHESTRATOR
 * 
 * Capabilities:
 * 1. Provider Registry: QWEN (VPS) & OPENAI (Secret Manager)
 * 2. Secret Redaction: Zero API keys exposed in frontend, logs, or error responses
 * 3. Role-Based Model Routing:
 *    - Planning Model (Complex reasoning & DAG synthesis)
 *    - Coding Model (Syntax, AST, Diff & Code Generation)
 *    - Fast Chat Model (Ultra-low latency interactive dialogue)
 *    - Fallback Model (Resilient failover)
 */

const { resolveSecret, resolveAIPlatformUrl, resolveAIProviderKey } = require('../security/secret-resolver');

class ProviderRegistry {
  constructor() {
    this.providers = new Map();
    this.activeRoles = {
      primary: 'qwen2.5:3b',
      coding: 'deepseek-coder:6.7b',
      planning: 'qwen2.5:3b',
      fallback: 'qwen2.5:1.5b'
    };

    this.initProviders();
  }

  initProviders() {
    // 1. Qwen Provider (Default on VPS)
    this.providers.set('QWEN', {
      id: 'QWEN',
      name: 'AI Platform VPS (Qwen 2.5)',
      endpoint: resolveAIPlatformUrl(),
      apiKeyConfigured: !!resolveAIProviderKey(),
      models: ['qwen2.5:3b', 'deepseek-coder:6.7b', 'llama3:8b', 'qwen2.5:1.5b'],
      status: 'ONLINE'
    });

    // 2. OpenAI Provider (Resolved via Secret Manager)
    const openaiKey = resolveSecret('openai_api_key') || process.env.OPENAI_API_KEY;
    this.providers.set('OPENAI', {
      id: 'OPENAI',
      name: 'OpenAI Cloud Provider',
      endpoint: 'https://api.openai.com/v1',
      apiKeyConfigured: !!openaiKey,
      models: ['gpt-4o', 'gpt-4o-mini', 'o1-mini'],
      status: openaiKey ? 'ONLINE' : 'UNCONFIGURED'
    });
  }

  resolveModelForTask(taskType = 'general') {
    switch (taskType) {
      case 'planning':
      case 'dag_synthesis':
        return this.activeRoles.planning;

      case 'coding':
      case 'code_diff':
      case 'refactor':
        return this.activeRoles.coding;

      case 'chat':
      case 'voice':
        return this.activeRoles.primary;

      default:
        return this.activeRoles.primary;
    }
  }

  getPublicProviderSummary() {
    // Returns status without exposing keys
    return Array.from(this.providers.values()).map(p => ({
      id: p.id,
      name: p.name,
      endpoint: p.endpoint,
      status: p.status,
      apiKeyConfigured: p.apiKeyConfigured,
      availableModels: p.models
    }));
  }

  setModelRole(role, modelName) {
    if (this.activeRoles[role] !== undefined) {
      this.activeRoles[role] = modelName;
    }
  }
}

module.exports = { ProviderRegistry };
