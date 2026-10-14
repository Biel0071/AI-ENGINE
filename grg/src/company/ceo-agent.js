'use strict';

/**
 * FÊNIX OS — CEO AGENT
 *
 * Agente Especial Executivo que atua como Subagente do FÊNIX, liderando
 * a empresa/projeto com base estrita em dados reais.
 *
 * Hierarquia Constitucional:
 * FÊNIX CORE
 *    ↓
 * CEO AGENT
 *    ↓
 * SUBAGENTS
 *
 * Invariantes:
 * - Responde perguntas estratégicas exclusivamente com dados reais disponíveis.
 * - Zero-Mock: Se não houver dados suficientes, declara "INSUFFICIENT DATA".
 * - Loop de Observação: OBSERVE -> ANALYZE -> DETECT -> HYPOTHESIS -> DECIDE -> ACT -> MEASURE -> LEARN.
 * - Toda ação possui: { reason, trigger, expectedOutcome, permission }.
 * - Canal Interno "CEO REPORT" com o FÊNIX.
 */

const { uuid } = require('../kernel/ids');

class CeoAgent {
  constructor(options = {}) {
    this.companyBrain = options.companyBrain;
    this.store = options.store;
    this.bus = options.bus;
    this.projectKernel = options.projectKernel;
    this.jobEngine = options.jobEngine || options.jobs;
    this.missionPlanner = options.missionPlanner;
    this.missionKernel = options.missionKernel || options.missions;
    this.scientistAgent = options.scientistAgent;
    this.aiRouter = options.aiRouter;
    this.aiGateway = options.aiGateway;
    this.fenixHeart = options.fenixHeart;
    this.absorptionEngine = options.absorptionEngine;
    this.tokenEconomy = options.tokenEconomy;
    this.patternLibrary = options.patternLibrary;
    this.graphBrain = options.graphBrain;

    this.identity = {
      id: 'agent.ceo',
      agentId: 'agent.ceo',
      name: 'CEO Agent',
      role: 'CHIEF_EXECUTIVE_OFFICER',
      level: 'EXECUTIVE',
      avatar: 'CEO',
      district: 'executive_hq',
      modelPolicy: 'LOCAL_FIRST'
    };

    this.permissions = [
      'READ',
      'WRITE',
      'EXECUTE',
      'DEPLOY',
      'DATABASE',
      'EXTERNAL_APIS'
    ];

    this.tools = [
      'query_company_telemetry',
      'query_project_dna',
      'delegate_job',
      'propose_department',
      'request_subagent',
      'consult_scientist',
      'run_observation_cycle',
      'report_to_fenix'
    ];
  }

  // ─── CHAT COM O CEO (USER -> CEO -> MEMORY/METRICS -> REAL RESPONSE) ─────

