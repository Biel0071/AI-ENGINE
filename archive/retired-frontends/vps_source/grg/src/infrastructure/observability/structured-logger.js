function createStructuredLogger({ sink = (line) => process.stderr.write(`${line}\n`), clock = () => new Date().toISOString() } = {}) {
  return {
    error(event) {
      const error = event.error instanceof Error ? event.error : new Error(String(event.error || 'Unknown error'));
      const record = {
        timestamp: clock(), level: 'error', event: event.event || 'runtime.exception',
        message: error.message, stack: error.stack || null,
        correlationId: event.correlationId || null, requestId: event.requestId || null,
        capability: event.capability || 'unknown', tenant: event.tenant || null,
        actor: event.actor || null, method: event.method || null, path: event.path || null,
      };
      sink(JSON.stringify(record));
      return record;
    },
  };
}

module.exports = { createStructuredLogger };
