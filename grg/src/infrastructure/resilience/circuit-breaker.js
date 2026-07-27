class CircuitOpenError extends Error {
  constructor(name, retryAt) {
    super(`circuit ${name} is open`);
    this.name = 'CircuitOpenError';
    this.code = 'CIRCUIT_OPEN';
    this.retryAt = retryAt;
  }
}

class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'default';
    this.failureThreshold = Math.max(1, Number(options.failureThreshold || 5));
    this.resetTimeoutMs = Math.max(1, Number(options.resetTimeoutMs || 30_000));
    this.clock = options.clock || (() => Date.now());
    this.state = 'CLOSED';
    this.failures = 0;
    this.openedAt = 0;
    this.halfOpenInFlight = false;
  }

  snapshot() {
    return {
      name: this.name, state: this.state, failures: this.failures,
      retryAt: this.state === 'OPEN' ? new Date(this.openedAt + this.resetTimeoutMs).toISOString() : null,
    };
  }

  async execute(operation) {
    const now = this.clock();
    if (this.state === 'OPEN') {
      if (now - this.openedAt < this.resetTimeoutMs) {
        throw new CircuitOpenError(this.name, this.openedAt + this.resetTimeoutMs);
      }
      this.state = 'HALF_OPEN';
    }
    if (this.state === 'HALF_OPEN' && this.halfOpenInFlight) {
      throw new CircuitOpenError(this.name, now + this.resetTimeoutMs);
    }

    this.halfOpenInFlight = this.state === 'HALF_OPEN';
    try {
      const result = await operation();
      this.state = 'CLOSED';
      this.failures = 0;
      this.openedAt = 0;
      return result;
    } catch (error) {
      this.failures += 1;
      if (this.state === 'HALF_OPEN' || this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
        this.openedAt = this.clock();
      }
      throw error;
    } finally {
      this.halfOpenInFlight = false;
    }
  }
}

module.exports = { CircuitBreaker, CircuitOpenError };