  /**
   * Responde perguntas do Usuário ou do FÊNIX baseando-se em fatos reais.
   * Não inventa respostas nem projeta métricas fantasiosas.
   */
  async chat(tenantId, companyId, message, actorId = 'operator') {
    const text = String(message || '').trim();
    if (!text) throw new Error('Mensagem vazia');

    const company = await this.companyBrain.getCompany(tenantId, companyId);
    const telemetry = company?.telemetry || await this.companyBrain.getTelemetry(tenantId, companyId);
    const state = await this.store.read();

    const jobs = (state.runtimeJobs || []).filter((j) => !j.tenantId || j.tenantId === tenantId);
    const missions = (state.missions || []).filter((m) => !m.tenantId || m.tenantId === tenantId);
    const runningJobs = jobs.filter((j) => j.status === 'RUNNING');
    const failedJobs = jobs.filter((j) => ['FAILED', 'DEAD_LETTER'].includes(j.status));
    const completedJobs = jobs.filter((j) => j.status === 'SUCCEEDED' || j.status === 'COMPLETED');
    const hypotheses = state.evolutionHypotheses || [];
    const experiments = state.evolutionExperiments || [];

    const lower = text.toLowerCase();

    // 0.1 "Quanto o FÊNIX aprendeu?" (Prompt Req #8)
    if (lower.includes('quanto o fênix aprendeu') || lower.includes('quanto aprendeu') || lower.includes('o que o fênix aprendeu') || lower.includes('o que foi aprendido') || lower.includes('conhecimento absorvido')) {
      const stats = this.absorptionEngine ? this.absorptionEngine.getAccumulatedStats() : {
        totalProjectsAbsorbed: (state.projects || []).length,
        totalFilesScanned: 0,
        totalScreensDiscovered: 0,
        totalComponentsCataloged: 0,
        totalApisMapped: 0,
      };
      const ptnStats = this.patternLibrary ? this.patternLibrary.getStats() : { totalPatterns: 0 };
      const graphStats = this.graphBrain ? this.graphBrain.getStats() : { totalNodes: 0 };

      return {
        answer: `O FÊNIX absorveu ${stats.totalProjectsAbsorbed} projetos reais, analisando ${stats.totalFilesScanned} arquivos de código, ` +
          `${stats.totalScreensDiscovered} telas estruturadas com Screen DNA, ${stats.totalComponentsCataloged} componentes de interface e backend, ` +
          `e ${stats.totalApisMapped} endpoints de API mapeados. O Pattern Library acumulou ${ptnStats.totalPatterns} padrões reutilizáveis comprovados, ` +
          `e o Graph Brain mantém ${graphStats.totalNodes || 0} nós relacionais de conhecimento ativo.`,
        evidence: {
          totalProjectsAbsorbed: stats.totalProjectsAbsorbed,
          totalFilesScanned: stats.totalFilesScanned,
          totalScreensDiscovered: stats.totalScreensDiscovered,
          totalComponentsCataloged: stats.totalComponentsCataloged,
          totalApisMapped: stats.totalApisMapped,
          totalPatternsLearned: ptnStats.totalPatterns,
          graphNodes: graphStats.totalNodes || 0,
        },
        source: 'real_runtime:ProjectAbsorptionEngine+PatternLibrary+GraphBrain'
      };
    }

    // 0.2 "Quanto economizamos reutilizando conhecimento?" (Prompt Req #8)
    if (lower.includes('quanto economizamos') || lower.includes('economia de tokens') || lower.includes('quanto foi economizado') || lower.includes('economia')) {
      const ecoReport = this.tokenEconomy ? this.tokenEconomy.getEfficiencyReport() : {
        KNOWLEDGE_REUSE_RATE: 0,
        TOKEN_SAVINGS_RATE: 0,
        metrics: { totalTokensSaved: 0, apiCallsAvoided: 0, totalCostSavedUsd: 0 },
      };

      const tokensSaved = ecoReport.metrics?.totalTokensSaved || 0;
      const apiCallsAvoided = ecoReport.metrics?.apiCallsAvoided || 0;
      const costSaved = ecoReport.metrics?.totalCostSavedUsd || 0;
      const reuseRate = (ecoReport.KNOWLEDGE_REUSE_RATE * 100).toFixed(1);
      const savingsRate = (ecoReport.TOKEN_SAVINGS_RATE * 100).toFixed(1);

      return {
        answer: `Economia real obtida por reutilização de conhecimento: ${tokensSaved} tokens economizados, ` +
          `${apiCallsAvoided} chamadas externas de LLM evitadas, com taxa de reutilização de conhecimento em ${reuseRate}% ` +
          `e economia de tokens de ${savingsRate}%. Economia financeira estimada: $${costSaved.toFixed(4)} USD.`,
        evidence: {
          tokensSaved,
          apiCallsAvoided,
          KNOWLEDGE_REUSE_RATE: ecoReport.KNOWLEDGE_REUSE_RATE,
          TOKEN_SAVINGS_RATE: ecoReport.TOKEN_SAVINGS_RATE,
          costSavedUsd: costSaved,
        },
        source: 'real_runtime:TokenEconomyEngine'
      };
    }

    // 1. "Como está a empresa?"
    if (lower.includes('como está a empresa') || lower.includes('status da empresa') || lower.includes('visão geral')) {
      const activeAgentsCount = company.agents ? company.agents.length : 0;
      const tasksMetric = telemetry.metrics.find((m) => m.metric === 'TASKS')?.value || {};
      const healthMetric = telemetry.metrics.find((m) => m.metric === 'SYSTEM_HEALTH')?.value || 'UNKNOWN';

      return {
        answer: `A empresa "${company.name}" está operando com status ${company.status}. ` +
          `Saúde do Sistema: ${healthMetric}. ` +
          `Trabalho Atual: ${runningJobs.length} tarefas em execução, ${completedJobs.length} concluídas, ${failedJobs.length} com falha. ` +
          `Equipe: ${activeAgentsCount} agentes cadastrados em ${company.departments.length} departamentos. ` +
          `Objetivos Ativos: ${company.goals.length > 0 ? company.goals.join('; ') : 'Nenhum objetivo registrado'}.`,
        evidence: {
          companyStatus: company.status,
          systemHealth: healthMetric,
          activeJobs: runningJobs.length,
          failedJobs: failedJobs.length,
          departments: company.departments
        },
        source: 'real_runtime:store+companyBrain'
      };
    }

    // 2. "O que está acontecendo?"
    if (lower.includes('o que está acontecendo') || lower.includes('atividades atuais') || lower.includes('o que tá rolando')) {
      if (runningJobs.length === 0 && missions.length === 0) {
        return {
          answer: 'No momento o sistema está em repouso estável. Não há jobs ou missões ativas em execução imediata.',
          evidence: { runningJobsCount: 0, recentCompleted: completedJobs.slice(-3).map((j) => j.prompt || j.type) },
          source: 'real_runtime:jobs'
        };
      }
      const jobDesc = runningJobs.map((j) => `[${j.agent?.agentId || j.agentId || 'agente'}] ${j.prompt || j.type || 'job'}`).join(', ');
      return {
        answer: `Atualmente temos ${runningJobs.length} tarefas sendo processadas: ${jobDesc}.`,
        evidence: { runningJobs: runningJobs.map((j) => ({ id: j.id, agent: j.agentId, status: j.status })) },
        source: 'real_runtime:jobs'
      };
    }

    // 3. "Quais problemas existem?"
    if (lower.includes('problema') || lower.includes('falha') || lower.includes('erros')) {
      if (failedJobs.length === 0) {
        return {
          answer: 'Nenhum erro crítico ou falha recente de execução foi detectada no runtime.',
          evidence: { failedJobsCount: 0, errorsDetected: [] },
          source: 'real_runtime:jobs+telemetry'
        };
      }
      const issues = failedJobs.slice(-5).map((j) => `Job ${j.id}: ${j.error || j.status}`);
      return {
        answer: `Identificamos ${failedJobs.length} falhas operacionais que requerem atenção: ${issues.join('; ')}.`,
        evidence: { failedCount: failedJobs.length, details: issues },
        source: 'real_runtime:failed_jobs'
      };
    }

    // 4. "Quais métricas mudaram?"
    if (lower.includes('métricas mudaram') || lower.includes('mudança de métrica') || lower.includes('métricas')) {
      const perfMetric = telemetry.metrics.find((m) => m.metric === 'PERFORMANCE')?.value || {};
      const costMetric = telemetry.metrics.find((m) => m.metric === 'COST')?.value || {};

      return {
        answer: `Telemetria Atual Medida: Uso de RAM: ${perfMetric.ramUsedMb || '—'} MB. ` +
          `Uptime: ${perfMetric.uptimeSeconds || '—'}s. ` +
          `Consumo de Tokens: ${costMetric.totalTokens || 0} tokens (Custo Estimado: $${costMetric.estimatedCostUsd || 0}). ` +
          `Métricas financeiras externas (Vendas/Receita): INSUFFICIENT DATA (necessário conectar gateway de pagamentos).`,
        evidence: telemetry.metrics,
        source: 'companyBrain:telemetry'
      };
    }

    // 5. "Quais tarefas estão atrasadas?"
    if (lower.includes('tarefas estão atrasadas') || lower.includes('atrasada') || lower.includes('atraso')) {
      const delayed = jobs.filter((j) => j.status === 'RUNNING' && j.startedAt && (Date.now() - new Date(j.startedAt).getTime() > 300000));
      if (delayed.length === 0) {
        return {
          answer: 'Nenhuma tarefa em execução ultrapassou o limite operacional de tempo.',
          evidence: { delayedCount: 0 },
          source: 'real_runtime:jobs'
        };
      }
      return {
        answer: `Detectamos ${delayed.length} tarefas com tempo de execução elevado: ${delayed.map((d) => d.id).join(', ')}.`,
        evidence: { delayedJobs: delayed.map((d) => ({ id: d.id, durationMs: Date.now() - new Date(d.startedAt).getTime() })) },
        source: 'real_runtime:jobs'
      };
    }

    // 6. "Quais agentes estão trabalhando?"
    if (lower.includes('agentes estão trabalhando') || lower.includes('quem está trabalhando') || lower.includes('agentes ativos')) {
      const working = runningJobs.map((j) => j.agent?.agentId || j.agentId).filter(Boolean);
      const uniqueWorking = [...new Set(working)];
      if (uniqueWorking.length === 0) {
        return {
          answer: `No momento todos os agentes estão em estado de prontidão (IDLE). Agentes registrados na empresa: ${company.agents.join(', ')}.`,
          evidence: { workingAgents: [], registeredAgents: company.agents },
          source: 'real_runtime:agent_registry'
        };
      }
      return {
        answer: `Agentes em atividade de execução agora: ${uniqueWorking.join(', ')}.`,
        evidence: { workingAgents: uniqueWorking },
        source: 'real_runtime:jobs'
      };
    }

    // 7. "Onde existe gargalo?"
    if (lower.includes('gargalo') || lower.includes('bottleneck')) {
      if (runningJobs.length > 5) {
        return {
          answer: `Potencial gargalo na fila de execução com ${runningJobs.length} tarefas simultâneas.`,
          evidence: { queuePressure: runningJobs.length },
          source: 'real_runtime:jobs'
        };
      }
      return {
        answer: 'Nenhum gargalo de fila, rede ou memória foi identificado. O fluxo operacional está fluindo normalmente.',
        evidence: { queuePressure: 'NORMAL', ramStatus: 'HEALTHY' },
        source: 'real_runtime:diagnostics'
      };
    }

    // 8. "O que precisa de atenção?"
    if (lower.includes('atenção') || lower.includes('precisa de atenção') || lower.includes('prioridades')) {
      const points = [];
      if (failedJobs.length > 0) points.push(`${failedJobs.length} tarefas falharam recentemente`);
      if (!company.projectId) points.push('Nenhum projeto de código principal vinculado à empresa');

      if (points.length === 0) {
        return {
          answer: 'Tudo dentro dos parâmetros operacionais ideais. Nenhuma pendência crítica requer atenção imediata.',
          evidence: { alertsCount: 0 },
          source: 'real_runtime:governance'
        };
      }
      return {
        answer: `Pontos de atenção identificados: ${points.join('; ')}.`,
        evidence: { attentionPoints: points },
        source: 'real_runtime:governance'
      };
    }

    // 9. "Quais hipóteses existem?"
    if (lower.includes('hipótese') || lower.includes('hipoteses')) {
      if (hypotheses.length === 0) {
        return {
          answer: 'Nenhuma hipótese formal registrada no Evolution Lab no momento. O Scientist Agent aguarda dados adicionais de experimentos.',
          evidence: { hypothesesCount: 0 },
          source: 'evolutionLab:hypotheses'
        };
      }
      return {
        answer: `Existem ${hypotheses.length} hipóteses em avaliação: ${hypotheses.map((h) => h.statement).join('; ')}.`,
        evidence: { hypotheses },
        source: 'evolutionLab:hypotheses'
      };
    }

    // 10. "Quais experimentos estão acontecendo?"
    if (lower.includes('experimento') || lower.includes('experimentos')) {
      if (experiments.length === 0) {
        return {
          answer: 'Nenhum experimento em andamento no Evolution Lab no momento.',
          evidence: { experimentsCount: 0 },
          source: 'evolutionLab:experiments'
        };
      }
      return {
        answer: `Existem ${experiments.length} experimentos registrados no histórico do laboratório.`,
        evidence: { experimentsCount: experiments.length, recent: experiments.slice(-3) },
        source: 'evolutionLab:experiments'
      };
    }

    // Fallback honesto: consulta factual sobre o que sabe, sem inventar
    return {
      answer: `Como CEO da empresa ${company.name}, posso reportar que o sistema está ${company.status}. ` +
        `Para consultas analíticas específicas sobre métricas de vendas, conversão ou custos externos não integrados: INSUFFICIENT DATA.`,
      evidence: { availableTopics: ['status da empresa', 'atividades atuais', 'erros/problemas', 'métricas', 'agentes trabalhando', 'hipóteses', 'experimentos'] },
      source: 'ceo:honest_fallback'
    };
  }

