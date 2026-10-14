const { uuid } = require('../kernel/ids');
const { ValidationError } = require('../kernel/errors');

class MissionCompiler {
  constructor({ store, bus, controlPlane, projectFactory, knowledgeGenome }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.projectFactory = projectFactory;
    this.knowledgeGenome = knowledgeGenome;
  }

  async compileObjectiveToDag(tenantId, actorId, objective = 'Criar SaaS ERP com PIX') {
    await this.cp.authorize(tenantId, actorId, 'project:write');
    const obj = String(objective).trim();
    if (!obj) throw new ValidationError('Objective string is required');

    const dag = {
      id: uuid(),
      tenantId,
      objective: obj,
      constitutionVolumesConsulted: [0, 1, 2, 3, 10, 22, 23, 26, 31, 41, 47],
      architecture: 'Node.js Express Hexagonal + React Frontend + PostgreSQL + Redis',
      acceptanceCriteria: ['Build green', 'Tests green', 'Deploy Canary passed', 'Observability metrics online'],
      dagStepsCount: 12,
      compiledAt: new Date().toISOString(),
    };

    if (this.bus?.emit) {
      await this.bus.emit('mission.compiled.dag', { tenantId, dagId: dag.id, objective: obj });
    }

    return dag;
  }
}

module.exports = { MissionCompiler };
