/**
 * FÊNIX OS — Core Contracts: 4-DNA Model, Artifact Graph & Reconstruction Metrics
 */

const DNA_TYPES = Object.freeze({
  PROJECT: 'PROJECT_DNA',
  OPERATIONAL: 'OPERATIONAL_DNA',
  VISUAL: 'VISUAL_DNA',
  AGENT: 'AGENT_DNA'
});

class SystemReconstructionScore {
  constructor({
    functionalMatch = 0,
    visualMatch = 0,
    apiMatch = 0,
    databaseMatch = 0,
    componentCoverage = 0,
    routeCoverage = 0,
    testCoverage = 0,
    weights = {
      functionalMatch: 0.25,
      apiMatch: 0.20,
      databaseMatch: 0.15,
      visualMatch: 0.15,
      componentCoverage: 0.10,
      routeCoverage: 0.10,
      testCoverage: 0.05
    }
  }) {
    this.functionalMatch = clampPct(functionalMatch);
    this.visualMatch = clampPct(visualMatch);
    this.apiMatch = clampPct(apiMatch);
    this.databaseMatch = clampPct(databaseMatch);
    this.componentCoverage = clampPct(componentCoverage);
    this.routeCoverage = clampPct(routeCoverage);
    this.testCoverage = clampPct(testCoverage);
    this.weights = weights;

    this.overallScore = this.calculateOverall();
  }

  calculateOverall() {
    let totalWeight = 0;
    let weightedSum = 0;

    for (const [key, weight] of Object.entries(this.weights)) {
      if (typeof this[key] === 'number') {
        weightedSum += this[key] * weight;
        totalWeight += weight;
      }
    }

    return Number((weightedSum / (totalWeight || 1)).toFixed(2));
  }

  toJSON() {
    return {
      overallScore: this.overallScore,
      functionalMatch: this.functionalMatch,
      visualMatch: this.visualMatch,
      apiMatch: this.apiMatch,
      databaseMatch: this.databaseMatch,
      componentCoverage: this.componentCoverage,
      routeCoverage: this.routeCoverage,
      testCoverage: this.testCoverage,
      passed: this.overallScore >= 90.0
    };
  }
}

class FunctionCoverage {
  constructor({
    totalFunctions = 0,
    preserved = 0,
    reconstructed = 0,
    pending = 0
  }) {
    this.totalFunctions = Math.max(0, totalFunctions);
    this.preserved = Math.max(0, preserved);
    this.reconstructed = Math.max(0, reconstructed);
    this.pending = Math.max(0, pending);
    this.coveragePct = this.calculateCoverage();
  }

  calculateCoverage() {
    if (this.totalFunctions === 0) return 100.0;
    const covered = this.preserved + this.reconstructed;
    return Number(((covered / this.totalFunctions) * 100).toFixed(2));
  }

  toJSON() {
    return {
      totalFunctions: this.totalFunctions,
      preserved: this.preserved,
      reconstructed: this.reconstructed,
      pending: this.pending,
      coveragePct: this.coveragePct,
      passed: this.coveragePct >= 95.0
    };
  }
}

function clampPct(v) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Number(n.toFixed(2))));
}

module.exports = {
  DNA_TYPES,
  SystemReconstructionScore,
  FunctionCoverage
};
