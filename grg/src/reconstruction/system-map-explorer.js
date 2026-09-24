'use strict';
/**
 * FÊNIX OS V11 — SYSTEM MAP EXPLORER (MIRO-STYLE VISUAL GRAPH)
 * 
 * Nodes:
 *   SYSTEM, PAGE, COMPONENT, API, FLOW, AGENT, JOB, DATABASE, TEST
 * 
 * Edges:
 *   NAVIGATES_TO, CALLS, DEPENDS_ON, USES, CREATES, TESTS, FIXES
 * 
 * Prepares interactive Vis.js graph network structure with visual styles,
 * icons, colors, groupings, and node inspector metadata.
 */

const NODE_COLORS = {
  SYSTEM: '#8b5cf6',
  PAGE: '#3b82f6',
  COMPONENT: '#06b6d4',
  API: '#10b981',
  FLOW: '#f59e0b',
  AGENT: '#ec4899',
  JOB: '#6366f1',
  DATABASE: '#14b8a6',
  TEST: '#84cc16'
};

class SystemMapExplorer {
  generateSystemMap(systemTwin = {}, options = {}) {
    const nodes = [];
    const edges = [];
    const seenNodes = new Set();
    const seenEdges = new Set();

    function addNode(id, label, type, extra = {}) {
      if (seenNodes.has(id)) return;
      seenNodes.add(id);

      nodes.push({
        id,
        label,
        group: type,
        color: {
          background: NODE_COLORS[type] || '#3b82f6',
          border: '#ffffff',
          highlight: { background: '#ffffff', border: NODE_COLORS[type] || '#3b82f6' }
        },
        shape: type === 'SYSTEM' ? 'hexagon' : (type === 'DATABASE' ? 'database' : (type === 'AGENT' ? 'diamond' : 'box')),
        font: { color: '#ffffff', face: 'Inter, sans-serif', size: type === 'SYSTEM' ? 14 : 11 },
        shadow: { enabled: true, color: 'rgba(0,0,0,0.5)', size: 8 },
        properties: { type, ...extra }
      });
    }

    function addEdge(from, to, type, label) {
      const edgeKey = `${from}->${to}:${type}`;
      if (seenEdges.has(edgeKey)) return;
      seenEdges.add(edgeKey);

      edges.push({
        id: edgeKey,
        from,
        to,
        label: label || type.toLowerCase().replace(/_/g, ' '),
        arrows: 'to',
        color: { color: 'rgba(255, 255, 255, 0.25)', highlight: '#3b82f6' },
        font: { color: '#94a3b8', size: 9, align: 'middle' },
        smooth: { type: 'cubicBezier' }
      });
    }

    // 1. Root System Node
    const sysId = systemTwin.id || 'system:fenix-core';
    addNode(sysId, systemTwin.name || 'Fênix System Core', 'SYSTEM', {
      sourceUrl: systemTwin.sourceUrl,
      status: systemTwin.status
    });

    // 2. Database Node
    const dbId = `db:${sysId}`;
    addNode(dbId, 'PostgreSQL Cluster', 'DATABASE', { engine: 'PostgreSQL 16' });
    addEdge(sysId, dbId, 'DEPENDS_ON', 'stores data in');

    // 3. Pages Nodes & Transitions
    (systemTwin.pages || []).forEach(p => {
      const pageId = p.id || `page:${p.url || p.title}`;
      addNode(pageId, p.title || p.url, 'PAGE', { url: p.url, screenshot: p.screenshot });
      addEdge(sysId, pageId, 'HAS_PAGE', 'displays');

      (p.nextScreens || []).forEach(nextId => {
        addEdge(pageId, nextId, 'NAVIGATES_TO', 'navigates to');
      });
    });

    // 4. Components Nodes
    (systemTwin.components || []).forEach(c => {
      const compName = typeof c === 'string' ? c : (c.name || c.id);
      const compId = `comp:${compName}`;
      addNode(compId, compName, 'COMPONENT', { component: compName });
      addEdge(sysId, compId, 'USES', 'renders');
    });

    // 5. APIs Nodes
    (systemTwin.apis || []).forEach(a => {
      const apiEndpoint = typeof a === 'string' ? a : (a.url || a.endpoint);
      const method = typeof a === 'string' ? 'GET' : (a.method || 'GET');
      const apiId = `api:${method}-${apiEndpoint}`;
      addNode(apiId, `${method} ${apiEndpoint}`, 'API', { method, endpoint: apiEndpoint });
      addEdge(sysId, apiId, 'CALLS', 'exposes');
      addEdge(apiId, dbId, 'USES', 'queries');
    });

    // 6. Agents Nodes
    const activeAgents = [
      { id: 'agent-orchestrator', label: '👑 Orchestrator', role: 'ORCHESTRATOR' },
      { id: 'agent-frontend', label: '🎨 Frontend Agent', role: 'FRONTEND' },
      { id: 'agent-backend', label: '⚙️ Backend Agent', role: 'BACKEND' },
      { id: 'agent-qa', label: '🧪 Visual QA Agent', role: 'QA' }
    ];

    activeAgents.forEach(ag => {
      addNode(ag.id, ag.label, 'AGENT', { role: ag.role });
      addEdge(ag.id, sysId, 'CREATES', 'manages & builds');
    });

    // 7. Test Suite Node
    const testNodeId = `test:${sysId}`;
    addNode(testNodeId, 'E2E & Visual QA Suite', 'TEST', { testsCount: 14 });
    addEdge(testNodeId, sysId, 'TESTS', 'verifies');

    return {
      systemId: sysId,
      totalNodes: nodes.length,
      totalEdges: edges.length,
      graph: { nodes, edges },
      legend: NODE_COLORS,
      generatedAt: new Date().toISOString()
    };
  }
}

const globalSystemMapExplorer = new SystemMapExplorer();

module.exports = {
  SystemMapExplorer,
  globalSystemMapExplorer,
  NODE_COLORS
};
