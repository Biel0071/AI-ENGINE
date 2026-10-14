/**
 * FÊNIX OS — Core Contracts: Event Types & Taxonomy
 * Inviolable Event Taxonomy covering all 5 layers of FÊNIX OS.
 */

const EVENT_PRIORITY = Object.freeze({
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
  BACKGROUND: 4
});

const FENIX_EVENTS = Object.freeze({
  // Workspace & Project
  PROJECT_OPENED: 'project.opened',
  PROJECT_CLOSED: 'project.closed',
  PROJECT_IMPORTED: 'project.imported',
  PROJECT_SCANNED: 'project.scanned',
  PROJECT_DNA_GENERATED: 'project.dna_generated',

  // Filesystem & Code
  FILE_CHANGED: 'file.changed',
  FILE_SAVED: 'file.saved',
  FILE_DELETED: 'file.deleted',
  FILE_MOVED: 'file.moved',

  // Agent Runtime & Lifecycle
  AGENT_SPAWNED: 'agent.spawned',
  AGENT_STARTED: 'agent.started',
  AGENT_PAUSED: 'agent.paused',
  AGENT_RESUMED: 'agent.resumed',
  AGENT_FINISHED: 'agent.finished',
  AGENT_FAILED: 'agent.failed',
  AGENT_TERMINATED: 'agent.terminated',
  AGENT_HEARTBEAT: 'agent.heartbeat',

  // Task Engine
  TASK_CREATED: 'task.created',
  TASK_PLANNING: 'task.planning',
  TASK_STARTED: 'task.started',
  TASK_UPDATED: 'task.updated',
  TASK_WAITING: 'task.waiting',
  TASK_COMPLETED: 'task.completed',
  TASK_FAILED: 'task.failed',
  TASK_CANCELLED: 'task.cancelled',

  // Skills & Learning
  SKILL_CREATED: 'skill.created',
  SKILL_UPDATED: 'skill.updated',
  SKILL_INVOKED: 'skill.invoked',
  SKILL_EVALUATED: 'skill.evaluated',
  WORKFLOW_EXTRACTED: 'workflow.extracted',
  PATTERN_LEARNED: 'pattern.learned',

  // Build & Runtime
  PREVIEW_STARTED: 'preview.started',
  PREVIEW_UPDATED: 'preview.updated',
  PREVIEW_STOPPED: 'preview.stopped',
  BUILD_STARTED: 'build.started',
  BUILD_SUCCESS: 'build.success',
  BUILD_FAILED: 'build.failed',

  // Version Control & GitHub
  GITHUB_CLONED: 'github.cloned',
  GITHUB_PUSHED: 'github.pushed',
  GITHUB_PULLED: 'github.pulled',
  GITHUB_PR_CREATED: 'github.pr_created',

  // Observer & Digital Genome
  OBSERVER_TICK: 'observer.tick',
  OBSERVATION_RECORDED: 'observer.observation_recorded',
  GENOME_COMPILED: 'genome.compiled',
  RECONSTRUCTION_EVALUATED: 'reconstruction.evaluated',

  // External & Devices
  WEB_PAGE_OPENED: 'web.page_opened',
  DEVICE_CONNECTED: 'device.connected',
  WORKFLOW_COMPLETED: 'workflow.completed'
});

module.exports = {
  EVENT_PRIORITY,
  FENIX_EVENTS
};
