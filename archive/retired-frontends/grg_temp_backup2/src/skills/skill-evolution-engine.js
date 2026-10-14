/**
 * FÊNIX OS — Skill Evolution Engine
 * Tracks real execution telemetry per skill and drives automatic version evolution.
 */

class SkillEvolutionEngine {
  constructor({ registry = null } = {}) {
    this.registry = registry;
    this.telemetry = new Map(); // skillId -> { executions, successes, failures, totalDurationMs, versions }
  }

  /**
   * Records execution telemetry for a skill
   */
  recordExecution(skillId, { success = true, durationMs = 0, feedbackScore = null, error = null }) {
    if (!this.telemetry.has(skillId)) {
      this.telemetry.set(skillId, {
        skillId,
        currentVersion: '1.0.0',
        executions: 0,
        successes: 0,
        failures: 0,
        totalDurationMs: 0,
        averageDurationMs: 0,
        successRate: 100.0,
        errors: [],
        versionHistory: [{ version: '1.0.0', promotedAt: new Date().toISOString() }]
      });
    }

    const data = this.telemetry.get(skillId);
    data.executions += 1;
    if (success) data.successes += 1;
    else {
      data.failures += 1;
      if (error) data.errors.push({ error, timestamp: new Date().toISOString() });
    }

    data.totalDurationMs += durationMs;
    data.averageDurationMs = Number((data.totalDurationMs / data.executions).toFixed(1));
    data.successRate = Number(((data.successes / data.executions) * 100).toFixed(2));

    // Check for version evolution condition
    this.evaluateEvolution(skillId);

    return data;
  }

  evaluateEvolution(skillId) {
    const data = this.telemetry.get(skillId);
    if (!data) return false;

    // Condition: After 10 executions, if success rate >= 90%, promote to next minor version
    if (data.executions >= 10 && data.successRate >= 90.0 && data.currentVersion === '1.0.0') {
      data.currentVersion = '1.1.0';
      data.versionHistory.push({
        version: '1.1.0',
        promotedAt: new Date().toISOString(),
        reason: `Proven stability: ${data.executions} runs with ${data.successRate}% success rate`
      });
      return true;
    }

    return false;
  }

  getSkillMetrics(skillId) {
    return this.telemetry.get(skillId) || null;
  }

  listAllMetrics() {
    return Array.from(this.telemetry.values());
  }
}

module.exports = { SkillEvolutionEngine };
