/**
 * FÊNIX Mission DNA
 * Immutable Genomic Footprint of Execution Missions
 */
class MissionDNA {
  constructor(data = {}) {
    this.id = data.id || `MDNA-${Date.now()}`;
    this.missionId = data.missionId;
    this.objective = data.objective;
    this.scope = data.scope || [];
    this.risks = data.risks || [];
    this.stack = data.stack || {};
    this.dependencies = data.dependencies || [];
    this.filesTouched = data.filesTouched || [];
    this.commits = data.commits || [];
    this.builds = data.builds || [];
    this.deploys = data.deploys || [];
    this.knowledgeLearned = data.knowledgeLearned || [];
    this.createdAt = data.createdAt || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      missionId: this.missionId,
      objective: this.objective,
      scope: this.scope,
      risks: this.risks,
      stack: this.stack,
      dependencies: this.dependencies,
      filesTouched: this.filesTouched,
      commits: this.commits,
      builds: this.builds,
      deploys: this.deploys,
      knowledgeLearned: this.knowledgeLearned,
      createdAt: this.createdAt,
    };
  }
}

module.exports = { MissionDNA };
