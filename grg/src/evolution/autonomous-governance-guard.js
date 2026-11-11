'use strict';
/**
 * FÊNIX OS — Level 26: Autonomous Governance & Safety Guard
 * ========================================================
 * Governança, limites de execução, orçamento de tokens/custo,
 * circuit breaker para provedores externos e portão de aprovação humana (Human Approval Gate).
 */

const CRITICAL_ACTIONS = Object.freeze(new Set([
  'DEPLOY_PRODUCTION',
  'DELETE_DATA',
  'DESTRUCTIVE_MIGRATION',
  'ROTATE_CREDENTIALS',
  'CRITICAL_INFRASTRUCTURE_CHANGE',
  'FINANCIAL_OPERATION',
  'IRREVERSIBLE_CHANGE'
]));

class AutonomousGovernanceGuard {
  constructor(options = {}) {
    this.maxConcurrency = Number(options.maxConcurrency || 2);
    this.maxTokensPerCycle = Number(options.maxTokensPerCycle || 32000);
    this.maxTokensPerProject = Number(options.maxTokensPerProject || 250000);
    this.maxTokensPerPeriod = Number(options.maxTokensPerPeriod || 500000);
    this.maxCostUsdPerPeriod = Number(options.maxCostUsdPerPeriod || 10.0);
    this.maxRetries = Number(options.maxRetries || 3);
    this.timeoutMs = Number(options.timeoutMs || 40000);
    this.circuitBreakerThreshold = Number(options.circuitBreakerThreshold || 3);

    this.criticalActions = new Set([...CRITICAL_ACTIONS, ...(options.criticalActions || [])]);

    // Orçamento e consumo factual
    this.usage = {
      totalTokens: 0,
      totalCostUsd: 0,
      totalApiCalls: 0,
      projectUsage: {}, // projectId -> { tokens, costUsd, tasksCount }
      providerUsage: {
        'api-platform-vps': { calls: 0, tokensUsed: 0, costUsd: 0, status: 'AVAILABLE' },
        'antigravity': { calls: 0, tokensUsed: 0, costUsd: 0, status: 'AVAILABLE' },
        'codex': { calls: 0, tokensUsed: 0, costUsd: 0, status: 'AVAILABLE' },
        'ollama-local': { calls: 0, tokensUsed: 0, costUsd: 0, status: 'AVAILABLE' }
      },
      periodStartedAt: new Date().toISOString()
    };

    // Circuit breakers por provedor
    this.circuitBreakers = new Map(); // provider -> { failuresCount: 0, tripped: false, trippedAt: null, reason: null }

    // Fila de aprovações humanas
    this.pendingApprovals = new Map(); // taskId -> approvalRecord
    this.approvalHistory = [];
  }

  /**
   * Avalia se uma tarefa exige aprovação humana obrigatória antes da execução.
   * @param {object} task
   * @returns {{ requiresApproval: boolean, reasons: string[], approved?: boolean }}
   */
  evaluateHumanApproval(task = {}) {
    const taskId = task.taskId || task.id;

    // Se a tarefa já foi aprovada pelo operador, autoriza execução imediata
    if (this.isApproved(taskId) || task.approved === true) {
      return {
        requiresApproval: false,
        approved: true,
        reasons: [],
        approvalId: taskId || null
      };
    }

    const reasons = [];
    const action = String(task.action || task.type || task.actionType || '').toUpperCase();
    const risk = String(task.risk || 'LOW').toUpperCase();

    if (this.criticalActions.has(action)) {
      reasons.push(`Ação crítica '${action}' requer autorização do operador`);
    }
    if (task.destructive === true || task.isDestructive === true) {
      reasons.push('Operação destrutiva ou de exclusão detectada');
    }
    if (task.approvalsRequired === true) {
      reasons.push('Marcador explícito de aprovação exigida');
    }
    if (risk === 'CRITICAL' || risk === 'HIGH') {
      reasons.push(`Nível de risco ${risk} exige aprovação do operador`);
    }

    // Alvos sensíveis no disco
    const targetFiles = Array.isArray(task.targetFiles) ? task.targetFiles : (task.targetFile ? [task.targetFile] : []);
    for (const f of targetFiles) {
      const lower = String(f).toLowerCase();
      if (lower.includes('.env') || lower.includes('secret') || lower.includes('credential') || lower.includes('id_rsa')) {
        reasons.push(`Edição em arquivo sensível '${f}' bloqueada para aprovação humana`);
      }
    }

    const requiresApproval = reasons.length > 0;
    if (requiresApproval && taskId) {
      this.pendingApprovals.set(taskId, {
        taskId,
        taskTitle: task.title || task.description || taskId,
        projectId: task.projectId || 'fenix-os',
        risk: task.risk || 'HIGH',
        reasons,
        createdAt: new Date().toISOString(),
        status: 'PENDING'
      });
    }

    return {
      requiresApproval,
      reasons,
      approvalId: taskId || null
    };
  }

