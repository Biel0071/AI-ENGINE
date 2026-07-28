const { uuid } = require('../kernel/ids');
const { ValidationError } = require('../kernel/errors');

class ProjectFactoryService {
  constructor({ store, bus, controlPlane, factory, missionPlanner, digitalTwin }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.factory = factory;
    this.missionPlanner = missionPlanner;
    this.digitalTwin = digitalTwin;
  }

  async processDemand(tenantId, actorId, input = {}) {
    await this.cp.authorize(tenantId, actorId, 'project:write');
    const prompt = String(input.prompt || input.demand || '').trim();
    if (!prompt) {
      throw new ValidationError('Demand prompt is required');
    }

    const type = this.detectProjectKind(prompt);
    const projectName = input.name || `${type.toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const questions = [];
    if (!input.scope) questions.push(`Qual o escopo principal do ${type}?`);
    if (!input.users) questions.push(`Quem são os usuários primários do ${type}?`);

    const architecture = {
      type,
      frontend: 'React / HTML5',
      backend: 'Node.js Express Hexagonal',
      database: 'PostgreSQL + Redis',
      aiFeatures: true,
    };

    const backlog = [
      { step: 1, task: 'Scaffold project repository & architecture foundation' },
      { step: 2, task: 'Create database migrations & domain models' },
      { step: 3, task: 'Implement REST APIs & business logic' },
      { step: 4, task: 'Build responsive Frontend interface' },
      { step: 5, task: 'Configure CI/CD, tests and deployment readiness' },
    ];

    let mission = null;
    if (this.missionPlanner && questions.length === 0) {
      const output = await this.missionPlanner.plan(tenantId, actorId, {
        message: `Construir ${projectName}: ${prompt}`,
        objective: prompt,
      }).catch(() => null);
      mission = output ? output.mission : null;
    }

    const result = {
      id: uuid(),
      tenantId,
      projectName,
      demandPrompt: prompt,
      projectType: type,
      architecture,
      questions,
      backlog,
      missionId: mission ? mission.id : null,
      status: questions.length > 0 ? 'INTERVIEW_NEEDS_INPUT' : 'READY_TO_BUILD',
      createdAt: new Date().toISOString(),
    };

    await this.store.update((state) => {
      state.factoryDemands = state.factoryDemands || [];
      state.factoryDemands.push(result);
      return state;
    });

    if (this.bus?.emit) {
      await this.bus.emit('factory.demand.created', { tenantId, demandId: result.id, projectName });
    } else if (this.bus?.publish) {
      await this.bus.publish({ tenantId, type: 'factory.demand.created', data: { demandId: result.id, projectName } });
    }

    return result;
  }

  detectProjectKind(prompt) {
    if (/\berp\b/i.test(prompt)) return 'ERP';
    if (/\bcrm\b/i.test(prompt)) return 'CRM';
    if (/\bjogo|game\b/i.test(prompt)) return 'GAME';
    if (/\bsaas\b/i.test(prompt)) return 'SAAS';
    if (/\bapp|aplicativo\b/i.test(prompt)) return 'MOBILE_APP';
    return 'CUSTOM_SYSTEM';
  }
}

module.exports = { ProjectFactoryService };
