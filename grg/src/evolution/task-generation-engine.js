'use strict';
/**
 * FÊNIX OS — Level 26: Task Generation & Decomposition Engine
 * ============================================================
 * Descoberta autônoma de tarefas fundamentadas em evidências reais,
 * cálculo determinístico de prioridade/risco/custo, deduplicação estrita via problemHash
 * e decomposição dinâmica em DAG.
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');

const VALID_TASK_STATUSES = [
  'DISCOVERED',
  'PLANNED',
  'PRIORITIZED',
  'ASSIGNED',
  'EXECUTING',
  'IN_REVIEW',
  'VALIDATING',
  'COMPLETED',
  'FAILED',
  'BLOCKED',
  'AWAITING_APPROVAL',
  'REOPENED'
];

const VALID_PRIORITIES = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];

function sha256(str) {
  return crypto.createHash('sha256').update(String(str || ''), 'utf8').digest('hex');
}

function normalizeText(text) {
  return String(text || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

class TaskGenerationEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.logger = options.logger || console;
    this.eventBus = options.eventBus || null;

    this.tasks = new Map(); // taskId -> TaskRecord
    this.tasksByHash = new Map(); // problemHash -> taskId
    this.cooldownMs = Number(options.cooldownMs || 30 * 60 * 1000); // 30min para tarefas concluídas
  }

  /**
   * Calcula o hash de deduplicação determinístico para a tarefa.
   */
  computeProblemHash(input = {}) {
    const projectId = input.projectId;
    const source = input.source;
    const problem = input.problem || input.title || input.description || '';
    const targetFile = input.targetFile || (Array.isArray(input.targetFiles) ? input.targetFiles[0] : null) || '';
    const normProj = normalizeText(projectId || 'fenix-os');
    const normSrc = normalizeText(source || 'discovery');
    const normProb = normalizeText(problem || '');
    const normTarget = normalizeText(targetFile || '');
    return sha256(`${normProj}:${normSrc}:${normProb}:${normTarget}`);
  }

  /**
   * Cria e registra uma proposta estruturada de tarefa com deduplicação factual.
   * @param {object} input
   * @returns {{ task: object, deduplicated: boolean, reason?: string }}
   */
  createTask(input = {}) {
    const projectId = input.projectId || 'fenix-os';
    const source = input.source || 'discovery';
    const problem = input.problem || input.title || input.description || 'Problema não especificado';
    const targetFile = input.targetFile || (Array.isArray(input.targetFiles) ? input.targetFiles[0] : null) || '';

    const problemHash = input.problemHash || this.computeProblemHash({ projectId, source, problem, targetFile });

    // ─── VERIFICAÇÃO DE DEDUPLICAÇÃO ───────────────────────────────────────
    if (this.tasksByHash.has(problemHash)) {
      const existingId = this.tasksByHash.get(problemHash);
      const existing = this.tasks.get(existingId);
      if (existing) {
        // Se a tarefa anterior estiver ativa (não terminal), ignorar duplicata
        if (!['COMPLETED', 'FAILED'].includes(existing.status)) {
          return {
            task: existing,
            deduplicated: true,
            reason: `Tarefa equivalente já está em andamento (${existing.status}): ${existing.taskId}`
          };
        }

        // Se estiver concluída há menos tempo que o cooldown e não for regressão
        const completedAtMs = existing.completedAt ? Date.parse(existing.completedAt) : 0;
        const now = Date.now();
        if (existing.status === 'COMPLETED' && (now - completedAtMs < this.cooldownMs) && !input.isRegression) {
          return {
            task: existing,
            deduplicated: true,
            reason: `Problema já resolvido recentemente em ${existing.taskId}; em período de cooldown`
          };
        }

        // Se for uma regressão comprovada, reabrir
        if (input.isRegression) {
          existing.status = 'REOPENED';
          existing.priority = 'P1'; // Bump priority
          existing.updatedAt = new Date().toISOString();
          existing.evidence = { ...(existing.evidence || {}), regressionEvidence: input.evidence };
          this.emit('task:reopened', existing);
          return {
            task: existing,
            deduplicated: false,
            isRegression: true,
            reason: `Regressão detectada: reabrindo ${existing.taskId}`
          };
        }
      }
    }

    const taskId = input.taskId || `TASK-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const priority = VALID_PRIORITIES.includes(input.priority) ? input.priority : 'P3';
    const risk = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(input.risk) ? input.risk : 'MEDIUM';
    const impact = ['LOW', 'MEDIUM', 'HIGH'].includes(input.impact) ? input.impact : 'MEDIUM';

    const nowIso = new Date().toISOString();

    const taskRecord = {
      taskId,
      title: input.title || problem.slice(0, 100),
      description: input.description || problem,
      source,
      projectId,
      priority,
      impact,
      risk,
      estimatedCost: Number(input.estimatedCost || (priority === 'P0' ? 0.05 : 0.01)),
      estimatedTokens: Number(input.estimatedTokens || (priority === 'P0' ? 6000 : 2500)),
      requiredSkills: Array.isArray(input.requiredSkills) && input.requiredSkills.length > 0
        ? input.requiredSkills
        : this._inferRequiredSkills(problem, targetFile),
      acceptanceCriteria: Array.isArray(input.acceptanceCriteria) && input.acceptanceCriteria.length > 0
        ? input.acceptanceCriteria
        : [`O problema '${problem.slice(0, 50)}' deve ser resolvido e comprovado por testes automatizados`],
      evidence: input.evidence || { detectedAt: nowIso, source },
      dependencies: Array.isArray(input.dependencies) ? input.dependencies : [],
      status: 'DISCOVERED',
      problemHash,
      targetFiles: Array.isArray(input.targetFiles) ? input.targetFiles : (targetFile ? [targetFile] : []),
      customExecutor: typeof input.customExecutor === 'function' ? input.customExecutor : null,
      testCommand: input.testCommand || null,
      actionType: input.actionType || null,
      parentId: input.parentId || null,
      assignedAgentId: null,
      reviewerAgentId: null,
      attempts: 0,
      maxAttempts: Number(input.maxAttempts || 3),
      logs: [{ at: nowIso, step: 'DISCOVERED', detail: `Tarefa descoberta a partir de ${source}` }],
      executionResult: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      completedAt: null
    };

    this.tasks.set(taskId, taskRecord);
    this.tasksByHash.set(problemHash, taskId);

    this.emit('task:created', taskRecord);
    if (this.eventBus) {
      this.eventBus.emit('autonomous.task.created', taskRecord);
    }

    return { task: taskRecord, deduplicated: false };
  }

  /**
   * Decompõe dinamicamente uma tarefa complexa em um DAG de subtarefas ordenadas.
   */
  decomposeIntoDag(parentTask, subtaskSpecs = []) {
    const parentId = parentTask.taskId || parentTask.id;
    const parent = this.tasks.get(parentId) || parentTask;
    const createdSubtasks = [];

    let prevSubtaskId = null;

    for (let i = 0; i < subtaskSpecs.length; i++) {
      const spec = subtaskSpecs[i];
      const subtaskDependencies = [parentId];
      if (spec.sequential !== false && prevSubtaskId) {
        subtaskDependencies.push(prevSubtaskId);
      }
      if (Array.isArray(spec.dependencies)) {
        subtaskDependencies.push(...spec.dependencies);
      }

      const res = this.createTask({
        projectId: parent.projectId,
        source: parent.source || 'decomposition',
        title: spec.title || `${parent.title} [Etapa ${i + 1}]`,
        description: spec.description || spec.title,
        problem: spec.problem || spec.title,
        targetFiles: spec.targetFiles || parent.targetFiles,
        priority: spec.priority || parent.priority,
        risk: spec.risk || parent.risk,
        impact: spec.impact || parent.impact,
        requiredSkills: spec.requiredSkills || parent.requiredSkills,
        acceptanceCriteria: spec.acceptanceCriteria || [`Etapa ${i + 1} concluída com testes`],
        dependencies: Array.from(new Set(subtaskDependencies)),
        evidence: { decomposedFrom: parentId, stepIndex: i },
        parentId: parentId
      });

      createdSubtasks.push(res.task);
      prevSubtaskId = res.task.taskId;
    }

    parent.status = 'PLANNED';
    parent.subtaskIds = createdSubtasks.map(s => s.taskId);
    parent.updatedAt = new Date().toISOString();

    const dag = {
      rootTaskId: parentId,
      nodes: [parent, ...createdSubtasks],
      edges: createdSubtasks.map(s => ({
        from: s.dependencies[0],
        to: s.taskId
      }))
    };

    this.emit('dag:created', dag);
    return dag;
  }

  /**
   * Retorna a estrutura DAG de uma árvore de tarefas.
   */
  getDag(rootTaskId = null) {
    const parent = rootTaskId
      ? this.tasks.get(rootTaskId)
      : Array.from(this.tasks.values()).find(t => t.subtaskIds && t.subtaskIds.length > 0);
    if (!parent) return { nodes: [], edges: [] };
    const subtasks = (parent.subtaskIds || []).map(id => this.tasks.get(id)).filter(Boolean);
    return {
      rootTaskId: parent.taskId,
      nodes: [parent, ...subtasks],
      edges: subtasks.map(s => ({
        from: (s.dependencies && s.dependencies[0]) || parent.taskId,
        to: s.taskId
      }))
    };
  }

  /**
   * Atualiza o estado da tarefa garantindo transições válidas.
   */
  updateTaskStatus(taskId, newStatus, detail = {}) {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    if (!VALID_TASK_STATUSES.includes(newStatus)) {
      throw new Error(`Estado de tarefa inválido: ${newStatus}`);
    }

    const prevStatus = task.status;
    task.status = newStatus;
    task.updatedAt = new Date().toISOString();

    if (newStatus === 'COMPLETED') {
      task.completedAt = task.updatedAt;
      this._checkParentCompletion(task);
      this._checkBlockedTasks(taskId);
    }

    if (detail.assignedAgentId) task.assignedAgentId = detail.assignedAgentId;
    if (detail.reviewerAgentId) task.reviewerAgentId = detail.reviewerAgentId;
    if (detail.executionResult) task.executionResult = detail.executionResult;

    task.logs.unshift({
      at: task.updatedAt,
      from: prevStatus,
      to: newStatus,
      detail: detail.message || detail.thought || `Transição de ${prevStatus} para ${newStatus}`
    });
    if (task.logs.length > 30) task.logs.pop();

    this.emit('task:transition', { taskId, prevStatus, newStatus, task });
    if (this.eventBus) {
      this.eventBus.emit('autonomous.task.transition', { taskId, prevStatus, newStatus });
    }

    return task;
  }

  /**
   * Verifica se tarefas no estado BLOCKED que dependiam da tarefa concluída agora têm todas
   * as suas dependências resolvidas e podem ser liberadas para PRIORITIZED.
   */
  _checkBlockedTasks(completedTaskId) {
    for (const task of this.tasks.values()) {
      if (task.status === 'BLOCKED' && Array.isArray(task.dependencies) && task.dependencies.includes(completedTaskId)) {
        const allDepsDone = task.dependencies.every(depId => {
          const dep = this.tasks.get(depId);
          return dep && dep.status === 'COMPLETED';
        });
        if (allDepsDone) {
          this.updateTaskStatus(task.taskId, 'PRIORITIZED', {
            message: `Desbloqueada: todas as dependências (${task.dependencies.join(', ')}) foram concluídas com sucesso`
          });
        }
      }
    }
  }

  /**
   * Verifica se todas as subtarefas de um pai foram concluídas e, em caso positivo, conclui o pai.
   */
  _checkParentCompletion(subtask) {
    const parentId = subtask.parentId || subtask.evidence?.decomposedFrom;
    if (!parentId) return;
    const parent = this.tasks.get(parentId);
    if (!parent || !Array.isArray(parent.subtaskIds) || parent.subtaskIds.length === 0) return;
    if (parent.status === 'COMPLETED') return;

    const allCompleted = parent.subtaskIds.every(id => {
      const s = this.tasks.get(id);
      return s && s.status === 'COMPLETED';
    });

    if (allCompleted) {
      this.updateTaskStatus(parentId, 'COMPLETED', {
        message: 'Todas as subtarefas decompostas do DAG foram concluídas com sucesso'
      });
    }
  }

  /**
   * Retorna tarefas elegíveis para execução (sem dependências pendentes).
   */
  getEligibleTasks() {
    const list = Array.from(this.tasks.values());
    return list.filter(task => {
      if (!['DISCOVERED', 'PLANNED', 'PRIORITIZED', 'REOPENED'].includes(task.status)) {
        return false;
      }

      // Se for uma tarefa pai composta com subtarefas ativas, ela não é executada diretamente como folha;
      // ela aguarda que suas subtarefas sejam concluídas.
      if (task.subtaskIds && task.subtaskIds.length > 0) {
        const allSubtasksDone = task.subtaskIds.every(subId => {
          const sub = this.tasks.get(subId);
          return sub && sub.status === 'COMPLETED';
        });
        if (!allSubtasksDone) return false;
      }

      // Verificar se todas as dependências estão concluídas
      if (task.dependencies && task.dependencies.length > 0) {
        const allDepsCompleted = task.dependencies.every(depId => {
          // Se a dependência for a tarefa pai de onde a subtarefa foi decomposta:
          // A tarefa pai já atingiu o estado PLANNED / decomposto, liberando as subtarefas
          if (depId === task.parentId || (task.evidence && task.evidence.decomposedFrom === depId)) {
            const parentDep = this.tasks.get(depId);
            return parentDep && ['PLANNED', 'PRIORITIZED', 'EXECUTING', 'IN_PROGRESS', 'COMPLETED'].includes(parentDep.status);
          }
          const dep = this.tasks.get(depId);
          return dep && dep.status === 'COMPLETED';
        });
        if (!allDepsCompleted) return false;
      }
      return true;
    }).sort((a, b) => {
      // Ordenação prioritária multi-critério:
      // 1. Prioridade P0 > P1 > ... > P7
      const pOrder = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4, P5: 5, P6: 6, P7: 7 };
      const pDiff = (pOrder[a.priority] ?? 9) - (pOrder[b.priority] ?? 9);
      if (pDiff !== 0) return pDiff;

      // 2. Impacto: HIGH > MEDIUM > LOW
      const impactOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      const iDiff = (impactOrder[a.impact] ?? 3) - (impactOrder[b.impact] ?? 3);
      if (iDiff !== 0) return iDiff;

      // 3. Risco: CRITICAL > HIGH > MEDIUM > LOW
      const riskOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const rDiff = (riskOrder[a.risk] ?? 4) - (riskOrder[b.risk] ?? 4);
      if (rDiff !== 0) return rDiff;

      // 4. Data de criação (FIFO)
      return Date.parse(a.createdAt || 0) - Date.parse(b.createdAt || 0);
    });
  }

  /**
   * Detecta se existe ciclo de dependências a partir de uma tarefa.
   */
  hasCycle(taskId, visited = new Set(), recStack = new Set()) {
    visited.add(taskId);
    recStack.add(taskId);
    const task = this.tasks.get(taskId);
    if (task && Array.isArray(task.dependencies)) {
      for (const depId of task.dependencies) {
        if (!visited.has(depId)) {
          if (this.hasCycle(depId, visited, recStack)) return true;
        } else if (recStack.has(depId)) {
          return true;
        }
      }
    }
    recStack.delete(taskId);
    return false;
  }

  /**
   * Infere competências requeridas com base no problema ou arquivos.
   */
  _inferRequiredSkills(problemText, targetFile) {
    const text = `${problemText} ${targetFile}`.toLowerCase();
    const skills = new Set();

    if (text.includes('html') || text.includes('css') || text.includes('ui') || text.includes('form') || text.includes('button') || text.includes('tela') || text.includes('component')) {
      skills.add('frontend');
    }
    if (text.includes('api') || text.includes('route') || text.includes('server') || text.includes('backend') || text.includes('endpoint')) {
      skills.add('backend');
    }
    if (text.includes('db') || text.includes('database') || text.includes('sql') || text.includes('sqlite') || text.includes('postgres') || text.includes('migration')) {
      skills.add('database');
    }
    if (text.includes('test') || text.includes('assert') || text.includes('qa') || text.includes('smoke') || text.includes('coverage')) {
      skills.add('testing');
    }
    if (text.includes('auth') || text.includes('permission') || text.includes('security') || text.includes('token') || text.includes('secret')) {
      skills.add('security');
    }

    if (skills.size === 0) {
      skills.add('engineering');
    }
    return Array.from(skills);
  }

  getTask(taskId) {
    return this.tasks.get(taskId) || null;
  }

  listTasks(filters = {}) {
    let result = Array.from(this.tasks.values());
    if (filters.projectId) {
      result = result.filter(t => t.projectId === filters.projectId);
    }
    if (filters.status) {
      result = result.filter(t => t.status === filters.status);
    }
    if (filters.priority) {
      result = result.filter(t => t.priority === filters.priority);
    }
    if (filters.source) {
      result = result.filter(t => t.source === filters.source);
    }
    return result;
  }

  getQueueSnapshot() {
    const all = Array.from(this.tasks.values());
    const counts = {
      TOTAL: all.length,
      DISCOVERED: 0,
      PRIORITIZED: 0,
      ASSIGNED: 0,
      EXECUTING: 0,
      IN_REVIEW: 0,
      AWAITING_APPROVAL: 0,
      VALIDATING: 0,
      COMPLETED: 0,
      FAILED: 0,
      BLOCKED: 0,
      REOPENED: 0
    };
    for (const t of all) {
      if (counts[t.status] !== undefined) counts[t.status]++;
    }
    return {
      total: all.length,
      counts,
      backlog: all.filter(t => ['DISCOVERED', 'PLANNED', 'PRIORITIZED', 'REOPENED'].includes(t.status)),
      executing: all.filter(t => t.status === 'EXECUTING'),
      reviewing: all.filter(t => t.status === 'IN_REVIEW'),
      awaitingApproval: all.filter(t => t.status === 'AWAITING_APPROVAL'),
      completed: all.filter(t => t.status === 'COMPLETED'),
      failed: all.filter(t => t.status === 'FAILED')
    };
  }
}

module.exports = {
  TaskGenerationEngine,
  VALID_TASK_STATUSES,
  VALID_PRIORITIES
};
