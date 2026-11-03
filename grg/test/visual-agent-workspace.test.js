'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { VisualWorkspaceEngine } = require('../src/visual-ide/visual-workspace-engine');
const { VideoProductionStudioEngine } = require('../src/media/video-production-studio');
const { handleVisualAgentWorkspaceRoutes } = require('../src/api/visual-agent-workspace-routes');

test('Visual Workspace Engine: Initial state and 24 canonical actions', async () => {
  const engine = new VisualWorkspaceEngine();
  const status = engine.getStatus();

  assert.equal(status.status, 'active');
  assert.equal(status.agentsCount, 9);
  assert.equal(status.activeProject, 'fenix-os');

  // Test 1: open_project
  const openProj = await engine.open_project('fenix-os');
  assert.equal(openProj.ok, true);

  // Test 2: inspect_dom
  const dom = await engine.inspect_dom('#btnRun');
  assert.equal(dom.ok, true);
  assert.ok(dom.element);

  // Test 3: select_element
  const sel = await engine.select_element('#btnRun', { agentId: 'visual-designer' });
  assert.equal(sel.ok, true);

  // Test 4: modify_css
  const css = await engine.modify_css('#btnRun', { 'background-color': '#00D9FF' }, { agentId: 'visual-designer' });
  assert.equal(css.ok, true);
  assert.equal(css.appliedProperties['background-color'], '#00D9FF');

  // Test 5: concurrency locking
  engine.acquireElementLock('frontend-dev', '#lockedInput', 'EDIT');
  assert.throws(() => {
    engine.acquireElementLock('visual-designer', '#lockedInput', 'DELETE');
  }, /currently locked/);
  engine.releaseElementLock('frontend-dev', '#lockedInput');

  // Test 6: undo / redo
  const undoRes = engine.undo();
  assert.equal(undoRes.ok, true);
  const redoRes = engine.redo();
  assert.equal(redoRes.ok, true);

  // Test 7: responsive test
  const resp = await engine.run_responsive_test();
  assert.equal(resp.ok, true);
  assert.equal(resp.allPassed, true);

  // Test 8: accessibility test
  const a11y = await engine.run_accessibility_test();
  assert.equal(a11y.ok, true);
  assert.equal(a11y.passed, true);

  // Test 9: capture and compare screenshots
  const snap1 = await engine.capture_screenshot('before_test');
  const snap2 = await engine.capture_screenshot('after_test');
  assert.equal(snap1.ok, true);
  assert.equal(snap2.ok, true);
  const comp = await engine.compare_screenshots(snap1.screenshotPath, snap2.screenshotPath);
  assert.equal(comp.ok, true);
  assert.ok(comp.similarityScore >= 90.0);
});

test('Website Reconstruction Engine: URL, Screenshot and Video Reconstruction', async () => {
  const engine = new VisualWorkspaceEngine();

  // 1. URL Reconstruction
  const urlRecon = await engine.reconstructFromSource('url', 'https://example.com', { projectName: 'Example Portal' });
  assert.equal(urlRecon.ok, true);
  assert.equal(urlRecon.isEquivalentImplementation, true);
  assert.ok(urlRecon.generatedCode.includes('<!DOCTYPE html>'));
  assert.ok(urlRecon.structure.sections.length >= 3);

  // 2. Screenshot Reconstruction
  const screenRecon = await engine.reconstructFromSource('screenshot', 'sample_screen.png', { projectName: 'Nike Hero' });
  assert.equal(screenRecon.ok, true);
  assert.ok(screenRecon.structure.detectedBlocks.length >= 2);

  // 3. Video Reconstruction
  const videoRecon = await engine.reconstructFromSource('video', 'user_video.mp4', { projectName: 'Motion App' });
  assert.equal(videoRecon.ok, true);
  assert.ok(videoRecon.structure.keyframesExtracted > 0);
});

test('Autonomous Visual QA Loop: Full 9-step cycle', async () => {
  const engine = new VisualWorkspaceEngine();
  const qaReport = await engine.runAutonomousQaLoop('.btn-primary');

  assert.equal(qaReport.status, 'COMPLETED');
  assert.equal(qaReport.verdict, 'VERIFIED');
  assert.equal(qaReport.stepsCount, 9);
  assert.equal(qaReport.responsivePassed, true);
  assert.equal(qaReport.accessibilityPassed, true);
  assert.ok(qaReport.similarityScore >= 90.0);
});

