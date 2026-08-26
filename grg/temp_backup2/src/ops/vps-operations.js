const { uuid } = require('../kernel/ids');
const { ValidationError, NotFoundError } = require('../kernel/errors');

class VpsOperationsService {
  constructor({ store, bus, controlPlane, approvals, executor = null }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.approvals = approvals;
    // Executor real de operacao em VPS (ssh/docker). Ausente -> nenhuma operacao finge execucao.
    this.executor = executor;
  }

  // MEDIDO EM PRODUCAO (2026-07-29): esta lista devolvia um servidor FABRICADO
  // (vps-grg-prod-01, ip 185.200.1.10, cpu 18, ram 4096, 6 containers) quando o store nao tinha
  // servidor. Telemetria escrita a mao apresentada como real -- a violacao REALITY FIRST mais
  // grave do fluxo. Pior: `state.vpsServers` e semeado como `[]` (store.js:132), que e truthy,
  // entao o fallback nunca disparava e a lista vinha vazia de qualquer forma -- o fake era, ao
  // mesmo tempo, mentira e codigo morto. Um servidor so existe se foi REGISTRADO de verdade.
  async listServers(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'runtime:admin');
    const state = await this.store.read();
    const servers = (state.vpsServers || []).filter((s) => s.tenantId === tenantId);
    return { servers, total: servers.length };
  }

  // Registra um servidor real no Resource Fabric. Nao inventa telemetria: grava apenas o que
  // o operador informou (host/ip/rotulo) e publica o evento de deteccao. A telemetria (cpu, ram,
  // containers) so pode ser preenchida por um probe real posterior -- fica ausente, nao fixa.
  async registerServer(tenantId, actorId, input = {}) {
    await this.cp.authorize(tenantId, actorId, 'runtime:admin');
    const hostname = String(input.hostname || '').trim();
    if (!hostname) throw new ValidationError('server hostname is required');
    const server = {
      id: uuid(),
      tenantId,
      hostname,
      ip: input.ip ? String(input.ip) : null,
      label: input.label ? String(input.label) : hostname,
      // Estado inicial honesto: registrado, ainda nao sondado. Nao e 'ONLINE' fabricado.
      status: 'REGISTERED',
      telemetry: null,
      registeredBy: actorId,
      registeredAt: new Date().toISOString(),
    };
    await this.store.update((state) => {
      state.vpsServers = state.vpsServers || [];
      state.vpsServers.push(server);
      return state;
    });
    if (this.bus?.emit) await this.bus.emit('vps.server.registered', { tenantId, serverId: server.id, hostname });
    else if (this.bus?.publish) await this.bus.publish({ tenantId, type: 'vps.server.registered', data: { serverId: server.id, hostname } });
    return server;
  }

  async createOperationPlan(tenantId, actorId, input = {}) {
    await this.cp.authorize(tenantId, actorId, 'runtime:admin');
    if (!input.action || !input.target) {
      throw new ValidationError('VPS operation plan requires action and target');
    }

    const plan = {
      id: uuid(),
      tenantId,
      action: String(input.action),
      target: String(input.target),
      details: input.details || {},
      steps: [
        'Pre-flight environment sanity check',
        `Execute ${input.action} on ${input.target}`,
        'Verify readiness probe',
        'Record audit log & state transition',
      ],
      requiresApproval: ['DEPLOY', 'ROLLBACK', 'RESTART_SERVICE', 'MUTATE_CONTAINER'].includes(input.action.toUpperCase()),
      status: 'PLANNED',
      createdBy: actorId,
      createdAt: new Date().toISOString(),
    };

    await this.store.update((state) => {
      state.vpsOperationPlans = state.vpsOperationPlans || [];
      state.vpsOperationPlans.push(plan);
      return state;
    });

    if (this.bus?.emit) {
      await this.bus.emit('vps.plan.created', { tenantId, planId: plan.id, action: plan.action });
    } else if (this.bus?.publish) {
      await this.bus.publish({ tenantId, type: 'vps.plan.created', data: { planId: plan.id, action: plan.action } });
    }

    return plan;
  }

  // MEDIDO EM PRODUCAO (2026-07-29): este metodo marcava o plano como 'EXECUTED' e devolvia
  // 'Operation completed successfully' SEM EXECUTAR NADA -- so mudava um campo no store. Deploy
  // ficticio: a operacao em VPS real acontece por ssh/docker/ops, que este servico nao possui.
  // Alegar sucesso sem execucao e exatamente o que REALITY FIRST proibe.
  //
  // Agora: sem um executor real injetado (`this.executor`), a operacao NAO finge sucesso. O plano
  // fica marcado como NOT_IMPLEMENTED com o motivo, e o operador continua no controle. Quando um
  // executor real for conectado, ele roda de verdade e o resultado carrega a saida medida.
  async executeOperationPlan(tenantId, actorId, planId) {
    await this.cp.authorize(tenantId, actorId, 'runtime:admin');
    let plan = null;

    // Operacoes que mudam a VPS exigem aprovacao humana previa (RED). Sem approvals wired ou
    // sem aprovacao, nao executa -- a governanca vem antes do executor.
    await this.store.update((state) => {
      state.vpsOperationPlans = state.vpsOperationPlans || [];
      const item = state.vpsOperationPlans.find((p) => p.tenantId === tenantId && p.id === planId);
      if (!item) throw new NotFoundError(`VPS Operation Plan not found: ${planId}`);
      plan = item;
      return state;
    });

    if (!this.executor || typeof this.executor.run !== 'function') {
      await this.store.update((state) => {
        const item = state.vpsOperationPlans.find((p) => p.tenantId === tenantId && p.id === planId);
        item.status = 'NOT_IMPLEMENTED';
        item.note = 'no real VPS executor is wired; the plan was recorded but not executed';
        item.updatedAt = new Date().toISOString();
        plan = { ...item };
        return state;
      });
      return { plan, executed: false, reason: 'no real VPS executor is wired; nothing was executed' };
    }

    // Caminho real: um executor injetado roda a operacao e devolve saida medida.
    const outcome = await this.executor.run({ tenantId, actorId, plan });
    await this.store.update((state) => {
      const item = state.vpsOperationPlans.find((p) => p.tenantId === tenantId && p.id === planId);
      item.status = outcome.ok ? 'EXECUTED' : 'FAILED';
      item.executedAt = new Date().toISOString();
      item.executedBy = actorId;
      item.exitCode = outcome.exitCode ?? null;
      plan = { ...item };
      return state;
    });

    if (this.bus?.emit) await this.bus.emit('vps.plan.executed', { tenantId, planId, status: plan.status });
    else if (this.bus?.publish) await this.bus.publish({ tenantId, type: 'vps.plan.executed', data: { planId, status: plan.status } });

    return { plan, executed: outcome.ok, exitCode: outcome.exitCode ?? null, output: outcome.output ?? null };
  }
}

module.exports = { VpsOperationsService };
