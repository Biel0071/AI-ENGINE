/**
 * FÊNIX OS — MULTI-MODEL CASCADE ROUTER (LEVEL 10)
 * 
 * Objective: Cheap First cascade. Never spend expensive tokens on trivial tasks.
 * Route hierarchy: Qwen 2.5 (VPS) -> DeepSeek Coder -> Escalation to OpenAI GPT-4o.
 */

const { resolveSecret } = require('../security/secret-resolver');

class ModelRouter {
  constructor({ tokenEconomyEngine = null } = {}) {
    this.economy = tokenEconomyEngine;

    // Available models in registry
    this.models = new Map([
      ['qwen2.5:3b', {
        id: 'qwen2.5:3b',
        name: 'Qwen 2.5 3B (VPS Real)',
        provider: 'aiplatform',
        endpoint: 'http://209.50.241.215',
        tier: 'ECONOMICAL',
        costPer1kTokens: 0.0001,
        capabilities: ['CHAT', 'CLASSIFICATION', 'SUMMARIZATION', 'ROUTING', 'RESEARCH']
      }],
      ['deepseek-coder', {
        id: 'deepseek-coder',
        name: 'DeepSeek Coder 6.7B',
        provider: 'aiplatform',
        endpoint: 'http://209.50.241.215',
        tier: 'INTERMEDIATE',
        costPer1kTokens: 0.0002,
        capabilities: ['CODING', 'DIFF', 'SYNTHESIS', 'TESTS']
      }],
      ['openai-gpt4o', {
        id: 'openai-gpt4o',
        name: 'OpenAI GPT-4o / o1',
        provider: 'openai',
        tier: 'HIGH_REASONING',
        costPer1kTokens: 0.0050,
        capabilities: ['ORCHESTRATOR', 'REASONING', 'CRITICAL_SECURITY', 'ESCALATED_REPAIR', 'ARCHITECTURE']
      }],
      ['llama3:8b', {
        id: 'llama3:8b',
        name: 'Llama 3 8B (QA & Logic)',
        provider: 'aiplatform',
        endpoint: 'http://209.50.241.215',
        tier: 'INTERMEDIATE',
        costPer1kTokens: 0.00015,
        capabilities: ['QA', 'TESTING', 'VALIDATION']
      }]
    ]);

    this.escalationsCount = 0;
  }

  /**
   * Route task to optimal model based on complexity, domain and cost mode
   */
  route({
    domain = 'GENERAL',
    taskType = 'code_synthesis',
    riskLevel = 'SAFE',
    complexity = 'MEDIUM', // 'TRIVIAL' | 'EASY' | 'MEDIUM' | 'HARD' | 'CRITICAL'
    failureCount = 0,
    requiresHighReasoning = false
  } = {}) {
    const costMode = this.economy ? this.economy.costMode : 'BALANCED';

    // 1. Check if Maximum Saving mode forces economical model
    if (costMode === 'MAXIMUM_SAVING' && riskLevel !== 'CRITICAL') {
      return this.models.get('qwen2.5:3b');
    }

    // 2. Escalation trigger: Repeated failures or Critical Risk
    const hasOpenAI = !!(resolveSecret('ai_provider_key') || process.env.OPENAI_API_KEY);
    if ((failureCount >= 2 || complexity === 'CRITICAL' || requiresHighReasoning) && hasOpenAI && costMode !== 'MAXIMUM_SAVING') {
      this.escalationsCount++;
      return this.models.get('openai-gpt4o');
    }

    // 3. Coding & Diff generation
    if (/coding|synthesis|patch|refactor/i.test(taskType) || /bug|fix/i.test(domain)) {
      if (complexity === 'HARD' && hasOpenAI && costMode === 'BALANCED') {
        return this.models.get('openai-gpt4o');
      }
      return this.models.get('deepseek-coder');
    }

    // 4. Testing & QA
    if (/test|qa|validation|verification/i.test(taskType)) {
      return this.models.get('llama3:8b');
    }

    // 5. Default: Economical Qwen 2.5 on VPS
    return this.models.get('qwen2.5:3b');
  }

  /**
   * Return model registry overview with health and status
   */
  getRegistryOverview() {
    return {
      totalModels: this.models.size,
      escalationsCount: this.escalationsCount,
      models: Array.from(this.models.values()).map(m => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
        tier: m.tier,
        costPer1kTokens: m.costPer1kTokens,
        active: m.provider === 'openai' ? !!(resolveSecret('ai_provider_key') || process.env.OPENAI_API_KEY) : true
      }))
    };
  }
}

module.exports = { ModelRouter };
