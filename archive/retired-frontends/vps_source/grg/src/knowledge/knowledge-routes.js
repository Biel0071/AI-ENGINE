function handleKnowledgeRoutes(req, res, url, app, sendJson) {
  if (req.method === 'GET') {
    
    if (url.pathname === '/api/kernel') {
      sendJson(res, 200, {
        kernel: 'active',
        uptime: process.uptime(),
        bootMode: process.env.NODE_ENV || 'development',
        engines: {
          runtime: true,
          mission: !!app.missionEngine,
          knowledge: !!app.knowledgeEngine
        }
      });
      return true;
    }

    if (url.pathname === '/api/storage') {
      if (!app.storageManager) {
        sendJson(res, 503, { error: 'Storage Layer Unavailable' });
        return true;
      }
      sendJson(res, 200, {
        storage: app.storageManager.getStats()
      });
      return true;
    }

    if (url.pathname === '/api/providers') {
      if (!app.providerRegistry) {
        sendJson(res, 503, { error: 'Provider Runtime Unavailable' });
        return true;
      }
      sendJson(res, 200, {
        providers: app.providerRegistry.getAllMetrics()
      });
      return true;
    }

    if (url.pathname === '/api/provider-health') {
      if (!app.providerRegistry) {
        sendJson(res, 503, { error: 'Provider Runtime Unavailable' });
        return true;
      }
      const metrics = app.providerRegistry.getAllMetrics();
      let allHealthy = true;
      const status = {};
      
      for (const [name, meta] of Object.entries(metrics)) {
        status[name] = meta.health;
        if (!meta.health) allHealthy = false;
      }
      
      sendJson(res, allHealthy ? 200 : 503, { healthy: allHealthy, providers: status });
      return true;
    }

    if (url.pathname === '/api/knowledge') {
      if (!app.knowledgeEngine) {
        sendJson(res, 503, { error: 'Knowledge Engine Unavailable' });
        return true;
      }
      sendJson(res, 200, app.knowledgeEngine.getMetrics());
      return true;
    }

    if (url.pathname === '/api/memory') {
      // Memory metrics from node process + short term/long term size stats
      const mem = process.memoryUsage();
      sendJson(res, 200, {
        osMemory: {
          rssMB: Math.round(mem.rss / 1024 / 1024),
          heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
          heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024)
        }
      });
      return true;
    }

    if (url.pathname === '/api/vector') {
      sendJson(res, 200, {
        status: 'online',
        indexSize: 0 // Mocked stat, could be pulled from vector store
      });
      return true;
    }

    if (url.pathname === '/api/conversations') {
      sendJson(res, 200, {
        conversations: [] // Would stream from conversationStore
      });
      return true;
    }

    if (url.pathname === '/api/artifacts') {
      sendJson(res, 200, {
        artifacts: [] // Would stream from artifactStore
      });
      return true;
    }
    
    if (url.pathname === '/api/missions') {
      sendJson(res, 200, {
        missions: [] // Would stream from missionStore
      });
      return true;
    }
  }

  return false;
}

module.exports = { handleKnowledgeRoutes };
