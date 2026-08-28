const crypto = require('node:crypto');

class LearningEngine {
  constructor(experienceStore, patternStore, eventBus, aiRouter = null) {
    this.experienceStore = experienceStore;
    this.patternStore = patternStore;
    this.eventBus = eventBus;
    this.aiRouter = aiRouter;

    if (this.eventBus) {
      this.eventBus.on('MissionCompleted', this.handleMissionEnd.bind(this, true));
      this.eventBus.on('MissionFailed', this.handleMissionEnd.bind(this, false));
    }
  }

  async handleMissionEnd(success, event) {
    const mission = event?.payload?.mission || event?.mission || event;
    
    // Layer 1: Deterministic Heuristic Extraction
    const layer1Data = this.extractHeuristics(mission, success);
    
    let experience = {
      experience_id: crypto.randomUUID(),
      domain: mission.domain || 'General',
      topic: mission.name || 'Unknown Mission',
      pattern: mission.pattern || 'Custom',
      result: success ? 'SUCCESS' : 'FAILED',
      confidence: success ? 0.90 : 0.10, // Initial confidence based on outcome
      recommended: success,
      avoid: !success,
      reason: success ? 'Mission executed successfully' : (mission.error || 'Unknown failure'),
      metrics: layer1Data,
      timestamp: new Date().toISOString()
    };

    // Layer 2: LLM Reflection (if warranted)
    const isComplex = this.isMissionComplex(mission, layer1Data);
    if (isComplex && this.aiRouter) {
      const reflection = await this.reflectOnMission(mission, success, layer1Data);
      if (reflection) {
        experience = { ...experience, ...reflection };
      }
    }

    // Save to Experience Store
    await this.experienceStore.set(experience.experience_id, experience);

    // Evaluate for Promotion to Pattern Library
    await this.evaluateAndPromote(experience);
  }

  async evaluateAndPromote(experience) {
    // Only promote if it was highly successful and passed all validation checks
    if (!experience.recommended || experience.confidence < 0.95) return;
    if (experience.metrics.tests !== 'PASS') return;

    // Check if pattern already exists
    const existing = await this.patternStore.find({ name: experience.pattern });
    if (existing && existing.length > 0) {
      // Could merge or update, but for now just skip if already promoted
      return;
    }

    const pattern = {
      name: experience.pattern,
      domain: experience.domain,
      architecture: experience.reason,
      experience_id: experience.experience_id,
      promotedAt: new Date().toISOString()
    };

    await this.patternStore.set(pattern.name, pattern);
  }

  extractHeuristics(mission, success) {
    return {
      duration: mission.duration || 0,
      errors: mission.errorCount || (success ? 0 : 1),
      retries: mission.retries || 0,
      tokens: mission.tokensUsed || 0,
      provider: mission.provider || 'unknown',
      worker: mission.worker || 'unknown',
      cost: mission.cost || 0,
      filesChanged: mission.filesChanged || 0,
      tests: mission.testStatus || (success ? 'PASS' : 'FAIL')
    };
  }

  isMissionComplex(mission, metrics) {
    // Determine if the mission warrants an LLM reflection call
    if (!mission.success) return true; // Always reflect on failure
    if (metrics.duration > 60000) return true; // Longer than 60s
    if (metrics.cost > 0.05) return true; // High cost
    if (metrics.filesChanged > 3) return true; // High impact
    if (mission.tags && mission.tags.includes('architecture')) return true;
    return false;
  }

  async reflectOnMission(mission, success, metrics) {
    const prompt = `
    Analise esta missão.
    Mission: ${JSON.stringify(mission)}
    Metrics: ${JSON.stringify(metrics)}
    Success: ${success}
    
    O que funcionou? O que poderia ser melhor?
    Qual arquitetura foi mais eficiente?
    Quais decisões devem ser repetidas? O que nunca devemos repetir?
    Responda em formato JSON contendo: { "reason": "...", "pattern": "...", "recommended": true/false, "avoid": true/false }
    `;

    try {
      const response = await this.aiRouter.routePrompt(prompt, { priority: 'background' });
      // Assume the response can be parsed as JSON, fallback if not
      const jsonStr = response.match(/\{[\s\S]*\}/);
      if (jsonStr) {
        return JSON.parse(jsonStr[0]);
      }
      return { reason: response };
    } catch (err) {
      console.warn('LLM Reflection failed:', err.message);
      return null;
    }
  }
}

module.exports = { LearningEngine };