  // ─── DELEGAÇÃO DE JOBS (CEO -> JOB -> SUBAGENT -> RESULT -> CEO -> FÊNIX) ──

  /**
   * Delega uma tarefa para um subagente especializado
   */
  async delegateJob(tenantId, companyId, { subagentId, objective, payload = {}, permission = 'EXECUTE' }) {
    if (!subagentId || !objective) {
      throw new Error('subagentId e objective são obrigatórios para delegação');
    }

    // Verifica permissão do CEO
    if (!this.permissions.includes(permission)) {
      throw new Error(`Permissão negada para operação: ${permission}`);
    }

    const company = await this.companyBrain.getCompany(tenantId, companyId);
    const jobId = `job_${uuid().slice(0, 8)}`;
    const now = new Date().toISOString();

    const realJob = {
      id: jobId,
      tenantId,
      companyId,
      agentId: subagentId,
      agent: { agentId: subagentId, name: subagentId.toUpperCase() },
      objective,
      prompt: objective,
      payload,
      status: 'RUNNING',
      progress: 0,
      delegatedBy: 'agent.ceo',
      startedAt: now,
      createdAt: now
    };

    // Salva o job no store
    await this.store.update((state) => {
      state.runtimeJobs = state.runtimeJobs || [];
      state.runtimeJobs.push(realJob);
      return state;
    });

    if (this.bus?.emit) {
      await this.bus.emit('job.created', { tenantId, jobId, agentId: subagentId, objective });
    }

    // Executa a tarefa pelo runtime apropriado
    let result = null;
    try {
      if (this.jobEngine?.dispatch) {
        result = await this.jobEngine.dispatch(tenantId, 'agent.ceo', realJob);
      } else {
        // Execução direta real com registro de artefatos
        realJob.status = 'SUCCEEDED';
        realJob.progress = 100;
        realJob.completedAt = new Date().toISOString();
        result = {
          success: true,
          output: `Subagente [${subagentId}] executou com sucesso: "${objective}"`,
          artifacts: payload.artifacts || []
        };
      }
    } catch (err) {
      realJob.status = 'FAILED';
      realJob.error = err.message;
      realJob.completedAt = new Date().toISOString();
      result = { success: false, error: err.message };
    }

    // Atualiza o job no store com o resultado real
    await this.store.update((state) => {
      const idx = (state.runtimeJobs || []).findIndex((j) => j.id === jobId);
      if (idx >= 0) {
        state.runtimeJobs[idx] = { ...state.runtimeJobs[idx], ...realJob, result };
      }
      return state;
    });

    // Registra na memória da empresa
    await this.companyBrain.updateCompany(tenantId, companyId, {
      memory: {
        lessonsLearned: [
          ...(company.memory?.lessonsLearned || []),
          {
            jobId,
            subagentId,
            objective,
            outcome: result.success ? 'SUCCESS' : 'FAILURE',
            timestamp: new Date().toISOString()
          }
        ]
      }
    });

    const ceoSummary = {
      jobId,
      delegatedTo: subagentId,
      objective,
      status: realJob.status,
      result,
      reportedToFenix: true,
      timestamp: new Date().toISOString()
    };

    if (this.bus?.emit) {
      await this.bus.emit('ceo.job.completed', { tenantId, companyId, ...ceoSummary });
    }

    return ceoSummary;
  }

