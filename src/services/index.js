const fs = require('fs/promises');
const path = require('path');

const MODULE_DEFINITIONS = [
  {
    key: 'Inbox',
    frontendPages: ['Inbox.tsx', 'InboxModular.tsx'],
    frontendServices: ['apiService.ts'],
    backendRoutes: ['messages.js', 'conversations.js'],
    backendServices: ['conversationSummarizer.js'],
  },
  {
    key: 'Contacts',
    frontendPages: ['Contacts.tsx'],
    frontendServices: ['apiService.ts'],
    backendRoutes: ['conversations.js'],
    backendServices: ['leadAnalyzer.js'],
  },
  {
    key: 'Automation',
    frontendPages: ['Flows.tsx', 'Campaigns.tsx', 'Scheduler.tsx'],
    frontendServices: ['apiService.ts'],
    backendRoutes: ['system.js'],
    backendServices: ['campaignEngine.js', 'campaignRuntime.js', 'microtaskRunner.js'],
  },
  {
    key: 'AI',
    frontendPages: ['AI.tsx', 'AIDashboard.tsx', 'ModuleBuilder.tsx'],
    frontendServices: ['apiService.ts'],
    backendRoutes: ['ai.js'],
    backendServices: ['aiResponseEngine.js', 'aiLearningEngine.js'],
  },
  {
    key: 'Analytics',
    frontendPages: ['Analytics.tsx', 'Diagnostics.tsx'],
    frontendServices: ['apiService.ts'],
    backendRoutes: ['system.js'],
    backendServices: ['metricsTracker.js', 'aiDiagnosticsService.js'],
  },
  {
    key: 'System',
    frontendPages: ['Settings.tsx', 'Connections.tsx'],
    frontendServices: ['apiService.ts'],
    backendRoutes: ['system.js', 'sessions.js'],
    backendServices: ['systemManager.js', 'runtimeManager.js'],
  },
];

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveExisting(rootPath, candidates = []) {
  const found = [];

  for (const candidate of candidates) {
    const target = path.join(rootPath, candidate);
    if (await exists(target)) {
      found.push(candidate);
    }
  }

  return found;
}

async function buildSystemArchitectureMap() {
  const backendRoot = path.resolve(__dirname, '..');
  const projectRoot = path.resolve(backendRoot, '..', '..');
  const frontendRoot = path.join(projectRoot, 'frontend', 'src');

  const modules = [];

  for (const definition of MODULE_DEFINITIONS) {
    const frontendPages = await resolveExisting(path.join(frontendRoot, 'pages'), definition.frontendPages);
    const frontendServices = await resolveExisting(path.join(frontendRoot, 'services'), definition.frontendServices);
    const backendRoutes = await resolveExisting(path.join(backendRoot, 'routes'), definition.backendRoutes);
    const backendServices = await resolveExisting(path.join(backendRoot, 'services'), definition.backendServices);

    modules.push({
      name: definition.key,
      status: frontendPages.length > 0 && backendRoutes.length > 0 ? 'detected' : 'partial',
      frontend: {
        pages: frontendPages,
        services: frontendServices,
      },
      backend: {
        routes: backendRoutes,
        services: backendServices,
      },
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    modules,
  };
}

module.exports = {
  MODULE_DEFINITIONS,
  buildSystemArchitectureMap,
};
