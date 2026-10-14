'use strict';
const crypto = require('crypto');
/**
 * FÊNIX OS — FÊNIX AIR (Agent Intelligence Representation)
 * Representação intermediária para instruções de agentes.
 * Traduzível para o runtime real (MissionKernel).
 * Não acoplada a nenhum modelo específico.
 *
 * Exemplo de uso:
 *
 *   const air = new FenixAIR();
 *   const mission = air.compile(`
 *     MISSION build_feature {
 *       REQUIREMENT authentication
 *       AGENT architect { READ project; ANALYZE architecture; EMIT design }
 *       AGENT developer { INPUT design; WRITE code; RUN tests }
 *       PROMOTE only_if { tests == PASS; security == PASS }
 *     }
 *   `);
 */


// ─── SCHEMA ───────────────────────────────────────────────────────────────────

/**
 * @typedef {object} AIRMission
 * @property {string} id
 * @property {string} name
 * @property {string[]} requirements
 * @property {AIRAgent[]} agents
 * @property {AIRPromoteCondition} promoteCondition
 * @property {object} metadata
 */

/**
 * @typedef {object} AIRAgent
 * @property {string} id
 * @property {string} role
 * @property {AIRAction[]} actions
 * @property {string[]} inputs   — artefatos esperados de outros agentes
 * @property {string[]} outputs  — artefatos emitidos
 */

/**
 * @typedef {object} AIRAction
 * @property {'READ'|'WRITE'|'ANALYZE'|'INPUT'|'EMIT'|'RUN'|'VERIFY'} verb
 * @property {string} target
 */

const VALID_VERBS = new Set(['READ', 'WRITE', 'ANALYZE', 'INPUT', 'EMIT', 'RUN', 'VERIFY', 'DEPLOY', 'SCAN', 'TEST', 'LEARN', 'OBSERVE', 'HYPOTHESIZE']);
const VALID_PROMOTION_KEYS = new Set(['tests', 'security', 'regression', 'coverage', 'latency', 'cost']);
const VALID_PROMOTION_OPS = new Set(['==', '!=', '>', '<', '>=', '<=']);
const VALID_PROMOTION_VALUES = new Set(['PASS', 'FAIL', 'NONE', 'OK', 'ERROR']);

class FenixAIR {
  /**
   * Compila uma missão expressa em notação AIR para um objeto estruturado.
   * @param {string} source — código-fonte AIR
   * @returns {AIRMission}
   */
  compile(source) {
    if (typeof source !== 'string' || !source.trim()) throw new Error('FenixAIR.compile: source vazio');
    const tokens = this._tokenize(source);
    return this._parseMission(tokens, source);
  }

  /**
   * Converte uma AIRMission em uma especificação de missão compatível
   * com o MissionKernel existente (não o duplica).
   */
  toMissionSpec(airMission) {
    const steps = [];
    // Cada agente vira um step do MissionKernel
    for (let i = 0; i < airMission.agents.length; i++) {
      const agent = airMission.agents[i];
      const prevAgent = i > 0 ? airMission.agents[i - 1] : null;
      steps.push({
        key: this._agentRoleToStepKey(agent.role),
        payload: {
          agentRole: agent.role,
          actions: agent.actions,
          inputs: agent.inputs,
          outputs: agent.outputs,
          airAgentId: agent.id,
        },
        dependsOn: prevAgent ? [this._agentRoleToStepKey(prevAgent.role)] : [],
        validation: this._buildValidation(airMission.promoteCondition),
      });
    }

    return {
      title: `AIR: ${airMission.name}`,
      objective: `Missão compilada do FÊNIX AIR: ${airMission.name}. Requisitos: ${airMission.requirements.join(', ')}`,
      steps,
      policy: airMission.metadata.policy || {},
      airMissionId: airMission.id,
      source: 'FENIX_AIR',
    };
  }

  /**
   * Serializa AIRMission para JSON
   */
  serialize(airMission) {
    return JSON.stringify(airMission, null, 2);
  }

  /**
   * Deserializa JSON para AIRMission e valida
   */
  deserialize(json) {
    let obj;
    try { obj = JSON.parse(json); } catch (e) { throw new Error('FenixAIR.deserialize: JSON inválido'); }
    return this._validate(obj);
  }

  // ─── PARSING ──────────────────────────────────────────────────────────────

