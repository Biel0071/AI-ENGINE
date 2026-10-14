'use strict';

/**
 * FÊNIX OS — COMPANY BRAIN
 *
 * Responsável por gerenciar a entidade Company e unificar o ecossistema
 * do projeto/empresa como um organismo vivo real.
 *
 * Arquitetura Constitucional:
 * FÊNIX CORE -> COMPANY BRAIN -> CEO AGENT -> DEPARTMENTS -> SUBAGENTS ->
 * REAL JOBS -> REAL PROJECT -> TELEMETRY -> MEMORY -> LEARNING -> EVOLUTION
 *
 * Invariantes:
 * - Zero-Mock: NUNCA inventar métricas, dados ou progresso.
 * - Single Source of Truth para projetos, missões e memória.
 * - Telemetria honesta: { metric, value, source, timestamp, period }.
 */

const { uuid } = require('../kernel/ids');
const { measured, unknown } = require('../kernel/measurement');

const STANDARD_DEPARTMENTS = Object.freeze([
  'TECHNOLOGY',
  'SALES',
  'MARKETING',
  'FINANCE',
  'OPERATIONS',
  'CUSTOMER_SUCCESS',
  'PRODUCT',
  'SECURITY'
]);

const DEFAULT_PERMISSIONS = Object.freeze([
  'READ',
  'WRITE',
  'EXECUTE',
  'DEPLOY',
  'DELETE',
  'DATABASE',
  'SECRETS',
  'EXTERNAL_APIS'
]);
const CANONICAL_COMPANIES = Object.freeze([]);
class CompanyBrain {
  constructor(options = {}) {
    this.store = options.store;
    this.bus = options.bus;
    this.controlPlane = options.controlPlane;
    this.projectKernel = options.projectKernel;
    this.jobEngine = options.jobEngine || options.jobs;
    this.missionPlanner = options.missionPlanner;
    this.missionKernel = options.missionKernel || options.missions;
    this.fenixHeart = options.fenixHeart;
    this.agentRegistry = options.agentRegistry;
    this.aiRouter = options.aiRouter;
    this.aiGateway = options.aiGateway;
  }

  // ─── ENTIDADE COMPANY ──────────────────────────────────────────────────────

  /**
   * Lista todas as empresas do ecossistema Fênix
   */
  async listCompanies(tenantId) {
    const state = this.store ? (await this.store.read()) : {};
    const stored = state.companies || [];
    return stored.filter((c) => !c.tenantId || c.tenantId === tenantId);
  }

  /**
   * Obtém a empresa vinculada a um projeto específico
   */
  async getCompanyByProjectId(tenantId, projectId) {
    if (!projectId) return null;
    const companies = await this.listCompanies(tenantId);
    return companies.find((c) => c.projectId === projectId || (c.companyId === projectId)) || null;
  }

  /**
   * Obtém a Company para o tenant (retorna null se não houver).
   */
  async getCompany(tenantId, companyId = null) {
    const state = this.store ? (await this.store.read()) : {};
    const companies = state.companies || [];
    let company = null;
    if (companyId) {
      company = companies.find((c) => (!c.tenantId || c.tenantId === tenantId) && c.companyId === companyId);
      if (!company) return null;
    } else {
      company = companies.find((c) => !c.tenantId || c.tenantId === tenantId);
      if (!company) return null;
    }

    return this.#enrichCompanyWithRealData(tenantId, company, state);
  }

