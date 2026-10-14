/**
 * FÊNIX Project DNA
 * Accumulative Engineering Genome of Repositories & SaaS Products
 */
class ProjectDNA {
  constructor(data = {}) {
    this.projectId = data.projectId || 'prj.ai_engine_core';
    this.projectName = data.projectName || 'ai-engine-core';
    this.stack = data.stack || ['Node.js', 'Express', 'PostgreSQL', 'Redis', 'Vanilla CSS'];
    this.architecture = data.architecture || 'Hexagonal / SCOS Live Runtime';
    this.components = data.components || [];
    this.learnedPatterns = data.learnedPatterns || [];
    this.executionHistory = data.executionHistory || [];
    this.performanceMetrics = data.performanceMetrics || { avgLatencyMs: 14, errorRatePct: 0.0 };
    this.aiUsageMetrics = data.aiUsageMetrics || { totalTokens: 450000, preferredModel: 'claude-3-5-sonnet' };
    this.updatedAt = new Date().toISOString();
  }

  recordMissionExecution(missionDna) {
    this.executionHistory.push({
      missionId: missionDna.missionId,
      objective: missionDna.objective,
      executedAt: new Date().toISOString(),
    });
    this.updatedAt = new Date().toISOString();
  }

  toJSON() {
    return {
      projectId: this.projectId,
      projectName: this.projectName,
      stack: this.stack,
      architecture: this.architecture,
      components: this.components,
      learnedPatterns: this.learnedPatterns,
      executionHistory: this.executionHistory,
      performanceMetrics: this.performanceMetrics,
      aiUsageMetrics: this.aiUsageMetrics,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = { ProjectDNA };
