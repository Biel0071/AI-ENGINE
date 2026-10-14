'use strict';

const { NotFoundError } = require('../kernel/errors');

class OrchestrationRepository {
  constructor(store, { writeAttempts = 5, writeBaseDelayMs = 500 } = {}) {
    if (!store?.read || !store?.update) throw new Error('orchestration repository requires the canonical store');
    this.store = store;
    this.writeAttempts = Math.max(1, Number(writeAttempts || 5));
    this.writeBaseDelayMs = Math.max(10, Number(writeBaseDelayMs || 500));
  }

  async createRequest(request) {
    await this.#write(() => this.store.update((state) => {
      state.orchestrationRequests.push(structuredClone(request));
      return state;
    }));
    return request;
  }

  async updateRequest(id, patch) {
    return this.#update('orchestrationRequests', id, patch, 'request');
  }

  async getRequest(tenantId, id) {
    const state = await this.store.read();
    return state.orchestrationRequests.find((item) => item.tenantId === tenantId && item.id === id) || null;
  }

  async listRequests(tenantId) {
    const state = await this.store.read();
    return state.orchestrationRequests.filter((item) => item.tenantId === tenantId).slice().reverse();
  }

  async createMission(mission) {
    await this.#write(() => this.store.update((state) => {
      state.orchestrationMissions.push(structuredClone(mission));
      return state;
    }));
    return mission;
  }

  async updateMission(id, patch) {
    return this.#update('orchestrationMissions', id, patch, 'mission');
  }

  async getMission(tenantId, id) {
    const state = await this.store.read();
    return state.orchestrationMissions.find((item) => item.tenantId === tenantId && item.id === id) || null;
  }

  async listMissions(tenantId) {
    const state = await this.store.read();
    return state.orchestrationMissions.filter((item) => item.tenantId === tenantId).slice().reverse();
  }

  async appendEvent(event) {
    await this.#write(() => this.store.update((state) => {
      state.orchestrationEvents.push(structuredClone(event));
      return state;
    }));
    return event;
  }

  async listEvents(tenantId, requestId = null) {
    const state = await this.store.read();
    return state.orchestrationEvents.filter((item) => item.tenantId === tenantId && (!requestId || item.requestId === requestId));
  }

  async #update(collection, id, patch, label) {
    let updated;
    await this.#write(() => this.store.update((state) => {
      const current = state[collection].find((item) => item.id === id);
      if (!current) throw new NotFoundError(`${label} not found: ${id}`);
      Object.assign(current, structuredClone(patch), { updatedAt: new Date().toISOString() });
      updated = structuredClone(current);
      return state;
    }));
    return updated;
  }

  async #write(operation) {
    let lastError;
    for (let attempt = 1; attempt <= this.writeAttempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (!isTransientWriteError(error) || attempt === this.writeAttempts) throw error;
        const delayMs = Math.min(8_000, this.writeBaseDelayMs * (2 ** (attempt - 1)));
        await new Promise((resolve) => setTimeout(resolve, delayMs + Math.floor(Math.random() * delayMs * 0.4)));
      }
    }
    throw lastError;
  }
}

function isTransientWriteError(error) {
  return error?.code === '40001' || error?.code === '40P01' || error?.code === '55P03';
}

module.exports = { OrchestrationRepository, isTransientWriteError };
