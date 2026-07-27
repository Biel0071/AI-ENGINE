const { ValidationError } = require('../kernel/errors');

class MasterAvatar {
  constructor({ chat, missionPlanner }) { this.chat = chat; this.missionPlanner = missionPlanner; }

  async handle(tenantId, actorId, input = {}) {
    const message = String(input.message || '').trim();
    if (!message || message.length > 4_000) throw new ValidationError('avatar message is required and must contain at most 4000 characters');
    if (input.mode === 'conversation' || !isOperationalRequest(message)) {
      const response = await this.chat.handle(tenantId, actorId, message);
      return { ...response, interface: 'MASTER_AVATAR', mission: null, plan: null };
    }
    const output = await this.missionPlanner.plan(tenantId, actorId, {
      message, objective: message, title: input.title, mode: input.mode === 'auto' ? undefined : input.mode,
      scopeId: input.scopeId, context: input.context, contextRefs: input.contextRefs,
      priority: input.priority, policy: input.policy, autoStart: input.autoStart !== false,
    });
    if (!output.mission) return { interface: 'MASTER_AVATAR', mission: null, plan: output.plan, reply: output.plan.questions.map((item) => item.question).join('\n') };
    const mission = output.mission; const awaiting = mission.steps.filter((item) => item.status === 'AWAITING_APPROVAL').length;
    return { interface: 'MASTER_AVATAR', mission, plan: output.plan, reply: `Missão ${mission.id} criada com ${mission.steps.length} etapas. Estado: ${mission.status}.${awaiting ? ` ${awaiting} etapa(s) aguardam aprovação.` : ''}` };
  }
}

function isOperationalRequest(value) {
  return /\b(analis|audit|verific|monitor|observ|cri(ar|e)|constru|ger(ar|e)|implant|deploy|evolu|corrig|otimiz|index|descobr|mape|teste|status|sa[uú]de|readiness|projeto|sistema|erp|crm|site|aplicativo|app)\w*/i.test(value);
}

module.exports = { MasterAvatar, isOperationalRequest };
