const { EventEmitter } = require('node:events');
const crypto = require('node:crypto');

/**
 * FenixMeshCluster — Fênix OS Agent Operating System (Fase 14)
 * 
 * Regra Suprema: O Agente pertence ao Fênix, não à máquina.
 * A máquina é apenas o nó de execução pontual.
 * Se o PC desliga, a missão migra para a VPS sem perder estado ou evidência.
 * Quando o PC volta, ele reconecta, sincroniza e continua observando.
 */

const NODE_TYPES = {
  PC: 'PC',
  VPS: 'VPS',
  DOCKER: 'DOCKER',
  MOBILE: 'MOBILE',
  CLOUD: 'CLOUD'
};

const NODE_STATUS = {
  ONLINE: 'ONLINE',
  DEGRADED: 'DEGRADED',
  OFFLINE: 'OFFLINE'
};

class FenixMeshCluster extends EventEmitter {
  constructor({ eventBus = null, logger = console } = {}) {
    super();
    this.eventBus = eventBus;
    this.logger = logger;
    this.nodes = new Map(); // nodeId -> NodeRecord
    this.nodeMissions = new Map(); // nodeId -> Set(missionId)
    this.missionPlacement = new Map(); // missionId -> nodeId
    this.initDefaultNodes();
  }

  initDefaultNodes() {
    // VPS Node (Always available production anchor)
    this.registerNode({
      id: 'node-vps-primary',
      name: 'VPS Production Anchor (209.50.241.22)',
      type: NODE_TYPES.VPS,
      address: '209.50.241.22',
      capabilities: ['runtime.host', 'database.postgres', 'cache.redis', 'vector.qdrant', 'inference.local']
    });

    // PC Node (Developer workstation)
    this.registerNode({
      id: 'node-pc-local',
      name: 'Developer Local Workstation',
      type: NODE_TYPES.PC,
      address: '127.0.0.1',
      capabilities: ['ide.workspace', 'browser.ui', 'testing.local', 'git.local']
    });
  }

  registerNode({ id, name, type = NODE_TYPES.PC, address = '127.0.0.1', capabilities = [] }) {
    const node = {
      id,
      name,
      type,
      address,
      capabilities: Array.from(new Set(capabilities)),
      status: NODE_STATUS.ONLINE,
      lastHeartbeat: Date.now(),
      metrics: { cpuPercent: 0, ramMb: 0, activeJobs: 0 },
      connectedAt: new Date().toISOString()
    };
    this.nodes.set(id, node);
    if (!this.nodeMissions.has(id)) {
      this.nodeMissions.set(id, new Set());
    }
    this.emit('mesh.node.registered', node);
    return node;
  }

  heartbeat(nodeId, metrics = {}) {
    const node = this.nodes.get(nodeId);
    if (!node) throw new Error(`Node ${nodeId} not registered in Fenix Mesh`);
    node.lastHeartbeat = Date.now();
    node.status = NODE_STATUS.ONLINE;
    if (metrics.cpuPercent != null) node.metrics.cpuPercent = metrics.cpuPercent;
    if (metrics.ramMb != null) node.metrics.ramMb = metrics.ramMb;
    return node;
  }

  assignMission(missionId, preferredNodeId = null) {
    let targetNode = null;
    if (preferredNodeId && this.nodes.has(preferredNodeId)) {
      const candidate = this.nodes.get(preferredNodeId);
      if (candidate.status === NODE_STATUS.ONLINE) targetNode = candidate;
    }
    if (!targetNode) {
      // Find least loaded online node (prefer VPS anchor as fallback)
      const onlineNodes = Array.from(this.nodes.values()).filter(n => n.status === NODE_STATUS.ONLINE);
      if (onlineNodes.length === 0) throw new Error('No online nodes available in Fenix Mesh');
      targetNode = onlineNodes.sort((a, b) => (this.nodeMissions.get(a.id)?.size || 0) - (this.nodeMissions.get(b.id)?.size || 0))[0];
    }

    this.missionPlacement.set(missionId, targetNode.id);
    this.nodeMissions.get(targetNode.id).add(missionId);
    this.emit('mesh.mission.assigned', { missionId, nodeId: targetNode.id });
    return { assignedNodeId: targetNode.id, nodeName: targetNode.name };
  }

  handleNodeFailure(failedNodeId, reason = 'Heartbeat timeout') {
    const node = this.nodes.get(failedNodeId);
    if (!node) return { migratedCount: 0 };
    node.status = NODE_STATUS.OFFLINE;
    this.emit('mesh.node.offline', { nodeId: failedNodeId, reason });

    const orphanMissions = Array.from(this.nodeMissions.get(failedNodeId) || []);
    const migrations = [];

    // Find surviving anchor node (e.g. VPS)
    const survivingNodes = Array.from(this.nodes.values()).filter(n => n.id !== failedNodeId && n.status === NODE_STATUS.ONLINE);
    if (survivingNodes.length === 0) {
      this.logger.warn('[FenixMesh] Critical: All mesh nodes offline. Missions paused.');
      return { migratedCount: 0, status: 'NO_SURVIVING_NODES' };
    }

    const targetNode = survivingNodes[0];
    for (const missionId of orphanMissions) {
      this.nodeMissions.get(failedNodeId).delete(missionId);
      this.nodeMissions.get(targetNode.id).add(missionId);
      this.missionPlacement.set(missionId, targetNode.id);
      migrations.push({ missionId, from: failedNodeId, to: targetNode.id });
    }

    this.emit('mesh.missions.migrated', { failedNodeId, targetNodeId: targetNode.id, migrations });
    return { migratedCount: migrations.length, targetNodeId: targetNode.id, migrations };
  }

  syncNodeOnReconnection(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return null;
    node.status = NODE_STATUS.ONLINE;
    node.lastHeartbeat = Date.now();

    // Reconcile snapshot
    const activeAssignments = [];
    for (const [mId, nId] of this.missionPlacement.entries()) {
      activeAssignments.push({ missionId: mId, currentNodeId: nId });
    }

    const syncReport = {
      nodeId,
      status: 'RECONCILED',
      activeAssignments,
      meshNodesOnline: Array.from(this.nodes.values()).filter(n => n.status === NODE_STATUS.ONLINE).length,
      syncedAt: new Date().toISOString()
    };
    this.emit('mesh.node.reconnected', syncReport);
    return syncReport;
  }

  toJSON() {
    return {
      nodes: Array.from(this.nodes.values()),
      totalNodes: this.nodes.size,
      onlineNodes: Array.from(this.nodes.values()).filter(n => n.status === NODE_STATUS.ONLINE).length,
      activeMissionsCount: this.missionPlacement.size
    };
  }
}

module.exports = { FenixMeshCluster, NODE_TYPES, NODE_STATUS };