  /**
   * Aprova uma tarefa pendente pelo operador humano.
   */
  approveTask(taskId, operatorId = 'operator', notes = '') {
    let record = this.pendingApprovals.get(taskId);
    if (!record) {
      const existing = this.approvalHistory.find(h => h.taskId === taskId);
      if (existing && existing.status === 'APPROVED') {
        return { ok: true, approval: existing };
      }
      record = {
        taskId,
        taskTitle: taskId,
        projectId: 'fenix-os',
        risk: 'HIGH',
        reasons: ['Aprovação direta pelo operador'],
        createdAt: new Date().toISOString()
      };
    }
    record.status = 'APPROVED';
    record.approvedBy = operatorId;
    record.approvedAt = new Date().toISOString();
    record.notes = notes;
    this.pendingApprovals.delete(taskId);
    this.approvalHistory.unshift(record);
    if (this.approvalHistory.length > 50) this.approvalHistory.pop();
    return { ok: true, approval: record };
  }

  /**
   * Rejeita uma tarefa pendente pelo operador humano.
   */
  rejectTask(taskId, operatorId = 'operator', reason = '') {
    const record = this.pendingApprovals.get(taskId) || {
      taskId,
      taskTitle: taskId,
      projectId: 'fenix-os',
      risk: 'HIGH',
      reasons: ['Rejeição pelo operador'],
      createdAt: new Date().toISOString()
    };
    record.status = 'REJECTED';
    record.rejectedBy = operatorId;
    record.rejectedAt = new Date().toISOString();
    record.reason = reason;
    this.pendingApprovals.delete(taskId);
    this.approvalHistory.unshift(record);
    if (this.approvalHistory.length > 50) this.approvalHistory.pop();
    return { ok: true, rejection: record };
  }

  /**
   * Verifica se a tarefa foi formalmente aprovada.
   */
  isApproved(taskId) {
    if (!taskId) return false;
    const history = this.approvalHistory.find(h => h.taskId === taskId);
    return Boolean(history && history.status === 'APPROVED');
  }

  /**
   * Verifica se a tarefa foi formalmente rejeitada.
   */
  isRejected(taskId) {
    if (!taskId) return false;
    const history = this.approvalHistory.find(h => h.taskId === taskId);
    return Boolean(history && history.status === 'REJECTED');
  }

  /**
   * Verifica se uma tarefa cabe no orçamento do período e do projeto.
   */
  checkBudget(task = {}) {
    const estimatedTokens = Number(task.estimatedTokens || 1200);
    const estimatedCostUsd = Number(task.estimatedCost || 0.005);
    const projectId = task.projectId || 'fenix-os';

    // 1. Orçamento total do período
    if (this.usage.totalTokens + estimatedTokens > this.maxTokensPerPeriod) {
      return {
        allowed: false,
        reason: `Orçamento de tokens do período excedido (${this.usage.totalTokens} / ${this.maxTokensPerPeriod})`
      };
    }
    if (this.usage.totalCostUsd + estimatedCostUsd > this.maxCostUsdPerPeriod) {
      return {
        allowed: false,
        reason: `Orçamento de custo em USD excedido ($${this.usage.totalCostUsd.toFixed(4)} / $${this.maxCostUsdPerPeriod.toFixed(2)})`
      };
    }

    // 2. Orçamento por projeto
    const proj = this.usage.projectUsage[projectId] || { tokens: 0, costUsd: 0, tasksCount: 0 };
    if (proj.tokens + estimatedTokens > this.maxTokensPerProject) {
      return {
        allowed: false,
        reason: `Orçamento do projeto '${projectId}' excedido (${proj.tokens} / ${this.maxTokensPerProject} tokens)`
      };
    }

    return { allowed: true };
  }

