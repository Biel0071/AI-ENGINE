const { ValidationError } = require('../../kernel/errors');

class InboxService {
  constructor({ store, clock = () => new Date().toISOString() }) {
    this.store = store;
    this.clock = clock;
  }

  async process({ tenantId, consumer, eventId, payload }, handler) {
    if (!tenantId || !consumer || !eventId) throw new ValidationError('tenantId, consumer and eventId are required');
    let existing;
    await this.store.update(async (state) => {
      existing = state.inbox.find((item) => item.tenantId === tenantId && item.consumer === consumer && item.eventId === eventId);
      if (existing) return state;
      state.inbox.push({ tenantId, consumer, eventId, status: 'PROCESSING', receivedAt: this.clock() });
      return state;
    });
    if (existing) {
      if (existing.status === 'COMPLETED') return { replayed: true, result: existing.result };
      throw new ValidationError('event is already being processed');
    }

    try {
      const result = await handler(payload);
      await this.store.update(async (state) => {
        const record = state.inbox.find((item) => item.tenantId === tenantId && item.consumer === consumer && item.eventId === eventId);
        record.status = 'COMPLETED';
        record.result = result;
        record.completedAt = this.clock();
        return state;
      });
      return { replayed: false, result };
    } catch (error) {
      await this.store.update(async (state) => {
        state.inbox = state.inbox.filter((item) => !(item.tenantId === tenantId && item.consumer === consumer && item.eventId === eventId));
        return state;
      });
      throw error;
    }
  }
}

module.exports = { InboxService };
