function delay(ms, signal) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (signal) {
      const abort = () => {
        clearTimeout(timer);
        reject(signal.reason || new Error('operation aborted'));
      };
      if (signal.aborted) abort();
      else signal.addEventListener('abort', abort, { once: true });
    }
  });
}

async function withRetry(operation, options = {}) {
  const attempts = Math.max(1, Number(options.attempts || 3));
  const baseDelayMs = Math.max(0, Number(options.baseDelayMs ?? 100));
  const maxDelayMs = Math.max(baseDelayMs, Number(options.maxDelayMs ?? 5_000));
  const jitter = Math.max(0, Math.min(1, Number(options.jitter ?? 0.2)));
  const retryable = options.retryable || (() => true);
  const random = options.random || Math.random;

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (options.signal?.aborted) throw options.signal.reason || new Error('operation aborted');
    try {
      return await operation({ attempt, signal: options.signal });
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !retryable(error, attempt)) throw error;
      const exponential = Math.min(maxDelayMs, baseDelayMs * (2 ** (attempt - 1)));
      const factor = 1 + ((random() * 2 - 1) * jitter);
      await (options.sleep || delay)(Math.max(0, Math.round(exponential * factor)), options.signal);
    }
  }
  throw lastError;
}

module.exports = { withRetry, delay };