  _tokenize(source) {
    // Remove comments
    const clean = source.replace(/\/\/.*/g, '').replace(/\r\n/g, '\n');
    // Tokenize: identifiers (any case), operators, strings
    return clean.match(/[a-zA-Z_][a-zA-Z_0-9]*|[{};\[\]()==!<>]+|"[^"]*"|'[^']*'|\S/g) || [];
  }

  _parseMission(tokens, source) {
    const pos = { i: 0 };
    const peek = () => tokens[pos.i] || null;
    const consume = (expected = null) => {
      const t = tokens[pos.i++];
      if (expected && t !== expected) throw new Error(`FenixAIR: esperado "${expected}", encontrado "${t}"`);
      return t;
    };

    consume('MISSION');
    const name = consume();
    if (!/^[a-zA-Z_][a-zA-Z_0-9_]*$/.test(name)) throw new Error(`FenixAIR: nome de missão inválido "${name}"`);
    consume('{');

    const requirements = [];
    const agents = [];
    let promoteCondition = { conditions: [] };

    while (peek() && peek() !== '}') {
      const keyword = consume();
      if (keyword === 'REQUIREMENT') {
        requirements.push(consume());
      } else if (keyword === 'AGENT') {
        agents.push(this._parseAgent(tokens, pos, consume, peek));
      } else if (keyword === 'PROMOTE') {
        consume('only_if');
        promoteCondition = this._parsePromoteCondition(tokens, pos, consume, peek);
      } else {
        throw new Error(`FenixAIR: token inesperado "${keyword}"`);
      }
    }
    consume('}');

    if (agents.length === 0) throw new Error('FenixAIR: missão deve ter pelo menos 1 agente');

    return {
      id: `air_${crypto.createHash('sha256').update(name + source.length).digest('hex').slice(0, 12)}`,
      name,
      requirements,
      agents,
      promoteCondition,
      metadata: { compiledAt: now(), tokenCount: tokens.length },
    };
  }

  _parseAgent(tokens, pos, consume, peek) {
    const role = consume();
    consume('{');
    const actions = [];
    const inputs = [];
    const outputs = [];

    while (peek() && peek() !== '}') {
      const token = peek();
      // Skip semicolons used as separators
      if (token === ';') { pos.i++; continue; }
      const verb = consume();
      if (!VALID_VERBS.has(verb)) throw new Error(`FenixAIR: verbo inválido "${verb}"`);
      // target is the next non-semicolon, non-brace token
      const target = consume();
      // optional trailing semicolon
      if (peek() === ';') pos.i++;

      actions.push({ verb, target });
      if (verb === 'INPUT') inputs.push(target);
      if (verb === 'EMIT') outputs.push(target);
    }
    consume('}');

    return {
      id: `air_agent_${crypto.randomBytes(4).toString('hex')}`,
      role,
      actions,
      inputs,
      outputs,
    };
  }

  _parsePromoteCondition(tokens, pos, consume, peek) {
    consume('{');
    const conditions = [];
    while (peek() && peek() !== '}') {
      if (peek() === ';') { pos.i++; continue; }
      const key = consume();
      const op = consume();
      const value = consume();
      if (peek() === ';') pos.i++;

      if (!VALID_PROMOTION_KEYS.has(key)) throw new Error(`FenixAIR: chave de promoção inválida "${key}"`);
      if (!VALID_PROMOTION_OPS.has(op)) throw new Error(`FenixAIR: operador inválido "${op}"`);
      conditions.push({ key, op, value });
    }
    consume('}');
    return { conditions };
  }

  _validate(obj) {
    if (!obj.name || !obj.agents || !Array.isArray(obj.agents)) {
      throw new Error('FenixAIR.deserialize: estrutura inválida — faltam name ou agents');
    }
    return obj;
  }

  _agentRoleToStepKey(role) {
    const map = {
      architect: 'inspect', developer: 'dev-execute', verifier: 'validate',
      researcher: 'inspect', qa: 'validate', security: 'validate',
      analyst: 'analyze', devops: 'orchestrate',
    };
    return map[role.toLowerCase()] || 'inspect';
  }

  _buildValidation(promoteCondition) {
    if (!promoteCondition?.conditions?.length) return null;
    return {
      rules: promoteCondition.conditions,
      strategy: 'ALL_MUST_PASS',
    };
  }
}

// ─── AGENT COMPILER ───────────────────────────────────────────────────────────

/**
 * Traduz intenção humana → missão FÊNIX AIR → spec MissionKernel.
 * Camada de compilação: Human Goal → Jobs → Execution.
 */
