/**
 * FÊNIX OS — Unified Task Engine v3.0
 * Manages the full lifecycle of tasks, DAG dependency graphs, priority scheduling,
 * and multi-agent coordination with strict 7-state validation.
 */

const { SystemModule } = require('../kernel/module');
const { STATE_MACHINE } = require('../kernel/states');
const { Task, TASK_STATES, TASK_PRIORITY } = require('../core/contracts/task');
const { FENIX_EVENTS, EVENT_PRIORITY } = require('../core/contracts/event-types');
const { PermissionMatrix } = require('./permission-matrix');
const crypto = require('crypto');

class TaskEngine extends SystemModule {
  constructor({ eventBus = null, agentRuntime = null, store = null, permissions = null } = {}) {
    super('task_engine', '3.0.0');
    this.eventBus = eventBus;
    this.agentRuntime = agentRuntime;
    this.store = store;
    this.permissions = permissions || new PermissionMatrix();
    this.tasks = new Map(); // taskId -> Task
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
   * Creates and registers a new task
   */
  async createTask({
    projectId = 'default',
    tenantId = 'default',
    title,
    objective,
    priority = TASK_PRIORITY.NORMAL,
    assignedAgent = null,
    requiredSkills = [],
    requiredTools = [],
    dependencies = [],
    context = {}
  }) {
    const task = new Task({
      projectId,
      tenantId,
      title,
      objective,
      priority,
      assignedAgent,
      requiredSkills,
      requiredTools,
      dependencies,
      context
    });

    this.tasks.set(task.id, task);

    if (this.eventBus) {
      await this.eventBus.emit(FENIX_EVENTS.TASK_CREATED, {
        taskId: task.id,
        projectId: task.projectId,
        title: task.title,
        priority: task.priority
      }, EVENT_PRIORITY.NORMAL);
    }

    return task;
  }

  /**
   * Decomposes a major goal into a DAG of subtasks
   */
  async decomposeGoal({ projectId = 'default', goal, subtasks = [] }) {
    const createdTasks = [];
    const idMap = new Map(); // tempIndex -> taskId

    for (let i = 0; i < subtasks.length; i += 1) {
      const spec = subtasks[i];
      // Resolve mapped dependencies
      const resolvedDeps = (spec.dependsOnIndices || []).map(idx => idMap.get(idx)).filter(Boolean);

      const task = await this.createTask({
        projectId,
        title: spec.title,
        objective: spec.objective || spec.title,
        assignedAgent: spec.assignedAgent || null,
        requiredSkills: spec.requiredSkills || [],
        dependencies: [...(spec.dependencies || []), ...resolvedDeps],
        context: { parentGoal: goal, ...spec.context }
      });

      idMap.set(i, task.id);
      createdTasks.push(task);
    }

    return createdTasks;
  }

  /**
   * Evaluates if a task's dependencies are all COMPLETED
   */
  canRun(taskId) {
    const task = this.tasks.get(taskId);
    if (!task || task.state !== TASK_STATES.QUEUED) return false;

    for (const depId of task.dependencies) {
      const depTask = this.tasks.get(depId);
      if (!depTask || depTask.state !== TASK_STATES.COMPLETED) {
        return false;
      }
    }

    return true;
  }

  /**
   * Executes a task using the assigned agent
   */
  async runTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    if (!this.canRun(taskId)) {
      task.transition(TASK_STATES.WAITING, 'Waiting for dependencies to complete');
      if (this.eventBus) {
        await this.eventBus.emit(FENIX_EVENTS.TASK_WAITING, { taskId: task.id });
      }
      return task;
    }

    task.transition(TASK_STATES.RUNNING, 'Execution started');
    if (this.eventBus) {
      await this.eventBus.emit(FENIX_EVENTS.TASK_STARTED, { taskId: task.id, assignedAgent: task.assignedAgent });
    }

    try {
      let result = null;

      if (this.agentRuntime && task.assignedAgent) {
        const agentInstanceId = await this.agentRuntime.spawnAgent(task.assignedAgent, {
          projectId: task.projectId,
          task: task.toJSON(),
          initialContext: task.context
        });

        result = await this.agentRuntime.executeAgent(agentInstanceId);
      } else {
        result = { success: true, message: 'Direct task execution completed' };
      }

      task.result = result;
      task.transition(TASK_STATES.COMPLETED, 'Execution succeeded');

      if (this.eventBus) {
        await this.eventBus.emit(FENIX_EVENTS.TASK_COMPLETED, { taskId: task.id, result });
      }

      // Check if dependent waiting tasks can now run
      await this.triggerDependentTasks(task.id);

      return task;
    } catch (err) {
      task.error = this.permissions.redactSecrets(err.message);
      task.transition(TASK_STATES.FAILED, `Error: ${task.error}`);

      if (this.eventBus) {
        await this.eventBus.emit(FENIX_EVENTS.TASK_FAILED, { taskId: task.id, error: task.error }, EVENT_PRIORITY.HIGH);
      }

      throw err;
    }
  }

  async triggerDependentTasks(completedTaskId) {
    for (const [id, task] of this.tasks.entries()) {
      if (task.dependencies.includes(completedTaskId) && task.state === TASK_STATES.WAITING) {
        if (this.canRun(id)) {
          task.transition(TASK_STATES.QUEUED, 'Dependencies resolved');
          // Auto-run next in pipeline
          this.runTask(id).catch(err => console.error(`[TaskEngine] Auto-run failed for ${id}:`, err.message));
        }
      }
    }
  }

  cancelTask(taskId, reason = 'User cancelled') {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    task.transition(TASK_STATES.CANCELLED, reason);
    if (this.eventBus) {
      this.eventBus.emit(FENIX_EVENTS.TASK_CANCELLED, { taskId, reason });
    }
    return true;
  }

  getTask(taskId) {
    return this.tasks.get(taskId) || null;
  }

  listByProject(projectId) {
    return Array.from(this.tasks.values()).filter(t => t.projectId === projectId);
  }

  listByState(state) {
    return Array.from(this.tasks.values()).filter(t => t.state === state);
  }

  async health() {
    return {
      ok: this.status === STATE_MACHINE.ONLINE,
      status: this.status,
      details: {
        totalTasks: this.tasks.size,
        queued: this.listByState(TASK_STATES.QUEUED).length,
        running: this.listByState(TASK_STATES.RUNNING).length,
        completed: this.listByState(TASK_STATES.COMPLETED).length,
        failed: this.listByState(TASK_STATES.FAILED).length
      }
    };
  }
}

module.exports = { TaskEngine };