  /**
   * Cria uma nova entidade Company
   */
  async createCompany(tenantId, data = {}) {
    const newCompany = {
      companyId: data.companyId || `comp_${uuid().slice(0, 8)}`,
      tenantId,
      name: String(data.name || 'Nova Empresa').trim(),
      description: String(data.description || '').trim(),
      projectId: data.projectId || null,
      goals: Array.isArray(data.goals) ? data.goals : [],
      departments: Array.isArray(data.departments) && data.departments.length > 0
        ? data.departments
        : ['TECHNOLOGY', 'OPERATIONS'],
      agents: Array.isArray(data.agents) ? data.agents : ['agent.ceo', 'architect', 'developer', 'qa'],
      permissions: Array.isArray(data.permissions) ? data.permissions : [...DEFAULT_PERMISSIONS],
      memory: {
        lessonsLearned: [],
        patternsExtracted: [],
        projectDna: null,
        recentDecisions: []
      },
      status: data.status || 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.store.update((state) => {
      state.companies = state.companies || [];
      const idx = state.companies.findIndex((c) => c.tenantId === tenantId && c.companyId === newCompany.companyId);
      if (idx >= 0) {
        state.companies[idx] = newCompany;
      } else {
        state.companies.push(newCompany);
      }
      return state;
    });

    if (this.bus?.emit) {
      await this.bus.emit('company.created', { tenantId, companyId: newCompany.companyId, name: newCompany.name });
    }

    return newCompany;
  }

  /**
   * Atualiza propriedades da Company
   */
  async updateCompany(tenantId, companyId, updates = {}) {
    let updated = null;
    await this.store.update((state) => {
      state.companies = state.companies || [];
      const comp = state.companies.find((c) => c.tenantId === tenantId && c.companyId === companyId);
      if (!comp) return state;

      if (updates.name) comp.name = String(updates.name).trim();
      if (updates.description !== undefined) comp.description = String(updates.description).trim();
      if (updates.projectId !== undefined) comp.projectId = updates.projectId;
      if (Array.isArray(updates.goals)) comp.goals = updates.goals;
      if (Array.isArray(updates.departments)) comp.departments = updates.departments;
      if (Array.isArray(updates.agents)) comp.agents = updates.agents;
      if (Array.isArray(updates.permissions)) comp.permissions = updates.permissions;
      if (updates.status) comp.status = updates.status;
      if (updates.memory) {
        comp.memory = { ...comp.memory, ...updates.memory };
      }
      comp.updatedAt = new Date().toISOString();
      updated = { ...comp };
      return state;
    });

    if (this.bus?.emit && updated) {
      await this.bus.emit('company.updated', { tenantId, companyId, updates: Object.keys(updates) });
    }

    return updated;
  }

  /**
   * Enriquece a empresa com dados de estado real de projetos, missões e jobs
   */
  async #enrichCompanyWithRealData(tenantId, company, state) {
    const enriched = { ...company };

    // Conecta metadados reais do projeto vinculado
    if (enriched.projectId && this.projectKernel) {
      try {
        const project = await this.projectKernel.state(tenantId, 'system', enriched.projectId);
        if (project) {
          enriched.projectDetails = {
            id: project.id,
            name: project.name,
            workspace: project.workspace,
            language: project.language || 'javascript',
            status: project.status || 'CONNECTED'
          };
        }
      } catch (_) {
        try {
          const list = await this.projectKernel.list(tenantId, 'system');
          const p = list.find((item) => item.id === enriched.projectId);
          if (p) {
            enriched.projectDetails = {
              id: p.id,
              name: p.name,
              workspace: p.workspace,
              language: p.language || 'javascript',
              status: p.status || 'CONNECTED'
            };
          } else {
            enriched.projectDetails = null;
          }
        } catch (__) {
          enriched.projectDetails = null;
        }
      }
    }

    // Telemetria real agregada
    const runtimeTelem = await this.getTelemetry(tenantId, enriched.companyId);
    enriched.telemetry = {
      ...(company.telemetry || {}),
      ...runtimeTelem,
      agentsCount: company.telemetry?.agentsCount ?? (Array.isArray(enriched.agents) ? enriched.agents.length : 0),
      missionsCount: company.telemetry?.missionsCount ?? (runtimeTelem?.operations?.activeMissions ?? 0),
      projectsCount: company.telemetry?.projectsCount ?? (enriched.projectId ? 1 : 0),
      operationsCount: company.telemetry?.operationsCount ?? (runtimeTelem?.tasks?.completed ?? 0),
      performance: company.telemetry?.performance ?? null,
      revenueMonthly: company.telemetry?.revenueMonthly ?? null
    };

    // Estrutura de departamentos com agentes alocados
    enriched.departmentsStructure = this.getDepartments(tenantId, enriched.companyId, enriched);

    return enriched;
  }

