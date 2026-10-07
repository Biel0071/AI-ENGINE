'use strict';

/**
 * FÊNIX OS — World Command & Specification Engine
 * ================================================
 * Declarative World Mutation & Hot Specification Layer:
 * - Executes declarative commands (CREATE_BUILDING, CREATE_ROOM, CREATE_AGENT,
 *   CREATE_WORKSTATION, MOVE_AGENT, ASSIGN_MISSION, UPDATE_BUILDING, REMOVE_ENTITY,
 *   CHANGE_ENVIRONMENT).
 * - Enforces zero-mock contract, validation, and deterministic state transitions.
 * - Records audit trail in commandLog with actor, timestamp, duration, status.
 * - Emits real-time events on globalBus for SSE streaming to the 3D WebGL World.
 * - Persists mutations immediately to .data/world-state.json.
 */

const { globalBus } = require('../eventing/fenix-event-bus');
const { getWorldStateEngine } = require('./world-state-engine');

class WorldCommandEngine {
  constructor(stateEngine = null) {
    this.stateEngine = stateEngine || getWorldStateEngine();
    this.commandLog = [];
  }

  /**
   * Execute a declarative World Command
   * @param {Object} command - { type, payload, actor, missionId }
   * @returns {Object} { ok: true, commandId, type, result, timestamp }
   */
  async executeCommand(command) {
    if (!command || !command.type) {
      throw new Error('[WorldCommandEngine] Command must specify a type');
    }

    const startTime = Date.now();
    const type = String(command.type).toUpperCase().trim();
    const payload = command.payload || {};
    const actor = command.actor || 'operator';
    const missionId = command.missionId || null;
    const commandId = `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const timestamp = new Date().toISOString();

    let result = null;

    try {
      switch (type) {
        case 'CREATE_BUILDING':
          result = this._handleCreateBuilding(payload, commandId, timestamp);
          break;

        case 'CREATE_ROOM':
          result = this._handleCreateRoom(payload, commandId, timestamp);
          break;

        case 'CREATE_AGENT':
          result = this._handleCreateAgent(payload, commandId, timestamp);
          break;

        case 'CREATE_WORKSTATION':
        case 'CREATE_OBJECT':
          result = this._handleCreateWorkstation(payload, commandId, timestamp);
          break;

        case 'MOVE_AGENT':
          result = this._handleMoveAgent(payload, commandId, timestamp);
          break;

        case 'ASSIGN_MISSION':
        case 'ASSIGN_AGENT':
          result = this._handleAssignMission(payload, commandId, timestamp);
          break;

        case 'COMPLETE_TASK':
          result = this._handleCompleteTask(payload, commandId, timestamp);
          break;

        case 'UPDATE_BUILDING':
          result = this._handleUpdateBuilding(payload, commandId, timestamp);
          break;

        case 'UPDATE_AGENT':
          result = this._handleUpdateAgent(payload, commandId, timestamp);
          break;

        case 'REMOVE_ENTITY':
          result = this._handleRemoveEntity(payload, commandId, timestamp);
          break;

        case 'CHANGE_ENVIRONMENT':
          result = this._handleChangeEnvironment(payload, commandId, timestamp);
          break;

        default:
          throw new Error(`[WorldCommandEngine] Unsupported command type: ${type}`);
      }

      const durationMs = Date.now() - startTime;
      const logEntry = {
        commandId,
        type,
        actor,
        missionId,
        payload,
        result,
        durationMs,
        status: 'SUCCESS',
        timestamp
      };

      this.commandLog.push(logEntry);
      if (this.commandLog.length > 500) this.commandLog.shift();

      // Persist world state
      this.stateEngine.schedulePersist();

      // Broadcast command execution to global event bus for 3D hot mutation
      globalBus.emit('world.command.executed', logEntry);

      return {
        ok: true,
        commandId,
        type,
        actor,
        result,
        durationMs,
        timestamp
      };

    } catch (err) {
      const durationMs = Date.now() - startTime;
      const failedEntry = {
        commandId,
        type,
        actor,
        missionId,
        payload,
        error: err.message,
        durationMs,
        status: 'FAILED',
        timestamp
      };
      this.commandLog.push(failedEntry);
      globalBus.emit('world.command.failed', failedEntry);
      throw err;
    }
  }

  /* ── Command Handlers ─────────────────────────────────────────────────── */

  _handleCreateBuilding(payload, commandId, timestamp) {
    const id = payload.id || `bld-${Date.now()}`;
    const name = payload.name || 'Novo Edifício Operacional';
    const district = payload.district || 'dev-district';
    const func = payload.function || payload.purpose || 'Centro de Inovação e Operações';
    const floors = Math.max(1, Math.min(10, parseInt(payload.floors, 10) || 2));
    const width = parseFloat(payload.width) || 16.0;
    const depth = parseFloat(payload.depth) || 14.0;
    const height = parseFloat(payload.height) || (floors * 4.2);
    const color = payload.color || '#3b82f6';
    const icon = payload.icon || payload.emoji || '🏢';
    const label = payload.label || name.toUpperCase();

    // Coordinates: default to unoccupied plot near dev/creative district if omitted
    const coordinates = payload.coordinates || {
      x: typeof payload.x === 'number' ? payload.x : -28.0,
      y: typeof payload.y === 'number' ? payload.y : 0,
      z: typeof payload.z === 'number' ? payload.z : 12.0
    };

    const building = {
      id,
      name,
      district,
      function: func,
      floors,
      width,
      depth,
      height,
      color,
      icon,
      label,
      coordinates,
      rooms: payload.rooms || [],
      workstations: payload.workstations || [],
      sourceId: commandId,
      status: 'ACTIVE',
      health: 'HEALTHY',
      createdAt: timestamp,
      lastUpdated: timestamp
    };

    // Register in World State
    this.stateEngine.buildings[id] = building;

    // Attach to district if exists
    if (this.stateEngine.districts[district]) {
      const d = this.stateEngine.districts[district];
      if (!Array.isArray(d.buildings)) d.buildings = [];
      if (!d.buildings.includes(id)) d.buildings.push(id);
    }

    globalBus.emit('world.building.created', building);
    return building;
  }

  _handleCreateRoom(payload, commandId, timestamp) {
    const buildingId = payload.buildingId;
    if (!buildingId || !this.stateEngine.buildings[buildingId]) {
      throw new Error(`Building '${buildingId}' not found for room creation`);
    }

    const bld = this.stateEngine.buildings[buildingId];
    const roomId = payload.id || `room-${Date.now()}`;
    const name = payload.name || 'Nova Sala Operacional';
    const floorNum = parseInt(payload.floorNum, 10) || 0;
    const capacity = parseInt(payload.capacity, 10) || 4;
    const func = payload.function || 'Trabalho Colaborativo';

    const room = {
      id: roomId,
      buildingId,
      name,
      floorNum,
      capacity,
      function: func,
      workstations: payload.workstations || [],
      coordinates: payload.coordinates || { ...bld.coordinates },
      createdAt: timestamp
    };

    if (!Array.isArray(bld.rooms)) bld.rooms = [];
    bld.rooms.push(room);
    bld.lastUpdated = timestamp;

    globalBus.emit('world.room.created', room);
    return room;
  }

  _handleCreateAgent(payload, commandId, timestamp) {
    const id = payload.id || `agent-${Date.now()}`;
    const name = payload.name || 'Agente Operacional';
    const role = payload.role || 'Especialista Fênix';
    const department = payload.department || 'OPERATIONS';
    const buildingId = payload.buildingId || null;
    const floorNum = typeof payload.floorNum === 'number' ? payload.floorNum : 0;
    const workstationId = payload.workstationId || null;
    const model = payload.model || 'qwen2.5:3b';
    const skills = payload.skills || ['task_execution', 'telemetry_monitoring'];
    const tools = payload.tools || ['api_call', 'read_file'];

    // Coordinates default to building location or plaza
    let coords = payload.coordinates;
    if (!coords) {
      if (buildingId && this.stateEngine.buildings[buildingId]) {
        const b = this.stateEngine.buildings[buildingId];
        coords = { x: b.coordinates.x, y: (floorNum * 4.0) + 0.8, z: b.coordinates.z };
      } else {
        coords = { x: 0, y: 0.8, z: 0 };
      }
    }

    const agent = {
      id,
      agentId: id,
      name,
      displayName: name,
      role,
      department,
      buildingId,
      floorNum,
      workstationId,
      stationId: workstationId,
      coordinates: coords,
      homeCoordinates: { ...coords },
      targetCoordinates: null,
      path: [],
      facing: 'SE',
      speed: 2.2,
      status: 'AVAILABLE',
      state: 'IDLE',
      model,
      skills,
      tools,
      energy: 100,
      attention: 100,
      currentTask: 'Pronto para novas atribuições',
      currentJob: null,
      memory: [
        {
          timestamp,
          content: `Instanciado no mundo Fênix OS via comando ${commandId}`
        }
      ],
      sourceId: commandId,
      createdAt: timestamp,
      lastUpdated: timestamp
    };

    // Register in World State
    this.stateEngine.agents[id] = agent;

    globalBus.emit('world.agent.created', agent);
    return agent;
  }

  _handleCreateWorkstation(payload, commandId, timestamp) {
    const id = payload.id || `ws-${Date.now()}`;
    const buildingId = payload.buildingId || null;
    const floorNum = parseInt(payload.floorNum, 10) || 0;
    const type = payload.type || 'developer_desk';
    const label = payload.label || 'Estação de Trabalho';
    const coordinates = payload.coordinates || { x: 0, y: 0.8, z: 0 };

    const ws = {
      id,
      buildingId,
      floorNum,
      type,
      label,
      coordinates,
      assignedAgentId: payload.assignedAgentId || null,
      createdAt: timestamp
    };

    this.stateEngine.workstations[id] = ws;
    globalBus.emit('world.workstation.created', ws);
    return ws;
  }

  _handleMoveAgent(payload, commandId, timestamp) {
    const agentId = payload.agentId || payload.id;
    const ag = this.stateEngine.findAgent(agentId);
    if (!ag) throw new Error(`Agent '${agentId}' not found for movement`);

    const dest = payload.destination || payload.coordinates || {};
    let targetCoords = null;

    if (dest.coordinates) {
      targetCoords = { ...dest.coordinates };
    } else if (typeof dest.x === 'number') {
      targetCoords = { x: dest.x, y: dest.y !== undefined ? dest.y : 0.8, z: dest.z !== undefined ? dest.z : 0 };
    } else if (dest.buildingId && this.stateEngine.buildings[dest.buildingId]) {
      const b = this.stateEngine.buildings[dest.buildingId];
      const f = dest.floorNum !== undefined ? dest.floorNum : 0;
      targetCoords = { x: b.coordinates.x, y: (f * 4.0) + 0.8, z: b.coordinates.z };
    } else if (dest.stationId && this.stateEngine.workstations[dest.stationId]) {
      const ws = this.stateEngine.workstations[dest.stationId];
      targetCoords = { ...ws.coordinates };
    } else {
      throw new Error(`Invalid destination coordinates for agent '${agentId}'`);
    }

    ag.targetCoordinates = targetCoords;
    ag.state = 'WALKING';
    ag.status = 'WALKING';
    ag.path = payload.path || [targetCoords];
    ag.lastUpdated = timestamp;

    const reason = payload.reason || 'Deslocamento operacional solicitado pelo operador';
    ag.memory.push({
      timestamp,
      content: `Iniciando deslocamento para (${targetCoords.x.toFixed(1)}, ${targetCoords.z.toFixed(1)}): ${reason}`
    });

    globalBus.emit('world.agent.moved', {
      agentId: ag.id,
      from: ag.coordinates,
      to: targetCoords,
      reason,
      path: ag.path,
      timestamp
    });

    return { agentId: ag.id, state: ag.state, destination: targetCoords, path: ag.path };
  }

  _handleAssignMission(payload, commandId, timestamp) {
    const agentId = payload.agentId || payload.id;
    let ag = this.stateEngine.findAgent(agentId);
    if (!ag && this.stateEngine.agents) {
      const allAgents = Object.values(this.stateEngine.agents);
      ag = allAgents.find(a => (a.name || '').toLowerCase() === String(agentId).replace(/^agent-/, '').toLowerCase());
    }
    if (!ag) {
      const rawName = String(agentId || 'agente').replace(/^agent-/, '');
      const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      ag = this._handleCreateAgent({
        id: agentId,
        name,
        role: 'Operador Especialista',
        department: 'OPERATIONS',
        buildingId: 'bld-api-platform'
      }, commandId, timestamp);
    }

    const taskName = payload.taskName || payload.task || 'Missão Operacional';
    const missionId = payload.missionId || `mis-${Date.now()}`;
    const objective = payload.objective || taskName;

    ag.assignedTask = taskName;
    ag.currentTask = taskName;
    ag.currentJob = payload.job || { id: `job-${Date.now()}`, name: taskName, progress: 0 };
    ag.missionId = missionId;
    ag.state = 'WORKING';
    ag.status = 'WORKING';
    ag.lastUpdated = timestamp;

    ag.memory.push({
      timestamp,
      content: `Missão atribuída [${missionId}]: ${objective}`
    });

    globalBus.emit('world.agent.task_assigned', {
      agentId: ag.id,
      missionId,
      taskName,
      objective,
      timestamp
    });

    return { agentId: ag.id, missionId, taskName, state: ag.state };
  }

  _handleCompleteTask(payload, commandId, timestamp) {
    const agentId = payload.agentId || payload.id;
    const ag = this.stateEngine.findAgent(agentId);
    if (!ag) throw new Error(`Agent '${agentId}' not found for task completion`);

    const task = ag.currentTask || 'Tarefa';
    const result = payload.result || 'Concluída com sucesso';

    ag.assignedTask = null;
    ag.currentJob = null;
    ag.currentTask = 'Standby operacional · Pronto para novas diretivas';
    ag.state = 'IDLE';
    ag.status = 'AVAILABLE';
    ag.lastUpdated = timestamp;

    ag.memory.push({
      timestamp,
      content: `Tarefa [${task}] concluída: ${result}`
    });

    globalBus.emit('world.agent.task_completed', {
      agentId: ag.id,
      task,
      result,
      timestamp
    });

    return { agentId: ag.id, task, result, state: ag.state };
  }

  _handleUpdateBuilding(payload, commandId, timestamp) {
    const id = payload.id || payload.buildingId;
    if (!id || !this.stateEngine.buildings[id]) {
      throw new Error(`Building '${id}' not found for update`);
    }

    const b = this.stateEngine.buildings[id];
    const updates = payload.updates || payload;
    Object.assign(b, updates);
    b.lastUpdated = timestamp;

    globalBus.emit('world.building.updated', b);
    return b;
  }

  _handleUpdateAgent(payload, commandId, timestamp) {
    const id = payload.id || payload.agentId;
    const ag = this.stateEngine.findAgent(id);
    if (!ag) throw new Error(`Agent '${id}' not found for update`);

    const updates = payload.updates || payload;
    Object.assign(ag, updates);
    ag.lastUpdated = timestamp;

    globalBus.emit('world.agent.updated', ag);
    return ag;
  }

  _handleRemoveEntity(payload, commandId, timestamp) {
    const entityType = String(payload.entityType || payload.type).toLowerCase();
    const id = payload.id || payload.entityId;

    if (entityType === 'building' && this.stateEngine.buildings[id]) {
      delete this.stateEngine.buildings[id];
      globalBus.emit('world.building.removed', { id, timestamp });
      return { removed: true, entityType, id };
    } else if (entityType === 'agent' && this.stateEngine.agents[id]) {
      delete this.stateEngine.agents[id];
      globalBus.emit('world.agent.removed', { id, timestamp });
      return { removed: true, entityType, id };
    } else if (entityType === 'workstation' && this.stateEngine.workstations[id]) {
      delete this.stateEngine.workstations[id];
      globalBus.emit('world.workstation.removed', { id, timestamp });
      return { removed: true, entityType, id };
    }

    throw new Error(`Entity not found for removal: ${entityType} '${id}'`);
  }

  _handleChangeEnvironment(payload, commandId, timestamp) {
    const timeOfDay = payload.timeOfDay || (payload.isNight ? 'NIGHT' : 'DAY');
    const weather = payload.weather || 'CLEAR';

    this.stateEngine.worldTime.timeOfDay = timeOfDay;
    this.stateEngine.worldTime.weather = weather;
    this.stateEngine.worldTime.lastUpdated = timestamp;

    const env = {
      timeOfDay,
      weather,
      lighting: payload.lighting || (timeOfDay === 'NIGHT' ? 'low' : 'full'),
      timestamp
    };

    globalBus.emit('world.environment.changed', env);
    return env;
  }
}

// Global Singleton
let _worldCommandEngineInstance = null;
function getWorldCommandEngine(stateEngine = null) {
  if (!_worldCommandEngineInstance) {
    _worldCommandEngineInstance = new WorldCommandEngine(stateEngine);
  }
  return _worldCommandEngineInstance;
}

module.exports = {
  WorldCommandEngine,
  getWorldCommandEngine
};
