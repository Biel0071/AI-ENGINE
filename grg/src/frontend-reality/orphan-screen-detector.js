/**
 * FÊNIX OS — ORPHAN SCREEN & DEAD BUTTON DETECTOR (FRONTEND REALITY LEVEL 10)
 * 
 * Objective: Detect unreachable screens, dead buttons, broken links and disconnected handlers.
 * Enforces "ZERO DEAD BUTTONS" and "EVERY SCREEN MUST HAVE A PATH".
 */

class OrphanScreenDetector {
  constructor({ screenDiscoveryEngine = null, navigationGraph = null } = {}) {
    this.screenDiscovery = screenDiscoveryEngine;
    this.navigationGraph = navigationGraph;
  }

  /**
   * Run comprehensive audit on screens and interactive elements
   */
  auditProject(projectId = 'fenix_test_lab') {
    const screens = this.screenDiscovery ? this.screenDiscovery.getScreens(projectId) : [];
    const graph = this.navigationGraph ? this.navigationGraph.getGraph(projectId) : { edges: [] };

    const orphans = [];
    const deadButtons = [];
    const potentialDeadButtons = [];
    const brokenRoutes = [];
    const verifiedScreens = [];
    const unverifiedScreens = [];

    const navigationVerified = graph.verificationStatus === 'VERIFIED';
    const reachableScreenIds = new Set(graph.rootScreenId ? [graph.rootScreenId] : []);
    if (navigationVerified) {
      for (const edge of (graph.edges || [])) {
        if (edge.verificationStatus === 'VERIFIED') reachableScreenIds.add(edge.to);
      }
    }

    for (const screen of screens) {
      // 1. Check if orphan (not reachable from root and not root itself)
      if (navigationVerified && screen.route !== '/' && !reachableScreenIds.has(screen.screenId) && screens.length > 1) {
        orphans.push({
          screenId: screen.screenId,
          title: screen.title,
          route: screen.route,
          reason: 'Nenhum link ou rota de navegação conduz a esta tela'
        });
      }

      // 2. Audit buttons for Zero Dead Buttons rule
      for (const action of (screen.actions || [])) {
        if (action.verificationStatus === 'VERIFIED' && action.operational === false) {
          deadButtons.push({
            screenId: screen.screenId,
            screenTitle: screen.title,
            buttonLabel: action.label,
            handler: action.handler,
            reason: 'A execução real confirmou que o botão não concluiu a ação'
          });
        } else if (action.handlerPresent === false) {
          potentialDeadButtons.push({
            screenId: screen.screenId,
            screenTitle: screen.title,
            buttonLabel: action.label,
            reason: 'A análise estática não encontrou handler; requer validação no navegador'
          });
        }
      }

      // 3. Verify route structure
      if (!screen.route || screen.route.length === 0) {
        brokenRoutes.push({
          screenId: screen.screenId,
          title: screen.title,
          reason: 'Componente não possui rota registrada'
        });
      } else if (screen.verificationStatus === 'VERIFIED') {
        verifiedScreens.push({
          screenId: screen.screenId,
          route: screen.route,
          title: screen.title,
          status: 'VERIFIED_FUNCTIONAL',
          healthScore: screen.healthScore
        });
      }
      if (screen.verificationStatus !== 'VERIFIED') {
        unverifiedScreens.push({ screenId: screen.screenId, route: screen.route, title: screen.title });
      }
    }

    const allScreensVerified = screens.length > 0 && verifiedScreens.length === screens.length;
    const allActionsVerified = screens.every((screen) => (screen.actions || []).every((action) => action.verificationStatus === 'VERIFIED'));
    const zeroDeadButtonsEnforced = allScreensVerified && allActionsVerified ? deadButtons.length === 0 : null;
    const auditPass = allScreensVerified && navigationVerified && allActionsVerified
      ? orphans.length === 0 && deadButtons.length === 0 && brokenRoutes.length === 0
      : null;

    return {
      projectId,
      auditPass,
      totalScreensAudited: screens.length,
      verifiedCount: verifiedScreens.length,
      unverifiedCount: unverifiedScreens.length,
      status: screens.length === 0 ? 'NOT_RUN_NO_SCREENS' : (auditPass == null ? 'NOT_VERIFIED' : (auditPass ? 'PASS' : 'FAIL')),
      navigationStatus: navigationVerified ? 'VERIFIED' : 'NOT_VERIFIED',
      orphansCount: orphans.length,
      deadButtonsCount: deadButtons.length,
      potentialDeadButtonsCount: potentialDeadButtons.length,
      brokenRoutesCount: brokenRoutes.length,
      orphans,
      deadButtons,
      potentialDeadButtons,
      brokenRoutes,
      verifiedScreens,
      unverifiedScreens,
      zeroDeadButtonsEnforced,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { OrphanScreenDetector };
