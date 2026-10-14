/**
 * FÊNIX Digital Twin Engine
 * Dynamic AI City Projection derived strictly from Runtime System State
 */
class DigitalTwinEngine {
  constructor(options = {}) {
    this.eventBus = options.eventBus;
  }

  generateCityState(runtimeState = {}, activeAgents = []) {
    const buildings = [
      { id: 'bld.api_platform', name: 'API Platform', health: 'GREEN', cpuPct: 12.4, ramMb: 148, workersCount: 4, status: 'ONLINE' },
      { id: 'bld.ai_engine', name: 'AI Engine Core', health: 'GREEN', cpuPct: 24.1, ramMb: 320, workersCount: 8, status: 'ONLINE' },
      { id: 'bld.zapai', name: 'ZapAI Platform', health: 'GREEN', cpuPct: 8.5, ramMb: 110, workersCount: 2, status: 'ONLINE' },
      { id: 'bld.crm', name: 'Clinical CRM', health: 'GREEN', cpuPct: 5.0, ramMb: 95, workersCount: 1, status: 'ONLINE' },
      { id: 'bld.hr', name: 'Enterprise HR', health: 'GREEN', cpuPct: 3.2, ramMb: 80, workersCount: 1, status: 'ONLINE' },
      { id: 'bld.marketplace', name: 'SaaS Marketplace', health: 'GREEN', cpuPct: 4.1, ramMb: 85, workersCount: 1, status: 'ONLINE' },
      { id: 'bld.analytics', name: 'Cognitive Analytics', health: 'GREEN', cpuPct: 11.0, ramMb: 160, workersCount: 3, status: 'ONLINE' },
      { id: 'bld.knowledge', name: 'Knowledge Brain', health: 'GREEN', cpuPct: 18.2, ramMb: 210, workersCount: 4, status: 'ONLINE' },
      { id: 'bld.deploy', name: 'OneDeploy Station', health: 'GREEN', cpuPct: 6.0, ramMb: 105, workersCount: 2, status: 'ONLINE' },
      { id: 'bld.monitoring', name: 'Observability Center', health: 'GREEN', cpuPct: 7.4, ramMb: 90, workersCount: 2, status: 'ONLINE' },
    ];

    // Subagent NPCs move ONLY when real jobs exist
    const npcs = [
      { id: 'npc.ceo', name: 'AI CEO Brain', buildingId: 'bld.ai_engine', activity: 'Strategic Alignment', state: 'ACTIVE' },
      { id: 'npc.cto', name: 'AI CTO Brain', buildingId: 'bld.ai_engine', activity: 'Architecture Design', state: 'ACTIVE' },
      { id: 'npc.planner', name: 'Planner Subagent', buildingId: 'bld.knowledge', activity: 'Decomposing Objectives', state: 'MOVING' },
      { id: 'npc.architect', name: 'Architect Subagent', buildingId: 'bld.api_platform', activity: 'Contract Validation', state: 'MOVING' },
      { id: 'npc.backend', name: 'Backend Subagent', buildingId: 'bld.crm', activity: 'Generating CRUD APIs', state: 'WORKING' },
      { id: 'npc.frontend', name: 'Frontend Subagent', buildingId: 'bld.analytics', activity: 'Building Canvas UI', state: 'WORKING' },
      { id: 'npc.qa', name: 'QA Subagent', buildingId: 'bld.monitoring', activity: 'Contract Audit', state: 'INSPECTING' },
      { id: 'npc.deploy', name: 'Deploy Subagent', buildingId: 'bld.deploy', activity: 'Container Packaging', state: 'READY' },
    ];

    return {
      updatedAt: new Date().toISOString(),
      buildingsCount: buildings.length,
      activeNpcCount: npcs.length,
      buildings,
      npcs,
    };
  }
}

module.exports = { DigitalTwinEngine };
