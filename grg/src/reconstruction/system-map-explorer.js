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

    if (!systemTwin.id && !systemTwin.name) {
      return {
        systemId: null,
        status: 'NOT_DISCOVERED',
        totalNodes: 0,
        totalEdges: 0,
        graph: { nodes, edges },
        legend: NODE_COLORS,
        generatedAt: new Date().toISOString()
      };
    }

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
        properties: {
          type,
          evidenceSource: 'SYSTEM_TWIN',
          verificationStatus: 'NOT_VERIFIED',
          ...extra
        }
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
        smooth: { type: 'cubicBezier' },
        verificationStatus: 'NOT_VERIFIED',
        evidenceSource: 'SYSTEM_TWIN'
      });
    }

    // 1. Root System Node
    const sysId = systemTwin.id || `system:${systemTwin.name}`;
    addNode(sysId, systemTwin.name, 'SYSTEM', {
      sourceUrl: systemTwin.sourceUrl,
      status: systemTwin.status
    });

    // 2. Pages and explicitly declared transitions
    (systemTwin.pages || []).forEach(p => {
      const pageId = p.id || `page:${p.url || p.title}`;
      addNode(pageId, p.title || p.url, 'PAGE', { url: p.url, screenshot: p.screenshot });
      addEdge(sysId, pageId, 'HAS_PAGE', 'declares');

      (p.nextScreens || []).forEach(nextId => {
        addEdge(pageId, nextId, 'NAVIGATES_TO', 'navigates to');
      });
    });

    // 3. Components declared by the observation/twin
    (systemTwin.components || []).forEach(c => {
      const compName = typeof c === 'string' ? c : (c.name || c.id);
      const compId = `comp:${compName}`;
      addNode(compId, compName, 'COMPONENT', { component: compName });
      addEdge(sysId, compId, 'DECLARES_COMPONENT', 'declares');
    });

    // 4. API requests or endpoints captured in the twin
    (systemTwin.apis || []).forEach(a => {
      const apiEndpoint = typeof a === 'string' ? a : (a.url || a.endpoint);
      const method = typeof a === 'string' ? 'GET' : (a.method || 'GET');
      const apiId = `api:${method}-${apiEndpoint}`;
      addNode(apiId, `${method} ${apiEndpoint}`, 'API', { method, endpoint: apiEndpoint });
      addEdge(sysId, apiId, 'OBSERVED_API', 'observed');
    });

    // 5. Runtime objects are included only when present in the supplied twin.
    (systemTwin.databases || []).forEach((database, index) => {
      const id = database.id || `database:${index + 1}`;
      addNode(id, database.name || id, 'DATABASE', { engine: database.engine || null });
    });

    (systemTwin.agents || []).forEach((agent, index) => {
      const id = agent.id || `agent:${index + 1}`;
      addNode(id, agent.name || agent.label || id, 'AGENT', { role: agent.role || null, status: agent.status || null });
    });

    (systemTwin.jobs || []).forEach((job, index) => {
      const id = job.id || `job:${index + 1}`;
      addNode(id, job.name || job.title || id, 'JOB', { status: job.status || null });
    });

    (systemTwin.tests || []).forEach((item, index) => {
      const id = typeof item === 'object' ? (item.id || `test:${index + 1}`) : `test:${index + 1}`;
      const label = typeof item === 'string' ? item : (item.name || item.title || id);
      addNode(id, label, 'TEST', { status: typeof item === 'object' ? (item.status || null) : null });
    });

    (systemTwin.edges || []).forEach((edge) => {
      if (edge?.from && edge?.to && edge?.type) {
        addEdge(edge.from, edge.to, edge.type, edge.label || edge.type);
      }
    });

    return {
      systemId: sysId,
      status: 'MODEL_ONLY',
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
