'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { VisualWorkspaceEngine } = require('../src/visual-ide/visual-workspace-engine');
const { VideoProductionStudioEngine } = require('../src/media/video-production-studio');

test('TEST A: Agent opens site, inspects, selects component and modifies CSS', async () => {
  const engine = new VisualWorkspaceEngine();
  
  // 1. Open project
  const openRes = await engine.open_project('fenix-dashboard');
  assert.equal(openRes.ok, true);
  assert.equal(openRes.project, 'fenix-dashboard');

  // 2. Open browser / navigate
  const navRes = await engine.navigate('http://localhost:4400');
  assert.equal(navRes.ok, true);

  // 3. Inspect page & DOM
  const pageRes = await engine.inspect_page();
  assert.equal(pageRes.ok, true);
  assert.ok(pageRes.elementsCount > 0);

  const inspectDom = await engine.inspect_dom('#cta-button');
  assert.equal(inspectDom.ok, true);
  assert.ok(inspectDom.element);

  // 4. Select component
  const selectRes = await engine.select_element('#cta-button', { agentId: 'ui-architect' });
  assert.equal(selectRes.ok, true);
  assert.equal(selectRes.selector, '#cta-button');

  // 5. Modify CSS
  const modCss = await engine.modify_css('#cta-button', {
    'background-color': '#FF5500',
    'border-radius': '8px',
    'font-weight': '700'
  }, { agentId: 'ui-architect' });
  assert.equal(modCss.ok, true);
  assert.equal(modCss.appliedProperties['background-color'], '#FF5500');
  assert.equal(modCss.appliedProperties['border-radius'], '8px');

  // 6. Verify mutation recorded in activity log
  const activities = engine.getActivityLog();
  assert.ok(activities.some(a => a.action === 'modify_css' && a.target === '#cta-button'));
});

test('TEST B: Agent reconstructs screen from screenshot', async () => {
  const engine = new VisualWorkspaceEngine();
  
  // 1. Reconstruct from sample screenshot
  const recon = await engine.reconstructFromSource('screenshot', 'hero_landing_mock.png', {
    projectName: 'Reconstructed Hero Landing',
    targetFramework: 'vanilla-html-css'
  });

  assert.equal(recon.ok, true);
  assert.equal(recon.sourceType, 'screenshot');
  assert.ok(recon.structure);
  assert.ok(recon.structure.detectedBlocks.length >= 2);
  assert.ok(recon.generatedCode.includes('<!DOCTYPE html>'));
  assert.ok(recon.generatedCode.includes('<header class="reconstructed-header">'));
  assert.ok(recon.generatedCode.includes('<main class="reconstructed-hero">'));
  assert.equal(recon.isEquivalentImplementation, true);
});

test('TEST C: Agent modifies an existing React/HTML application', async () => {
  const engine = new VisualWorkspaceEngine();

  // 1. Open React project
  await engine.open_project('fenix-react-dashboard');

  // 2. Inspect component
  const comp = await engine.inspect_component('StatCard');
  assert.equal(comp.ok, true);
  assert.equal(comp.componentName, 'StatCard');
  assert.ok(comp.props);

  // 3. Modify component props/state
  const modComp = await engine.modify_component('StatCard', {
    title: 'Active Agents Online',
    value: '15 Agents',
    trend: '+12%'
  }, { agentId: 'frontend-engineer' });
  assert.equal(modComp.ok, true);
  assert.equal(modComp.newProps.title, 'Active Agents Online');

  // 4. Create new component in application
  const createComp = await engine.create_component('AgentActivityTimeline', {
    type: 'list',
    items: ['Init', 'Inspect', 'CSS Modified']
  }, { agentId: 'frontend-engineer' });
  assert.equal(createComp.ok, true);
  assert.equal(createComp.componentName, 'AgentActivityTimeline');

  // 5. Verify responsive and a11y tests pass
  const resp = await engine.run_responsive_test();
  assert.equal(resp.allPassed, true);
  const a11y = await engine.run_accessibility_test();
  assert.equal(a11y.passed, true);
});

test('TEST D: Agent executes navigation, forms, and interactions', async () => {
  const engine = new VisualWorkspaceEngine();

  // 1. Navigate to forms page
  await engine.navigate('http://localhost:4400/settings');

  // 2. Type text into input
  const typeRes = await engine.type_text('#agent-name-input', 'Autonomous Visual QA', { agentId: 'qa-agent' });
  assert.equal(typeRes.ok, true);
  assert.equal(typeRes.text, 'Autonomous Visual QA');

  // 3. Click submit button
  const clickRes = await engine.click_element('#btn-save-settings', { agentId: 'qa-agent' });
  assert.equal(clickRes.ok, true);
  assert.equal(clickRes.selector, '#btn-save-settings');

  // 4. Inspect console for errors
  const consoleLogs = await engine.inspect_console();
  assert.equal(consoleLogs.ok, true);
  assert.equal(consoleLogs.hasErrors, false);
});