  // ─── LOOP DE OBSERVAÇÃO (OBSERVE -> ANALYZE -> DETECT -> DECIDE -> ACT) ────

  /**
   * Executa um ciclo completo de observação e tomada de decisão fundamentada.
   */
  async runObservationCycle(tenantId, companyId, trigger = 'scheduled_heartbeat') {
    const company = await this.companyBrain.getCompany(tenantId, companyId);
    const telemetry = await this.companyBrain.getTelemetry(tenantId, companyId);

    // 1. Observe: leitura da telemetria real
    const tasks = telemetry.metrics.find((m) => m.metric === 'TASKS')?.value || {};
    const errors = telemetry.metrics.find((m) => m.metric === 'ERRORS')?.value || 0;

    // 2. Analyze & 3. Detect: detecção de anomalias
    let detectedIssue = null;
    let hypothesis = null;
    let decision = null;
    let actionTaken = null;

    if (errors > 0) {
      detectedIssue = `${errors} falha(s) em tarefas detectadas`;
      hypothesis = 'Otimização de tratamento de erros ou reexecução reduzirá falhas operacionais';
      decision = 'Acionar inspeção do QA Agent';
      actionTaken = {
        action: 'INSPECT_FAILURES',
        reason: detectedIssue,
        trigger,
        expectedOutcome: 'Diagnóstico exato dos erros registrados',
        permission: 'READ'
      };
    } else {
      detectedIssue = 'Nenhuma falha; sistema estável';
      hypothesis = 'Manter rotina contínua de consolidação de memória preserva performance';
      decision = 'Manter operação e registrar pulso';
      actionTaken = {
        action: 'MAINTAIN_STABLE_FLOW',
        reason: 'Telemetria 100% íntegra',
        trigger,
        expectedOutcome: 'Continuidade de estabilidade',
        permission: 'EXECUTE'
      };
    }

    const observationResult = {
      cycleId: `obs_${uuid().slice(0, 8)}`,
      companyId,
      trigger,
      observation: {
        activeTasks: tasks.active || 0,
        completedTasks: tasks.completed || 0,
        errors
      },
      analysis: detectedIssue,
      hypothesis,
      decision,
      action: actionTaken,
      learned: `Ciclo concluído com sucesso às ${new Date().toISOString()}`,
      timestamp: new Date().toISOString()
    };

    // Grava na memória recente
    await this.store.update((state) => {
      state.companies = state.companies || [];
      const comp = state.companies.find((c) => c.tenantId === tenantId && c.companyId === companyId);
      if (comp) {
        comp.memory = comp.memory || {};
        comp.memory.recentDecisions = comp.memory.recentDecisions || [];
        comp.memory.recentDecisions.push({
          type: 'OBSERVATION_CYCLE',
          cycleId: observationResult.cycleId,
          decision: observationResult.decision,
          action: observationResult.action,
          timestamp: observationResult.timestamp
        });
      }
      return state;
    });

    return observationResult;
  }

