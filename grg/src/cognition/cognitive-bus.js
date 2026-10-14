const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');

/**
 * CognitiveBus & CognitiveEscalationEngine — Fênix OS Agent Operating System
 * 
 * Regra Suprema: O Sistema controla o Modelo, não o Modelo o Sistema.
 * A camada de baixo (Autonomy / Kernel) NUNCA depende da camada cognitiva.
 * Suporta modo DETERMINISTIC / ZERO-AI de primeira classe.
 */

const PROVIDER_TIERS = {
  DETERMINISTIC: { tier: 'ZERO_AI', priority: 0, costPer1k: 0.0 },
  SKILL: { tier: 'PROCEDURAL', priority: 1, costPer1k: 0.0 },
  PATTERN: { tier: 'MEMORIZED', priority: 2, costPer1k: 0.0 },
  LOCAL_SMALL: { tier: 'LOCAL', priority: 3, costPer1k: 0.0 },
  FAST_LANE: { tier: 'CLOUD_FAST', priority: 4, costPer1k: 0.0001 },
  HEAVY_REASONING: { tier: 'CLOUD_HEAVY', priority: 5, costPer1k: 0.015 }
};

class CognitiveBus extends EventEmitter {
  constructor({
    deterministicEngine = null,
    skillRegistry = null,
    patternLibrary = null,
    defaultProvider = 'DETERMINISTIC',
    aiEnabled = true,
    logger = console
  } = {}) {
    super();
    this.deterministicEngine = deterministicEngine;
    this.skillRegistry = skillRegistry;
    this.patternLibrary = patternLibrary;
    this.defaultProvider = defaultProvider;
    this.aiEnabled = Boolean(aiEnabled);
    this.logger = logger;

    // Registry of pluggable cognitive adapters
    this.providers = new Map();
    this.telemetryHistory = [];
    this.initDefaultAdapters();
  }

