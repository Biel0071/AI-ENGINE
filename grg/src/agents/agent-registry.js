/**
 * FÊNIX OS — Agent Registry
 * Manages registration, lookup, metadata, and capability resolution for specialized agents.
 */

const { FENIX_AGENTS, AGENT_SPECIFICATIONS } = require('./agent-definitions');

class AgentRegistry {
  constructor() {
    this.agents = new Map();
    this.bootDefaults();
  }

  bootDefaults() {
    for (const [key, spec] of Object.entries(AGENT_SPECIFICATIONS)) {
      this.register(key, {
        id: key,
        ...spec,
        createdAt: new Date().toISOString()
      });
    }
  }

  register(agentId, spec) {
    if (!agentId) throw new Error('agentId is required');
    if (!spec.name) throw new Error('spec.name is required');
    const record = {
      id: agentId,
      agentId,
      name: spec.name,
      companyId: spec.companyId || null,
      projectId: spec.projectId || null,
      role: spec.role || spec.domain || 'specialist',
      personality: spec.personality || 'analytical',
      status: spec.status || 'AVAILABLE',
      availability: spec.availability || spec.status || 'AVAILABLE',
      runtimeStatus: spec.runtimeStatus || 'READY',
      currentMissionId: spec.currentMissionId || null,
      currentTaskId: spec.currentTaskId || null,
      memoryId: spec.memoryId || null,
      worldEntityId: spec.worldEntityId || null,
      allowedProjects: Array.isArray(spec.allowedProjects) ? spec.allowedProjects : ['*'],
      supervisor: spec.supervisor || 'Orchestrator',
      costLimitUsd: Number(spec.costLimitUsd || 5.0),
      model: spec.model || 'claude-3-7-sonnet',
      provider: spec.provider || 'anthropic',
      tools: Array.isArray(spec.tools) ? spec.tools : [],
      taskHistory: [],
      tasksCompleted: 0,
      tasksFailed: 0,
      successRate: null, // honest: null until first execution
      averageDurationMs: null, // honest: null until measured
      totalExecutionDurationMs: 0,
      episodicMemory: [],
      ...spec,
      updatedAt: new Date().toISOString()
    };
    this.agents.set(agentId, record);
    return record;
  }

  get(agentId) {
    return this.agents.get(agentId) || null;
  }

  list() {
    return Array.from(this.agents.values());
  }

  count() {
    return this.agents.size;
  }

  findByDomain(domain) {
    return Array.from(this.agents.values()).filter(a => a.domain === domain);
  }

  findForTask(objective = '', domain = null) {
    const text = objective.toLowerCase();
    if (domain) {
      const match = this.findByDomain(domain);
      if (match.length > 0) return match[0];
    }

    if (text.includes('css') || text.includes('component') || text.includes('react') || text.includes('frontend') || text.includes('interface')) {
      return this.get(FENIX_AGENTS.FRONTEND);
    }
    if (text.includes('api') || text.includes('controller') || text.includes('backend') || text.includes('route') || text.includes('service')) {
      return this.get(FENIX_AGENTS.BACKEND);
    }
    if (text.includes('banco') || text.includes('database') || text.includes('prisma') || text.includes('migration') || text.includes('sql')) {
      return this.get(FENIX_AGENTS.DATABASE);
    }
    if (text.includes('erro') || text.includes('bug') || text.includes('debug') || text.includes('falha') || text.includes('crash')) {
      return this.get(FENIX_AGENTS.DEBUG);
    }
    if (text.includes('teste') || text.includes('test') || text.includes('assert') || text.includes('smoke') || text.includes('e2e')) {
      return this.get(FENIX_AGENTS.TESTING);
    }
    if (text.includes('deploy') || text.includes('docker') || text.includes('vps') || text.includes('porta') || text.includes('container')) {
      return this.get(FENIX_AGENTS.DEPLOYMENT);
    }
    if (text.includes('git') || text.includes('commit') || text.includes('branch')) {
      return this.get(FENIX_AGENTS.GIT);
    }
    if (text.includes('github') || text.includes('pull request') || text.includes('pr') || text.includes('issue')) {
      return this.get(FENIX_AGENTS.GITHUB);
    }
    if (text.includes('visual') || text.includes('layout') || text.includes('cor') || text.includes('design') || text.includes('alinhamento')) {
      return this.get(FENIX_AGENTS.VISUAL);
    }

    return this.get(FENIX_AGENTS.DEVELOPER);
  }

