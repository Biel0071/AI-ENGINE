const { ValidationError } = require('../kernel/errors');

class MasterAvatar {
  constructor({ chat, missionPlanner }) {
    this.chat = chat;
    this.missionPlanner = missionPlanner;
    this.states = [
      'DORMINDO',
      'PENSANDO',
      'PLANEJANDO',
      'CONVERSANDO',
      'ANALISANDO',
      'LENDO',
      'APRENDENDO',
      'CONSTRUINDO',
      'EXECUTANDO',
      'CORRIGINDO',
      'TESTANDO',
      'IMPLANTANDO',
      'OBSERVANDO',
    ];
    this.currentState = 'DORMINDO';
  }

  getState() {
    return {
      state: this.currentState,
      availableStates: this.states,
      building: 'Praça Central',
      progress: 100,
    };
  }

  setState(newState) {
    const s = String(newState || '').toUpperCase();
    if (this.states.includes(s)) {
      this.currentState = s;
    }
  }

  async handle(tenantId, actorId, input = {}) {
    const message = String(input.message || '').trim();
    if (!message || message.length > 4_000) {
      throw new ValidationError('avatar message is required and must contain at most 4000 characters');
    }

    const shouldPlanMission = shouldCreateMission(message, input.mode);
    if (!shouldPlanMission) {
      this.setState('CONVERSANDO');
      const response = await this.chat.handle(tenantId, actorId, message);
      return { ...response, interface: 'MASTER_AVATAR', state: this.currentState, mission: null, plan: null };
    }

    this.setState('PLANEJANDO');
    let output;
    try {
      output = await this.missionPlanner.plan(tenantId, actorId, {
        message,
        objective: message,
        title: input.title,
        mode: input.mode === 'auto' ? undefined : input.mode,
        scopeId: input.scopeId,
        context: input.context,
        contextRefs: input.contextRefs,
        priority: input.priority,
        policy: input.policy,
        autoStart: input.autoStart !== false,
      });
    } catch (error) {
      this.setState('ANALISANDO');
      return {
        interface: 'MASTER_AVATAR',
        state: this.currentState,
        mission: null,
        plan: null,
        reply: `Nao consegui criar a missao agora: ${error.message}`,
      };
    }

    if (!output.mission) {
      this.setState('ANALISANDO');
      return {
        interface: 'MASTER_AVATAR',
        state: this.currentState,
        mission: null,
        plan: output.plan,
        reply: output.plan.questions.map((item) => item.question).join('\n'),
      };
    }

    this.setState('EXECUTANDO');
    const mission = output.mission;
    const awaiting = mission.steps.filter((item) => item.status === 'AWAITING_APPROVAL').length;
    return {
      interface: 'MASTER_AVATAR',
      state: this.currentState,
      mission,
      plan: output.plan,
      reply: `Missão ${mission.id} criada com ${mission.steps.length} etapas. Estado: ${mission.status}.${awaiting ? ` ${awaiting} etapa(s) aguardam aprovação.` : ''}`,
    };
  }
}

function isOperationalRequest(value) {
  return /\b(analis|audit|verific|monitor|observ|cri(ar|e)|constru|ger(ar|e)|implant|deploy|evolu|corrig|otimiz|index|descobr|mape|teste|status|sa[uú]de|readiness|projeto|sistema|erp|crm|site|aplicativo|app)\w*/i.test(value);
}

function shouldCreateMission(value, mode) {
  if (mode === 'mission') return true;
  const text = String(value || '');
  const explicitMission = /\b(crie|criar|abre|abrir|inicie|iniciar|planeje|planejar|monte|montar)\b.{0,60}\bmiss[aã]o\b/i.test(text)
    || /\bmiss[aã]o\b.{0,60}\b(crie|criar|abre|abrir|inicie|iniciar|planeje|planejar|monte|montar)\b/i.test(text);
  if (explicitMission) return true;
  if (mode === 'conversation' || mode === 'unified') return false;
  return isOperationalRequest(text);
}

module.exports = { MasterAvatar, isOperationalRequest, shouldCreateMission };
