/**
 * FÊNIX OS — RUNTIME RESOURCE GUARD & REQUEST MANAGER
 * 
 * V17.1 Runtime Stabilization:
 * - Singletons Enforcement (window.__FENIX_SINGLETONS__)
 * - Request Deduplication (Inflight Map)
 * - Concurrency Limits (MAX_FETCH_INFLIGHT = 12)
 * - AbortController Lifecycle per View
 * - Exponential Backoff for Polling / Health
 * - Resource Leaks & Request Storm Prevention
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FenixRequestGuard = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // 1. Resource Limits Budget (Requirement 16)
  const BUDGET = {
    MAX_FETCH_INFLIGHT: 12,
    MAX_EVENTSOURCE: 4,
    MAX_WORLD_RENDERER: 1,
    MAX_COPILOT: 1,
    MAX_PLAYWRIGHT_BROWSER: 1,
    MAX_PLAYWRIGHT_CONTEXT: 2,
    MAX_PLAYWRIGHT_PAGE: 4
  };

  // 2. Global Singletons Registry (Requirement 2)
  const singletonsRegistry = new Map();

  const Singletons = {
    register(type, instance) {
      if (singletonsRegistry.has(type)) {
        const existing = singletonsRegistry.get(type);
        if (existing !== instance) {
          console.warn(`[FENIX SINGLETON GUARD] Instance of '${type}' already registered. Reusing existing.`);
          return existing;
        }
        return existing;
      }
      singletonsRegistry.set(type, instance);
      return instance;
    },

    get(type) {
      return singletonsRegistry.get(type) || null;
    },

    has(type) {
      return singletonsRegistry.has(type);
    },

    remove(type, instance) {
      if (singletonsRegistry.get(type) === instance) {
        singletonsRegistry.delete(type);
        return true;
      }
      return false;
    },

    clearAll() {
      singletonsRegistry.clear();
    },

    getAll() {
      const out = {};
      singletonsRegistry.forEach((v, k) => { out[k] = v; });
      return out;
    }
  };

  // Expose on window if in browser
  if (typeof window !== 'undefined') {
    window.__FENIX_SINGLETONS__ = Singletons;
  }

  // 3. Request Deduplication & Inflight Manager (Requirement 4, 5, 16)
  const inflightRequests = new Map();
  const activeControllersByView = new Map(); // viewId -> Set<AbortController>
  let totalInflight = 0;

  function generateRequestKey(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    let bodyHash = '';
    if (options.body) {
      try {
        bodyHash = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      } catch (_) {
        bodyHash = String(options.body);
      }
    }
    return `${method}:${url}:${bodyHash}`;
  }

  // Exponential Backoff helper (Requirement 3)
  function createBackoff(options = {}) {
    const initialMs = options.initialMs || 5000;
    const maxMs = options.maxMs || 60000;
    const factor = options.factor || 2;
    let currentMs = initialMs;
    let failures = 0;

    return {
      nextDelay() {
        failures++;
        const delay = currentMs;
        currentMs = Math.min(currentMs * factor, maxMs);
        return delay;
      },
      reset() {
        currentMs = initialMs;
        failures = 0;
      },
      get currentDelay() {
        return currentMs;
      },
      get failureCount() {
        return failures;
      }
    };
  }

  // Request Execution through RequestManager
  function request(url, options = {}, viewId = 'global') {
    const method = (options.method || 'GET').toUpperCase();
    const isIdempotent = method === 'GET' || method === 'HEAD';

    // Guard: Concurrency Budget
    if (totalInflight >= BUDGET.MAX_FETCH_INFLIGHT) {
      console.error(`[FENIX RESOURCE GUARD] resource limit exceeded: ${totalInflight} inflight requests >= MAX (${BUDGET.MAX_FETCH_INFLIGHT})`);
      return Promise.reject(new Error(`[FENIX RESOURCE GUARD] resource limit exceeded for ${url}`));
    }

    const key = generateRequestKey(url, options);

    // Guard: Deduplicate in-flight idempotent requests with response cloning
    if (isIdempotent && inflightRequests.has(key)) {
      const entry = inflightRequests.get(key);
      return new Promise((resolve, reject) => {
        entry.subscribers.push({ resolve, reject });
      });
    }

    // Attach AbortController for view tracking
    const controller = new (typeof AbortController !== 'undefined' ? AbortController : function () { this.signal = {}; this.abort = () => {}; })();
    let mergedSignal = options.signal;
    if (!mergedSignal && controller.signal) {
      mergedSignal = controller.signal;
    }

    if (viewId) {
      if (!activeControllersByView.has(viewId)) {
        activeControllersByView.set(viewId, new Set());
      }
      activeControllersByView.get(viewId).add(controller);
    }

    totalInflight++;
    const startTime = Date.now();

    const fetchPromise = (async () => {
      try {
        const fetchFn = typeof fetch === 'function' ? fetch : (globalThis.fetch || null);
        if (!fetchFn) {
          throw new Error('fetch is not available in environment');
        }

        const res = await fetchFn(url, { ...options, signal: mergedSignal });
        const duration = Date.now() - startTime;
        
        // Structured Request Logging (Requirement 6)
        if (typeof console !== 'undefined' && console.debug) {
          console.debug(`[FENIX REQUEST] ${method} ${url} status:${res.status} duration:${duration}ms`);
        }

        // Notify deduplicated subscribers with fresh clones so body stream is never consumed twice
        if (isIdempotent && inflightRequests.has(key)) {
          const entry = inflightRequests.get(key);
          if (entry && entry.subscribers && entry.subscribers.length > 0) {
            entry.subscribers.forEach(sub => {
              try {
                const clone = typeof res.clone === 'function' ? res.clone() : res;
                sub.resolve(clone);
              } catch (_) {
                sub.resolve(res);
              }
            });
          }
        }

        return res;
      } catch (err) {
        const duration = Date.now() - startTime;
        const isAbort = err.name === 'AbortError' || err.message?.includes('aborted');
        console.warn(`[FENIX REQUEST] ${method} ${url} ${isAbort ? 'ABORTED' : 'FAILED'} duration:${duration}ms - ${err.message}`);
        
        if (isIdempotent && inflightRequests.has(key)) {
          const entry = inflightRequests.get(key);
          if (entry && entry.subscribers && entry.subscribers.length > 0) {
            entry.subscribers.forEach(sub => sub.reject(err));
          }
        }
        throw err;
      } finally {
        totalInflight = Math.max(0, totalInflight - 1);
        inflightRequests.delete(key);
        if (viewId && activeControllersByView.has(viewId)) {
          activeControllersByView.get(viewId).delete(controller);
        }
      }
    })();

    if (isIdempotent) {
      inflightRequests.set(key, { promise: fetchPromise, subscribers: [] });
    }

    return fetchPromise;
  }

  // Cancel all inflight requests registered for a specific view or all (Requirement 5)
  function cancelViewRequests(viewId) {
    if (!viewId) {
      // Cancel everything
      activeControllersByView.forEach((set) => {
        set.forEach((ctrl) => {
          try { ctrl.abort(); } catch (_) {}
        });
        set.clear();
      });
      activeControllersByView.clear();
      return;
    }

    const set = activeControllersByView.get(viewId);
    if (set && set.size > 0) {
      set.forEach((ctrl) => {
        try { ctrl.abort(); } catch (_) {}
      });
      set.clear();
      activeControllersByView.delete(viewId);
    }
  }

  // 4. Hydration Lock helper (Requirement 7)
  const hydrationLocks = new Map();

  function runLockedHydration(name, fn) {
    if (hydrationLocks.has(name)) {
      return hydrationLocks.get(name);
    }
    const promise = (async () => {
      try {
        return await fn();
      } finally {
        hydrationLocks.delete(name);
      }
    })();
    hydrationLocks.set(name, promise);
    return promise;
  }

  const api = {
    BUDGET,
    Singletons,
    request,
    cancelViewRequests,
    createBackoff,
    runLockedHydration,
    getInflightCount: () => totalInflight,
    getActiveViewsWithRequests: () => Array.from(activeControllersByView.keys())
  };

  if (typeof window !== 'undefined') {
    window.FenixRequestGuard = api;
    window.fenixFetch = (url, opts, viewId) => api.request(url, opts, viewId);
  }

  return api;
});