  /**
   * Registra resultado de execução factual de uma tarefa para um agente.
   */
  recordTaskResult(agentId, { taskId, success, durationMs = 0, tokensUsed = 0, costUsd = 0 } = {}) {
    const agent = this.get(agentId);
    if (!agent) return null;

    const isSuccess = Boolean(success);
    if (isSuccess) {
      agent.tasksCompleted = (agent.tasksCompleted || 0) + 1;
    } else {
      agent.tasksFailed = (agent.tasksFailed || 0) + 1;
    }

    const totalTasks = agent.tasksCompleted + agent.tasksFailed;
    agent.successRate = totalTasks > 0 ? Number((agent.tasksCompleted / totalTasks).toFixed(2)) : null;

    const d = Number(durationMs) || 0;
    agent.totalExecutionDurationMs = (agent.totalExecutionDurationMs || 0) + d;
    agent.averageDurationMs = totalTasks > 0 ? Math.round(agent.totalExecutionDurationMs / totalTasks) : null;

    agent.taskHistory = Array.isArray(agent.taskHistory) ? agent.taskHistory : [];
    agent.taskHistory.unshift({
      taskId,
      success: isSuccess,
      durationMs: d,
      tokensUsed: Number(tokensUsed) || 0,
      costUsd: Number(costUsd) || 0,
      completedAt: new Date().toISOString()
    });
    if (agent.taskHistory.length > 20) agent.taskHistory.pop();

    agent.currentTaskId = null;
    agent.availability = 'AVAILABLE';
    agent.updatedAt = new Date().toISOString();
    return agent;
  }

  /**
   * Atualiza a disponibilidade e tarefa atual do agente.
   */
  setAvailability(agentId, availability, { taskId = null, currentMissionId = null } = {}) {
    const agent = this.get(agentId);
    if (!agent) return null;

    const validStates = ['AVAILABLE', 'WORKING', 'REVIEWING', 'BLOCKED', 'OFFLINE'];
    agent.availability = validStates.includes(availability) ? availability : 'AVAILABLE';
    agent.status = agent.availability;
    if (taskId !== undefined) agent.currentTaskId = taskId;
    if (currentMissionId !== undefined) agent.currentMissionId = currentMissionId;
    agent.updatedAt = new Date().toISOString();
    return agent;
  }