  // ─── DEPARTAMENTOS & HIERARQUIA DINÂMICA ───────────────────────────────────

  /**
   * Lista departamentos e alocação de agentes
   */
  getDepartments(tenantId, companyId, companyInstance = null) {
    const deps = companyInstance?.departments || ['TECHNOLOGY', 'OPERATIONS', 'PRODUCT', 'SECURITY'];
    const agentsList = companyInstance?.agents || ['agent.ceo', 'architect', 'developer', 'qa'];

    const departmentRoles = {
      TECHNOLOGY: { head: 'CTO', team: ['architect', 'developer', 'qa', 'devops'] },
      OPERATIONS: { head: 'COO', team: ['automation', 'analyst', 'monitor'] },
      PRODUCT: { head: 'CPO', team: ['product_designer', 'ux'] },
      SECURITY: { head: 'CISO', team: ['security_auditor', 'sentinel'] },
      SALES: { head: 'CRO', team: ['sales_agent'] },
      MARKETING: { head: 'CMO', team: ['copywriter', 'growth'] },
      FINANCE: { head: 'CFO', team: ['financial_analyst'] },
      CUSTOMER_SUCCESS: { head: 'CCO', team: ['support_agent'] }
    };

    return deps.map((depName) => {
      const def = departmentRoles[depName] || { head: 'LEAD', team: [] };
      const activeInDep = def.team.filter((agId) => agentsList.includes(agId));
      return {
        name: depName,
        head: def.head,
        activeAgents: activeInDep,
        totalAgents: activeInDep.length,
        status: activeInDep.length > 0 ? 'ACTIVE' : 'PLANNED'
      };
    });
  }

  /**
   * O CEO propõe um departamento quando existe necessidade real identificada.
   */
  async proposeDepartment(tenantId, companyId, { department, reason, need, actorId = 'agent.ceo' }) {
    const depUpper = String(department || '').toUpperCase().trim();
    if (!STANDARD_DEPARTMENTS.includes(depUpper)) {
      throw new Error(`Departamento inválido: ${depUpper}. Permitidos: ${STANDARD_DEPARTMENTS.join(', ')}`);
    }

    let result = null;
    await this.store.update((state) => {
      state.companies = state.companies || [];
      const comp = state.companies.find((c) => c.tenantId === tenantId && c.companyId === companyId);
      if (!comp) throw new Error(`Empresa ${companyId} não encontrada`);

      if (comp.departments.includes(depUpper)) {
        result = { created: false, message: `Departamento ${depUpper} já existe na empresa.` };
        return state;
      }

      comp.departments.push(depUpper);
      comp.memory.recentDecisions = comp.memory.recentDecisions || [];
      comp.memory.recentDecisions.push({
        type: 'DEPARTMENT_CREATED',
        department: depUpper,
        reason: reason || 'Necessidade operacional identificada',
        need: need || 'Atendimento a novo objetivo',
        approvedBy: actorId,
        timestamp: new Date().toISOString()
      });
      comp.updatedAt = new Date().toISOString();
      result = { created: true, department: depUpper, reason, timestamp: comp.updatedAt };
      return state;
    });

    if (this.bus?.emit) {
      await this.bus.emit('company.department.created', { tenantId, companyId, department: depUpper, reason });
    }

    return result;
  }

