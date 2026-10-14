/**
 * FÊNIX OS — SCREEN NAVIGATION GRAPH (FRONTEND REALITY LEVEL 10)
 * 
 * Objective: Build a complete, navigable directed graph of all screens, routes and transition paths.
 * Every screen must have a valid reachable path from an entry point.
 */

class ScreenNavigationGraph {
  constructor({ screenDiscoveryEngine = null } = {}) {
    this.screenDiscovery = screenDiscoveryEngine;
    this.graphs = new Map(); // projectId -> NavigationGraph
  }

  /**
   * Build complete navigation graph from discovered screens
   */
  buildGraph(projectId, screens = []) {
    const nodes = [];
    const edges = [];

    for (const screen of screens) {
      nodes.push({
        id: screen.screenId,
        route: screen.route,
        title: screen.title,
        component: screen.component,
        permissions: screen.permissions,
        healthScore: screen.healthScore,
        status: screen.status
      });

      // Derive transitions based on route structure
      if (screen.route === '/' || screen.route === '/login') {
        // Root links to other primary views
        const otherScreens = screens.filter(s => s.screenId !== screen.screenId);
        for (const target of otherScreens) {
          edges.push({
            from: screen.screenId,
            to: target.screenId,
            action: `navigate(${target.route})`,
            type: 'NAVIGATIONAL',
            operational: true
          });
        }
      }
    }

    const graph = {
      projectId,
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodes,
      edges,
      rootScreenId: nodes[0]?.id || 'screen_dashboard_root',
      generatedAt: new Date().toISOString()
    };

    this.graphs.set(projectId, graph);
    return graph;
  }

  /**
   * Get Navigation Graph for project
   */
  getGraph(projectId = 'fenix_test_lab') {
    if (this.graphs.has(projectId)) {
      return this.graphs.get(projectId);
    }
    const screens = this.screenDiscovery ? this.screenDiscovery.getScreens(projectId) : [];
    return this.buildGraph(projectId, screens);
  }
}

module.exports = { ScreenNavigationGraph };
