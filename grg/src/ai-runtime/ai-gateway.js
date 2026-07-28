const crypto = require('node:crypto');
const { uuid } = require('../kernel/ids');
const { ValidationError, ForbiddenError } = require('../kernel/errors');
const { estimateTokens } = require('./providers');
const { withRetry } = require('../infrastructure/resilience/retry');
const { CircuitBreaker } = require('../infrastructure/resilience/circuit-breaker');

class AIGateway {
  constructor({ store, bus, controlPlane, providers, routes, prices = {}, rateLimiter = null, cacheTtlMs = 3_600_000 }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.providers = providers;
    this.prices = prices;
    this.rateLimiter = rateLimiter;
    this.cacheTtlMs = cacheTtlMs;
    this.routes = routes || {
      default: { provider: 'echo', model: 'echo-small' },
      plan: { provider: 'echo', model: 'echo-large' },
      generate: { provider: 'echo', model: 'echo-large' },
    };
    this.breakers = new Map();
  }

  cacheKey(tenantId, taskType, prompt) {
    const route = JSON.stringify(this.route(taskType));
    return crypto.createHash('sha256').update(`${tenantId}|${taskType}|${route}|${prompt}`).digest('hex');
  }

  route(taskType) { return this.routes[taskType] || this.routes.default; }

  // MISSION-1005 — `override` opcional ({provider, model}) permite que o AI Router injete a
  // escolha que ELE fez por evidência, sem que o Gateway deixe de ser o único executor
  // (cache, breaker, rate-limit, aiCalls continuam aqui). Sem override, o comportamento é
  // exatamente o de antes: a rota configurada manda. Com override, o provider decidido pelo
  // Router lidera a lista de candidatos e a rota configurada vira fallback operacional —
  // então se o escolhido cair no breaker, o Gateway ainda tem para onde ir.
  candidates(taskType, override = null) {
    const route = this.route(taskType);
    if (!route?.provider || !route?.model) throw new ValidationError(`AI route ${taskType} requires provider and model`);
    const fallback = route.fallback ? (Array.isArray(route.fallback) ? route.fallback : [route.fallback]) : [];
    const base = [{ ...route, fallback: undefined }, ...fallback];
    if (base.some((item) => !item?.provider || !item?.model)) throw new ValidationError(`AI route ${taskType} has an invalid fallback`);
    if (override?.provider) {
      const chosen = { provider: override.provider, model: override.model || route.model };
      // O escolhido pelo Router primeiro; a rota configurada segue como fallback (sem duplicar o escolhido).
      return [chosen, ...base.filter((item) => item.provider !== chosen.provider)];
    }
    return base;
  }

  breaker(providerName) {
    if (!this.breakers.has(providerName)) {
      this.breakers.set(providerName, new CircuitBreaker({ name: `ai:${providerName}`, failureThreshold: 3, resetTimeoutMs: 30_000 }));
    }
    return this.breakers.get(providerName);
  }

  async setBudget(tenantId, actorId, totalTokens) {
    await this.cp.authorize(tenantId, actorId, 'ai:invoke');
    await this.store.update((state) => {
      const tenant = state.tenants.find((item) => item.id === tenantId);
      tenant.tokenBudget = { total: Number(totalTokens), spent: tenant.tokenBudget?.spent || 0, reserved: tenant.tokenBudget?.reserved || 0 };
      return state;
    });
    return this.budget(tenantId);
  }

  async setCostBudget(tenantId, actorId, totalUsd) {
    await this.cp.authorize(tenantId, actorId, 'ai:invoke');
    await this.store.update((state) => {
      const tenant = state.tenants.find((item) => item.id === tenantId);
      tenant.aiCostBudget = {
        totalUsd: Number(totalUsd), spentUsd: tenant.aiCostBudget?.spentUsd || 0,
        reservedUsd: tenant.aiCostBudget?.reservedUsd || 0,
      };
      return state;
    });
    return this.budget(tenantId);
  }

  async budget(tenantId) {
    const state = await this.store.read();
    const tenant = state.tenants.find((item) => item.id === tenantId);
    const token = tenant?.tokenBudget || { total: null, spent: 0, reserved: 0 };
    const cost = tenant?.aiCostBudget || { totalUsd: null, spentUsd: 0, reservedUsd: 0 };
    return {
      total: token.total, spent: token.spent || 0, reserved: token.reserved || 0,
      remaining: token.total == null ? Infinity : Math.max(0, token.total - (token.spent || 0) - (token.reserved || 0)),
      cost: {
        totalUsd: cost.totalUsd, spentUsd: cost.spentUsd || 0, reservedUsd: cost.reservedUsd || 0,
        remainingUsd: cost.totalUsd == null ? Infinity : Math.max(0, cost.totalUsd - (cost.spentUsd || 0) - (cost.reservedUsd || 0)),
      },
    };
  }

