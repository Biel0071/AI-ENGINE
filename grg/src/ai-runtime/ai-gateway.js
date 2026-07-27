const crypto = require('node:crypto');
const { uuid } = require('../kernel/ids');
const { ValidationError, ForbiddenError } = require('../kernel/errors');
const { estimateTokens } = require('./providers');

// AI Gateway: roteamento multi-provedor + fallback + cache + token budget por tenant + telemetria.
class AIGateway {
  constructor({ store, bus, controlPlane, providers, routes }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    // providers: { name: adapter }
    this.providers = providers;
    // routes: { taskType: { provider, model, fallback? } }
    this.routes = routes || {
      default: { provider: 'echo', model: 'echo-small' },
      plan: { provider: 'echo', model: 'echo-large' },
      generate: { provider: 'echo', model: 'echo-large' },
    };
  }

  cacheKey(tenantId, model, prompt) {
    return crypto.createHash('sha256').update(`${tenantId}|${model}|${prompt}`).digest('hex');
  }

  route(taskType) {
    return this.routes[taskType] || this.routes.default;
  }

  async setBudget(tenantId, actorId, totalTokens) {
    await this.cp.authorize(tenantId, actorId, 'ai:invoke');
    await this.store.update((state) => {
      const t = state.tenants.find((x) => x.id === tenantId);
      t.tokenBudget = { total: Number(totalTokens), spent: t.tokenBudget?.spent || 0 };
      return state;
    });
    return this.budget(tenantId);
  }

  async budget(tenantId) {
    const state = await this.store.read();
    const t = state.tenants.find((x) => x.id === tenantId);
    const b = t?.tokenBudget || { total: null, spent: 0 };
    return { total: b.total, spent: b.spent, remaining: b.total == null ? Infinity : Math.max(0, b.total - b.spent) };
  }

  async invoke(tenantId, actorId, { taskType = 'default', prompt }) {
    await this.cp.authorize(tenantId, actorId, 'ai:invoke');
    if (!prompt) throw new ValidationError('prompt is required');

    const { provider: providerName, model, fallback } = this.route(taskType);
    const key = this.cacheKey(tenantId, model, prompt);

    // cache hit: custo zero de provider
    const cached = (await this.store.read()).aiCache.find((c) => c.key === key);
    if (cached) {
      await this.record(tenantId, actorId, { taskType, model, promptTokens: 0, completionTokens: 0, cached: true });
      await this.bus.emit('ai.cache_hit', { tenantId, taskType, model });
      return { text: cached.text, cached: true, model };
    }

    // budget check (estimativa antes de chamar)
    const est = estimateTokens(prompt);
    const bud = await this.budget(tenantId);
    if (bud.remaining !== Infinity && bud.remaining < est) {
      throw new ForbiddenError(`Token budget exhausted for tenant ${tenantId}`);
    }

    let provider = this.providers[providerName];
    let usedModel = model;
    if (!provider && fallback) { provider = this.providers[fallback.provider]; usedModel = fallback.model; }
    if (!provider) throw new ValidationError(`No provider available for ${providerName}`);

    const result = await provider.complete({ model: usedModel, prompt });
    await this.store.update((state) => {
      state.aiCache.push({ key, text: result.text, model: usedModel, createdAt: now() });
      return state;
    });
    await this.record(tenantId, actorId, {
      taskType, model: usedModel,
      promptTokens: result.promptTokens, completionTokens: result.completionTokens, cached: false,
    });
    await this.bus.emit('ai.invoked', { tenantId, taskType, model: usedModel, tokens: result.promptTokens + result.completionTokens });
    return { text: result.text, cached: false, model: usedModel };
  }

  async record(tenantId, actorId, { taskType, model, promptTokens, completionTokens, cached }) {
    const total = promptTokens + completionTokens;
    await this.store.update((state) => {
      state.aiCalls.push({
        id: uuid(), tenantId, actorId, taskType, model,
        promptTokens, completionTokens, totalTokens: total, cached,
        costUsd: estimateCost(model, total), createdAt: now(),
      });
      if (!cached) {
        const t = state.tenants.find((x) => x.id === tenantId);
        if (t && t.tokenBudget) t.tokenBudget.spent += total;
      }
      return state;
    });
  }

  async telemetry(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'ai:invoke');
    const state = await this.store.read();
    const calls = state.aiCalls.filter((c) => c.tenantId === tenantId);
    return {
      calls: calls.length,
      cacheHits: calls.filter((c) => c.cached).length,
      totalTokens: calls.reduce((s, c) => s + c.totalTokens, 0),
      totalCostUsd: Number(calls.reduce((s, c) => s + c.costUsd, 0).toFixed(6)),
      budget: await this.budget(tenantId),
    };
  }
}

function estimateCost(model, tokens) {
  const rate = /large/.test(model) ? 0.000015 : 0.0000005; // usd/token (mock)
  return tokens * rate;
}
function now() { return new Date().toISOString(); }

module.exports = { AIGateway };
