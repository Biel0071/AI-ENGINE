const { uuid } = require('../kernel/ids');
const { ValidationError, NotFoundError } = require('../kernel/errors');

class HypothesisEngine {
  constructor({ store, bus, controlPlane, approvals, policy }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.approvals = approvals;
    this.policy = policy;
  }

  async proposeHypothesis(tenantId, actorId, input = {}) {
    await this.cp.authorize(tenantId, actorId, 'governance:approve');
    if (!input.title || !input.description || !input.category) {
      throw new ValidationError('Hypothesis requires title, description and category');
    }

    const category = input.category.toUpperCase();
    const validCategories = [
      'REFACTORING',
      'PERFORMANCE',
      'SECURITY',
      'DUPLICATION',
      'MODULARIZATION',
      'UX_IMPROVEMENT',
      'NEW_CAPABILITY',
      'NEW_AGENT',
      'ARCHITECTURE',
    ];

    const hypothesis = {
      id: uuid(),
      tenantId,
      title: String(input.title),
      description: String(input.description),
      category: validCategories.includes(category) ? category : 'ARCHITECTURE',
      evidence: Array.isArray(input.evidence) ? input.evidence : [input.description],
      confidence: Number(input.confidence || 0.85),
      expectedImpact: input.expectedImpact || 'High operational benefit',
      risks: Array.isArray(input.risks) ? input.risks : ['Standard operational risk'],
      rollbackPlan: input.rollbackPlan || 'Revert git commit / restore container image',
      priority: Number(input.priority || 50),
      status: 'PROPOSED',
      createdBy: actorId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.store.update((state) => {
      state.cognitiveHypotheses = state.cognitiveHypotheses || [];
      state.cognitiveHypotheses.push(hypothesis);
      return state;
    });

    if (this.bus?.emit) {
      await this.bus.emit('cognitive.hypothesis.created', { tenantId, hypothesisId: hypothesis.id, title: hypothesis.title });
    } else if (this.bus?.publish) {
      await this.bus.publish({ tenantId, type: 'cognitive.hypothesis.created', data: { hypothesisId: hypothesis.id, title: hypothesis.title } });
    }

    return hypothesis;
  }

  async evaluateHypothesis(tenantId, actorId, hypothesisId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    let hypothesis = null;
    let approval = null;

    await this.store.update((state) => {
      state.cognitiveHypotheses = state.cognitiveHypotheses || [];
      const item = state.cognitiveHypotheses.find((h) => h.tenantId === tenantId && h.id === hypothesisId);
      if (!item) throw new NotFoundError(`Hypothesis not found: ${hypothesisId}`);

      item.status = 'UNDER_REVIEW';
      item.updatedAt = new Date().toISOString();
      hypothesis = { ...item };
      return state;
    });

    if (this.approvals) {
      approval = await this.approvals.request(tenantId, actorId, {
        action: `hypothesis.evaluate.${hypothesis.category.toLowerCase()}`,
        resource: { hypothesisId, title: hypothesis.title },
        rationale: hypothesis.description,
      });

      await this.store.update((state) => {
        const item = state.cognitiveHypotheses.find((h) => h.tenantId === tenantId && h.id === hypothesisId);
        if (item) {
          item.approvalId = approval.id;
          item.status = approval.status === 'approved' ? 'APPROVED' : 'AWAITING_APPROVAL';
        }
        return state;
      });
    }

    return { hypothesis, approval };
  }

  async listHypotheses(tenantId, actorId, filter = {}) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    const state = await this.store.read();
    let hypotheses = (state.cognitiveHypotheses || []).filter((h) => h.tenantId === tenantId);

    if (filter.category) {
      hypotheses = hypotheses.filter((h) => h.category === filter.category.toUpperCase());
    }
    if (filter.status) {
      hypotheses = hypotheses.filter((h) => h.status === filter.status.toUpperCase());
    }

    return { hypotheses, total: hypotheses.length };
  }
}

module.exports = { HypothesisEngine };
