const { uuid } = require('../kernel/ids');

// Meta-Agente: coordena os motores. Decompõe o pedido, consulta reutilização ANTES de gerar,
// distribui aos serviços (agentes) e consolida. Aqui os "agentes" são os serviços já testados;
// adapters de agentes autônomos (subagentes/serviços) plugam a mesma orquestração.
class Orchestrator {
  constructor({ store, bus, controlPlane, factory, deployer, appFactory, product }) {
    this.store = store; this.bus = bus; this.cp = controlPlane;
    this.factory = factory; this.deployer = deployer; this.appFactory = appFactory; this.product = product;
  }

  // Pipeline ponta-a-ponta: prompt -> projeto reutilizando capabilities -> deploy preview -> (opcional) build.
  async buildFromPrompt(tenantId, actorId, input) {
    const trace = [];
    const step = (name, data) => trace.push({ step: name, at: new Date().toISOString(), ...data });

    // 1. planejar (descobrir reutilização)
    const plan = await this.factory.plan(tenantId, actorId, input.prompt);
    step('plan', { reused: plan.reusedModules, build: plan.newModulesToBuild });

    // 2. gerar (só o inexistente)
    const gen = await this.factory.generate(tenantId, actorId, { id: input.id, name: input.name, prompt: input.prompt });
    step('generate', { projectId: gen.project.id, validation: gen.validation.ok, outputPath: gen.outputPath });

    // 3. deploy preview
    let deployment = null;
    if (input.deploy !== false) {
      deployment = await this.deployer.deploy(tenantId, actorId, gen.project.id, { environment: 'preview', target: input.target || 'node' });
      step('deploy', { url: deployment.url, environment: 'preview' });
    }

    // 4. empacotar (opcional)
    const artifacts = [];
    for (const t of input.buildTargets || []) {
      const art = await this.appFactory.build(tenantId, actorId, gen.project.id, { target: t });
      artifacts.push(art);
      step('build', { target: t, filename: art.filename });
    }

    const summary = {
      id: uuid(), tenantId, projectId: gen.project.id,
      reused: plan.reusedModules, built: plan.newModulesToBuild,
      previewUrl: deployment?.url || null,
      outputPath: gen.outputPath || null,
      artifacts: artifacts.map((a) => ({ target: a.target, filename: a.filename })),
    };
    await this.bus.emit('orchestrator.completed', summary);
    return { ...summary, trace };
  }
}

module.exports = { Orchestrator };
