'use strict';

/**
 * FÊNIX OS — World Intent Planner
 * ================================
 * Translates Natural Language Operator Intents into deterministic, validated
 * declarative World Commands for WorldCommandEngine:
 * 
 * Supports:
 * - "Crie um novo laboratório chamado Media Lab" -> CREATE_BUILDING
 * - "Coloque o agente João nessa sala" / "Mova o agente João para o Media Lab" -> MOVE_AGENT
 * - "Crie o agente João como Especialista em IA no Media Lab" -> CREATE_AGENT
 * - "Crie uma missão para João com objetivo Testar APIs" -> ASSIGN_MISSION
 * - "Mude o horário para noite e ative chuva" -> CHANGE_ENVIRONMENT
 * - Compound multi-step intents ("Crie o Media Lab e adicione o agente João nele")
 */

const { getWorldStateEngine } = require('./world-state-engine');

class WorldIntentPlanner {
  constructor(stateEngine = null) {
    this.stateEngine = stateEngine || getWorldStateEngine();
  }

  /**
   * Plan declarative commands from a natural language intent string
   * @param {string} prompt - Raw natural language string
   * @param {Object} context - Optional context (activeBuilding, activeAgent, tenantId)
   * @returns {Object} { ok: true, intent, commands: [ { type, payload } ], explanation }
   */
  plan(prompt, context = {}) {
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      throw new Error('[WorldIntentPlanner] Prompt must be a non-empty string');
    }

    const cleanPrompt = prompt.trim();
    const clauses = this._splitClauses(cleanPrompt);
    const plannedCommands = [];

    for (const clause of clauses) {
      const cmds = this._parseClause(clause, context, plannedCommands);
      if (cmds && cmds.length > 0) {
        plannedCommands.push(...cmds);
      }
    }

    if (plannedCommands.length === 0) {
      // Fallback: try general parsing on full prompt
      const fallbackCmds = this._parseClause(cleanPrompt, context, []);
      if (fallbackCmds && fallbackCmds.length > 0) {
        plannedCommands.push(...fallbackCmds);
      }
    }

    // Merge multiple CHANGE_ENVIRONMENT commands into a single command
    const envCmds = plannedCommands.filter(c => c.type === 'CHANGE_ENVIRONMENT');
    if (envCmds.length > 1) {
      const mergedPayload = {
        timeOfDay: envCmds.some(c => c.payload.timeOfDay === 'NIGHT') ? 'NIGHT' : 'DAY',
        weather: envCmds.some(c => c.payload.weather === 'RAIN') ? 'RAIN' : 'CLEAR',
        lighting: envCmds.some(c => c.payload.lighting === 'low') ? 'low' : 'full'
      };
      const filtered = plannedCommands.filter(c => c.type !== 'CHANGE_ENVIRONMENT');
      filtered.push({ type: 'CHANGE_ENVIRONMENT', payload: mergedPayload });
      plannedCommands.length = 0;
      plannedCommands.push(...filtered);
    }

    if (plannedCommands.length === 0) {
      throw new Error(`[WorldIntentPlanner] Não foi possível mapear o comando operacional: "${prompt}". Exemplo: "Crie um laboratório chamado Media Lab" ou "Mova o agente André para a Doca 2"`);
    }

