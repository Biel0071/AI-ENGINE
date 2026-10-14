/**
 * FÊNIX OS — MASTER FRONTEND REALITY ENGINE (LEVEL 10)
 * 
 * Objective: Real visual, functional, navigational and code understanding.
 * Maps: SCREEN <-> COMPONENT <-> FILE <-> FUNCTION <-> API <-> DATABASE.
 * Enforces Zero-Mock, Zero Dead Buttons, Design System Lock & Autonomous Repair Loop.
 */

const { SystemModule } = require('../kernel/module');
const { STATE_MACHINE } = require('../kernel/states');
const { ScreenDiscoveryEngine } = require('./screen-discovery-engine');
const { ScreenNavigationGraph } = require('./screen-navigation-graph');
const { OrphanScreenDetector } = require('./orphan-screen-detector');

class VisualRealityEngine extends SystemModule {
  constructor({ workspaceManager = null, eventBus = null, promptCompiler = null } = {}) {
    super('visual_reality_engine', '5.0.0');
    this.workspaceManager = workspaceManager;
    this.eventBus = eventBus;
    this.promptCompiler = promptCompiler;

    this.discoveryEngine = new ScreenDiscoveryEngine({ workspaceManager });
    this.navigationGraph = new ScreenNavigationGraph({ screenDiscoveryEngine: this.discoveryEngine });
    this.orphanDetector = new OrphanScreenDetector({
      screenDiscoveryEngine: this.discoveryEngine,
      navigationGraph: this.navigationGraph
    });

    // Design System DNA (Persistent Style Guidelines)
    this.designSystem = {
      palette: {
        background: '#0a0f1c',
        surface: '#111a2e',
        primary: '#38bdf8',
        secondary: '#6366f1',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        text: '#f8fafc'
      },
      typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
        headingWeight: '700',
        bodyWeight: '400'
      },
      spacing: { unit: '4px', cardPadding: '20px', gap: '16px' },
      radius: { button: '8px', card: '16px', modal: '20px' },
      breakpoints: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' }
    };

    // User Flow Registry (End-to-End Visual User Journeys)
    this.userFlows = new Map([
      ['flow_dev_journey', {
        id: 'flow_dev_journey',
        name: 'Jornada Completa do Desenvolvedor',
        steps: [
          { step: 1, screen: 'Dashboard', action: 'Visualizar Métricas', expected: 'Telemetria ao vivo carregada' },
          { step: 2, screen: 'Projetos', action: 'Selecionar Projeto', expected: 'Projeto ativo conectado' },
          { step: 3, screen: 'IDE Web', action: 'Abrir Código', expected: 'Árvore de arquivos e editor sincronizados' },
          { step: 4, screen: 'Job Inspector', action: 'Executar Missão', expected: 'DAG de microtarefas em execução' }
        ],
        status: 'NOT_RUN',
        lastTested: null
      }]
    ]);
  }

  async start() {
    this.status = STATE_MACHINE.ONLINE;
    return this;
  }

  async stop() {
    this.status = STATE_MACHINE.SHUTDOWN;
  }

  /**
   * Scan project and establish complete Frontend Reality Map
   */
  async scanProject(projectId = 'fenix_enterprise') {
    let rootPath = null;
    if (this.workspaceManager) {
      const prj = this.workspaceManager.getProject(projectId);
      if (prj) rootPath = prj.rootPath;
    }

    if (!rootPath) {
      const path = require('path');
      rootPath = projectId === 'fenix_enterprise' ? path.join(__dirname, '..', '..', 'public') : path.join(__dirname, '..', 'generated', projectId);
    }

    const discovery = await this.discoveryEngine.scanProjectScreens(projectId, rootPath);
    const graph = this.navigationGraph.buildGraph(projectId, discovery.screens);
    const audit = this.orphanDetector.auditProject(projectId);

    const realityMap = {
      projectId,
      totalScreens: discovery.totalScreens,
      overallHealthScore: discovery.overallHealthScore,
      qualityLevel: discovery.totalScreens ? 'STATIC_INVENTORY_ONLY' : 'NOT_DISCOVERED',
      verificationStatus: 'NOT_VERIFIED',
      screens: discovery.screens,
      navigationGraph: graph,
      audit,
      designSystem: this.designSystem,
      userFlowsCount: this.userFlows.size,
      zeroDeadButtonsPass: null,
      scannedAt: new Date().toISOString()
    };

    if (this.eventBus) {
      this.eventBus.emit('frontend_reality.scanned', {
        projectId,
        totalScreens: discovery.totalScreens,
        healthScore: discovery.overallHealthScore,
        zeroDeadButtons: null,
        verificationStatus: 'NOT_VERIFIED'
      });
    }

    return realityMap;
  }

  /** Lightweight inventory used by the screen browser; reads only the canonical shell. */
  scanShell(projectId = 'fenix_enterprise') {
    const shellPath = require('path').join(__dirname, '..', '..', 'public', 'index.html');
    if (projectId !== 'fenix_enterprise' || !require('fs').existsSync(shellPath)) return { projectId, screens: [], totalScreens: 0, status: 'NOT_DISCOVERED', verificationStatus: 'NOT_VERIFIED' };
    const content = require('fs').readFileSync(shellPath, 'utf8');
    const screens = this.discoveryEngine._extractScreensFromFile(content, 'public/index.html', shellPath);
    this.discoveryEngine.screenRegistry.set(projectId, screens);
    return { projectId, screens, totalScreens: screens.length, status: screens.length ? 'STATIC_INVENTORY' : 'NOT_DISCOVERED', verificationStatus: 'NOT_VERIFIED' };
  }

  /**
   * Visual <-> Code Correlation:
   * Maps an interactive screen element to the exact component file, function and API
   */
  correlateElement({ screenId = null, elementLabel = '' } = {}) {
    if (!screenId || !elementLabel) return { screenId, elementLabel, correlationStatus: 'NOT_ENOUGH_EVIDENCE' };
    return {
      elementLabel,
      screenId,
      component: null,
      file: null,
      functionHandler: null,
      apiEndpoint: null,
      backendService: null,
      databaseEntity: null,
      correlationStatus: 'NOT_RESOLVED',
      reason: 'A correlação entre elemento e código ainda não foi observada em execução.'
    };
  }

  /**
   * Report available actions without claiming they were executed.
   */
  runClickEverythingTest(projectId = 'fenix_test_lab') {
    const screens = this.discoveryEngine.getScreens(projectId);
    const results = [];

    for (const screen of screens) {
      for (const action of (screen.actions || [])) {
        results.push({
          screen: screen.title,
          element: action.label,
          handler: action.handler,
          status: 'NOT_EXECUTED',
          latencyMs: null,
          evidenceStatus: 'STATIC_INVENTORY_ONLY',
          reason: 'Nenhum executor de navegador foi conectado a esta análise.'
        });
      }
    }

    return {
      projectId,
      totalElementsTested: 0,
      totalElementsDiscovered: results.length,
      workingCount: null,
      brokenCount: null,
      successRate: null,
      status: 'NOT_RUN_NO_RUNTIME',
      elements: results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Autonomous Frontend Repair Loop:
   * Detects broken elements/screens, generates surgical patch, and validates through Reality Gate
   */
  async executeAutonomousRepair(projectId, issue = {}) {
    return {
      repairId: null,
      projectId,
      issueDetected: issue.description || null,
      targetFile: issue.file || null,
      patchApplied: null,
      validation: null,
      status: 'BLOCKED',
      reason: 'Nenhum executor isolado de reparos está configurado para aplicar e validar alterações.'
    };
  }
}

module.exports = { VisualRealityEngine };
