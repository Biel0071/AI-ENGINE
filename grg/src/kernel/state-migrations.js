const CURRENT_SCHEMA_VERSION = 20;

const COLLECTIONS_BY_VERSION = {
  1: ['tenants', 'orgs', 'customers', 'users', 'memberships', 'projects', 'repositories'],
  2: ['snapshots', 'capabilities', 'memoryEvents', 'graphEdges', 'runs', 'deployments', 'aiCalls', 'aiCache'],
  3: [
    'brands', 'domains', 'plans', 'licenses', 'moduleSets', 'designSystems', 'buildTargets',
    'artifacts', 'marketplaceInstalls', 'subscriptions', 'invoices', 'insights', 'learningCycles',
    'digitalTwins', 'workforces', 'employees', 'dailyReports', 'employeeTemplates',
  ],
  4: ['sessions', 'auditEvents', 'approvalRequests', 'idempotencyKeys', 'outbox', 'inbox'],
  5: ['migrationHistory'],
  6: ['memories', 'memoryVersions'],
  7: ['knowledgeEntities', 'knowledgeRelationships'],
  8: ['serviceRegistry', 'serviceVersions', 'domainEvents', 'fabricEnrollments'],
  9: ['discoveryScans', 'discoveredResources', 'knowledgePublications'],
  10: ['resourceVersions', 'changeSets', 'rollbackProposals'],
  11: ['cityNodes', 'cityEdges', 'cityProjectionStates'],
  12: ['runtimeJobs', 'runtimeSchedules', 'deadLetters', 'workerHeartbeats'],
  13: ['capabilityDefinitions', 'capabilityVersions', 'capabilityLogs'],
  14: ['cognitiveGoals', 'cognitiveObservations', 'cognitiveHypotheses', 'cognitiveDecisions', 'cognitiveValidations', 'cognitiveReflections', 'cognitiveCycles', 'cognitiveCursors'],
  15: ['operationalTwins'],
  16: ['cognitiveEntities', 'cognitiveWorkspaces', 'cognitiveAgents', 'cognitiveAccessGrants', 'knowledgeSharingPolicies'],
  17: ['toolDefinitions', 'scriptSigners', 'scriptDefinitions', 'sandboxExecutions', 'executionTimeline'],
  18: ['inspectionRuns', 'inspectionReports', 'inspectionTwins', 'evolutionProposals'],
  19: ['agentCycles', 'agentTasks', 'agentSummaries', 'knowledgePromotionProposals', 'evolutionPatterns'],
  20: ['operationalActivationRuns', 'operationalComponentStates', 'operationalComponentHistory', 'operationalInvestigations', 'operationalReadinessReports', 'dailyIntelligenceReports', 'operationalAssurances'],
};

function normalizeVersion(value) {
  const version = Number(value || 0);
  if (!Number.isInteger(version) || version < 0) throw new Error('invalid state schema version');
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new Error(`state schema ${version} is newer than supported ${CURRENT_SCHEMA_VERSION}`);
  }
  return version;
}

function migrateState(input, now = () => new Date().toISOString()) {
  const state = input && typeof input === 'object' ? structuredClone(input) : {};
  let version = normalizeVersion(state.schemaVersion);
  const applied = [];

  for (let target = version + 1; target <= CURRENT_SCHEMA_VERSION; target += 1) {
    for (const collection of COLLECTIONS_BY_VERSION[target]) {
      if (!Array.isArray(state[collection])) state[collection] = [];
    }
    state.schemaVersion = target;
    applied.push({ from: target - 1, to: target, appliedAt: now() });
    version = target;
  }

  // Repair missing collections even when an old build wrote an incorrect version.
  for (const collections of Object.values(COLLECTIONS_BY_VERSION)) {
    for (const collection of collections) {
      if (!Array.isArray(state[collection])) state[collection] = [];
    }
  }
  if (applied.length) state.migrationHistory.push(...applied);
  return { state, applied };
}

module.exports = { CURRENT_SCHEMA_VERSION, COLLECTIONS_BY_VERSION, migrateState };