  /**
   * Seleciona o melhor agente para a tarefa baseado em competências, disponibilidade e custo.
   */
  findBestAgentForTask({ requiredSkills = [], priority = 'P3', estimatedCost = 0, risk = 'LOW', projectId = 'fenix-os' } = {}) {
    const agents = this.list();
    const skills = (requiredSkills || []).map(s => String(s).toLowerCase());

    const isAllowed = (ag) => {
      if (!ag.allowedProjects || ag.allowedProjects.includes('*')) return true;
      return ag.allowedProjects.includes(projectId);
    };

    // Filtra agentes com custo suportado e projeto permitido
    const eligible = agents.filter(ag => isAllowed(ag) && (!ag.costLimitUsd || ag.costLimitUsd >= estimatedCost));

    // Pontua cada agente de acordo com match de skill e histórico de sucesso
    const scored = eligible.map(ag => {
      let score = 0;
      const agDomain = String(ag.domain || '').toLowerCase();
      const agRole = String(ag.role || '').toLowerCase();
      const agTools = (ag.tools || []).map(t => String(t).toLowerCase());

      for (const s of skills) {
        if (agDomain.includes(s) || agRole.includes(s)) score += 10;
        if (agTools.some(t => t.includes(s))) score += 5;
      }

      // Bônus se estiver disponível agora
      if (ag.availability === 'AVAILABLE') score += 15;
      else if (ag.availability === 'BLOCKED') score -= 10;
      else if (ag.availability === 'OFFLINE') score -= 50;

      // Bônus para taxa de sucesso comprovada
      if (typeof ag.successRate === 'number') {
        score += Math.round(ag.successRate * 10);
      }

      return { agent: ag, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.length > 0 && scored[0].score > -30 ? scored[0].agent : this.get(FENIX_AGENTS.DEVELOPER);
  }

  /**
   * Avalia se um agente possui capacidade para executar a tarefa.
   * Se não possuir, retorna a lista de competências ausentes para solicitação de ajuda.
   */
  canAgentExecute(agentId, task = {}) {
    const agent = this.get(agentId);
    if (!agent) return { canExecute: false, reason: 'Agente não encontrado', missingSkills: task.requiredSkills || [] };

    if (agent.availability === 'OFFLINE' || agent.availability === 'BLOCKED') {
      return { canExecute: false, reason: `Agente indisponível (${agent.availability})`, missingSkills: [] };
    }

    const skills = (task.requiredSkills || []).map(s => String(s).toLowerCase());
    if (skills.length === 0) {
      return { canExecute: true, missingSkills: [], reason: null };
    }

    const agDomain = String(agent.domain || '').toLowerCase();
    const agRole = String(agent.role || '').toLowerCase();
    const agTools = (agent.tools || []).map(t => String(t).toLowerCase());

    const hasSkillMatch = (s) => {
      if (agDomain.includes(s) || agRole.includes(s) || agTools.some(t => t.includes(s))) return true;
      if (agent.id === 'Developer' || agent.id === 'Orchestrator' || agDomain === 'engineering') {
        const engineeringSkills = ['backend', 'frontend', 'database', 'devops', 'deployment', 'testing', 'api', 'engineering', 'git', 'fullstack'];
        if (engineeringSkills.includes(s)) return true;
      }
      return false;
    };

    const matchedSkills = skills.filter(hasSkillMatch);
    const missingSkills = skills.filter(s => !hasSkillMatch(s));

    if (task.estimatedCost && agent.costLimitUsd && task.estimatedCost > agent.costLimitUsd) {
      return { canExecute: false, reason: 'Custo estimado excede limite do agente', missingSkills: [] };
    }

    const canExecute = matchedSkills.length > 0;

    return {
      canExecute,
      missingSkills: canExecute ? [] : missingSkills,
      reason: canExecute ? null : `Agente não possui competência para executar tarefa: ${missingSkills.join(', ')}`
    };
  }

  /**
   * Retorna resumo de distribuição de carga de trabalho dos agentes.
   */
  getWorkloadDistribution() {
    const agents = this.list();
    const distribution = {
      total: agents.length,
      available: 0,
      working: 0,
      reviewing: 0,
      blocked: 0,
      offline: 0
    };

    for (const ag of agents) {
      const state = String(ag.availability || ag.status || 'AVAILABLE').toUpperCase();
      if (state === 'AVAILABLE' || state === 'IDLE' || state === 'READY') distribution.available++;
      else if (state === 'WORKING' || state === 'BUSY' || state === 'RUNNING') distribution.working++;
      else if (state === 'REVIEWING') distribution.reviewing++;
      else if (state === 'BLOCKED') distribution.blocked++;
      else if (state === 'OFFLINE') distribution.offline++;
      else distribution.available++;
    }

    return distribution;
  }

  /**
   * Retorna roster factual dos agentes formatado para telemetria de operações.
   */
  getAgentRoster() {
    return this.list().map(ag => ({
      id: ag.id,
      name: ag.name,
      role: ag.role,
      domain: ag.domain,
      model: ag.model,
      provider: ag.provider,
      availability: ag.availability || ag.status || 'AVAILABLE',
      currentTaskId: ag.currentTaskId || null,
      tasksCompleted: ag.tasksCompleted || 0,
      tasksFailed: ag.tasksFailed || 0,
      successRate: ag.successRate, // null se não houver tarefas
      averageDurationMs: ag.averageDurationMs, // null se não houver tarefas
      toolsCount: (ag.tools || []).length,
      supervisor: ag.supervisor || 'Orchestrator'
    }));
  }

  /**
   * Registra heartbeat de atividade recente de um agente.
   */
  recordHeartbeat(agentId) {
    const agent = this.get(agentId);
    if (!agent) return null;
    agent.lastHeartbeat = new Date().toISOString();
    agent.updatedAt = agent.lastHeartbeat;
    return agent;
  }

  /**
   * Recupera agentes bloqueados ou paralisados há mais de maxIdleMs sem tarefa ativa.
   */
  recoverStalledAgents(maxIdleMs = 60_000) {
    const agents = this.list();
    const nowMs = Date.now();
    const recovered = [];

    for (const ag of agents) {
      if (ag.availability === 'WORKING' || ag.status === 'WORKING') {
        const lastHb = ag.lastHeartbeat || ag.updatedAt || ag.createdAt;
        const ageMs = lastHb ? nowMs - Date.parse(lastHb) : Infinity;
        if (ageMs > maxIdleMs) {
          ag.availability = 'AVAILABLE';
          ag.status = 'AVAILABLE';
          ag.currentTaskId = null;
          ag.updatedAt = new Date().toISOString();
          recovered.push(ag.id);
        }
      }
    }
    return recovered;
  }
}

module.exports = { AgentRegistry };