  // `provider`/`model` opcionais: quando o AI Router já decidiu por evidência, ele os passa
  // e o Gateway executa essa escolha (mantendo cache/breaker/rate-limit/aiCalls). Ausentes,
  // o Gateway roteia pela config como sempre — retrocompatível.
  async invoke(tenantId, actorId, { taskType = 'default', prompt, temperature, provider = null, model = null }) {
    await this.cp.authorize(tenantId, actorId, 'ai:invoke');
    if (!prompt) throw new ValidationError('prompt is required');
    if (this.rateLimiter) await this.rateLimiter.consume(tenantId, 'ai.invoke');

    const override = provider ? { provider, model } : null;
    const key = this.cacheKey(tenantId, taskType, prompt);
    const cached = (await this.store.read()).aiCache.find((item) => item.key === key && (!item.expiresAt || item.expiresAt > now()));
    if (cached) {
      await this.record(tenantId, actorId, { taskType, provider: cached.provider, model: cached.model, promptTokens: 0, completionTokens: 0, cached: true, latencyMs: 0 });
      await this.bus.emit('ai.cache_hit', { tenantId, taskType, provider: cached.provider, model: cached.model });
      return { text: cached.text, cached: true, provider: cached.provider, model: cached.model };
    }

    const promptEstimate = estimateTokens(prompt);
    const candidates = this.candidates(taskType, override);
    const maxOutputTokens = Math.max(...candidates.map((item) => Number(item.maxOutputTokens || 2_048)));
    const tokenReservation = promptEstimate + maxOutputTokens;
    const costReservation = Math.max(...candidates.map((item) => estimateCost(
      item.model, promptEstimate, Number(item.maxOutputTokens || 2_048), this.prices,
    )));
    await this.reserveResources(tenantId, tokenReservation, costReservation);
    const started = Date.now();
    const errors = [];
    let selected;
    try {
      for (const candidate of candidates) {
        const provider = this.providers[candidate.provider];
        if (!provider) {
          errors.push({ provider: candidate.provider, error: 'not configured' });
          continue;
        }
        try {
          const result = await this.breaker(candidate.provider).execute(() => withRetry(
            () => provider.complete({
              model: candidate.model, prompt, temperature,
              maxTokens: Number(candidate.maxOutputTokens || 2_048),
            }),
            { attempts: 2, baseDelayMs: 100, retryable: (error) => error?.retryable === true },
          ));
          selected = { candidate, result };
          break;
        } catch (error) {
          errors.push({ provider: candidate.provider, error: error.code || error.name || 'provider error' });
          await this.bus.emit('ai.provider_failed', { tenantId, taskType, provider: candidate.provider, code: error.code || error.name });
        }
      }
      if (!selected) throw new ValidationError(`No AI provider succeeded: ${errors.map((item) => item.provider).join(', ')}`);

      const { candidate, result } = selected;
      const usedModel = result.model || candidate.model;
      const usage = {
        taskType, provider: candidate.provider, model: usedModel,
        promptTokens: Number(result.promptTokens ?? promptEstimate),
        completionTokens: Number(result.completionTokens ?? estimateTokens(result.text)),
        cached: false, latencyMs: Date.now() - started,
      };
      await this.record(tenantId, actorId, usage, { tokens: tokenReservation, costUsd: costReservation });
      await this.store.update((state) => {
        state.aiCache = state.aiCache.filter((item) => item.key !== key);
        state.aiCache.push({
          key, text: result.text, provider: candidate.provider, model: usedModel,
          createdAt: now(), expiresAt: new Date(Date.now() + this.cacheTtlMs).toISOString(),
        });
        return state;
      });
      await this.bus.emit('ai.invoked', {
        tenantId, taskType, provider: candidate.provider, model: usedModel,
        tokens: usage.promptTokens + usage.completionTokens, fallbackDepth: errors.length,
      });
      return { text: result.text, cached: false, provider: candidate.provider, model: usedModel };
    } catch (error) {
      await this.releaseResources(tenantId, tokenReservation, costReservation);
      throw error;
    }
  }

