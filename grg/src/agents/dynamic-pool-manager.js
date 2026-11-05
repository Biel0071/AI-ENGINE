'use strict';

/**
 * FÊNIX OS — DYNAMIC AGENT POOL & POPUP DISPATCHER
 * ===================================================
 * Manages dynamically scalable agent pools (10, 20, 50, 100+ agents),
 * intelligent auto-scaling based on system load/tasks,
 * Human-in-the-Loop task popup alerts, and real-time synchronization
 * with the 3D Living City and Living Office.
 */

const { EventEmitter } = require('node:events');
const { globalBus } = require('../eventing/fenix-event-bus');

const POOL_ROLES = Object.freeze([
  { role: 'ORCHESTRATOR', name: 'Master Orchestrator', emoji: '👑', executor: 'ANTIGRAVITY', district: 'command-center' },
  { role: 'ARCHITECT', name: 'System Architect', emoji: '📐', executor: 'CLAUDE', district: 'command-center' },
  { role: 'FRONTEND', name: 'Frontend Engineer', emoji: '🎨', executor: 'ANTIGRAVITY', district: 'dev-district' },
  { role: 'BACKEND', name: 'Backend & API Engineer', emoji: '⚙️', executor: 'ANTIGRAVITY', district: 'dev-district' },
  { role: 'DATABASE', name: 'Database & State Specialist', emoji: '🗄️', executor: 'ANTIGRAVITY', district: 'data-center' },
  { role: 'UIUX', name: 'UI/UX & Design Systems', emoji: '✨', executor: 'QWEN', district: 'dev-district' },
  { role: 'VISUAL', name: 'Visual Reconstruction Agent', emoji: '👁️', executor: 'ANTIGRAVITY', district: 'research' },
  { role: 'BROWSER', name: 'Browser Automation Agent', emoji: '🌐', executor: 'ANTIGRAVITY', district: 'porto' },
  { role: 'QA', name: 'Quality & Test Guardian', emoji: '🧪', executor: 'ANTIGRAVITY', district: 'dev-district' },
  { role: 'SECURITY', name: 'Zero-Trust Security Auditor', emoji: '🔒', executor: 'CLAUDE', district: 'data-center' },
  { role: 'DEVOPS', name: 'DevOps & SRE Controller', emoji: '🛡️', executor: 'OLLAMA', district: 'observatory' },
  { role: 'GITHUB', name: 'Git & Versioning Specialist', emoji: '🔀', executor: 'ANTIGRAVITY', district: 'dev-district' },
  { role: 'RESEARCH', name: 'Deep Intelligence Researcher', emoji: '🔬', executor: 'CLAUDE', district: 'research' },
  { role: 'OBSERVATORY', name: 'Telemetry & Trace Observer', emoji: '🔭', executor: 'OLLAMA', district: 'observatory' }
]);

class DynamicPoolManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.minSize = options.minSize || 10;
    this.maxSize = options.maxSize || 200;
    this.currentSize = options.currentSize || 10;
    this.autoScale = options.autoScale !== undefined ? options.autoScale : true;
    this.scaleCooldownMs = options.scaleCooldownMs !== undefined ? options.scaleCooldownMs : 5000;
    this.lastScaledAt = 0;

    this.agents = new Map();
    this.pendingPopups = new Map();
    this.completedTasksHistory = [];

    this._initializePool(this.currentSize);
  }

  _initializePool(size) {
    this.agents.clear();
    for (let i = 1; i <= size; i++) {
      const template = POOL_ROLES[(i - 1) % POOL_ROLES.length];
      const indexStr = String(i).padStart(2, '0');
      const id = `agent-pool-${indexStr}-${template.role.toLowerCase()}`;
      const agent = {
        id,
        index: i,
        name: `${template.name} #${indexStr}`,
        role: template.role,
        emoji: template.emoji,
        executor: template.executor,
        district: template.district,
        status: 'IDLE', // IDLE, ASSIGNED, RUNNING, WAITING_APPROVAL, COMPLETED
        efficiency: Math.floor(Math.random() * 8) + 92,
        currentTask: null,
        tasksCompleted: 0,
        createdAt: new Date().toISOString(),
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${id}`,
        coordinates: {
          x: (Math.random() * 20 - 10).toFixed(1) * 1,
          y: (Math.random() * 20 - 10).toFixed(1) * 1
        }
      };
      this.agents.set(id, agent);
    }
  }

  getPoolState() {
    const list = Array.from(this.agents.values());
    const idleCount = list.filter(a => a.status === 'IDLE').length;
    const busyCount = list.filter(a => ['ASSIGNED', 'RUNNING', 'WAITING_APPROVAL'].length && a.status !== 'IDLE').length;
    const waitingApprovalCount = list.filter(a => a.status === 'WAITING_APPROVAL').length;
    const utilization = list.length ? Math.round((busyCount / list.length) * 100) : 0;

    return {
      size: this.agents.size,
      minSize: this.minSize,
      maxSize: this.maxSize,
      autoScale: this.autoScale,
      idleCount,
      busyCount,
      waitingApprovalCount,
      utilizationPercentage: utilization,
      lastScaledAt: this.lastScaledAt ? new Date(this.lastScaledAt).toISOString() : null,
      agents: list,
      pendingPopups: Array.from(this.pendingPopups.values())
    };
  }

  scale(targetSize, { reason = 'manual_request' } = {}) {
    const sanitized = Math.max(this.minSize, Math.min(this.maxSize, Number(targetSize) || this.minSize));
    const previousSize = this.agents.size;

    if (sanitized === previousSize) {
      return { ok: true, previousSize, currentSize: sanitized, changed: false };
    }

    if (sanitized > previousSize) {
      // Scale UP
      for (let i = previousSize + 1; i <= sanitized; i++) {
        const template = POOL_ROLES[(i - 1) % POOL_ROLES.length];
        const indexStr = String(i).padStart(2, '0');
        const id = `agent-pool-${indexStr}-${template.role.toLowerCase()}`;
        const agent = {
          id,
          index: i,
          name: `${template.name} #${indexStr}`,
          role: template.role,
          emoji: template.emoji,
          executor: template.executor,
          district: template.district,
          status: 'IDLE',
          efficiency: Math.floor(Math.random() * 8) + 92,
          currentTask: null,
          tasksCompleted: 0,
          createdAt: new Date().toISOString(),
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${id}`,
          coordinates: {
            x: (Math.random() * 20 - 10).toFixed(1) * 1,
            y: (Math.random() * 20 - 10).toFixed(1) * 1
          }
        };
        this.agents.set(id, agent);
      }
    } else {
      // Scale DOWN: prefer removing idle agents first
      const allEntries = Array.from(this.agents.entries());
      const toRemoveCount = previousSize - sanitized;
      let removed = 0;

      // First pass: remove idle agents from highest indices
      for (let idx = allEntries.length - 1; idx >= 0 && removed < toRemoveCount; idx--) {
        const [id, agent] = allEntries[idx];
        if (agent.status === 'IDLE') {
          this.agents.delete(id);
          removed++;
        }
      }

      // Second pass: if needed, remove remaining
      if (removed < toRemoveCount) {
        const remainingEntries = Array.from(this.agents.entries());
        for (let idx = remainingEntries.length - 1; idx >= 0 && removed < toRemoveCount; idx--) {
          const [id] = remainingEntries[idx];
          this.agents.delete(id);
          removed++;
        }
      }
    }

    this.currentSize = this.agents.size;
    this.lastScaledAt = Date.now();

    const eventPayload = {
      event: 'agent_pool_scaled',
      previousSize,
      currentSize: this.currentSize,
      reason,
      timestamp: new Date().toISOString()
    };

    this.emit('scaled', eventPayload);
    try {
      globalBus.emit('agent.pool.scaled', eventPayload);
    } catch (_) {}

    return { ok: true, previousSize, currentSize: this.currentSize, changed: true, reason };
  }

  setAutoScale(enabled) {
    this.autoScale = Boolean(enabled);
    return { ok: true, autoScale: this.autoScale };
  }

  evaluateAutoScaling({ activeTasksCount = 0, queueDepth = 0 } = {}) {
    if (!this.autoScale) return null;
    const now = Date.now();
    if (now - this.lastScaledAt < this.scaleCooldownMs) return null;

    const totalWorkload = activeTasksCount + queueDepth;
    const currentSize = this.agents.size;

    let target = currentSize;
    if (totalWorkload > currentSize * 0.8) {
      // High load -> scale up
      if (currentSize < 20) target = 20;
      else if (currentSize < 50) target = 50;
      else if (currentSize < 100) target = 100;
    } else if (totalWorkload < currentSize * 0.3 && currentSize > 10) {
      // Low load -> scale down gracefully
      if (currentSize > 50) target = 50;
      else if (currentSize > 20) target = 20;
      else target = 10;
    }

    if (target !== currentSize) {
      return this.scale(target, { reason: `auto_load_adaptation (workload=${totalWorkload})` });
    }
    return null;
  }

  findAvailableAgent(preferredRole = null) {
    const list = Array.from(this.agents.values());
    if (preferredRole) {
      const match = list.find(a => a.status === 'IDLE' && a.role.toUpperCase() === String(preferredRole).toUpperCase());
      if (match) return match;
    }
    return list.find(a => a.status === 'IDLE') || list[0] || null;
  }

  createTaskPopup({ taskId, title, objective, role = 'DEVELOPER', executor = null, payload = {}, requiresApproval = true }) {
    const id = taskId || `task-pop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const agent = this.findAvailableAgent(role);

    if (agent) {
      agent.status = requiresApproval ? 'WAITING_APPROVAL' : 'RUNNING';
      agent.currentTask = {
        id,
        title: title || 'Tarefa do Sistema',
        startedAt: new Date().toISOString()
      };
    }

    const resolvedExecutor = executor || agent?.executor || 'ANTIGRAVITY';

    const popupEvent = {
      taskId: id,
      title: title || 'Nova Tarefa Operacional Fênix',
      objective: objective || title || 'Execução autônoma supervisionada',
      agent: {
        id: agent?.id || 'agent-auto',
        name: agent?.name || 'Pool Worker',
        role: agent?.role || role,
        emoji: agent?.emoji || '🤖',
        avatarUrl: agent?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${id}`
      },
      executor: resolvedExecutor,
      status: requiresApproval ? 'APPROVAL_PENDING' : 'RUNNING',
      requiresApproval,
      createdAt: new Date().toISOString(),
      payload
    };

    this.pendingPopups.set(id, popupEvent);

    this.emit('task_popup', popupEvent);
    try {
      globalBus.emit('agent.task.popup', popupEvent);
    } catch (_) {}

    return popupEvent;
  }

  approveTask(taskId, { feedback = null, approvedBy = 'operator' } = {}) {
    const popup = this.pendingPopups.get(taskId);
    if (!popup) {
      return { ok: false, error: `Popup/Task ${taskId} não encontrado` };
    }

    popup.status = 'APPROVED';
    popup.approvedAt = new Date().toISOString();
    popup.approvedBy = approvedBy;
    popup.feedback = feedback;

    // Transition assigned agent to RUNNING
    const agent = this.agents.get(popup.agent.id);
    if (agent) {
      agent.status = 'RUNNING';
      setTimeout(() => {
        // Simulated execution completion after approval
        agent.status = 'IDLE';
        agent.tasksCompleted += 1;
        agent.currentTask = null;
        popup.status = 'COMPLETED';
        popup.completedAt = new Date().toISOString();
        this.completedTasksHistory.push(popup);
        this.pendingPopups.delete(taskId);
        
        try {
          globalBus.emit('agent.task.completed', { taskId, agentId: agent.id });
        } catch (_) {}
      }, 3500);
    } else {
      this.pendingPopups.delete(taskId);
    }

    try {
      globalBus.emit('agent.task.approved', { taskId, approvedBy, feedback });
    } catch (_) {}

    return { ok: true, popup };
  }

  rejectTask(taskId, { reason = 'Rejeitado pelo operador', rejectedBy = 'operator' } = {}) {
    const popup = this.pendingPopups.get(taskId);
    if (!popup) {
      return { ok: false, error: `Popup/Task ${taskId} não encontrado` };
    }

    popup.status = 'REJECTED';
    popup.rejectedAt = new Date().toISOString();
    popup.rejectedBy = rejectedBy;
    popup.rejectionReason = reason;

    const agent = this.agents.get(popup.agent.id);
    if (agent) {
      agent.status = 'IDLE';
      agent.currentTask = null;
    }

    this.pendingPopups.delete(taskId);
    this.completedTasksHistory.push(popup);

    try {
      globalBus.emit('agent.task.rejected', { taskId, reason });
    } catch (_) {}

    return { ok: true, taskId, status: 'REJECTED' };
  }

  syncWithWorldState(worldEngine) {
    if (!worldEngine || !worldEngine.agents) return 0;
    let synced = 0;
    for (const [id, agent] of this.agents.entries()) {
      if (!worldEngine.agents[id]) {
        worldEngine.agents[id] = {
          id: agent.id,
          agentId: agent.id,
          name: agent.name,
          displayName: agent.name,
          role: agent.role,
          status: agent.status,
          avatar: agent.emoji,
          coordinates: agent.coordinates,
          homeCoordinates: { ...agent.coordinates },
          district: agent.district,
          efficiency: agent.efficiency,
          tasksCompleted: agent.tasksCompleted
        };
        synced++;
      } else {
        // Update live status
        worldEngine.agents[id].status = agent.status;
        worldEngine.agents[id].tasksCompleted = agent.tasksCompleted;
      }
    }
    return synced;
  }

  dispatchParallelTasks(tasksList = [], { autoScaleIfOverloaded = true } = {}) {
    if (!Array.isArray(tasksList) || tasksList.length === 0) {
      return { ok: false, error: 'Lista de tarefas vazia ou inválida' };
    }

    // Auto-scale if task demand exceeds current capacity
    if (autoScaleIfOverloaded && tasksList.length > this.agents.size) {
      const requiredSize = Math.min(this.maxSize, Math.max(this.agents.size * 2, tasksList.length));
      this.scale(requiredSize, { reason: `parallel_demand_surge (${tasksList.length} tasks)` });
    }

    const parallelDispatches = [];
    const executionId = `parallel-exec-${Date.now()}`;

    tasksList.forEach((t, idx) => {
      const taskId = t.id || `${executionId}_task_${idx + 1}`;
      const title = t.title || `Tarefa Paralela #${idx + 1}`;
      const role = t.role || 'DEVELOPER';
      const requiresApproval = t.requiresApproval !== undefined ? t.requiresApproval : false;

      const popup = this.createTaskPopup({
        taskId,
        title,
        objective: t.objective || title,
        role,
        executor: t.executor,
        requiresApproval,
        payload: {
          executionId,
          parallelIndex: idx + 1,
          totalParallel: tasksList.length,
          ...(t.payload || {})
        }
      });

      parallelDispatches.push({
        taskId,
        title,
        assignedAgent: popup.agent,
        executor: popup.executor,
        status: popup.status
      });
    });

    return {
      ok: true,
      executionId,
      parallelCount: parallelDispatches.length,
      poolSize: this.agents.size,
      concurrencyLevel: parallelDispatches.length,
      dispatches: parallelDispatches
    };
  }
}

const globalDynamicPoolManager = new DynamicPoolManager();

module.exports = {
  DynamicPoolManager,
  globalDynamicPoolManager,
  POOL_ROLES
};
