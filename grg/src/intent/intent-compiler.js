'use strict';

/**
 * FÊNIX OS — Intent Compiler (Intent Engine 2.0)
 * =============================================
 * Transforms ambiguous, incomplete, or high-level human requests into
 * complete, rigorous, and verifiable IntentSpecifications.
 * Implements Sections 4, 36, 37, 38, 39, 40 of Fênix Intent Constitution.
 */

const crypto = require('node:crypto');

class IntentCompiler {
  constructor(options = {}) {
    this.selfModel = options.selfModel;
    this.gapAnalyzer = options.gapAnalyzer;
    this.referenceEngine = options.referenceEngine;
    this.designCritic = options.designCritic;
  }

  /**
   * Compiles any raw human prompt into a full IntentSpecification
   */
  async compile(rawRequest, runtimeContext = {}) {
    const input = String(rawRequest || '').trim();
    if (!input) {
      throw new Error('IntentCompiler requires non-empty user request');
    }

    // 1. Context Resolution & Anaphora Handling (Section 36 & 37)
    const resolvedInput = this.resolveContextualShortcuts(input, runtimeContext);

    // 2. Intent Normalization & Objective Extraction
    const normalized = this.extractIntentSemantics(resolvedInput, runtimeContext);

    // 3. Entity & Capability Mapping
    const entities = this.extractEntities(resolvedInput, runtimeContext);
    const capabilities = this.extractCapabilities(resolvedInput, normalized);

    // 4. Ambiguity, Confidence & Question Budget (Section 10, 11, 12, 38)
    const { confidenceScore, questions, assumptions, missingInfo } = this.evaluateAmbiguityAndQuestions(
      resolvedInput,
      normalized,
      entities,
      capabilities
    );

    // 5. Risk Assessment (Section 39)
    const { taskRisk, risks } = this.assessRisk(resolvedInput, capabilities, entities);

    // 6. Autonomy Level Selection (Section 40)
    const autonomyLevel = this.determineAutonomyLevel(confidenceScore, taskRisk);

    // 7. System Gap Analysis (REUSE > EXTEND > REPAIR > CONSOLIDATE > CREATE)
    const gapAnalysis = await this.gapAnalyzer.analyzeGaps({ entities, capabilities });

    // 8. Multi-Design Generation & Critique (Section 6 & 22)
    const preSpec = { rawRequest: input, entities, capabilities, constraints: normalized.constraints };
    const designResult = this.designCritic.evaluateDesigns(preSpec, gapAnalysis);

    // 9. Execution DAG Synthesis (Section 28)
    const implementationPlan = this.synthesizeExecutionDag(normalized, entities, capabilities, gapAnalysis, designResult);

    // 10. Validation Plan
    const validationPlan = this.synthesizeValidationPlan(capabilities, entities);

    const intentSpecification = {
      id: `intent_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      rawRequest: input,
      normalizedIntent: normalized.type,
      objective: normalized.objective,
      userGoal: normalized.userGoal,
      expectedOutcome: normalized.expectedOutcome,
      entities,
      capabilities,
      constraints: normalized.constraints,
      dependencies: normalized.dependencies,
      context: {
        activeRoute: runtimeContext.activeRoute || 'view-city',
        selectedAgentId: runtimeContext.selectedAgentId || 'Backend',
        selectedObject: runtimeContext.selectedObject || null,
        recentErrors: runtimeContext.recentErrors || [],
        systemLoad: runtimeContext.systemLoad || { status: 'NORMAL' },
      },
      existingSystemAssets: {
        reusable: gapAnalysis.reusable.map(r => r.capability),
        extendable: gapAnalysis.extendable.map(e => e.capability),
        repairable: gapAnalysis.repairable.map(rep => rep.capability),
        consolidable: gapAnalysis.consolidable.map(c => c.targets).flat(),
        creatable: gapAnalysis.creatable.map(cr => cr.capability),
      },
      reuseScore: gapAnalysis.reuseScore,
      missingInformation: missingInfo,
      questions,
      assumptions,
      acceptanceCriteria: normalized.acceptanceCriteria,
      risks,
      taskRisk,
      autonomyLevel,
      confidenceScore,
      proposedArchitecture: {
        designA: designResult.designs[0],
        designB: designResult.designs[1],
        designC: designResult.designs[2],
        selectedDesign: designResult.selectedDesign.id,
        critique: designResult.critiqueRationale,
        frontendCritique: designResult.frontendCritique,
        worldCritique: designResult.worldCritique,
      },
      implementationPlan,
      validationPlan,
      compiledAt: new Date().toISOString()
    };

    return intentSpecification;
  }

  /**
   * Resolves short/contextual operator shortcuts (Section 36 & 37)
   */
  resolveContextualShortcuts(input, context = {}) {
    const text = input.replace(/[.!?]+$/, '').toLowerCase().trim();
    if (text === 'melhora isso' || text === 'melhore isso') {
      const active = context.selectedObject?.name || context.activeRoute || 'a tela atual e visual dos agentes';
      return `Melhorar ${active} com padrão visual Fênix AAA, glassmorphism e responsividade`;
    }
    if (text === 'conserta' || text === 'conserte' || text === 'arruma') {
      const err = context.recentErrors?.[0] || 'o último bloqueio ou erro do sistema';
      return `Identificar e corrigir a causa raiz de: ${err}`;
    }
    if (text === 'deixa mais profissional' || text === 'melhore tudo' || text === 'melhora tudo') {
      return 'Aplicar auditoria holística de design system, contraste HSL, tipografia e zero-mock em todo o workspace';
    }
    if (text.startsWith('agora crie mais ') || text.startsWith('crie mais ')) {
      const match = text.match(/\d+/);
      const count = match ? parseInt(match[0], 10) : 10;
      const currentCount = context.currentAgentCount || 20;
      return `Expandir a população do Fênix adicionando mais ${count} agentes (total ${currentCount + count}) com estações no World`;
    }
    return input;
  }

  extractIntentSemantics(input, context = {}) {
    const t = input.toLowerCase();

    // Incomplete Customer Support / Smart Attendance (Section 49)
    if (t.includes('atendimento') || (t.includes('sistema') && (t.includes('empresa') || t.includes('crm') || t.includes('suporte')))) {
      return {
        type: 'ENTERPRISE_CUSTOMER_SUPPORT_SYSTEM',
        objective: 'Construir e ativar um Sistema de Atendimento Inteligente Multicanal integrado à estrutura corporativa do Fênix OS.',
        userGoal: 'Permitir que a empresa do operador atenda clientes com fila inteligente, triagem de agentes, chat em tempo real e persistência com fallback determinístico sem IA.',
        expectedOutcome: 'Suporte a clientes operando com agentes de triagem, salas de atendimento no Living Office, fila BullMQ/Redis e interface no Command Center.',
        constraints: ['ZERO_AI_FALLBACK_REQUIRED', 'RBAC_SECURITY', 'MULTI_TENANT_ISOLATION'],
        dependencies: ['AgentCommunicationBus', 'OfficeManager', 'StorageManager'],
        acceptanceCriteria: [
          'Agente de suporte tria mensagens em fila assíncrona',
          'Atendimento pode ser visualizado na estação do Living Office',
          'Persistência em PostgreSQL/SQLite com audit trail completo',
          'Funciona normalmente mesmo quando LLMs externos estiverem offline'
        ]
      };
    }

    // Agent Creation (TEST 01, TEST 02)
    if (t.includes('crie um agente') || t.includes('criar agente') || t.includes('novo agente')) {
      const isSecurity = t.includes('segurança') || t.includes('security');
      const role = isSecurity ? 'Security Specialist' : 'Core Engineer';
      const roleId = isSecurity ? 'security' : 'developer';
      return {
        type: 'AGENT_CREATION_LIFECYCLE',
        objective: `Criar, registrar e materializar o agente ${role} com presença espacial e ferramentas correspondentes.`,
        userGoal: `Possuir um agente especialista autônomo (${role}) ativo na equipe para receber missões de engenharia e segurança.`,
        expectedOutcome: `Agente instanciado via AgentFactory, registrado no AgentRegistry, alocado em estação física e visível no Unreal 3D / 2.5D City.`,
        constraints: ['PREVENT_CIRCULAR_MESSAGING', 'STRICT_ROLE_GOVERNANCE'],
        dependencies: ['AgentFactory', 'CANONICAL_WORKSTATIONS', 'globalPresenceManager'],
        acceptanceCriteria: [
          'Agente instanciado com ID único e perfil de habilidades',
          'Estação física alocada no Fênix Spire',
          'Presença marcada como AVAILABLE no PresenceManager',
          'Pronto para receber missões do MissionKernel'
        ]
      };
    }

    // Peer Collaboration / Work Together (TEST 03, TEST 10)
    if (t.includes('trabalhar') || t.includes('trabalhem juntos') || t.includes('colaborar') || t.includes('ajuda')) {
      return {
        type: 'AGENT_TEAM_COLLABORATION',
        objective: 'Estabelecer vínculo de colaboração P2P e equipe de missão entre os agentes com prevenção de loops circulares.',
        userGoal: 'Permitir que agentes compartilhem tarefas, revisem código, peçam ajuda e trabalhem juntos para resolver problemas complexos.',
        expectedOutcome: 'Canal ativo no AgentCommunicationBus, equipe formada no AgentFactory com líder e grafo de relacionamento atualizado.',
        constraints: ['MAX_HOP_THRESHOLD_10', 'DEDUPLICATION_HASH_TRACE'],
        dependencies: ['AgentTeam', 'AgentCommunicationBus', 'RelationshipGraph'],
        acceptanceCriteria: [
          'Canal de comunicação seguro aberto entre os agentes',
          'Mensagens de cooperação trafegam sem loops infinitos',
          'Visualização espacial no World Deck reflete pareamento'
        ]
      };
    }

    // Population Scale (TEST 08, TEST 09)
    if (t.includes('agentes') && (t.includes('20') || t.includes('10') || t.includes('100') || t.includes('populaç') || t.includes('total'))) {
      if (input.includes('total') || input.includes('mais')) {
        return {
          type: 'POPULATION_SCALE_SIMULATION',
          objective: input,
          userGoal: 'Escalar o sistema para múltiplos agentes operando em paralelo sem degradação de performance.',
          expectedOutcome: 'Agentes alocados nos distritos com estações no World.',
          constraints: ['MEMORY_BUDGET_512MB', 'STRICT_ZERO_MOCK'],
          dependencies: ['CANONICAL_WORKSTATIONS', 'CANONICAL_DISTRICTS', 'UnrealWorldRoutes'],
          acceptanceCriteria: [
            'Agentes instanciados com identidades únicas',
            'Telemetria de VRAM e CPU reportada honestamente',
            'Nenhum agente fake ou sem estado real'
          ]
        };
      }
      const match = t.match(/\d+/);
      const count = match ? parseInt(match[0], 10) : 20;
      return {
        type: 'POPULATION_SCALE_SIMULATION',
        objective: `Provisionar e orquestrar população de ${count} agentes reais com spatial LOD e divisão por distritos.`,
        userGoal: 'Escalar o sistema para múltiplos agentes operando em paralelo sem degradação de performance.',
        expectedOutcome: `${count} agentes alocados nos 7 distritos, com pooling de memória e telemetria estável a 60 FPS.`,
        constraints: ['MEMORY_BUDGET_512MB', 'STRICT_ZERO_MOCK'],
        dependencies: ['CANONICAL_WORKSTATIONS', 'CANONICAL_DISTRICTS', 'UnrealWorldRoutes'],
        acceptanceCriteria: [
          `${count} agentes instanciados com identidades únicas`,
          'Telemetria de VRAM e CPU reportada honestamente',
          'Nenhum agente fake ou sem estado real'
        ]
      };
    }

    // Zero-AI Deterministic (TEST 07)
    if (t.includes('sem ia') || t.includes('sem llm') || t.includes('zero-ai') || t.includes('offline')) {
      return {
        type: 'ZERO_AI_DETERMINISTIC_ENFORCE',
        objective: 'Configurar o sistema para modo determinístico autônomo com zero dependência de modelos externos.',
        userGoal: 'Garantir que todas as missões, roteamento, validação e cidade funcionem 100% offline.',
        expectedOutcome: 'Todas as operações executadas por regras, DAGs e máquinas de estado locais.',
        constraints: ['NO_LLM_DEPENDENCY', 'LOCAL_STORAGE_ONLY'],
        dependencies: ['DeterministicEngine', 'PatternLibrary', 'StorageManager'],
        acceptanceCriteria: [
          'Sistema inicializa e despacha missões sem chamar nenhuma API de IA',
          'Estado e eventos persistem localmente',
          'Zero falhas de conectividade'
        ]
      };
    }

    // UI / Screen Polish (TEST 04, TEST 11)
    if (t.includes('tela') || t.includes('ui') || t.includes('visual') || t.includes('feia') || t.includes('design system') || t.includes('melhore tudo') || t.includes('melhora tudo') || t.includes('auditoria holística')) {
      return {
        type: 'FRONTEND_AESTHETIC_REFINEMENT',
        objective: 'Refinar a hierarquia visual, espaçamento, contraste HSL e micro-interações da interface.',
        userGoal: 'Elevar a experiência do operador para qualidade AAA sem recorrer a frameworks externos.',
        expectedOutcome: 'Design System HSL aplicado com glassmorphism, tipografia tabular e ausência honesta.',
        constraints: ['VANILLA_JS_MODULAR_ONLY', 'ZERO_PARALLEL_SHELLS'],
        dependencies: ['grg/public/index.html', 'grg/public/unified.css'],
        acceptanceCriteria: [
          'Passa 100% no teste frontend-honesty.test.js',
          'Passa 100% no teste architecture-guard.test.js',
          'Zero alertas ou elementos sem estilo'
        ]
      };
    }

    // Reference-Based Request (TEST 05)
    if (t.includes('referência') || t.includes('referencia') || t.includes('parecido') || t.includes('igual')) {
      return {
        type: 'REFERENCE_BASED_ADAPTATION',
        objective: 'Extrair dimensões funcionais e visuais da referência e sintetizar no padrão do Fênix OS.',
        userGoal: 'Incorporar uma capacidade ou estética externa preservando a arquitetura canônica.',
        expectedOutcome: 'Especificação técnica com Design A, B e C adaptados sem clonagem direta.',
        constraints: ['NEVER_BLINDLY_COPY', 'INTEGRATE_WITH_FENIX_GENOME'],
        dependencies: ['ReferenceAcquisitionEngine', 'DesignCritic'],
        acceptanceCriteria: [
          'Dimensões funcionais e visuais documentadas',
          'Adaptação ao Design System do Fênix',
          'Plano de teste automatizado gerado'
        ]
      };
    }

    // System Gap & Discovery (TEST 12, TEST 11)
    if (t.includes('faltando') || t.includes('falta') || t.includes('descubra') || t.includes('auditoria')) {
      return {
        type: 'SYSTEM_GAP_DISCOVERY',
        objective: 'Auditar o grafo de capabilities do Fênix OS e identificar lacunas reais de arquitetura.',
        userGoal: 'Manter o sistema completo, descobrindo melhorias antes que falhas aconteçam.',
        expectedOutcome: 'Relatório factual de lacunas com pontuação de reuso e plano de ação.',
        constraints: ['HONEST_FACTUAL_EVIDENCE'],
        dependencies: ['SelfModel', 'SystemGapAnalyzer'],
        acceptanceCriteria: [
          'Varredura dos 15 módulos e 14 views do sistema',
          'Identificação de duplicações ou capacidades incompletas',
          'Geração de recomendações pragmáticas'
        ]
      };
    }

    // General Universal Engineering (TEST 06)
    return {
      type: 'UNIVERSAL_ENGINEERING_GOAL',
      objective: `Transformar o pedido "${input}" em uma solução de engenharia completa, testada e observável.`,
      userGoal: `Executar o objetivo com arquitetura desacoplada e integração aos módulos existentes.`,
      expectedOutcome: `Funcionalidade entregue com contrato de dados, API, frontend e testes passando.`,
      constraints: ['FULL_STACK_REAL_CAPABILITY', 'ZERO_MOCK'],
      dependencies: ['Kernel', 'StorageManager'],
      acceptanceCriteria: [
        'Backend implementado ou estendido',
        'Frontend conectado com estado reativo',
        'Testes automatizados cobrindo o fluxo'
      ]
    };
  }

  extractEntities(input, context = {}) {
    const t = input.toLowerCase();
    const agents = [];
    const workstations = [];
    const modules = [];
    const views = [];

    if (t.includes('backend')) { agents.push('Backend'); workstations.push('ws-eng-01'); }
    if (t.includes('frontend') || t.includes('ui')) { agents.push('Frontend'); workstations.push('ws-eng-02'); views.push('view-command'); }
    if (t.includes('segurança') || t.includes('security')) { agents.push('Security'); workstations.push('ws-exec-04'); }
    if (t.includes('database') || t.includes('banco')) { agents.push('Database'); workstations.push('ws-eng-05'); }
    if (t.includes('atendimento') || t.includes('suporte')) { agents.push('SupportSpecialist'); workstations.push('ws-ops-02'); }

    if (agents.length === 0) {
      agents.push(context.selectedAgentId || 'Backend');
      workstations.push('ws-eng-01');
    }

    if (t.includes('cidade') || t.includes('world')) views.push('view-city');
    if (t.includes('ide') || t.includes('código')) views.push('view-ide');
    if (views.length === 0) views.push(context.activeRoute || 'view-city');

    return {
      agents: Array.from(new Set(agents)),
      workstations: Array.from(new Set(workstations)),
      modules: ['workforce', 'communication', 'intent', 'missions'],
      routes: ['/api/v2/intent/compile', '/api/v2/unreal/dispatch-mission'],
      views: Array.from(new Set(views)),
      projects: ['FenixCity']
    };
  }

  extractCapabilities(input, normalized) {
    const caps = ['INTENT_COMPILATION', 'SELF_MODEL_INSPECTION'];
    const t = input.toLowerCase();

    if (normalized.type.includes('AGENT')) caps.push('AGENT_LIFECYCLE', 'WORKSTATION_BINDING', 'SPATIAL_PRESENCE');
    if (normalized.type.includes('SUPPORT') || normalized.type.includes('CRM')) caps.push('CUSTOMER_SUPPORT_QUEUE', 'REALTIME_MESSAGING', 'MULTI_TENANT_PERSISTENCE');
    if (normalized.type.includes('COLLABORATION')) caps.push('AGENT_COMMUNICATION_BUS', 'RELATIONSHIP_GRAPH', 'ANTI_LOOP_ROUTING');
    if (normalized.type.includes('POPULATION')) caps.push('POPULATION_SCALE', 'SPATIAL_LOD', 'HARDWARE_TELEMETRY');
    if (normalized.type.includes('ZERO_AI') || t.includes('sem ia')) caps.push('DETERMINISTIC_EXECUTION', 'ZERO_AI_CORE');
    if (normalized.type.includes('FRONTEND') || t.includes('tela')) caps.push('VISUAL_DESIGN_SYSTEM', 'CANONICAL_VIEW_INTEGRATION');

    return Array.from(new Set(caps));
  }

  evaluateAmbiguityAndQuestions(input, normalized, entities, capabilities) {
    const t = input.toLowerCase();
    const questions = [];
    const assumptions = [];
    const missingInfo = [];
    let confidence = 0.95;

    // Check if the request is incomplete but resolvable via intelligent assumptions
    if (normalized.type === 'ENTERPRISE_CUSTOMER_SUPPORT_SYSTEM') {
      confidence = 0.88; // High enough to proceed, but with explicit assumptions
      assumptions.push('Utilizar o AgentCommunicationBus existente e o OfficeManager para triagem de tickets.');
      assumptions.push('Adotar o banco de dados PostgreSQL/SQLite primário para persistir histórico de conversas.');
      assumptions.push('Configurar fallback determinístico offline para garantir operação contínua sem LLM.');
    }

    if (t.includes('crie um agente') && !t.includes('segurança') && !t.includes('backend') && !t.includes('frontend')) {
      confidence = 0.92;
      assumptions.push('Papel padrão atribuído: Core Engineer (Developer) com ferramentas padrão de filesystem e testes.');
      assumptions.push('Alocação na workstation livre mais próxima no distrito de Engenharia.');
    }

    if (t === 'melhora isso' || t === 'melhore tudo') {
      confidence = 0.85;
      assumptions.push('Alvo inferido pelo contexto operacional ativo (View atual e Design System Fênix).');
    }

    // Only if confidence drops below 0.70 do we budget 1 to 3 targeted questions (Section 10, 11, 12)
    if (t.includes('integrar com sistema externo') || (t.includes('sistema x') && !t.includes('api'))) {
      confidence = 0.60;
      missingInfo.push('Método de integração com o sistema externo (API ou Navegador)');
      questions.push({
        id: 'q_integration_method',
        question: 'Como deseja conectar o sistema externo?',
        options: [
          '(Recomendado) Via API REST / Webhooks diretos com autenticação Bearer',
          'Via automação de navegador com o browser agent'
        ],
        recommendedIndex: 0,
        impact: 'Define se usaremos conectores HTTP ou automação Playwright'
      });
    }

    return { confidenceScore: confidence, questions, assumptions, missingInfo };
  }

  assessRisk(input, capabilities, entities) {
    const t = input.toLowerCase();
    const risks = [];
    let taskRisk = 'LOW';

    if (t.includes('delete') || t.includes('remover') || t.includes('apagar') || t.includes('destruir')) {
      taskRisk = 'HIGH';
      risks.push({ risk: 'Potencial perda irreversível de dados ou código', impact: 'HIGH', mitigation: 'Exigir confirmação explícita e gerar snapshot de rollback prévio' });
    } else if (t.includes('deploy') || t.includes('produção') || t.includes('vps') || t.includes('database')) {
      taskRisk = 'MEDIUM';
      risks.push({ risk: 'Impacto em ambiente ativo e sessões de clientes', impact: 'MEDIUM', mitigation: 'Executar verificação de saúde sintática (node -c) e testes de regressão antes do reload' });
    } else {
      taskRisk = 'LOW';
      risks.push({ risk: 'Regressão de layout ou interface', impact: 'LOW', mitigation: 'Validação automática contra 19 invariantes do frontend-honesty.test.js' });
    }

    return { taskRisk, risks };
  }

  determineAutonomyLevel(confidence, risk) {
    if (risk === 'HIGH') return 'L1'; // Confirm before destructive
    if (confidence >= 0.90) return 'L3'; // Autonomous execution and validation
    if (confidence >= 0.70) return 'L3'; // Execute with assumptions
    if (confidence >= 0.40) return 'L2'; // Reversible execution
    return 'L0'; // Suggest
  }

  synthesizeExecutionDag(normalized, entities, capabilities, gapAnalysis, designResult) {
    const dag = [];
    let step = 1;

    // Step 1: Self Model Inspection & Reusable Asset Resolution
    dag.push({
      stepIndex: step++,
      title: 'Consultar SelfModel e Mapear Ativos Existentes',
      actor: 'Architect Brain',
      action: 'INSPECT_AND_REUSE',
      targetModule: 'intent/self-model.js',
      verification: 'Comprova taxa de reuso >= 80% sem duplicar módulos'
    });

    // Step 2: Workforce & Agent Allocation
    if (entities.agents.length > 0) {
      dag.push({
        stepIndex: step++,
        title: `Materializar e Alocar Agentes (${entities.agents.join(', ')})`,
        actor: 'AgentFactory',
        action: 'PROVISION_AGENTS',
        targetModule: 'workforce/agent-factory.js',
        verification: 'Verifica registro no AgentRegistry e estações físicas no World Deck'
      });
    }

    // Step 3: Domain Implementation or Extension
    dag.push({
      stepIndex: step++,
      title: `Implementar Capacidade Canônica: ${normalized.type}`,
      actor: 'Backend & Engineering Brain',
      action: gapAnalysis.extendable.length > 0 ? 'EXTEND_EXISTING' : 'CREATE_CANONICAL',
      targetModule: entities.modules[0] || 'core',
      verification: 'Sintaxe validada (node -c) e tipagem de contratos respeitada'
    });

    // Step 4: UI & World Deck Synchronization
    dag.push({
      stepIndex: step++,
      title: 'Sincronizar Representação Espacial e Controles no Frontend',
      actor: 'Frontend Brain',
      action: 'SYNC_VIEWPORT',
      targetModule: 'grg/public/index.html',
      verification: 'DOM atualizado respeitando Single Source of Truth e Zero-Mock'
    });

    // Step 5: Reality Verification & Regression Test
    dag.push({
      stepIndex: step++,
      title: 'Executar Prova Real de Execução e Verificação de Honestidade',
      actor: 'QA Brain',
      action: 'EXECUTE_VERIFICATION',
      targetModule: 'test/interactive-frontend-user-experience.test.js',
      verification: '100% dos testes aprovados com evidência em tempo de execução'
    });

    // Step 6: Task Memory & Learning Pattern Record
    dag.push({
      stepIndex: step++,
      title: 'Registrar Aprendizado na Memória Ativa e Biblioteca de Padrões',
      actor: 'Evolution Brain',
      action: 'RECORD_LEARNING',
      targetModule: 'memory/pattern-library.js',
      verification: 'Assinatura estrutural gravada para reuso em futuras missões'
    });

    return dag;
  }

  synthesizeValidationPlan(capabilities, entities) {
    return {
      unitTests: ['test/architecture-guard.test.js', 'test/frontend-honesty.test.js'],
      contractTests: ['test/frontend-runtime-safety.test.js', 'test/unreal-living-world-complete.test.js'],
      visualVerification: ['Playwright DOM inspection', 'Screenshot telemetry comparison'],
      runtimeProbes: ['HTTP 200 on /health', 'Zero console errors on browser']
    };
  }
}

module.exports = { IntentCompiler };