    return {
      ok: true,
      originalPrompt: cleanPrompt,
      commandsCount: plannedCommands.length,
      commands: plannedCommands,
      explanation: `Plano gerado com ${plannedCommands.length} comando(s) operacional(is) validado(s).`
    };
  }

  /**
   * Split compound sentences into individual command clauses
   */
  _splitClauses(text) {
    // Splits on " e ", " e depois ", " depois ", " em seguida ", ";", "\n"
    const splitRegex = /\s*(?:;\s*|\n+|\s+e\s+(?:depois\s+|em\s+seguida\s+)?|\s+depois\s+|\s+em\s+seguida\s+)/i;
    const parts = text.split(splitRegex).map(s => s.trim()).filter(s => s.length > 3);
    return parts.length > 0 ? parts : [text];
  }

  /**
   * Parse a single natural language clause
   */
  _parseClause(clause, context, previousCommands = []) {
    const text = clause.toLowerCase();

    // 1. ENVIRONMENT / WEATHER / TIME OF DAY
    if (/\b(?:clima|tempo|meteorologia)\b/i.test(text) || /\b(?:noite|noturno|madrugada|anoitecer)\b/i.test(text) || /\b(?:dia|diurno|amanhecer)\b/i.test(text) || /\b(?:chuva|chovendo|tempestade|ensolarado)\b/i.test(text)) {
      const isNight = /\b(?:noite|noturno|madrugada|anoitecer|escuro)\b/i.test(text);
      const isRain = /\b(?:chuva|chovendo|tempestade)\b/i.test(text);
      return [{
        type: 'CHANGE_ENVIRONMENT',
        payload: {
          timeOfDay: isNight ? 'NIGHT' : 'DAY',
          weather: isRain ? 'RAIN' : 'CLEAR',
          lighting: isNight ? 'low' : 'full'
        }
      }];
    }

    // 2. CREATE BUILDING / LAB / WORKSPACE
    if (
      (text.includes('crie') || text.includes('construa') || text.includes('adicione') || text.includes('novo') || text.includes('inicie')) &&
      (text.includes('laborat') || text.includes('prédio') || text.includes('predio') || text.includes('edif') || text.includes('galpão') || text.includes('galpao') || text.includes('sala de inovação') || text.includes('centro'))
    ) {
      // Extract name
      const nameMatch = clause.match(/(?:chamado|nomeado|com o nome de|denominado)\s+["']?([^"',.\n]+?)["']?(?:\s+com\s+\d+|\s+no\s+|\s+para\s+|$)/i) ||
                        clause.match(/(?:laborat[óo]rio|pr[ée]dio|edif[íi]cio|galp[ãa]o|centro)\s+(?:de\s+)?["']?([A-Z0-9][a-zA-Z0-9_\s-]+?)["']?(?:\s+com\s+\d+|\s+no\s+|\s+para\s+|$)/i);
      
      let rawName = nameMatch ? nameMatch[1].trim() : 'Novo Centro de Inovação';
      rawName = rawName.replace(/\s+com\s+\d+.*$/i, '').trim();
      const buildingName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      const slug = this._toSlug(buildingName);
      const id = `bld-${slug}`;

      // Extract floors count
      const floorsMatch = clause.match(/(\d+)\s*(?:andares|andar|pisos)/i);
      const floors = floorsMatch ? parseInt(floorsMatch[1], 10) : 2;

      // Extract district
      let district = 'dev-district';
      if (text.includes('criativo') || text.includes('creative')) district = 'creative-district';
      else if (text.includes('logística') || text.includes('logistica') || text.includes('depósito')) district = 'logistics-district';
      else if (text.includes('financeiro') || text.includes('finance')) district = 'finance-district';
      else if (text.includes('comando') || text.includes('governança')) district = 'command-center';

      // Pick an open coordinate offset avoiding collision with existing buildings
      const existingBlds = Object.values(this.stateEngine.buildings || {});
      const occupiedPlots = existingBlds.map(b => b.coordinates || { x: b.x || 0, z: b.z || 0 });
      let slotIdx = Math.max(1, existingBlds.length);
      let xOffset = -26.0 + ((slotIdx % 4) * 22.0);
      let zOffset = 22.0 + (Math.floor(slotIdx / 4) * 22.0);
      
      while (occupiedPlots.some(p => Math.hypot((p.x || 0) - xOffset, (p.z || 0) - zOffset) < 18.0)) {
        slotIdx++;
        xOffset = -26.0 + ((slotIdx % 4) * 22.0);
        zOffset = 22.0 + (Math.floor(slotIdx / 4) * 22.0);
      }

      return [{
        type: 'CREATE_BUILDING',
        payload: {
          id,
          name: buildingName,
          district,
          floors,
          function: `Polo Operacional e Pesquisa: ${buildingName}`,
          color: text.includes('media') || text.includes('lab') ? '#8b5cf6' : '#3b82f6',
          icon: text.includes('lab') ? '🧪' : '🏢',
          label: buildingName.toUpperCase(),
          coordinates: { x: xOffset, y: 0, z: zOffset }
        }
      }];
    }

    // 3. CREATE ROOM INSIDE BUILDING
    if (
      (text.includes('crie') || text.includes('adicione') || text.includes('nova')) &&
      (text.includes('sala') || text.includes('espaço') || text.includes('estúdio') || text.includes('estudio'))
    ) {
      const roomMatch = clause.match(/(?:sala|espa[çc]o|est[úu]dio)\s+(?:de\s+|chamada\s+|com o nome\s+)?["']?([^"',.\n]+?)["']?(?:\s+no|\s+no pr[ée]dio|\s*$)/i);
      const roomName = roomMatch ? roomMatch[1].trim() : 'Nova Sala';

      // Find target building from context, previous commands, or text
      let targetBuildingId = this._resolveBuildingReference(clause, context, previousCommands);
      if (!targetBuildingId) {
        targetBuildingId = Object.keys(this.stateEngine.buildings)[0] || 'bld-api-platform';
      }

      return [{
        type: 'CREATE_ROOM',
        payload: {
          buildingId: targetBuildingId,
          name: roomName,
          floorNum: text.includes('segundo') || text.includes('2º') ? 1 : 0,
          function: `Espaço de Trabalho: ${roomName}`
        }
      }];
    }

    // 4. CREATE AGENT
    if (
      (text.includes('crie') || text.includes('adicione') || text.includes('instancie') || text.includes('novo')) &&
      (text.includes('agente') || text.includes('colaborador') || text.includes('operador'))
    ) {
      const nameMatch = clause.match(/agente\s+["']?([A-Z0-9À-ÿ][a-zA-Z0-9À-ÿ_\s-]+?)["']?(?:\s+como|\s+no|\s+na|\s+com|\s*$)/i) ||
                        clause.match(/(?:chamado|nomeado)\s+["']?([A-Z0-9À-ÿ][a-zA-Z0-9À-ÿ_\s-]+?)["']?/i);
      const rawName = nameMatch ? nameMatch[1].trim() : 'Agente ' + Math.floor(Math.random() * 900 + 100);
      const agentName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      const slug = this._toSlug(agentName);
      const agentId = `agent-${slug}`;

      // Role
      const roleMatch = clause.match(/como\s+["']?([^"',.\n]+?)["']?(?:\s+no|\s+na|\s+com|\s*$)/i);
      const role = roleMatch ? roleMatch[1].trim() : 'Especialista Fênix';

      // Department & Building
      const targetBuildingId = this._resolveBuildingReference(clause, context, previousCommands);

      return [{
        type: 'CREATE_AGENT',
        payload: {
          id: agentId,
          name: agentName,
          role,
          department: text.includes('ia') || text.includes('ai') ? 'AI_RESEARCH' : 'ENGINEERING',
          buildingId: targetBuildingId,
          model: text.includes('deepseek') ? 'deepseek-coder:6.7b' : (text.includes('qwen') ? 'qwen2.5:7b' : 'qwen2.5:3b'),
          skills: ['task_execution', 'telemetry_monitoring', 'code_synthesis']
        }
      }];
    }

    // 5. MOVE AGENT
    if (
      text.includes('mova') || text.includes('coloque') || text.includes('desloque') ||
      text.includes('envie') || text.includes('posicione') || text.includes('leve')
    ) {
      const agentId = this._resolveAgentReference(clause, context, previousCommands);
      const targetBuildingId = this._resolveBuildingReference(clause, context, previousCommands);

      let targetDestination = {};
      if (targetBuildingId && this.stateEngine.buildings[targetBuildingId]) {
        const bld = this.stateEngine.buildings[targetBuildingId];
        const floorNum = text.includes('segundo') || text.includes('2º') ? 1 : 0;
        targetDestination = {
          buildingId: targetBuildingId,
          floorNum,
          coordinates: { x: bld.coordinates.x, y: (floorNum * 4.0) + 0.8, z: bld.coordinates.z }
        };
      } else if (text.includes('doca') || text.includes('depósito') || text.includes('deposito')) {
        targetDestination = {
          buildingId: 'bld-deposito-mais',
          floorNum: 0,
          coordinates: { x: 28.0, y: 0.8, z: 10.0 }
        };
      } else if (text.includes('praça') || text.includes('praca') || text.includes('centro')) {
        targetDestination = {
          coordinates: { x: 0, y: 0.8, z: 0 }
        };
      } else {
        // Default target is active building or coordinates
        targetDestination = {
          coordinates: { x: -18.0, y: 0.8, z: -10.0 }
        };
      }

      const agentExists = this.stateEngine.findAgent(agentId) || previousCommands.some(c => c.type === 'CREATE_AGENT' && c.payload.id === agentId);
      if (!agentExists && (text.includes('coloque') || text.includes('adicione') || text.includes('crie') || text.includes('ponha') || text.includes('novo'))) {
        const rawName = (agentId || 'agente-novo').replace(/^agent-/, '');
        const capitalized = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        return [{
          type: 'CREATE_AGENT',
          payload: {
            id: agentId || `agent-${Date.now()}`,
            name: capitalized,
            role: 'Especialista Fênix',
            department: 'OPERATIONS',
            buildingId: targetBuildingId,
            coordinates: targetDestination.coordinates,
            skills: ['task_execution', 'telemetry_monitoring']
          }
        }];
      }

      return [{
        type: 'MOVE_AGENT',
        payload: {
          agentId: agentId || 'agent-andre',
          destination: targetDestination,
          reason: `Operador solicitou: ${clause}`
        }
      }];
    }

    // 6. ASSIGN MISSION / TASK
    if (
      text.includes('missão') || text.includes('missao') || text.includes('tarefa') ||
      text.includes('atribua') || text.includes('execute') || text.includes('trabalhe')
    ) {
      const agentId = this._resolveAgentReference(clause, context, previousCommands) || 'agent-andre';
      const taskMatch = clause.match(/(?:com\s+objetivo|chamada|intitulada)\s+["']?([^"',.\n]+?)["']?$/i) ||
                        clause.match(/(?:miss[ãa]o|tarefa)\s+para\s+[\wÀ-ÿ-]+\s+(?:com\s+objetivo\s+|de\s+)?["']?([^"',.\n]+?)["']?$/i) ||
                        clause.match(/(?:miss[ãa]o|tarefa|objetivo)\s+["']?([^"',.\n]+?)["']?(?:\s+para|\s+ao|\s*$)/i) ||
                        clause.match(/(?:execute|fazer)\s+["']?([^"',.\n]+?)["']?$/i);
      const taskName = taskMatch ? taskMatch[1].trim() : 'Execução de Diretiva Operacional';

      return [{
        type: 'ASSIGN_MISSION',
        payload: {
          agentId,
          taskName,
          objective: taskName,
          missionId: `mis-${Date.now().toString(36)}`
        }
      }];
    }

    // 7. COMPLETE TASK
    if (text.includes('conclua') || text.includes('finalize') || text.includes('termine') || text.includes('complete')) {
      const agentId = this._resolveAgentReference(clause, context, previousCommands) || 'agent-andre';
      return [{
        type: 'COMPLETE_TASK',
        payload: {
          agentId,
          result: 'Concluído conforme solicitado pelo operador'
        }
      }];
    }

    // 8. REMOVE ENTITY
    if (text.includes('remova') || text.includes('exclua') || text.includes('delete') || text.includes('apague')) {
      const agentId = this._resolveAgentReference(clause, context, previousCommands);
      if (agentId) {
        return [{
          type: 'REMOVE_ENTITY',
          payload: { entityType: 'agent', id: agentId }
        }];
      }

      const bldId = this._resolveBuildingReference(clause, context, previousCommands);
      if (bldId) {
        return [{
          type: 'REMOVE_ENTITY',
          payload: { entityType: 'building', id: bldId }
        }];
      }
    }

    return null;
  }

  /**
   * Helper: Resolve building referenced in text, context, or previous command outputs
   */
  _resolveBuildingReference(clause, context, previousCommands) {
    const text = clause.toLowerCase();

    // Check previous command created buildings (e.g. "Crie o Media Lab e coloque João nele")
    const prevCreated = previousCommands.find(c => c.type === 'CREATE_BUILDING');
    if (prevCreated && (text.includes('nele') || text.includes('nessa') || text.includes('nessa sala') || text.includes('nela') || text.includes('nesse prédio') || text.includes('nesse predio') || text.includes(prevCreated.payload.name.toLowerCase()))) {
      return prevCreated.payload.id;
    }

    // Check existing buildings in state
    for (const [id, bld] of Object.entries(this.stateEngine.buildings || {})) {
      const bName = (bld.name || '').toLowerCase();
      const bId = id.toLowerCase();
      if (text.includes(bName) || text.includes(bId) || (bld.label && text.includes(bld.label.toLowerCase()))) {
        return id;
      }
    }

    // Check contextual terms
    if (text.includes('media lab') || text.includes('medialab')) return 'bld-media-lab';
    if (text.includes('depósito') || text.includes('deposito') || text.includes('logística')) return 'bld-deposito-mais';
    if (text.includes('api') || text.includes('platform')) return 'bld-api-platform';
    if (text.includes('enterprise') || text.includes('empresa') || text.includes('sede')) return 'bld-fenix-enterprise';

    return context.activeBuildingId || null;
  }

  /**
   * Helper: Resolve agent referenced in text, context, or previous command outputs
   */
  _resolveAgentReference(clause, context, previousCommands) {
    const text = clause.toLowerCase();

    // Check previously created agent
    const prevCreated = previousCommands.find(c => c.type === 'CREATE_AGENT');
    if (prevCreated && (text.includes('ele') || text.includes('o agente') || text.includes(prevCreated.payload.name.toLowerCase()))) {
      return prevCreated.payload.id;
    }

    // Check existing agents by name or id
    for (const [id, ag] of Object.entries(this.stateEngine.agents || {})) {
      const agName = (ag.name || '').toLowerCase();
      const agId = id.toLowerCase();
      if (text.includes(agName) || text.includes(agId)) {
        return id;
      }
    }

    // Canonical names mapping
    if (text.includes('joão') || text.includes('joao')) return 'agent-joao';
    if (text.includes('andré') || text.includes('andre')) return 'agent-andre';
    if (text.includes('camila')) return 'agent-camila';
    if (text.includes('marcos')) return 'agent-marcos';
    if (text.includes('silva')) return 'agent-silva';
    if (text.includes('elena')) return 'agent-elena';
    if (text.includes('alex')) return 'agent-alex';
    if (text.includes('gabriel')) return 'agent-gabriel';
    if (text.includes('sofia')) return 'agent-sofia';
    if (text.includes('lucas')) return 'agent-lucas';

    return context.activeAgentId || null;
  }

  _toSlug(str) {
    if (!str) return 'entity';
    return String(str)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

// Global Singleton
let _worldIntentPlannerInstance = null;
function getWorldIntentPlanner(stateEngine = null) {
  if (!_worldIntentPlannerInstance) {
    _worldIntentPlannerInstance = new WorldIntentPlanner(stateEngine);
  }
  return _worldIntentPlannerInstance;
}

module.exports = {
  WorldIntentPlanner,
  getWorldIntentPlanner
};
