'use strict';
/**
 * FÊNIX OS — UNREAL ENGINE WORLD RUNTIME ADAPTER
 * 
 * Provides a standardized visual ingestion contract for Unreal Engine 5.
 * The Fênix backend remains the sole authority of all business logic, state, and memory.
 * The Unreal client connects over WebSocket or REST, consumes the canonical World State,
 * and renders the 3D cinematic city.
 */

class UnrealWorldAdapter {
  constructor({ cityGrowthEngine, eventBus, wsBridge = null }) {
    this.growthEngine = cityGrowthEngine;
    this.eventBus = eventBus;
    this.wsBridge = wsBridge;
    this.unrealClients = new Set();
  }

  /**
   * Manifest mapping Fênix entities to Unreal 3D Actor Blueprints & Materials
   */
  getUnrealManifest() {
    return {
      version: '1.0.0',
      targetEngine: 'Unreal Engine 5.4 / 5.5',
      coordinateSystem: 'Left-Handed Z-Up (Unreal Standard)',
      scaleRatio: '1 Unreal Unit = 1 cm (100 UU = 1 meter)',
      blueprints: {
        commandTower: 'BP_CommandCenterTower_C',
        projectComplex: 'BP_ProjectOfficeComplex_C',
        memoryCitadel: 'BP_MemoryCitadel_C',
        agentAvatar: 'BP_SpecialistAgentPawn_C',
        neuralBridge: 'BP_DataSplineMesh_C',
      },
      materials: {
        neonCyan: 'M_FenixNeonCyan_Inst',
        neonEmerald: 'M_FenixNeonEmerald_Inst',
        darkGlass: 'M_FenixCarbonGlass_Inst',
        pulseTransmission: 'M_FenixDataPulse_Inst',
      },
      districts: [
        { id: 'command-center', unrealTag: 'Tag_District_Command', center: { x: 0, y: 0, z: 0 } },
        { id: 'agent-hub', unrealTag: 'Tag_District_Workforce', center: { x: -2000, y: 0, z: 0 } },
        { id: 'memory-district', unrealTag: 'Tag_District_Memory', center: { x: 3000, y: -1000, z: 0 } },
        { id: 'project-district', unrealTag: 'Tag_District_Projects', center: { x: -3000, y: 1500, z: 0 } },
        { id: 'dev-district', unrealTag: 'Tag_District_DevFactory', center: { x: 0, y: 2000, z: 0 } },
        { id: 'data-center', unrealTag: 'Tag_District_DataVault', center: { x: 4000, y: 1000, z: 0 } },
        { id: 'observatory', unrealTag: 'Tag_District_Observatory', center: { x: 0, y: -3000, z: 0 } },
      ],
    };
  }

  /**
   * Format the World State specifically for Unreal Engine ingestion
   */
  getUnrealWorldPayload(systemSnapshot = {}) {
    const rawState = this.growthEngine.computeWorldState(systemSnapshot);
    
    // Scale 2D coords to 3D Unreal Units (x10 scale)
    const actors = [];

    // 1. Buildings
    for (const b of rawState.buildings) {
      actors.push({
        id: b.id,
        type: 'BUILDING',
        blueprint: b.type === 'command_tower' ? 'BP_CommandCenterTower_C' : (b.type.includes('citadel') ? 'BP_MemoryCitadel_C' : 'BP_ProjectOfficeComplex_C'),
        label: b.name,
        transform: {
          location: { x: (b.coordinates?.x || 0) * 10, y: (b.coordinates?.y || 0) * 10, z: 0 },
          rotation: { pitch: 0, yaw: 0, roll: 0 },
          scale: { x: 1.0, y: 1.0, z: Math.max(0.5, b.height / 20) },
        },
        state: b.status,
        metadata: {
          district: b.district,
          modulesCount: b.modulesCount || 0,
        },
      });
    }

    // 2. Agents
    for (const a of rawState.agents) {
      actors.push({
        id: a.id,
        type: 'AGENT',
        blueprint: 'BP_SpecialistAgentPawn_C',
        label: `${a.name} (${a.role})`,
        transform: {
          location: { x: (a.position?.x || 0) * 10, y: (a.position?.y || 0) * 10, z: 50 },
          rotation: { pitch: 0, yaw: 0, roll: 0 },
          scale: { x: 1.0, y: 1.0, z: 1.0 },
        },
        state: a.status,
        animationState: a.status === 'RUNNING' ? 'TYPING_OPERATIONAL' : 'STANDBY_OBSERVE',
        metadata: {
          role: a.role,
          currentJob: a.currentJob,
        },
      });
    }

    // 3. Splines / Data Links
    const splines = rawState.connections.map(c => ({
      id: c.id,
      fromId: c.fromBuilding,
      toId: c.toBuilding,
      type: c.type,
      active: c.active,
      pulseSpeed: 1.5,
    }));

    return {
      protocol: 'FENIX_UNREAL_SYNC_V1',
      serverTime: new Date().toISOString(),
      worldInfo: rawState.world,
      actors,
      splines,
      districts: rawState.districts,
    };
  }

  /**
   * Broadcast an event to any connected Unreal client
   */
  broadcastToUnreal(eventType, payload) {
    const message = JSON.stringify({
      protocol: 'FENIX_UNREAL_EVENT_V1',
      type: eventType,
      payload,
      timestamp: new Date().toISOString(),
    });

    for (const ws of this.unrealClients) {
      if (ws.readyState === 1 /* OPEN */) {
        try {
          ws.send(message);
        } catch (e) {}
      }
    }
  }
}

let globalUnrealWorldAdapter = null;
function getUnrealWorldAdapter(options = {}) {
  if (!globalUnrealWorldAdapter) {
    globalUnrealWorldAdapter = new UnrealWorldAdapter(options);
  }
  return globalUnrealWorldAdapter;
}

module.exports = {
  UnrealWorldAdapter,
  getUnrealWorldAdapter,
};