  /**
   * Registra consumo real de tokens e custos após execução de tarefa.
   */
  recordTaskConsumption(projectId, provider, { tokensUsed = 0, costUsd = 0 } = {}) {
    const t = Number(tokensUsed) || 0;
    const c = Number(costUsd) || 0;

    this.usage.totalTokens += t;
    this.usage.totalCostUsd += c;
    this.usage.totalApiCalls += 1;

    if (!this.usage.projectUsage[projectId]) {
      this.usage.projectUsage[projectId] = { tokens: 0, costUsd: 0, tasksCount: 0 };
    }
    this.usage.projectUsage[projectId].tokens += t;
    this.usage.projectUsage[projectId].costUsd += c;
    this.usage.projectUsage[projectId].tasksCount += 1;

    if (!this.usage.providerUsage[provider]) {
      this.usage.providerUsage[provider] = { calls: 0, tokensUsed: 0, costUsd: 0, status: 'AVAILABLE' };
    }
    this.usage.providerUsage[provider].calls += 1;
    this.usage.providerUsage[provider].tokensUsed += t;
    this.usage.providerUsage[provider].costUsd += c;
  }

  /**
   * Registra falha de um provedor e aciona circuit breaker se exceder limite.
   */
  recordProviderFailure(provider, errorMsg = '') {
    const p = String(provider || 'unknown').toLowerCase();
    const entry = this.circuitBreakers.get(p) || { failuresCount: 0, tripped: false, trippedAt: null, reason: null };
    entry.failuresCount += 1;

    if (entry.failuresCount >= this.circuitBreakerThreshold) {
      entry.tripped = true;
      entry.trippedAt = new Date().toISOString();
      entry.reason = `Circuit Breaker acionado: ${entry.failuresCount} falhas consecutivas (${errorMsg})`;
      if (this.usage.providerUsage[p]) {
        this.usage.providerUsage[p].status = 'CIRCUIT_BREAKER_OPEN';
      }
    }
    this.circuitBreakers.set(p, entry);
    return entry;
  }

  /**
   * Reseta o circuit breaker quando uma chamada ao provedor obtém sucesso.
   */
  recordProviderSuccess(provider) {
    const p = String(provider || 'unknown').toLowerCase();
    const entry = this.circuitBreakers.get(p);
    if (entry) {
      entry.failuresCount = 0;
      entry.tripped = false;
      entry.trippedAt = null;
      entry.reason = null;
      if (this.usage.providerUsage[p]) {
        this.usage.providerUsage[p].status = 'AVAILABLE';
      }
    }
  }

  /**
   * Verifica se o circuit breaker para o provedor está aberto (bloqueado).
   */
  isProviderBlocked(provider) {
    const p = String(provider || 'unknown').toLowerCase();
    const entry = this.circuitBreakers.get(p);
    return Boolean(entry?.tripped);
  }

  /**
   * Retorna telemetria consolidada de governança.
   */
  getGovernanceStatus() {
    return {
      concurrency: {
        max: this.maxConcurrency,
      },
      budgets: {
        maxTokensPerPeriod: this.maxTokensPerPeriod,
        tokensUsed: this.usage.totalTokens,
        tokensAvailable: Math.max(0, this.maxTokensPerPeriod - this.usage.totalTokens),
        maxCostUsdPerPeriod: this.maxCostUsdPerPeriod,
        costUsdUsed: this.usage.totalCostUsd,
        costUsdAvailable: Math.max(0, this.maxCostUsdPerPeriod - this.usage.totalCostUsd),
      },
      circuitBreakers: Object.fromEntries(this.circuitBreakers.entries()),
      pendingApprovalsCount: this.pendingApprovals.size,
      pendingApprovals: Array.from(this.pendingApprovals.values()),
      recentApprovals: this.approvalHistory.slice(0, 10),
      usage: this.usage
    };
  }
}

module.exports = {
  AutonomousGovernanceGuard,
  CRITICAL_ACTIONS
};