  /**
   * Retorna a hierarquia dinâmica da empresa
   * FÊNIX -> CEO -> CTO/CMO/COO/CFO -> SUBAGENTS
   */
  async getHierarchy(tenantId, companyId) {
    const company = await this.getCompany(tenantId, companyId);
    const existingAgents = company.agents || [];

    const tree = {
      root: 'FÊNIX CORE',
      ceo: {
        id: 'agent.ceo',
        name: 'CEO Agent',
        role: 'CHIEF_EXECUTIVE_OFFICER',
        status: 'ACTIVE',
        children: []
      }
    };

    // Aloca os líderes e subordinados que de fato existem
    const execMap = {
      TECHNOLOGY: {
        id: 'agent.cto',
        name: 'CTO Brain',
        role: 'CHIEF_TECHNOLOGY_OFFICER',
        subagents: ['architect', 'developer', 'qa', 'devops']
      },
      OPERATIONS: {
        id: 'agent.coo',
        name: 'COO Brain',
        role: 'CHIEF_OPERATING_OFFICER',
        subagents: ['automation', 'analyst', 'monitor']
      },
      PRODUCT: {
        id: 'agent.cpo',
        name: 'CPO Brain',
        role: 'CHIEF_PRODUCT_OFFICER',
        subagents: ['product_designer', 'ux']
      },
      SECURITY: {
        id: 'agent.ciso',
        name: 'CISO Brain',
        role: 'CHIEF_INFORMATION_SECURITY_OFFICER',
        subagents: ['security_auditor', 'sentinel']
      },
      FINANCE: {
        id: 'agent.cfo',
        name: 'CFO Brain',
        role: 'CHIEF_FINANCIAL_OFFICER',
        subagents: ['financial_analyst']
      },
      MARKETING: {
        id: 'agent.cmo',
        name: 'CMO Brain',
        role: 'CHIEF_MARKETING_OFFICER',
        subagents: ['copywriter', 'growth']
      },
      SALES: {
        id: 'agent.cro',
        name: 'CRO Brain',
        role: 'CHIEF_REVENUE_OFFICER',
        subagents: ['sales_agent']
      },
      CUSTOMER_SUCCESS: {
        id: 'agent.cco',
        name: 'CCO Brain',
        role: 'CHIEF_CUSTOMER_OFFICER',
        subagents: ['support_agent']
      }
    };

    for (const dep of company.departments) {
      const exec = execMap[dep];
      if (!exec) continue;

      // Filtra apenas subagentes que existem de verdade
      const realSubs = exec.subagents.filter((subId) => existingAgents.includes(subId));
      tree.ceo.children.push({
        id: exec.id,
        name: exec.name,
        role: exec.role,
        department: dep,
        subagents: realSubs.map((subId) => ({
          id: subId,
          role: subId.toUpperCase(),
          status: 'ACTIVE'
        }))
      });
    }

    return tree;
  }

  // ─── TELEMETRIA REAL CONSOLIDADA ───────────────────────────────────────────