class AgentCompiler {
  constructor(opts = {}) {
    this.air = opts.air || new FenixAIR();
  }

  /**
   * Compila um objetivo humano em uma especificação de missão.
   * Detecta a topologia adequada baseada na complexidade.
   */
  compile(humanGoal, context = {}) {
    const complexity = this._assessComplexity(humanGoal, context);
    const topology = this._selectTopology(complexity, context.domain);
    const airSource = this._generateAIR(humanGoal, topology);

    let airMission;
    try {
      airMission = this.air.compile(airSource);
    } catch (err) {
      throw new Error(`AgentCompiler: falha ao compilar AIR — ${err.message}`);
    }

    const missionSpec = this.air.toMissionSpec(airMission);

    return {
      id: `compiled_${crypto.randomBytes(6).toString('hex')}`,
      humanGoal,
      complexity,
      topology,
      airSource,
      airMission,
      missionSpec,
      compiledAt: now(),
    };
  }

  _assessComplexity(goal, context) {
    const goalLength = goal.length;
    const keywords = ['security', 'migration', 'refactor', 'multi-service', 'database', 'deploy'];
    const complexKeywords = keywords.filter((k) => goal.toLowerCase().includes(k)).length;
    if (goalLength < 100 && complexKeywords === 0) return 'SIMPLE';
    if (goalLength < 300 && complexKeywords <= 2) return 'MODERATE';
    return 'COMPLEX';
  }

  _selectTopology(complexity, domain) {
    // Problema simples: 1 agente
    if (complexity === 'SIMPLE') return { agents: ['developer'], pattern: 'SINGLE' };
    // Código: architect → developer → tester → security
    if (domain === 'CODE_GENERATION') return { agents: ['architect', 'developer', 'qa', 'security'], pattern: 'CODE_PIPELINE' };
    // Pesquisa: researchers → verifier → synthesizer → critic
    if (domain === 'RESEARCH') return { agents: ['researcher', 'verifier', 'analyst'], pattern: 'RESEARCH_PIPELINE' };
    // Complexo: planner → specialists → critic → verifier
    return { agents: ['architect', 'developer', 'qa', 'verifier'], pattern: 'FULL_PIPELINE' };
  }

  _generateAIR(goal, topology) {
    const missionName = goal.replace(/\s+/g, '_').replace(/[^a-zA-Z_0-9]/g, '').slice(0, 40) || 'compiled_mission';
    const agentBlocks = topology.agents.map((role) => {
      const actions = this._defaultActionsForRole(role);
      return `  AGENT ${role} {\n${actions.map((a) => `    ${a.verb} ${a.target}`).join('\n')}\n  }`;
    }).join('\n');

    return `MISSION ${missionName} {
  REQUIREMENT goal_completion

${agentBlocks}

  PROMOTE only_if {
    tests == PASS
    security == PASS
    regression == NONE
  }
}`;
  }

  _defaultActionsForRole(role) {
    const map = {
      architect: [{ verb: 'READ', target: 'project' }, { verb: 'ANALYZE', target: 'architecture' }, { verb: 'EMIT', target: 'design' }],
      developer: [{ verb: 'INPUT', target: 'design' }, { verb: 'WRITE', target: 'code' }, { verb: 'RUN', target: 'tests' }],
      qa: [{ verb: 'READ', target: 'code' }, { verb: 'RUN', target: 'test_suite' }, { verb: 'EMIT', target: 'test_report' }],
      security: [{ verb: 'SCAN', target: 'code' }, { verb: 'VERIFY', target: 'dependencies' }, { verb: 'EMIT', target: 'security_report' }],
      verifier: [{ verb: 'READ', target: 'changes' }, { verb: 'RUN', target: 'validation' }, { verb: 'EMIT', target: 'evidence' }],
      researcher: [{ verb: 'READ', target: 'sources' }, { verb: 'ANALYZE', target: 'data' }, { verb: 'EMIT', target: 'findings' }],
      analyst: [{ verb: 'INPUT', target: 'findings' }, { verb: 'HYPOTHESIZE', target: 'patterns' }, { verb: 'EMIT', target: 'insights' }],
    };
    return map[role] || [{ verb: 'OBSERVE', target: 'context' }, { verb: 'EMIT', target: 'result' }];
  }
}

function now() { return new Date().toISOString(); }

module.exports = { FenixAIR, AgentCompiler };
