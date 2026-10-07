'use strict';

/**
 * FÊNIX OS — World Simulation Engine (Layer 2: World Simulation)
 * ===============================================================
 * Autonomous 24/7 continuous simulation loop:
 * - Deterministic ticks running in backend independent of rendering FPS.
 * - Agent State Machine: IDLE -> RECEIVING_TASK -> WALKING -> WORKING -> COMPLETED -> REPORTING.
 * - Dynamic Agent Movement: Agents physically travel between workstations, buildings, and rooms.
 * - Vehicle Logistics System: Depósito Mais delivery trucks, logistics vans, drones moving with cargo.
 * - Construction Lifecycle: PLANNED -> FOUNDATION -> STRUCTURE -> FINISHING -> ACTIVE.
 * - Autonomous WorldDirector: System governor observing telemetry & queue to trigger mutations without mandatory LLMs.
 */

const { globalBus } = require('../eventing/fenix-event-bus');
const { getWorldStateEngine } = require('./world-state-engine');

class WorldSimulationEngine {
  constructor(options = {}) {
    this.stateEngine = (options && typeof options.getSnapshot === 'function') ? options : (options.stateEngine || getWorldStateEngine());
    this.tickIntervalMs = options.tickIntervalMs || 1000;
    this.timer = null;
    this.isRunning = false;
    this.tickCount = 0;
    this.directorEvaluationFrequency = 15; // Every 15 ticks (~15 seconds)

    // Road waypoints for vehicle routing
    this.ROAD_NODES = {
      'deposito-hub': { x: 6.0, y: -2.5, name: 'Depósito Mais Central Hub' },
      'industrial-junction': { x: 4.0, y: -1.0, name: 'Entroncamento Industrial' },
      'central-plaza': { x: 0.0, y: 0.0, name: 'Praça Central Fênix' },
      'hq-avenue': { x: 0.0, y: -4.0, name: 'Avenida HQ Spire' },
      'engineering-gate': { x: -4.0, y: 1.5, name: 'Portal Engenharia Dev Loft' },
      'dev-loft': { x: -6.5, y: 3.5, name: 'Dev Loft Workshop' },
      'research-way': { x: -4.0, y: -6.0, name: 'Via P&D Bio-Inovação' },
      'research-hub': { x: -6.0, y: -8.0, name: 'Research Lab Hub' },
      'porto-digital': { x: 12.0, y: -4.0, name: 'Porto Digital & Rodovias' }
    };
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timer = setInterval(() => {
      this.tick().catch(() => {});
    }, this.tickIntervalMs);
    if (this.timer.unref) this.timer.unref();
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick() {
    this.tickCount += 1;
    const now = new Date().toISOString();

    // 1. Advance World Time
    const state = this.stateEngine;
    state.worldTime.tick = this.tickCount;
    state.worldTime.lastTick = now;

    // Time of day cycle: 120 ticks = 1 cycle
    const cycleTick = this.tickCount % 120;
    if (cycleTick < 70) state.worldTime.timeOfDay = 'DAY';
    else if (cycleTick < 90) state.worldTime.timeOfDay = 'SUNSET';
    else state.worldTime.timeOfDay = 'NIGHT';

    // 2. Simulate Agents
    this.simulateAgents();

    // 3. Simulate Vehicles
    this.simulateVehicles();

    // 4. Simulate Constructions
    this.simulateConstructions();

    // 5. WorldDirector Autonomous Evaluation
    if (this.tickCount % this.directorEvaluationFrequency === 0) {
      this.evaluateWorldDirector();
    }

    // 6. Broadcast Tick Delta every 2 ticks to keep bandwidth clean
    if (this.tickCount % 2 === 0) {
      globalBus.emit('world.simulation.tick', {
        tick: this.tickCount,
        timeOfDay: state.worldTime.timeOfDay,
        activeAgents: Object.keys(state.agents).length,
        workingAgents: Object.values(state.agents).filter(a => a.state === 'WORKING').length,
        activeVehicles: Object.keys(state.vehicles).length,
        constructionsCount: Object.keys(state.constructions).length,
        timestamp: now
      });
    }

    // 7. Persist state periodically (every 10 ticks)
    if (this.tickCount % 10 === 0) {
      state.schedulePersist();
    }
  }

  simulateAgents() {
    const agents = this.stateEngine.agents;
    const workstations = this.stateEngine.workstations;

    for (const [id, agent] of Object.entries(agents)) {
      if (!agent.state) agent.state = 'IDLE';

      switch (agent.state) {
        case 'IDLE': {
          // If idle for a while, give a patrol or routine inspection task
          if (this.tickCount % 20 === 0 && Math.random() < 0.3) {
            agent.state = 'RECEIVING_TASK';
            agent.currentTask = 'Ronda preventiva e verificação de integridade operacional';
          }
          break;
        }

        case 'RECEIVING_TASK': {
          // Transition to walking towards designated station or waypoint
          agent.state = 'WALKING';
          const targetWs = workstations[agent.workstationId];
          if (targetWs && targetWs.coordinates) {
            agent.targetCoordinates = { ...targetWs.coordinates };
          } else {
            agent.targetCoordinates = { ...agent.homeCoordinates };
          }
          break;
        }

        case 'WALKING': {
          if (!agent.targetCoordinates) {
            agent.state = 'WORKING';
            break;
          }
          if (!agent.coordinates) {
            agent.coordinates = {
              x: typeof agent.x === 'number' ? agent.x : 0,
              y: typeof agent.y === 'number' ? agent.y : 0
            };
          }

          const tx = typeof agent.targetCoordinates.x === 'number' ? agent.targetCoordinates.x : 0;
          const ty = typeof agent.targetCoordinates.y === 'number' ? agent.targetCoordinates.y : 0;
          const cx = typeof agent.coordinates.x === 'number' ? agent.coordinates.x : 0;
          const cy = typeof agent.coordinates.y === 'number' ? agent.coordinates.y : 0;

          const dx = tx - cx;
          const dy = ty - cy;
          const dist = Math.hypot(dx, dy);
          const step = agent.speed || 0.04;

          if (dist <= step) {
            agent.coordinates.x = tx;
            agent.coordinates.y = ty;
            agent.x = tx;
            agent.y = ty;
            agent.targetCoordinates = null;
            agent.state = 'WORKING';
          } else {
            agent.coordinates.x = cx + (dx / dist) * step;
            agent.coordinates.y = cy + (dy / dist) * step;
            agent.x = agent.coordinates.x;
            agent.y = agent.coordinates.y;

            // Update facing direction based on movement angle
            if (Math.abs(dx) > Math.abs(dy)) {
              agent.facing = dx > 0 ? 'SE' : 'NW';
            } else {
              agent.facing = dy > 0 ? 'SW' : 'NE';
            }
          }
          break;
        }

        case 'WORKING': {
          if (agent.currentJob) {
            agent.currentJob.progress = (agent.currentJob.progress || 0) + 1;
            if (agent.currentJob.progress >= 100) {
              agent.state = 'COMPLETED';
            }
          } else {
            // Autonomous routine work
            if (this.tickCount % 35 === 0) {
              agent.state = 'COMPLETED';
            }
          }
          break;
        }

        case 'COMPLETED': {
          agent.memory.push({
            timestamp: new Date().toISOString(),
            content: `Concluída tarefa com sucesso: ${agent.currentTask || (agent.currentJob ? agent.currentJob.name : 'Operação padrão')}`
          });
          if (agent.memory.length > 20) agent.memory.shift();
          agent.state = 'REPORTING';
          break;
        }

        case 'REPORTING': {
          agent.state = 'IDLE';
          agent.currentJob = null;
          agent.currentTask = 'Standby aguardando nova diretiva ou lote';
          break;
        }

        default:
          agent.state = 'IDLE';
      }
    }
  }

  simulateVehicles() {
    const vehicles = this.stateEngine.vehicles;

    for (const [id, vehicle] of Object.entries(vehicles)) {
      if (!vehicle.status) vehicle.status = 'EN_ROUTE';

      if (vehicle.status === 'EN_ROUTE' || vehicle.status === 'FLYING') {
        if (!vehicle.targetCoordinates) {
          vehicle.status = 'DELIVERED';
          continue;
        }
        if (!vehicle.coordinates) {
          vehicle.coordinates = {
            x: typeof vehicle.x === 'number' ? vehicle.x : 0,
            y: typeof vehicle.y === 'number' ? vehicle.y : 0
          };
        }

        const tx = typeof vehicle.targetCoordinates.x === 'number' ? vehicle.targetCoordinates.x : 0;
        const ty = typeof vehicle.targetCoordinates.y === 'number' ? vehicle.targetCoordinates.y : 0;
        const cx = typeof vehicle.coordinates.x === 'number' ? vehicle.coordinates.x : 0;
        const cy = typeof vehicle.coordinates.y === 'number' ? vehicle.coordinates.y : 0;

        const dx = tx - cx;
        const dy = ty - cy;
        const dist = Math.hypot(dx, dy);
        const step = vehicle.speed || 0.08;

        if (dist <= step) {
          vehicle.coordinates.x = tx;
          vehicle.coordinates.y = ty;
          vehicle.x = tx;
          vehicle.y = ty;
          vehicle.progress = 100;
          vehicle.status = 'UNLOADING';
          vehicle.unloadTicks = 5;
        } else {
          vehicle.coordinates.x = cx + (dx / dist) * step;
          vehicle.coordinates.y = cy + (dy / dist) * step;
          vehicle.x = vehicle.coordinates.x;
          vehicle.y = vehicle.coordinates.y;
          vehicle.progress = Math.min(99, Math.round((1 - (dist / Math.max(1, dist + step * 20))) * 100));
        }
      } else if (vehicle.status === 'UNLOADING') {
        vehicle.unloadTicks = (vehicle.unloadTicks || 5) - 1;
        if (vehicle.unloadTicks <= 0) {
          // Finished unloading, switch destination and return to base
          const prevOrigin = vehicle.origin;
          const prevDest = vehicle.destination;
          const prevTarget = { ...vehicle.targetCoordinates };

          vehicle.origin = prevDest;
          vehicle.destination = prevOrigin;
          vehicle.targetCoordinates = id.includes('deposito') ? { x: 5.5, y: -2.0 } : { x: -6.5, y: 3.5 };
          vehicle.status = 'LOADING';
          vehicle.loadTicks = 4;
        }
      } else if (vehicle.status === 'LOADING') {
        vehicle.loadTicks = (vehicle.loadTicks || 4) - 1;
        if (vehicle.loadTicks <= 0) {
          vehicle.status = vehicle.type === 'DRONE' ? 'FLYING' : 'EN_ROUTE';
          vehicle.progress = 0;
        }
      } else if (vehicle.status === 'DELIVERED' || vehicle.status === 'IDLE') {
        if (this.tickCount % 10 === 0) {
          vehicle.status = vehicle.type === 'DRONE' ? 'FLYING' : 'EN_ROUTE';
        }
      }
    }
  }

  simulateConstructions() {
    const constructions = this.stateEngine.constructions;
    const stages = ['PLANNED', 'FOUNDATION', 'STRUCTURE', 'FINISHING', 'ACTIVE'];

    for (const [id, constr] of Object.entries(constructions)) {
      if (constr.stage === 'ACTIVE') continue;

      constr.progress = Math.min(100, (constr.progress || 0) + 1);

      if (constr.progress < 15) constr.stage = 'PLANNED';
      else if (constr.progress < 40) constr.stage = 'FOUNDATION';
      else if (constr.progress < 75) constr.stage = 'STRUCTURE';
      else if (constr.progress < 100) constr.stage = 'FINISHING';
      else {
        constr.stage = 'ACTIVE';
        constr.completedAt = new Date().toISOString();

        globalBus.emit('world.construction.completed', {
          constructionId: constr.id,
          name: constr.name,
          district: constr.district,
          timestamp: constr.completedAt
        });
      }
    }
  }

  evaluateWorldDirector() {
    // Autonomous evaluator: Zero mandatory LLM dependency on tick loop
    const state = this.stateEngine;
    const workingCount = Object.values(state.agents).filter(a => a.state === 'WORKING').length;
    const totalAgents = Object.keys(state.agents).length;

    const logEntry = {
      timestamp: new Date().toISOString(),
      worldTime: state.worldTime,
      totalAgents,
      workingCount,
      activeVehicles: Object.keys(state.vehicles).length,
      constructionsCount: Object.keys(state.constructions).length,
      decision: 'Evaluated world telemetry and maintained logistical readiness'
    };
    this.directorLogs = this.directorLogs || [];
    this.directorLogs.push(logEntry);
    if (this.directorLogs.length > 50) this.directorLogs.shift();
    state.directorLogs = this.directorLogs;

    // If working load is high (>70%), autonomously spawn a logistics support vehicle
    if (workingCount / totalAgents >= 0.7 && !state.vehicles['drone-logistics-02']) {
      state.applyMutation({
        type: 'SPAWN',
        payload: {
          vehicle: {
            id: 'drone-logistics-02',
            name: 'Drone de Apoio SkyDrop #02',
            type: 'DRONE',
            company: 'AI Engine',
            color: '#10B981',
            origin: 'Centro de Inteligência WMS',
            destination: 'Porto Digital',
            coordinates: { x: 6.0, y: -2.0 },
            targetCoordinates: { x: 12.0, y: -4.0 },
            cargo: 'Documentação Fiscal & Chips RFID',
            status: 'FLYING',
            altitude: 2.8,
            speed: 0.14
          }
        },
        issuer: 'WorldDirector'
      });
    }

    // Check if Depósito Mais needs a fleet replenishment
    const trucksCount = Object.values(state.vehicles).filter(v => v.company === 'Depósito Mais').length;
    if (trucksCount < 3 && !state.vehicles['truck-deposito-03']) {
      state.applyMutation({
        type: 'SPAWN',
        payload: {
          vehicle: {
            id: 'truck-deposito-03',
            name: 'Caminhão Baú WMS #03',
            type: 'MEDIUM_TRUCK',
            company: 'Depósito Mais',
            color: '#F59E0B',
            origin: 'Depósito Mais Docas',
            destination: 'Centro Metropolitano BH',
            coordinates: { x: 5.5, y: -2.5 },
            targetCoordinates: { x: 0.0, y: 2.0 },
            cargo: 'Pisos e Revestimentos Porcelanato (8t)',
            status: 'LOADING',
            speed: 0.07
          }
        },
        issuer: 'WorldDirector'
      });
    }
  }
}

// Global Singleton
let _worldSimulationInstance = null;
function getWorldSimulationEngine() {
  if (!_worldSimulationInstance) {
    _worldSimulationInstance = new WorldSimulationEngine();
  }
  return _worldSimulationInstance;
}

module.exports = {
  WorldSimulationEngine,
  getWorldSimulationEngine
};
