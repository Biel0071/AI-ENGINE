/**
 * FÊNIX OS — Genome Builder
 * Compiles, versions, and diffs the 4 Dimensions of FÊNIX DNA:
 * 1. PROJECT DNA
 * 2. OPERATIONAL DNA
 * 3. VISUAL DNA
 * 4. AGENT DNA
 */

class GenomeBuilder {
  constructor({ projectId = 'default' } = {}) {
    this.projectId = projectId;
    this.versions = []; // list of { version, timestamp, dna }
  }

  /**
   * Compiles a snapshot of the 4-DNA model
   */
  compile({
    projectDna = {},
    operationalDna = {},
    visualDna = {},
    agentDna = {},
    versionTag = null
  }) {
    const nextVersionNum = this.versions.length + 1;
    const version = versionTag || `v${nextVersionNum}.0.0`;

    const dnaSnapshot = {
      version,
      projectId: this.projectId,
      timestamp: new Date().toISOString(),
      projectDna: {
        stack: projectDna.stack || [],
        architecture: projectDna.architecture || 'Modular Monolith',
        modules: projectDna.modules || [],
        features: projectDna.features || [],
        apiRoutes: projectDna.apiRoutes || [],
        databaseSchemas: projectDna.databaseSchemas || [],
        integrations: projectDna.integrations || [],
        dependencies: projectDna.dependencies || []
      },
      operationalDna: {
        workflows: operationalDna.workflows || [],
        actionSequences: operationalDna.actionSequences || [],
        decisions: operationalDna.decisions || [],
        learnedRules: operationalDna.learnedRules || []
      },
      visualDna: {
        layouts: visualDna.layouts || [],
        componentTree: visualDna.componentTree || [],
        designTokens: visualDna.designTokens || {},
        breakpoints: visualDna.breakpoints || ['mobile', 'tablet', 'desktop']
      },
      agentDna: {
        activeAgents: agentDna.activeAgents || [],
        skillsInventory: agentDna.skillsInventory || [],
        taskSuccessRate: agentDna.taskSuccessRate || 100.0
      }
    };

    this.versions.push({
      version,
      timestamp: dnaSnapshot.timestamp,
      dna: dnaSnapshot
    });

    return dnaSnapshot;
  }

  getLatest() {
    if (this.versions.length === 0) return null;
    return this.versions[this.versions.length - 1].dna;
  }

  getVersion(version) {
    const found = this.versions.find(v => v.version === version);
    return found ? found.dna : null;
  }

  /**
   * Compares two DNA versions to measure evolution and modifications
   */
  diff(vOld, vNew) {
    const oldDna = typeof vOld === 'string' ? this.getVersion(vOld) : vOld;
    const newDna = typeof vNew === 'string' ? this.getVersion(vNew) : vNew;

    if (!oldDna || !newDna) throw new Error('Both old and new DNA versions are required for diff');

    return {
      projectId: this.projectId,
      fromVersion: oldDna.version,
      toVersion: newDna.version,
      changes: {
        project: {
          addedModules: newDna.projectDna.modules.filter(m => !oldDna.projectDna.modules.includes(m)),
          addedApiRoutes: newDna.projectDna.apiRoutes.filter(r => !oldDna.projectDna.apiRoutes.includes(r))
        },
        operational: {
          newWorkflowsCount: newDna.operationalDna.workflows.length - oldDna.operationalDna.workflows.length,
          newRulesCount: newDna.operationalDna.learnedRules.length - oldDna.operationalDna.learnedRules.length
        },
        visual: {
          componentDelta: newDna.visualDna.componentTree.length - oldDna.visualDna.componentTree.length
        },
        agent: {
          successRateDelta: Number((newDna.agentDna.taskSuccessRate - oldDna.agentDna.taskSuccessRate).toFixed(2))
        }
      }
    };
  }
}

module.exports = { GenomeBuilder };