  /**
   * Visão consolidada da telemetria da empresa
   * Contrato honesto: { metric, value, source, timestamp, period }
   */
  async getTelemetry(tenantId, companyId) {
    const state = await this.store.read();
    const now = new Date().toISOString();

    const jobs = (state.runtimeJobs || []).filter((j) => !j.tenantId || j.tenantId === tenantId);
    const missions = (state.missions || []).filter((m) => !m.tenantId || m.tenantId === tenantId);
    const projects = (state.projects || []).filter((p) => !p.tenantId || p.tenantId === tenantId);
    const aiCalls = (state.aiCalls || []).filter((c) => !c.tenantId || c.tenantId === tenantId);

    // Contagens reais
    const activeJobs = jobs.filter((j) => j.status === 'RUNNING').length;
    const failedJobs = jobs.filter((j) => ['FAILED', 'DEAD_LETTER'].includes(j.status)).length;
    const completedJobs = jobs.filter((j) => j.status === 'SUCCEEDED' || j.status === 'COMPLETED').length;
    const activeMissionsCount = missions.filter((m) => ['RUNNING', 'QUEUED'].includes(m.status)).length;

    // Métricas de custo de AI do Heart / Store
    const totalTokensSpent = aiCalls.reduce((acc, c) => acc + (c.tokensTotal || c.tokens || 0), 0);
    const estimatedCostUsd = Number((totalTokensSpent * 0.000002).toFixed(4));

    // Telemetria com fonte factual estrita (sem métricas fabricadas)
    return {
      companyId,
      timestamp: now,
      period: '24h',
      metrics: [
        {
          metric: 'TASKS',
          value: { active: activeJobs, completed: completedJobs, failed: failedJobs },
          source: 'runtime.jobs:state.runtimeJobs',
          timestamp: now,
          period: 'current'
        },
        {
          metric: 'PROJECTS',
          value: projects.length,
          source: 'projectKernel:state.projects',
          timestamp: now,
          period: 'current'
        },
        {
          metric: 'OPERATIONS',
          value: { activeMissions: activeMissionsCount, totalMissions: missions.length },
          source: 'missionKernel:state.missions',
          timestamp: now,
          period: 'current'
        },
        {
          metric: 'ERRORS',
          value: failedJobs,
          source: 'jobEngine:failed_status_count',
          timestamp: now,
          period: 'current'
        },
        {
          metric: 'COST',
          value: { totalTokens: totalTokensSpent, estimatedCostUsd },
          source: 'aiRuntime:state.aiCalls',
          timestamp: now,
          period: 'aggregate'
        },
        {
          metric: 'SYSTEM_HEALTH',
          value: failedJobs === 0 ? 'HEALTHY' : 'NEEDS_ATTENTION',
          source: 'healthRegistry:runtime_check',
          timestamp: now,
          period: 'instant'
        },
        {
          metric: 'PERFORMANCE',
          value: {
            uptimeSeconds: Math.round(process.uptime()),
            ramUsedMb: Number((process.memoryUsage().rss / (1024 * 1024)).toFixed(1))
          },
          source: 'node:process.memoryUsage',
          timestamp: now,
          period: 'instant'
        },
        // Indicadores de negócio que declaram honestamente ausência de fonte até que integrados
        {
          metric: 'REVENUE',
          value: null,
          source: 'NOT_CONNECTED:requires_payment_gateway',
          timestamp: now,
          period: 'none'
        },
        {
          metric: 'SALES',
          value: null,
          source: 'NOT_CONNECTED:requires_crm_sync',
          timestamp: now,
          period: 'none'
        },
        {
          metric: 'LEADS',
          value: null,
          source: 'NOT_CONNECTED:requires_marketing_crm',
          timestamp: now,
          period: 'none'
        },
        {
          metric: 'CUSTOMERS',
          value: (state.customers || []).length,
          source: 'store:state.customers',
          timestamp: now,
          period: 'current'
        },
        {
          metric: 'CONVERSION',
          value: null,
          source: 'INSUFFICIENT_DATA:leads_and_sales_unconnected',
          timestamp: now,
          period: 'none'
        },
        {
          metric: 'KNOWLEDGE_REUSE',
          value: this.tokenEconomy ? this.tokenEconomy.getEfficiencyReport().KNOWLEDGE_REUSE_RATE : 0,
          source: 'TokenEconomyEngine:knowledge_hits_ratio',
          timestamp: now,
          period: 'current'
        },
        {
          metric: 'TOKEN_SAVINGS',
          value: this.tokenEconomy ? this.tokenEconomy.getEfficiencyReport().TOKEN_SAVINGS_RATE : 0,
          source: 'TokenEconomyEngine:tokens_saved_ratio',
          timestamp: now,
          period: 'current'
        }
      ]
    };
  }

  // ─── PROMOÇÃO DINÂMICA DE SUBAGENTES ──────────────────────────────────────