test('Video Production Studio: Projects, Media Library and FFmpeg rendering', async () => {
  const studio = new VideoProductionStudioEngine();
  
  // 1. Check default project
  const projects = studio.getProjects();
  assert.ok(projects.length >= 1);
  const defaultProj = projects[0];
  assert.equal(defaultProj.aspectRatio, '9:16');
  assert.ok(defaultProj.scenes.length >= 3);

  // 2. Check media library
  const media = studio.getMediaLibrary();
  assert.ok(Array.isArray(media));
  console.log(`Indexed ${media.length} media files in video library.`);
  if (media.length > 0) {
    assert.ok(media[0].id);
    assert.ok(media[0].filePath);
    assert.equal(media[0].format, 'mp4');
  }

  // 3. Render test video
  const renderRes = await studio.renderVideo(defaultProj.id, { durationSec: 3 });
  assert.equal(renderRes.projectId, defaultProj.id);
  assert.ok(renderRes.success);
  assert.ok(renderRes.sizeBytes > 1000, 'Rendered video file must exist and have content');
  console.log(`Rendered video: ${renderRes.outputPath} (${renderRes.sizeBytes} bytes)`);
});

test('Visual Agent Workspace & Video Studio HTTP Routes Integration', async () => {
  const reqMock = (method, pathname, body = null) => {
    return {
      method,
      headers: { 'content-type': 'application/json' },
      url: pathname,
    };
  };

  let responseData = null;
  let responseCode = null;
  const sendJson = (res, code, payload) => {
    responseCode = code;
    responseData = payload;
    return true;
  };

  const readJson = async (req) => req._body || {};

  // 1. GET /api/v2/visual-workspace/status
  const req1 = reqMock('GET', '/api/v2/visual-workspace/status');
  const url1 = new URL(req1.url, 'http://localhost');
  const handled1 = await handleVisualAgentWorkspaceRoutes(req1, {}, url1, {}, sendJson, readJson, { tenantId: 'grg', actorId: 'admin' });
  assert.equal(handled1, true);
  assert.equal(responseCode, 200);
  assert.equal(responseData.ok, true);
  assert.equal(responseData.workspace.status, 'active');

  // 2. GET /api/v2/visual-workspace/agents
  const req2 = reqMock('GET', '/api/v2/visual-workspace/agents');
  const url2 = new URL(req2.url, 'http://localhost');
  const handled2 = await handleVisualAgentWorkspaceRoutes(req2, {}, url2, {}, sendJson, readJson, { tenantId: 'grg', actorId: 'admin' });
  assert.equal(handled2, true);
  assert.equal(responseCode, 200);
  assert.equal(responseData.count, 9);

  // 3. POST /api/v2/visual-workspace/action
  const req3 = reqMock('POST', '/api/v2/visual-workspace/action');
  req3._body = { action: 'select_element', selector: '#mainHeader', agentId: 'visual-designer' };
  const url3 = new URL(req3.url, 'http://localhost');
  const handled3 = await handleVisualAgentWorkspaceRoutes(req3, {}, url3, {}, sendJson, readJson, { tenantId: 'grg', actorId: 'admin' });
  assert.equal(handled3, true);
  assert.equal(responseCode, 200);
  assert.equal(responseData.result.ok, true);

  // 4. GET /api/v2/video-studio/projects
  const req4 = reqMock('GET', '/api/v2/video-studio/projects');
  const url4 = new URL(req4.url, 'http://localhost');
  const handled4 = await handleVisualAgentWorkspaceRoutes(req4, {}, url4, {}, sendJson, readJson, { tenantId: 'grg', actorId: 'admin' });
  assert.equal(handled4, true);
  assert.equal(responseCode, 200);
  assert.ok(responseData.projects.length >= 1);

  // 5. POST /api/v2/video-studio/render
  const req5 = reqMock('POST', '/api/v2/video-studio/render');
  req5._body = { projectId: responseData.projects[0].id, durationSec: 2 };
  const url5 = new URL(req5.url, 'http://localhost');
  const handled5 = await handleVisualAgentWorkspaceRoutes(req5, {}, url5, {}, sendJson, readJson, { tenantId: 'grg', actorId: 'admin' });
  assert.equal(handled5, true);
  assert.equal(responseCode, 200);
  assert.ok(responseData.render.success);
});
