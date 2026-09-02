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
    const brokenRoutes = [];
    const verifiedScreens = [];

    const reachableScreenIds = new Set([graph.rootScreenId]);
    for (const edge of (graph.edges || [])) {
      reachableScreenIds.add(edge.to);
    }

    for (const screen of screens) {
      // 1. Check if orphan (not reachable from root and not root itself)
      if (screen.route !== '/' && !reachableScreenIds.has(screen.screenId) && screens.length > 1) {
        orphans.push({
          screenId: screen.screenId,
          title: screen.title,
          route: screen.route,
          reason: 'Nenhum link ou rota de navegação conduz a esta tela'
        });
      }

      // 2. Audit buttons for Zero Dead Buttons rule
      for (const action of (screen.actions || [])) {
        if (!action.operational) {
          deadButtons.push({
            screenId: screen.screenId,
            screenTitle: screen.title,
            buttonLabel: action.label,
            handler: action.handler,
            reason: 'Botão não possui onClick ou operação real associada'
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
      } else {
        verifiedScreens.push({
          screenId: screen.screenId,
          route: screen.route,
          title: screen.title,
          status: 'VERIFIED_FUNCTIONAL',
          healthScore: screen.healthScore || 100
        });
      }
    }

    // An empty project is not proof of a healthy UI. Keep the audit honest and
    // force onboarding/scan before allowing a PASS result.
    const auditPass = screens.length > 0 && verifiedScreens.length === screens.length && orphans.length === 0 && deadButtons.length === 0 && brokenRoutes.length === 0;

    return {
      projectId,
      auditPass,
      totalScreensAudited: screens.length,
      verifiedCount: verifiedScreens.length,
      status: screens.length === 0 ? 'NOT_RUN_NO_SCREENS' : (auditPass ? 'PASS' : 'FAIL'),
      orphansCount: orphans.length,
      deadButtonsCount: deadButtons.length,
      brokenRoutesCount: brokenRoutes.length,
      orphans,
      deadButtons,
      brokenRoutes,
      verifiedScreens,
      zeroDeadButtonsEnforced: deadButtons.length === 0,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { OrphanScreenDetector };