test('TEST E: Agent identifies visual defects, fixes them, and compares before/after', async () => {
  const engine = new VisualWorkspaceEngine();

  // Run autonomous QA loop that executes:
  // OBSERVE -> ANALYZE -> PLAN -> MODIFY -> RENDER -> TEST -> COMPARE -> FIX -> VERIFY
  const qaResult = await engine.runAutonomousQaLoop('#nav-menu');

  assert.equal(qaResult.status, 'COMPLETED');
  assert.equal(qaResult.verdict, 'VERIFIED');
  assert.equal(qaResult.stepsCount, 9);
  assert.ok(qaResult.steps.includes('OBSERVE'));
  assert.ok(qaResult.steps.includes('COMPARE'));
  assert.ok(qaResult.steps.includes('VERIFY'));
  assert.ok(qaResult.similarityScore >= 90.0, 'Visual similarity score should exceed 90%');
  assert.equal(qaResult.responsivePassed, true);
  assert.equal(qaResult.accessibilityPassed, true);
});

test('TEST F: Two agents work on different stages without overwriting changes (concurrency lock)', async () => {
  const engine = new VisualWorkspaceEngine();

  // Agent 1 locks #header-brand
  const lock1 = engine.acquireElementLock('agent-claude', '#header-brand', 'RENAME_TITLE');
  assert.equal(lock1.ok, true);
  assert.equal(lock1.holder, 'agent-claude');

  // Agent 2 attempts to acquire lock on the SAME element -> should fail with conflict
  assert.throws(() => {
    engine.acquireElementLock('agent-alex', '#header-brand', 'CHANGE_COLOR');
  }, /currently locked/);

  // Agent 2 works on a DIFFERENT element -> should succeed
  const lock2 = engine.acquireElementLock('agent-alex', '#sidebar-nav', 'EXPAND_MENU');
  assert.equal(lock2.ok, true);
  assert.equal(lock2.holder, 'agent-alex');

  // Agent 1 applies change and releases lock
  await engine.modify_css('#header-brand', { 'font-size': '24px' }, { agentId: 'agent-claude' });
  const release1 = engine.releaseElementLock('agent-claude', '#header-brand');
  assert.equal(release1.ok, true);

  // Agent 2 applies change and releases lock
  await engine.modify_css('#sidebar-nav', { 'width': '260px' }, { agentId: 'agent-alex' });
  const release2 = engine.releaseElementLock('agent-alex', '#sidebar-nav');
  assert.equal(release2.ok, true);

  // Verify both changes are preserved in the history
  const log = engine.getActivityLog();
  const claudeAction = log.find(l => l.agentId === 'agent-claude' && l.action === 'modify_css');
  const alexAction = log.find(l => l.agentId === 'agent-alex' && l.action === 'modify_css');
  assert.ok(claudeAction);
  assert.ok(alexAction);
});

test('TEST G: Fênix creates improvement on isolated branch, tests, and presents preview for approval', async () => {
  const engine = new VisualWorkspaceEngine();

  // Trigger self-evolution improvement
  const proposal = {
    title: 'High-Contrast Micro-Interactions on Action Toolbar',
    targetComponent: '#action-toolbar',
    changes: {
      css: { 'box-shadow': '0 0 15px rgba(0, 217, 255, 0.4)', 'border': '1px solid #00D9FF' }
    }
  };

  const evolutionResult = await engine.proposeSelfEvolution(proposal);

  assert.equal(evolutionResult.ok, true);
  assert.ok(evolutionResult.branchName.startsWith('fenix/self-evolution-'));
  assert.equal(evolutionResult.requiresHumanApproval, true);
  assert.equal(evolutionResult.status, 'AWAITING_APPROVAL');
  assert.ok(evolutionResult.testSuiteResults.allPassed);
  assert.ok(evolutionResult.previewUrl.includes('/preview?branch='));
  assert.ok(evolutionResult.manifestPath);

  // Verify manifest exists on disk
  assert.ok(fs.existsSync(evolutionResult.manifestPath));
  const manifest = JSON.parse(fs.readFileSync(evolutionResult.manifestPath, 'utf8'));
  assert.equal(manifest.branchName, evolutionResult.branchName);
  assert.equal(manifest.status, 'AWAITING_APPROVAL');
});
