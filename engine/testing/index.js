function toSmokeTest(name, objective, steps, expected) {
  return {
    name,
    objective,
    steps,
    expected,
    type: 'smoke',
  };
}

function toE2ETest(name, objective, flow, expected) {
  return {
    name,
    objective,
    flow,
    expected,
    type: 'e2e',
  };
}

function generateSmokeTests(context = {}) {
  const tests = [];

  tests.push(
    toSmokeTest('health-endpoint-responds', 'Validate server health endpoint returns success.', [
      'Start server process.',
      'Call GET /health.',
      'Assert HTTP status is 200.',
    ], ['Response includes status field with ok value.']),
  );

  tests.push(
    toSmokeTest('analyze-endpoint-responds', 'Validate legacy analyze endpoint remains backward compatible.', [
      'Call POST /analyze with minimal payload.',
      'Assert response contains analysis, problems, improvements and refactorPlan.',
    ], ['Endpoint responds without runtime exception.']),
  );

  tests.push(
    toSmokeTest('dev-analyze-contract', 'Validate enhanced dev endpoint returns freeze-safe contract.', [
      'Call POST /dev/analyze with representative project files.',
      'Assert response contains analysis, problems, improvements, microtasks, designSystem, tests, suggestedCode, validation.',
    ], ['Contract keys are always present.']),
  );

  if (context && context.ingestion && Array.isArray(context.ingestion.screens) && context.ingestion.screens.length > 0) {
    tests.push(
      toSmokeTest('screen-map-created', 'Validate ingestion maps available screens.', [
        'Run /dev/analyze with UI files.',
        'Assert analysis.ingestionSummary.screenCount > 0.',
      ], ['Screen intelligence pipeline is active.']),
    );
  }

  return tests;
}

function generateE2ETests(context = {}) {
  const tests = [];

  tests.push(
    toE2ETest('user-flow-analysis-to-improvement', 'Simulate a full analysis flow from payload to actionable improvements.', [
      'Submit projectContext + files + currentGoal to /dev/analyze.',
      'Read problems and microtasks from response.',
      'Confirm suggestedCode references safe non-destructive refactors.',
    ], ['Flow returns improvements prioritized for safe execution.']),
  );

  tests.push(
    toE2ETest('api-and-ui-consistency-flow', 'Simulate integrated API and UI analysis path.', [
      'Provide backend endpoint file and frontend screen file in payload.',
      'Assert analysis summary detects frontend and backend signals.',
      'Assert designSystem includes uiScore and normalization suggestions.',
    ], ['UI and architecture recommendations are generated together.']),
  );

  if (context && Array.isArray(context.microtasks) && context.microtasks.length > 0) {
    tests.push(
      toE2ETest('microtask-execution-readiness', 'Simulate planning output consumption by execution orchestrator.', [
        'Take first microtask from /dev/analyze result.',
        'Map filesAffected to repository files.',
        'Validate suggestedFix can be executed incrementally.',
      ], ['Microtask payload is execution-ready for downstream automation.']),
    );
  }

  return tests;
}

function generateTests(context = {}) {
  return {
    smokeTests: generateSmokeTests(context),
    e2eTests: generateE2ETests(context),
  };
}

module.exports = {
  generateTests,
};
