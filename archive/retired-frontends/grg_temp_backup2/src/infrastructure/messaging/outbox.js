const { uuid } = require('../../kernel/ids');
const { ValidationError } = require('../../kernel/errors');

class OutboxService {
  constructor({ store, clock = () => new Date().toISOString() }) {
    this.store = store;
    this.clock = clock;
  }

  async enqueue(tenantId, type, payload, options = {}) {
    if (!tenantId || !type) throw new ValidationError('tenantId and event type are required');
    let event;
    await this.store.update(async (state) => {
      if (options.dedupeKey) {
        event = state.outbox.find((item) => item.tenantId === tenantId && item.dedupeKey === options.dedupeKey);
        if (event) return state;
      }
      event = {
        id: uuid(), tenantId, type, payload, dedupeKey: options.dedupeKey || null,
        status: 'PENDING', attempts: 0, availableAt: options.availableAt || this.clock(), createdAt: this.clock(),
      };
      state.outbox.push(event);
      return state;
    });
    return event;
  }

  async claimBatch(workerId, limit = 25) {
    if (!workerId) throw new ValidationError('workerId is required');
    const claimed = [];
    const now = this.clock();
    await this.store.update(async (state) => {
      for (const event of state.outbox) {
        if (claimed.length >= limit) break;
        if (event.status === 'PENDING' && event.availableAt <= now) {
          event.status = 'PROCESSING';
          event.workerId = workerId;
          event.claimedAt = now;
          event.attempts += 1;
          claimed.push(event);
        }
      }
      return state;
    });
    return claimed;
  }

  async markPublished(eventId, workerId) {
    return this.#transition(eventId, workerId, (event) => {
      event.status = 'PUBLISHED';
      event.publishedAt = this.clock();
    });
  }

  async markFailed(eventId, workerId, error, retryAt = null) {
    return this.#transition(eventId, workerId, (event) => {
      event.lastError = String(error?.message || error || 'unknown error').slice(0, 1000);
      event.status = retryAt ? 'PENDING' : 'FAILED';
      event.availableAt = retryAt || event.availableAt;
      event.failedAt = this.clock();
      delete event.workerId;
    });
  }

  async #transition(eventId, workerId, mutate) {
    let result;
    await this.store.update(async (state) => {
      const event = state.outbox.find((item) => item.id === eventId);
      if (!event || event.status !== 'PROCESSING' || event.workerId !== workerId) {
        throw new ValidationError('outbox event is not claimed by this worker');
      }
      mutate(event);
      result = event;
      return state;
    });
    return result;
  }
}

module.exports = { OutboxService };
