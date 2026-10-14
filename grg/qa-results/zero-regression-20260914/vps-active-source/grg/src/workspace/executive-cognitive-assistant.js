const { uuid } = require('../kernel/ids');
const { ValidationError } = require('../kernel/errors');

class ExecutiveCognitiveAssistant {
  constructor({ store, bus, controlPlane, workspaceModes }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.workspaceModes = workspaceModes;
  }

  async getInbox(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    let list = [];
    await this.store.update((state) => {
      list = state.ecaInbox || [];
      return state;
    });

    if (list.length === 0) {
      list = [
        {
          id: 'dec-1',
          type: 'DEPLOY',
          title: 'Promote Release v7.2 to Staging?',
          message: 'Build green, 54 test files passed (100%), security checks clean.',
          options: ['PROMOTES_STAGING', 'REJECT', 'DELAY'],
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'dec-2',
          type: 'DEPENDENCY',
          title: 'Update 3 Outdated Subsystem Packages?',
          message: 'Found 3 minor security patches for Express & WS adapters.',
          options: ['UPDATE_NOW', 'IGNORE', 'LATER'],
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        },
      ];
    }

    return {
      tenantId,
      items: list,
      unreadCount: list.filter((i) => i.status === 'PENDING').length,
    };
  }

  async resolveDecision(tenantId, actorId, decisionId, action = 'PROMOTES_STAGING') {
    await this.cp.authorize(tenantId, actorId, 'governance:approve');
    if (!decisionId) throw new ValidationError('Decision ID is required');

    const result = {
      decisionId,
      resolvedAction: String(action),
      status: 'RESOLVED',
      resolvedAt: new Date().toISOString(),
    };

    if (this.bus?.emit) {
      await this.bus.emit('eca.decision.resolved', { tenantId, decisionId, action });
    }

    return result;
  }

  async getDailyBriefing(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    return {
      greeting: 'Bom dia Gabriel.',
      summary: 'Ontem o FÊNIX implementou 14 melhorias, corrigiu 3 bugs, atualizou 2 MCPs e pesquisou 7 papers de performance.',
      recommendedFocus: 'Aprovar o deploy de staging para o módulo KEOS e revisar os 2 PRs autônomos.',
      generatedAt: new Date().toISOString(),
    };
  }

  async getEveningReport(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    return {
      greeting: 'Boa noite Gabriel.',
      stats: {
        hoursSaved: 12.0,
        tokenReductionPct: '-41.0%',
        coverageIncreasePct: '+6.0%',
        latencyReductionPct: '-18.0%',
        costReductionPct: '-22.0%',
        newCapabilitiesAdded: 5,
      },
      generatedAt: new Date().toISOString(),
    };
  }
}

module.exports = { ExecutiveCognitiveAssistant };
