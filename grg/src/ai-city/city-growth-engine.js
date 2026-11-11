'use strict';
/**
 * FÊNIX LIVING CITY — CITY GROWTH ENGINE
 * Observes the living system state (projects, agents, jobs, memory, concepts, capabilities)
 * and dynamically projects the urban evolution of the AI City.
 * 
 * Growth is 100% driven by real system metrics — NO artificial leveling.
 */

class CityGrowthEngine {
  constructor(options = {}) {
    this.projectDNAManager = options.projectDNAManager || null;
    this.rebornMemoryEngine = options.rebornMemoryEngine || null;
    this.graphBrain = options.graphBrain || null;
    this.eventBus = options.eventBus || null;

    // Canonical Districts (Starting from Core and expanding dynamically)
    this.districts = [
      { id: 'command-center', name: 'Central Command Plaza', role: 'CORE', level: 1, baseCapacity: 10 },
      { id: 'agent-hub', name: 'Agent Workforce Hub', role: 'AGENT_HUB', level: 1, baseCapacity: 20 },
      { id: 'memory-district', name: 'Memory & Cognitive Fabric', role: 'MEMORY_HUB', level: 1, baseCapacity: 100 },
      { id: 'project-district', name: 'Project Space & Workspaces', role: 'PROJECT_SPACE', level: 1, baseCapacity: 10 },
      { id: 'dev-district', name: 'Software Factory District', role: 'DEV', level: 1, baseCapacity: 15 },
      { id: 'data-center', name: 'Data & Security Fortress', role: 'INFRA', level: 1, baseCapacity: 10 },
      { id: 'observatory', name: 'Observatory & Telemetry Spire', role: 'OBSERVABILITY', level: 1, baseCapacity: 10 },
    ];
  }

  /**
   * Compute the canonical World State by aggregating real subsystem states
   */
  computeWorldState(systemSnapshot = {}) {
    const memMetrics = this.rebornMemoryEngine ? this.rebornMemoryEngine.getMetrics() : { totalMemories: 0, rebornCount: 0, capabilityCount: 0 };
    const projects = this.projectDNAManager ? this.projectDNAManager.listAll() : [];
    const agents = systemSnapshot.agents || [];
    const jobs = systemSnapshot.jobs || [];
    const missions = systemSnapshot.missions || [];

    // Calculate City Density and Load
    const totalEntities = projects.length + agents.length + jobs.length + (memMetrics.totalMemories || 0);
    let cityDensity = 'nascent';
    if (totalEntities > 500) cityDensity = 'metropolis';
    else if (totalEntities > 150) cityDensity = 'thriving';
    else if (totalEntities > 30) cityDensity = 'growing';

    // Compute dynamic buildings derived from real projects
    const buildings = [];
    const connections = [];

    // 1. Project Buildings (Scale derived from modules, agents, and dependencies)
    projects.forEach((proj, idx) => {
      const moduleCount = (proj.modules || []).length;
      const agentCount = (proj.agents || []).length;
      const memCount = (proj.memories || []).length;
      const complexity = moduleCount * 2 + agentCount * 3 + memCount;

      let buildingType = 'small_building';
      let heightUnits = 10 + complexity * 2;
      let status = proj.currentState?.health === 'HEALTHY' ? 'ACTIVE' : 'WARNING';

      if (complexity > 30) {
        buildingType = 'district_complex';
        heightUnits = 50 + complexity;
      } else if (complexity > 10) {
        buildingType = 'building_complex';
        heightUnits = 25 + complexity;
      }

      const buildingId = `bld_${proj.projectId}`;
      buildings.push({
        id: buildingId,
        projectId: proj.projectId,
        name: proj.identity || proj.name || proj.projectId,
        district: 'project-district',
        type: buildingType,
        height: heightUnits,
        modulesCount: moduleCount,
        assignedAgents: agentCount,
        status,
        coordinates: {
          x: -300 + (idx * 200),
          y: 150 + (idx % 2 === 0 ? 50 : -50),
          z: 0,
        },
      });

      // Inter-project dependencies become Physical Roads/Bridges/Data Links
      (proj.dependencies || []).forEach(depId => {
        connections.push({
          id: `conn_${proj.projectId}_${depId}`,
          fromBuilding: buildingId,
          toBuilding: `bld_${depId}`,
          type: 'DATA_LINK',
          bandwidth: '10 Gbps',
          active: true,
        });
      });
    });

    // 2. Memory Hub & Capability Spire
    const memoryBuildingHeight = 20 + (memMetrics.rebornCount * 10) + (memMetrics.capabilityCount * 5);
    buildings.push({
      id: 'bld_memory_citadel',
      name: 'Memory Citadel & Cognitive Core',
      district: 'memory-district',
      type: memMetrics.rebornCount > 0 ? 'cognitive_citadel' : 'memory_vault',
      height: memoryBuildingHeight,
      rebornMemories: memMetrics.rebornCount,
      capabilities: memMetrics.capabilityCount,
      status: 'ACTIVE',
      coordinates: { x: 300, y: -50, z: 0 },
    });

    // Connect Memory Citadel to Central Plaza
    connections.push({
      id: 'conn_memory_core',
      fromBuilding: 'bld_memory_citadel',
      toBuilding: 'bld_command_center',
      type: 'NEURAL_BRIDGE',
      active: true,
    });

    // 3. Command Center Tower
    buildings.push({
      id: 'bld_command_center',
      name: 'Central Autonomous Control Tower',
      district: 'command-center',
      type: 'command_tower',
      height: 60,
      activeAgents: agents.length,
      status: 'ACTIVE',
      coordinates: { x: 0, y: 0, z: 0 },
    });

    // Canonical World State Representation
    const worldState = {
      world: {
        time: new Date().toISOString(),
        weather: 'clear',
        systemLoad: Number((systemSnapshot.cpuUsage || 0.15).toFixed(2)),
        cityDensity,
        totalNodes: buildings.length + agents.length + connections.length,
      },
      districts: this.districts,
      buildings,
      projects: projects.map(p => ({
        id: p.projectId,
        name: p.identity,
        architecture: p.architecture,
        status: p.currentState?.health || 'HEALTHY',
      })),
      agents: agents.map(a => ({
        id: a.id,
        name: a.name,
        role: a.role,
        status: a.status,
        district: a.district || 'command-center',
        position: a.position || { x: 0, y: 0, z: 0 },
        currentJob: a.currentJob || null,
      })),
      jobs: jobs.slice(-20),
      missions: missions.slice(-10),
      memories: {
        total: memMetrics.totalMemories,
        reborn: memMetrics.rebornCount,
        capabilities: memMetrics.capabilityCount,
      },
      connections,
      events: systemSnapshot.recentEvents || [],
    };

    return worldState;
  }
}

let globalCityGrowthEngine = null;
function getCityGrowthEngine(options = {}) {
  if (!globalCityGrowthEngine) {
    globalCityGrowthEngine = new CityGrowthEngine(options);
  }
  return globalCityGrowthEngine;
}

module.exports = {
  CityGrowthEngine,
  getCityGrowthEngine,
};