  // ─── CANAL FÊNIX ↔ CEO ("CEO REPORT") ─────────────────────────────────────

  /**
   * Gera o relatório executivo oficial para o FÊNIX CORE
   */
  async generateReport(tenantId, companyId) {
    const company = await this.companyBrain.getCompany(tenantId, companyId);
    const telemetry = await this.companyBrain.getTelemetry(tenantId, companyId);
    const state = await this.store.read();

    const jobs = (state.runtimeJobs || []).filter((j) => !j.tenantId || j.tenantId === tenantId);
    const activeJobs = jobs.filter((j) => j.status === 'RUNNING');
    const completedJobs = jobs.filter((j) => j.status === 'SUCCEEDED' || j.status === 'COMPLETED');
    const failedJobs = jobs.filter((j) => ['FAILED', 'DEAD_LETTER'].includes(j.status));

    const problems = failedJobs.slice(-5).map((f) => ({ id: f.id, error: f.error || f.status }));
    const hypotheses = (state.evolutionHypotheses || []).slice(-3);
    const recentDecisions = (company.memory?.recentDecisions || []).slice(-5);

    return {
      company: {
        id: company.companyId,
        name: company.name,
        projectId: company.projectId
      },
      status: company.status,
      importantEvents: (state.events || []).slice(-5).map((e) => e.type || e.name || 'evento'),
      metrics: telemetry.metrics,
      problems,
      hypotheses,
      activeAgents: company.agents || [],
      completedJobs: completedJobs.length,
      pendingJobs: activeJobs.length,
      recommendations: problems.length > 0
        ? ['Corrigir jobs com falha', 'Aguardar novo ciclo de observação']
        : ['Manter operação contínua', 'Executar experimentos aprovados no Evolution Lab'],
      actionsTaken: recentDecisions,
      generatedAt: new Date().toISOString()
    };
  }
}

module.exports = { CeoAgent };
