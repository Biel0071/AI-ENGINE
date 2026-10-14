/**
 * FÊNIX OS — Native GitHub Engine
 * Git operations, semantic commit generation, Pull Requests, and repository synchronization.
 */

const { SystemModule } = require('../kernel/module');
const { STATE_MACHINE } = require('../kernel/states');
const { FENIX_EVENTS, EVENT_PRIORITY } = require('../core/contracts/event-types');

class GitHubEngine extends SystemModule {
  constructor({ eventBus = null, permissionMatrix = null } = {}) {
    super('github_engine', '1.0.0');
    this.eventBus = eventBus;
    this.permissionMatrix = permissionMatrix;
    this.pullRequests = new Map(); // prId -> PRData
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
   * Generates a semantic commit message from git diff and task context
   */
  generateSemanticCommit({ type = 'feat', scope = null, description, details = [], breaking = false }) {
    if (!description) throw new Error('description is required for semantic commit');

    const prefix = scope ? `${type}(${scope})` : type;
    const header = `${prefix}${breaking ? '!' : ''}: ${description}`;
    const body = details.length > 0 ? `\n\n${details.map(d => `- ${d}`).join('\n')}` : '';

    return `${header}${body}`;
  }

  /**
   * Records a semantic commit in repository tracking
   */
  async createSemanticCommit({
    projectId,
    branch = 'main',
    message,
    filesChanged = [],
    author = 'FENIX Agent <ai@fenix.os>'
  }) {
    const commitId = `commit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const commit = {
      commitId,
      projectId,
      branch,
      message,
      filesChanged,
      author,
      committed: true,
      timestamp: new Date().toISOString()
    };
    if (this.eventBus) {
      await this.eventBus.emit(FENIX_EVENTS.GITHUB_PUSHED, {
        commitId,
        projectId,
        branch,
        filesCount: filesChanged.length
      }, EVENT_PRIORITY.NORMAL);
    }
    return commit;
  }

  /**
   * Creates a formal Pull Request manifest
   */
  async createPullRequest({
    projectId,
    title,
    headBranch,
    baseBranch = 'main',
    summary,
    changedFiles = [],
    reconstructionScore = null
  }) {
    const prId = `pr_${Date.now()}`;
    const pr = {
      id: prId,
      projectId,
      title,
      headBranch,
      baseBranch,
      summary,
      changedFiles,
      reconstructionScore,
      status: 'OPEN',
      createdAt: new Date().toISOString()
    };

    this.pullRequests.set(prId, pr);

    if (this.eventBus) {
      await this.eventBus.emit(FENIX_EVENTS.GITHUB_PR_CREATED, {
        prId,
        projectId,
        title,
        headBranch,
        baseBranch
      }, EVENT_PRIORITY.HIGH);
    }

    return pr;
  }

  getPullRequest(prId) {
    return this.pullRequests.get(prId) || null;
  }

  async health() {
    return {
      ok: this.status === STATE_MACHINE.ONLINE,
      status: this.status,
      details: {
        totalPullRequestsCreated: this.pullRequests.size
      }
    };
  }
}

module.exports = { GitHubEngine };
