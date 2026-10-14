/**
 * FÊNIX OS — Multi-Project Workspace Manager & Cross-Project Knowledge Bus
 * Manages concurrent workspaces with isolated 4-DNA containers and shared cross-project knowledge.
 */

const { SystemModule } = require('../kernel/module');
const { STATE_MACHINE } = require('../kernel/states');
const { GenomeBuilder } = require('../intelligence/genome-builder');
const { ArtifactGraph } = require('../repo-intel/artifact-graph');
const { FunctionInventory } = require('../repo-intel/function-inventory');
const { FENIX_EVENTS, EVENT_PRIORITY } = require('../core/contracts/event-types');

class MultiProjectWorkspaceManager extends SystemModule {
  constructor({ eventBus = null } = {}) {
    super('workspace_manager', '3.0.0');
    this.eventBus = eventBus;
    this.workspaces = new Map(); // projectId -> WorkspaceContainer
    this.crossProjectKnowledge = new Map(); // topic/tag -> list of { projectId, snippet }
    this.status = STATE_MACHINE.BOOT;
  }

  async start() {
    this.status = STATE_MACHINE.READY;
    this.status = STATE_MACHINE.ONLINE;
    this.startTime = Date.now();
    return this;
  }

  async stop() {
    this.status = STATE_MACHINE.SHUTDOWN;
    this.startTime = null;
  }

  /**
   * Registers and initializes a new isolated project workspace
   */
  registerProject({
    projectId,
    name,
    rootPath,
    stack = [],
    initialDna = null
  }) {
    if (!projectId) throw new Error('projectId is required');
    if (!rootPath) throw new Error('rootPath is required');

    const genomeBuilder = new GenomeBuilder({ projectId });
    if (initialDna) {
      genomeBuilder.compile({
        projectDna: initialDna.projectDna || {},
        operationalDna: initialDna.operationalDna || {},
        visualDna: initialDna.visualDna || {},
        agentDna: initialDna.agentDna || {}
      });
    }

    const container = {
      projectId,
      name: name || projectId,
      rootPath,
      stack,
      genomeBuilder,
      artifactGraph: new ArtifactGraph({ projectId }),
      functionInventory: new FunctionInventory({ projectId }),
      activeSessions: new Set(),
      registeredAt: new Date().toISOString()
    };

    this.workspaces.set(projectId, container);

    if (this.eventBus) {
      this.eventBus.emit(FENIX_EVENTS.PROJECT_OPENED, {
        projectId,
        name: container.name,
        rootPath
      }, EVENT_PRIORITY.NORMAL);
    }

    return container;
  }

  getProject(projectId) {
    return this.workspaces.get(projectId) || null;
  }

  listProjects() {
    return Array.from(this.workspaces.values()).map(w => ({
      projectId: w.projectId,
      name: w.name,
      rootPath: w.rootPath,
      stack: w.stack,
      dnaVersion: w.genomeBuilder.getLatest()?.version || 'none',
      totalFeatures: w.functionInventory.listAll().length
    }));
  }

  /**
   * Share learned knowledge across projects
   */
  shareKnowledge(topic, { projectId, snippet }) {
    if (!this.crossProjectKnowledge.has(topic)) {
      this.crossProjectKnowledge.set(topic, []);
    }
    this.crossProjectKnowledge.get(topic).push({
      projectId,
      snippet,
      sharedAt: new Date().toISOString()
    });
  }

  /**
   * Search knowledge learned across all projects
   */
  queryCrossProjectKnowledge(topic) {
    return this.crossProjectKnowledge.get(topic) || [];
  }
}

module.exports = { MultiProjectWorkspaceManager };