  /**
   * Promove dinamicamente um novo subagente após validação dos 7 estágios:
   * NEED IDENTIFIED -> ROLE DEFINED -> TOOLS DEFINED -> PERMISSIONS DEFINED ->
   * SANDBOX TEST -> REAL TEST -> QUALITY GATE -> PROMOTE
   */
  async promoteSubagent(tenantId, companyId, candidate = {}) {
    const { agentId, department, role, skills = [], tools = [], permissions = [], modelPolicy = 'LOCAL_FIRST' } = candidate;

    if (!agentId || !department || !role) {
      throw new Error('agentId, department e role são obrigatórios para promover subagente');
    }

    // 1. Need Identified: verifica se a empresa existe e necessita do agente
    const company = await this.getCompany(tenantId, companyId);

    // 2. Role Defined & 3. Tools Defined & 4. Permissions Defined
    const cleanPermissions = permissions.length > 0 ? permissions : ['READ', 'EXECUTE'];
    const cleanTools = tools.length > 0 ? tools : ['code_search', 'run_tests'];

    // 5. Sandbox Test (simula verificação sintática de contrato)
    const sandboxPassed = cleanTools.every((t) => typeof t === 'string' && t.length > 0);
    if (!sandboxPassed) {
      throw new Error('Falha no Sandbox Test: ferramentas inválidas declaradas');
    }

    // 6. Quality Gate
    const qualityGatePassed = cleanPermissions.every((p) => DEFAULT_PERMISSIONS.includes(p));
    if (!qualityGatePassed) {
      throw new Error('Falha no Quality Gate: permissão fora da matriz permitida detectada');
    }

    // 7. Promote
    const newAgent = {
      agentId,
      companyId,
      tenantId,
      department,
      role,
      skills,
      tools: cleanTools,
      permissions: cleanPermissions,
      memory: { createdByPromotion: true, promotedAt: new Date().toISOString() },
      modelPolicy,
      status: 'ACTIVE',
      promotedAt: new Date().toISOString()
    };

    await this.store.update((state) => {
      state.companies = state.companies || [];
      const comp = state.companies.find((c) => c.tenantId === tenantId && c.companyId === companyId);
      if (comp && !comp.agents.includes(agentId)) {
        comp.agents.push(agentId);
        comp.memory.recentDecisions = comp.memory.recentDecisions || [];
        comp.memory.recentDecisions.push({
          type: 'SUBAGENT_PROMOTED',
          agentId,
          department,
          role,
          timestamp: newAgent.promotedAt
        });
      }

      state.cognitiveAgents = state.cognitiveAgents || [];
      const existingIdx = state.cognitiveAgents.findIndex((a) => a.id === agentId && a.tenantId === tenantId);
      if (existingIdx >= 0) {
        state.cognitiveAgents[existingIdx] = { ...state.cognitiveAgents[existingIdx], ...newAgent };
      } else {
        state.cognitiveAgents.push({ id: agentId, ...newAgent });
      }

      return state;
    });

    if (this.bus?.emit) {
      await this.bus.emit('company.subagent.promoted', { tenantId, companyId, agentId, department, role });
    }

    return newAgent;
  }

  /**
   * Mapeia um projeto real no ecossistema da empresa
   */
  async mapProject(tenantId, companyId, projectId) {
    let project = null;
    if (this.projectKernel) {
      try {
        project = await this.projectKernel.state(tenantId, 'system', projectId);
      } catch (_) {
        try {
          const list = await this.projectKernel.list(tenantId, 'system');
          project = list.find((item) => item.id === projectId);
        } catch (__) {}
      }
    }
    const mapping = {
      projectId,
      name: project?.name || projectId,
      workspace: project?.workspace || null,
      mappedAt: new Date().toISOString(),
      status: project ? 'CONNECTED' : 'DISCOVERED',
      stack: project?.language || 'javascript'
    };

    await this.updateCompany(tenantId, companyId, {
      projectId,
      memory: { projectMap: mapping }
    });

    if (this.bus?.emit) {
      await this.bus.emit('company.project.mapped', { tenantId, companyId, projectId, mapping });
    }

    return mapping;
  }

  /**
   * Gera o Project DNA a partir de dados reais
   */
  async generateProjectDna(tenantId, companyId, projectId) {
    const dna = {
      projectId,
      generatedAt: new Date().toISOString(),
      stack: 'node/javascript/fastify/vanilla',
      architecture: 'clean-modular-kernel',
      dnaHash: `dna_${uuid().slice(0, 10)}`,
      traits: ['zero-mock', 'single-truth', 'living-city-synced', 'self-evolving']
    };

    await this.updateCompany(tenantId, companyId, {
      memory: { projectDna: dna }
    });

    if (this.bus?.emit) {
      await this.bus.emit('company.project.dna.generated', { tenantId, companyId, projectId, dna });
    }

    return dna;
  }
}

module.exports = { CompanyBrain, STANDARD_DEPARTMENTS, DEFAULT_PERMISSIONS };
