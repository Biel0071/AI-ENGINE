const crypto = require('node:crypto');
const { ConflictError, ValidationError } = require('../../kernel/errors');

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash('sha256').update(canonical(value)).digest('hex');
}

class IdempotencyService {
  constructor({ store, clock = () => new Date().toISOString() }) {
    this.store = store;
    this.clock = clock;
  }

  async execute({ tenantId, key, operation, input }, handler) {
    if (!tenantId || !key || !operation) throw new ValidationError('tenantId, key and operation are required');
    const inputHash = digest(input ?? null);
    let replay;
    let hasReplay = false;
    await this.store.update(async (state) => {
      const existing = state.idempotencyKeys.find((item) => item.tenantId === tenantId && item.key === key);
      if (existing) {
        if (existing.operation !== operation || existing.inputHash !== inputHash) {
          throw new ConflictError('idempotency key was already used with a different request');
        }
        if (existing.status === 'COMPLETED') {
          replay = existing.result;
          hasReplay = true;
        }
        else throw new ConflictError('idempotent operation is already in progress');
        return state;
      }
      state.idempotencyKeys.push({ tenantId, key, operation, inputHash, status: 'PENDING', createdAt: this.clock() });
      return state;
    });
    if (hasReplay) return { replayed: true, result: replay };

    try {
      const result = await handler();
      await this.store.update(async (state) => {
        const record = state.idempotencyKeys.find((item) => item.tenantId === tenantId && item.key === key);
        record.status = 'COMPLETED';
        record.result = result;
        record.completedAt = this.clock();
        return state;
      });
      return { replayed: false, result };
    } catch (error) {
      await this.store.update(async (state) => {
        state.idempotencyKeys = state.idempotencyKeys.filter((item) => !(item.tenantId === tenantId && item.key === key));
        return state;
      });
      throw error;
    }
  }
}

module.exports = { IdempotencyService, digest };
