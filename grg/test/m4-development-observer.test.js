const test = require('node:test');
const assert = require('node:assert');
const { DevelopmentObserver } = require('../src/observer/development-observer');
const { VisualTimeline } = require('../src/observer/visual-timeline');
const { SessionRecorder } = require('../src/observer/session-recorder');
const { UnifiedEventBus } = require('../src/core/UnifiedEventBus');
const { FENIX_EVENTS } = require('../src/core/contracts/event-types');

test('M4: DevelopmentObserver — Session Tracking & Atomic Observation Events', async () => {
  const bus = new UnifiedEventBus();
  await bus.start();

  const observer = new DevelopmentObserver({ eventBus: bus });
  await observer.start();

  const session = observer.startSession({
    sessionId: 'ses_build_dashboard',
    projectId: 'prj_analytics',
    metadata: { author: 'dev_user' }
  });

  assert.strictEqual(session.sessionId, 'ses_build_dashboard');

  // Record Event 1: Project opened
  await observer.recordObservation({
    sessionId: session.sessionId,
    projectId: 'prj_analytics',
    action: 'PROJECT_OPENED',
    timestamp: '2026-08-19T10:01:00.000Z',
    actor: 'user',
    target: { file: 'package.json' }
  });

  // Record Event 2: Card selected & styled
  await observer.recordObservation({
    sessionId: session.sessionId,
    projectId: 'prj_analytics',
    action: 'MODIFY_COMPONENT_STYLE',
    timestamp: '2026-08-19T10:15:00.000Z',
    actor: 'agent:Frontend',
    target: { visual: 'card#kpi', component: 'KpiCard', file: 'src/components/KpiCard.tsx', line: 18 },
    beforeState: { width: 300 },
    afterState: { width: 360 },
    visualState: { screenshotHash: 'hash_screen_1015' },
    codeState: { gitDiff: '+ width: 360px;' },
    result: { visualMatchDelta: '+3.5%', buildStatus: 'PASSED' },
    causality: { reason: 'Alinhar largura com os cards adjacentes' }
  });

  // Record Event 3: Build Success via EventBus
  await bus.emit(FENIX_EVENTS.BUILD_SUCCESS, {
    sessionId: session.sessionId,
    projectId: 'prj_analytics',
    buildId: 'bld_101'
  });

  const sessionEvents = observer.getEventsBySession(session.sessionId);
  assert.strictEqual(sessionEvents.length, 3);
  assert.strictEqual(sessionEvents[1].target.component, 'KpiCard');

  await observer.stop();
  await bus.stop();
});

test('M4: VisualTimeline — Temporal Navigation & Point-In-Time State Reconstruction', async () => {
  const observer = new DevelopmentObserver();
  await observer.start();

  const sessionId = 'ses_timetravel_test';
  observer.startSession({ sessionId, projectId: 'prj_travel' });

  await observer.recordObservation({
    sessionId,
    projectId: 'prj_travel',
    action: 'CREATE_FILE',
    timestamp: '2026-08-19T10:05:00.000Z',
    actor: 'agent:Backend',
    target: { file: 'src/api/users.ts' },
    codeState: { gitDiff: '+ export const getUsers = () => []' }
  });

  await observer.recordObservation({
    sessionId,
    projectId: 'prj_travel',
    action: 'ADD_API_ROUTE',
    timestamp: '2026-08-19T10:20:00.000Z',
    actor: 'agent:Backend',
    target: { file: 'src/api/users.ts', apiRoute: 'GET /api/users' },
    codeState: { gitDiff: '+ router.get("/api/users", ...)' }
  });

  const timeline = new VisualTimeline({ observer });
  const track = timeline.getTimelineTrack(sessionId);
  assert.strictEqual(track.length, 2);

  // Time Travel to 10:10 (before Event 2 happened)
  const stateAt1010 = timeline.getStateAt(sessionId, '2026-08-19T10:10:00.000Z');
  assert.strictEqual(stateAt1010.totalEventsUpToPoint, 1);
  assert.strictEqual(stateAt1010.filesState.length, 1);
  assert.strictEqual(stateAt1010.filesState[0].file, 'src/api/users.ts');

  // Time Travel to 10:25 (after Event 2 happened)
  const stateAt1025 = timeline.getStateAt(sessionId, '2026-08-19T10:25:00.000Z');
  assert.strictEqual(stateAt1025.totalEventsUpToPoint, 2);

  await observer.stop();
});

test('M4: SessionRecorder — Export Manifest & Adaptive Replay', async () => {
  const observer = new DevelopmentObserver();
  await observer.start();

  const sessionId = 'ses_export_replay';
  observer.startSession({ sessionId, projectId: 'prj_source' });

  await observer.recordObservation({
    sessionId,
    projectId: 'prj_source',
    action: 'GENERATE_COMPONENT',
    timestamp: new Date().toISOString(),
    actor: 'agent:Frontend',
    target: { component: 'Header', file: 'src/components/Header.tsx' }
  });

  await observer.recordObservation({
    sessionId,
    projectId: 'prj_source',
    action: 'APPLY_DESIGN_TOKENS',
    timestamp: new Date().toISOString(),
    actor: 'agent:Visual',
    target: { file: 'src/styles/theme.css' }
  });

  const recorder = new SessionRecorder({ observer });
  const manifest = recorder.exportSession(sessionId);

  assert.strictEqual(manifest.sessionId, sessionId);
  assert.strictEqual(manifest.reconstructionSummary.componentsModified.includes('Header'), true);
  assert.strictEqual(manifest.reconstructionSummary.filesTouched.length, 2);

  // Test Adaptive Replay on new project
  const replayed = await recorder.replayWorkflow(manifest, 'prj_target_new', {
    executor: async (step, targetProj) => {
      assert.strictEqual(targetProj, 'prj_target_new');
      return { ok: true };
    }
  });

  assert.strictEqual(replayed.totalSteps, 2);
  assert.strictEqual(replayed.successfulSteps, 2);
  assert.strictEqual(replayed.failedSteps, 0);

  await observer.stop();
});