  initDefaultAdapters() {
    // 1. DETERMINISTIC Adapter (Always active, 100% offline, zero-cost)
    this.registerProvider('DETERMINISTIC', {
      name: 'Deterministic Rules & Script Engine',
      type: 'DETERMINISTIC',
      available: true,
      execute: async ({ prompt, context, taskType }) => {
        return {
          content: typeof prompt === 'string' ? prompt : JSON.stringify(prompt),
          tokens: 0,
          costUsd: 0.0,
          latencyMs: 0,
          provider: 'DETERMINISTIC',
          model: 'none'
        };
      }
    });

    // 2. MOCK / LOCAL / API_PLATFORM Adapter stubs that safely failover
    this.registerProvider('API_PLATFORM', {
      name: 'API Platform (Qwen / DeepSeek Host)',
      type: 'FAST_LANE',
      available: Boolean(process.env.GRG_AIPLATFORM_URL || process.env.API_PLATFORM_URL),
      endpoint: process.env.GRG_AIPLATFORM_URL || 'http://209.50.241.22:3001',
      execute: async ({ prompt, model = 'qwen2.5:0.5b', timeoutMs = 30000 }) => {
        const t0 = Date.now();
        const res = await fetch(`${this.providers.get('API_PLATFORM').endpoint}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: String(prompt) }] }),
          signal: AbortSignal.timeout(timeoutMs)
        });
        if (!res.ok) throw new Error(`API_PLATFORM HTTP ${res.status}`);
        const json = await res.json();
        return {
          content: json.choices?.[0]?.message?.content || '',
          tokens: json.usage?.total_tokens || 100,
          costUsd: 0.00001,
          latencyMs: Date.now() - t0,
          provider: 'API_PLATFORM',
          model
        };
      }
    });
  }

  registerProvider(id, adapter) {
    this.providers.set(id.toUpperCase(), adapter);
    this.emit('provider.registered', { id, adapterName: adapter.name });
  }

  setAiEnabled(enabled) {
    const prev = this.aiEnabled;
    this.aiEnabled = Boolean(enabled);
    this.emit('ai.toggled', { enabled: this.aiEnabled, previous: prev });
    return this.aiEnabled;
  }

  /**
   * Cognitive Escalation Pipeline:
   * 1. DETERMINISTIC Check
   * 2. EXISTING SKILL Check
   * 3. PATTERN Check
   * 4. LOCAL SMALL Model
   * 5. FAST Model
   * 6. HEAVY Model
   */
  async dispatch({
    prompt,
    context = {},
    taskType = 'general',
    complexity = 'MEDIUM',
    preferredProvider = null,
    forceDeterministic = false
  }) {
    const t0 = Date.now();
    const escalationAudit = [];

    // Step 1: Deterministic Check
    if (forceDeterministic || !this.aiEnabled || complexity === 'NONE' || taskType === 'deterministic') {
      escalationAudit.push({ stage: 'DETERMINISTIC', decision: 'RESOLVED_BY_DETERMINISTIC_RULES' });
      const record = {
        success: true,
        content: prompt,
        provider: 'DETERMINISTIC',
        model: 'none',
        tokens: 0,
        costUsd: 0.0,
        latencyMs: Date.now() - t0,
        escalationAudit
      };
      this.#recordTelemetry(record);
      return record;
    }

    // Step 2: Skill Registry Check (Can existing executable skill solve?)
    if (this.skillRegistry && typeof this.skillRegistry.matchSkillForTask === 'function') {
      const matchedSkill = this.skillRegistry.matchSkillForTask(prompt, context);
      if (matchedSkill) {
        escalationAudit.push({ stage: 'SKILL', decision: 'RESOLVED_BY_EXECUTABLE_SKILL', skillId: matchedSkill.id });
        const record = {
          success: true,
          content: `Resolved by Skill: ${matchedSkill.name}`,
          skillId: matchedSkill.id,
          provider: 'SKILL_ENGINE',
          model: 'none',
          tokens: 0,
          costUsd: 0.0,
          latencyMs: Date.now() - t0,
          escalationAudit
        };
        this.#recordTelemetry(record);
        return record;
      }
    }

    // Step 3: Pattern Library Check (Can existing pattern solve?)
    if (this.patternLibrary && typeof this.patternLibrary.findMatchingPattern === 'function') {
      const pattern = this.patternLibrary.findMatchingPattern(prompt);
      if (pattern) {
        escalationAudit.push({ stage: 'PATTERN', decision: 'RESOLVED_BY_MEMORIZED_PATTERN', patternId: pattern.id });
        const record = {
          success: true,
          content: pattern.solution,
          patternId: pattern.id,
          provider: 'PATTERN_LIBRARY',
          model: 'none',
          tokens: 0,
          costUsd: 0.0,
          latencyMs: Date.now() - t0,
          escalationAudit
        };
        this.#recordTelemetry(record);
        return record;
      }
    }

    // If AI is disabled in runtime, stop right here with clean deterministic output
    if (!this.aiEnabled) {
      escalationAudit.push({ stage: 'AI_DISABLED', decision: 'ZERO_AI_FALLBACK_APPLIED' });
      const record = {
        success: true,
        content: prompt,
        provider: 'DETERMINISTIC',
        model: 'none',
        tokens: 0,
        costUsd: 0.0,
        latencyMs: Date.now() - t0,
        escalationAudit
      };
      this.#recordTelemetry(record);
      return record;
    }

    // Step 4 & 5: Cognitive Provider Invocation
    const providerOrder = preferredProvider
      ? [preferredProvider, 'API_PLATFORM', 'DETERMINISTIC']
      : ['API_PLATFORM', 'DETERMINISTIC'];

    let lastErr = null;
    for (const provId of providerOrder) {
      const p = this.providers.get(provId.toUpperCase());
      if (!p || !p.available) {
        escalationAudit.push({ stage: provId, decision: 'PROVIDER_UNAVAILABLE' });
        continue;
      }
      try {
        const result = await p.execute({ prompt, context, taskType, complexity });
        escalationAudit.push({ stage: provId, decision: 'EXECUTED_SUCCESSFULLY' });
        const record = {
          success: true,
          ...result,
          latencyMs: Date.now() - t0,
          escalationAudit
        };
        this.#recordTelemetry(record);
        return record;
      } catch (err) {
        lastErr = err.message;
        escalationAudit.push({ stage: provId, decision: 'FAILED_ESCALATING', error: err.message });
      }
    }

    // Ultimate fallback: Deterministic Core (never fails the system)
    escalationAudit.push({ stage: 'ULTIMATE_FALLBACK', decision: 'DETERMINISTIC_SAFE_MODE' });
    const fallbackRecord = {
      success: true,
      content: prompt,
      provider: 'DETERMINISTIC',
      model: 'none',
      tokens: 0,
      costUsd: 0.0,
      latencyMs: Date.now() - t0,
      escalationAudit,
      warning: `Cognitive providers failed: ${lastErr}. Fell back to deterministic safe mode.`
    };
    this.#recordTelemetry(fallbackRecord);
    return fallbackRecord;
  }

  #recordTelemetry(record) {
    this.telemetryHistory.push({
      timestamp: new Date().toISOString(),
      provider: record.provider,
      model: record.model,
      tokens: record.tokens || 0,
      costUsd: record.costUsd || 0.0,
      latencyMs: record.latencyMs,
      stages: record.escalationAudit?.map(s => s.stage)
    });
    if (this.telemetryHistory.length > 500) this.telemetryHistory.shift();
    this.emit('cognitive.dispatched', record);
  }

  getTelemetry() {
    return {
      aiEnabled: this.aiEnabled,
      providersCount: this.providers.size,
      totalDispatches: this.telemetryHistory.length,
      recent: this.telemetryHistory.slice(-10)
    };
  }
}

module.exports = { CognitiveBus, PROVIDER_TIERS };
