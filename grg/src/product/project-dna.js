'use strict';

/**
 * FÊNIX OS — Project DNA (Level 10)
 * Accumulative Engineering Genome of Repositories & Products.
 * 
 * Contains:
 * - Architecture & Stack
 * - Screen DNA (visual, layout, responsive tokens, interaction contracts)
 * - Component DNA (UI and backend modules)
 * - API Contracts & Schemas
 * - Design Tokens (colors, fonts, glassmorphism, spacing)
 * - Reusable Patterns catalog
 * - Historical Reconstruction Events & Metrics
 */
class ProjectDNA {
  constructor(data = {}) {
    this.projectId = data.projectId || 'prj.ai_engine_core';
    this.projectName = data.projectName || 'ai-engine-core';
    this.rootPath = data.rootPath || null;
    this.stack = data.stack || ['Node.js', 'Express', 'PostgreSQL', 'Redis', 'Vanilla CSS'];
    this.architecture = data.architecture || 'Hexagonal / SCOS Live Runtime';
    this.screens = data.screens || [];
    this.components = data.components || [];
    this.apis = data.apis || [];
    this.schemas = data.schemas || [];
    this.designTokens = data.designTokens || {
      palette: ['#0f172a', '#1e293b', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
      typography: ['Inter', 'system-ui', 'monospace'],
      spacing: ['0.25rem', '0.5rem', '1rem', '1.5rem', '2rem'],
      glassmorphism: true,
      darkMode: true,
    };
    this.learnedPatterns = data.learnedPatterns || [];
    this.executionHistory = data.executionHistory || [];
    this.reconstructionHistory = data.reconstructionHistory || [];
    this.performanceMetrics = data.performanceMetrics || { avgLatencyMs: 14, errorRatePct: 0.0 };
    this.aiUsageMetrics = data.aiUsageMetrics || { totalTokens: 450000, preferredModel: 'claude-3-5-sonnet' };
    this.updatedAt = new Date().toISOString();
  }

  addScreen(screenDna) {
    const existingIndex = this.screens.findIndex(s => s.screenId === screenDna.screenId || s.route === screenDna.route);
    if (existingIndex >= 0) {
      this.screens[existingIndex] = { ...this.screens[existingIndex], ...screenDna, updatedAt: new Date().toISOString() };
    } else {
      this.screens.push({ ...screenDna, addedAt: new Date().toISOString() });
    }
    this.updatedAt = new Date().toISOString();
    return this;
  }

  addComponent(componentDna) {
    const existingIndex = this.components.findIndex(c => c.name === componentDna.name || c.id === componentDna.id);
    if (existingIndex >= 0) {
      this.components[existingIndex] = { ...this.components[existingIndex], ...componentDna, updatedAt: new Date().toISOString() };
    } else {
      this.components.push({ ...componentDna, addedAt: new Date().toISOString() });
    }
    this.updatedAt = new Date().toISOString();
    return this;
  }

  addApi(apiContract) {
    const existingIndex = this.apis.findIndex(a => a.endpoint === apiContract.endpoint && a.method === apiContract.method);
    if (existingIndex >= 0) {
      this.apis[existingIndex] = { ...this.apis[existingIndex], ...apiContract, updatedAt: new Date().toISOString() };
    } else {
      this.apis.push({ ...apiContract, addedAt: new Date().toISOString() });
    }
    this.updatedAt = new Date().toISOString();
    return this;
  }

  addPattern(pattern) {
    const id = typeof pattern === 'string' ? pattern : pattern.id || pattern.name;
    if (!this.learnedPatterns.some(p => (typeof p === 'string' ? p : p.id) === id)) {
      this.learnedPatterns.push(pattern);
    }
    this.updatedAt = new Date().toISOString();
    return this;
  }

  recordMissionExecution(missionDna) {
    this.executionHistory.push({
      missionId: missionDna.missionId,
      objective: missionDna.objective,
      executedAt: new Date().toISOString(),
    });
    this.updatedAt = new Date().toISOString();
  }

  recordReconstruction(event = {}) {
    this.reconstructionHistory.push({
      id: event.id || `rec_${Date.now()}`,
      target: event.target,
      timeMs: event.timeMs,
      tokensUsed: event.tokensUsed,
      tokensSaved: event.tokensSaved,
      knowledgeReused: event.knowledgeReused,
      executedAt: new Date().toISOString(),
    });
    this.updatedAt = new Date().toISOString();
  }

  toJSON() {
    return {
      projectId: this.projectId,
      projectName: this.projectName,
      rootPath: this.rootPath,
      stack: this.stack,
      architecture: this.architecture,
      screens: this.screens,
      components: this.components,
      apis: this.apis,
      schemas: this.schemas,
      designTokens: this.designTokens,
      learnedPatterns: this.learnedPatterns,
      executionHistory: this.executionHistory,
      reconstructionHistory: this.reconstructionHistory,
      performanceMetrics: this.performanceMetrics,
      aiUsageMetrics: this.aiUsageMetrics,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = { ProjectDNA };