  async reserveResources(tenantId, tokens, costUsd) {
    await this.store.update((state) => {
      const tenant = state.tenants.find((item) => item.id === tenantId);
      if (tenant?.tokenBudget?.total != null) {
        const remaining = tenant.tokenBudget.total - (tenant.tokenBudget.spent || 0) - (tenant.tokenBudget.reserved || 0);
        if (remaining < tokens) throw new ForbiddenError(`Token budget exhausted for tenant ${tenantId}`);
        tenant.tokenBudget.reserved = (tenant.tokenBudget.reserved || 0) + tokens;
      }
      if (tenant?.aiCostBudget?.totalUsd != null) {
        const remaining = tenant.aiCostBudget.totalUsd - (tenant.aiCostBudget.spentUsd || 0) - (tenant.aiCostBudget.reservedUsd || 0);
        if (remaining < costUsd) throw new ForbiddenError(`AI cost budget exhausted for tenant ${tenantId}`);
        tenant.aiCostBudget.reservedUsd = (tenant.aiCostBudget.reservedUsd || 0) + costUsd;
      }
      return state;
    });
  }

  async releaseResources(tenantId, tokens, costUsd) {
    await this.store.update((state) => {
      const tenant = state.tenants.find((item) => item.id === tenantId);
      if (tenant?.tokenBudget) tenant.tokenBudget.reserved = Math.max(0, (tenant.tokenBudget.reserved || 0) - tokens);
      if (tenant?.aiCostBudget) tenant.aiCostBudget.reservedUsd = Math.max(0, (tenant.aiCostBudget.reservedUsd || 0) - costUsd);
      return state;
    });
  }

  async record(tenantId, actorId, usage, reservation = { tokens: 0, costUsd: 0 }) {
    const total = usage.promptTokens + usage.completionTokens;
    const costUsd = estimateCost(usage.model, usage.promptTokens, usage.completionTokens, this.prices);
    await this.store.update((state) => {
      if (!usage.cached) {
        const tenant = state.tenants.find((item) => item.id === tenantId);
        if (tenant?.tokenBudget) {
          const next = (tenant.tokenBudget.spent || 0) + total;
          if (tenant.tokenBudget.total != null && next > tenant.tokenBudget.total) {
            throw new ForbiddenError(`Token budget exhausted for tenant ${tenantId}`);
          }
          tenant.tokenBudget.reserved = Math.max(0, (tenant.tokenBudget.reserved || 0) - reservation.tokens);
          tenant.tokenBudget.spent = (tenant.tokenBudget.spent || 0) + total;
        }
        if (tenant?.aiCostBudget) {
          const next = (tenant.aiCostBudget.spentUsd || 0) + costUsd;
          if (tenant.aiCostBudget.totalUsd != null && next > tenant.aiCostBudget.totalUsd) {
            throw new ForbiddenError(`AI cost budget exhausted for tenant ${tenantId}`);
          }
          tenant.aiCostBudget.reservedUsd = Math.max(0, (tenant.aiCostBudget.reservedUsd || 0) - reservation.costUsd);
          tenant.aiCostBudget.spentUsd = next;
        }
      }
      state.aiCalls.push({
        id: uuid(), tenantId, actorId, ...usage, totalTokens: total, costUsd, createdAt: now(),
      });
      return state;
    });
  }

  async providerHealth() {
    const health = {};
    await Promise.all(Object.entries(this.providers).map(async ([name, provider]) => {
      try { health[name] = { ok: typeof provider.available === 'function' ? await provider.available() : true, circuit: this.breaker(name).snapshot() }; }
      catch (error) { health[name] = { ok: false, error: error.name, circuit: this.breaker(name).snapshot() }; }
    }));
    return health;
  }

  async telemetry(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'ai:invoke');
    const state = await this.store.read();
    const calls = state.aiCalls.filter((item) => item.tenantId === tenantId);
    return {
      calls: calls.length,
      cacheHits: calls.filter((item) => item.cached).length,
      totalTokens: calls.reduce((sum, item) => sum + item.totalTokens, 0),
      totalCostUsd: Number(calls.reduce((sum, item) => sum + item.costUsd, 0).toFixed(6)),
      byProvider: Object.groupBy ? Object.groupBy(calls, (item) => item.provider || 'legacy') : groupBy(calls, (item) => item.provider || 'legacy'),
      budget: await this.budget(tenantId),
    };
  }
}

function estimateCost(model, promptTokens, completionTokens, prices = {}) {
  const price = prices[model];
  if (price) return (promptTokens / 1_000_000) * price.inputPerMillion + (completionTokens / 1_000_000) * price.outputPerMillion;
  const legacyRate = /large/.test(model) ? 0.000015 : 0.0000005;
  return (promptTokens + completionTokens) * legacyRate;
}
function groupBy(items, selector) {
  return items.reduce((groups, item) => { const key = selector(item); (groups[key] ||= []).push(item); return groups; }, {});
}
function now() { return new Date().toISOString(); }

module.exports = { AIGateway, estimateCost };
