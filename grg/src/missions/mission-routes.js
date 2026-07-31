function handleMissionRoutes(req, res, url, app, sendJson) {
  if (req.method === 'GET') {
    if (url.pathname === '/api/orchestrator/status') {
      sendJson(res, 200, {
        status: 'online',
        gateway: 'active',
        stateMachine: 'enforced',
        workers: app.workerRegistry ? app.workerRegistry.workers.size : 0
      });
      return true;
    }
    
    if (url.pathname === '/api/workers/health') {
      if (!app.workerRegistry) {
        sendJson(res, 503, { error: 'WorkerRegistry unavailable' });
        return true;
      }
      
      const healthStatus = {};
      let allHealthy = true;
      for (const [name, worker] of app.workerRegistry.workers.entries()) {
        const isHealthy = worker.health();
        healthStatus[name] = isHealthy;
        if (!isHealthy) allHealthy = false;
      }

      sendJson(res, allHealthy ? 200 : 503, { healthy: allHealthy, workers: healthStatus });
      return true;
    }

    if (url.pathname.startsWith('/api/workers/')) {
      if (!app.workerRegistry) {
        sendJson(res, 503, { error: 'WorkerRegistry unavailable' });
        return true;
      }
      const idOrName = url.pathname.replace('/api/workers/', '');
      let found = app.workerRegistry.getWorkerByName(idOrName);
      if (!found) {
        // Try to find by ID
        for (const worker of app.workerRegistry.workers.values()) {
          if (worker.id === idOrName) {
            found = worker;
            break;
          }
        }
      }

      if (found) {
        sendJson(res, 200, {
          id: found.id,
          name: found.name,
          version: found.version,
          capabilities: found.capabilities(),
          health: found.health(),
          status: found.status(),
          metrics: found.metrics()
        });
      } else {
        sendJson(res, 404, { error: `Worker ${idOrName} not found` });
      }
      return true;
    }

    if (url.pathname === '/api/workers') {
      if (!app.workerRegistry) {
        sendJson(res, 503, { error: 'WorkerRegistry unavailable' });
        return true;
      }
      sendJson(res, 200, {
        workers: app.workerRegistry.getAllMetrics()
      });
      return true;
    }

    if (url.pathname === '/api/providers') {
      sendJson(res, 200, {
        capabilities: {
          classification: ['gemini', 'groq'],
          crud: ['gpt', 'claude'],
          architecture: ['claude'],
          audit: ['gpt']
        }
      });
      return true;
    }

    if (url.pathname === '/api/jobs') {
      sendJson(res, 200, {
        jobs: []
      });
      return true;
    }

    if (url.pathname === '/api/plans') {
      sendJson(res, 200, {
        plans: []
      });
      return true;
    }

    if (url.pathname === '/api/estimates') {
      sendJson(res, 200, {
        estimates: []
      });
      return true;
    }
  }

  return false;
}

module.exports = { handleMissionRoutes };
