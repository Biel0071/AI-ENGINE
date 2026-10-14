process.env.FENIX_TEST_MODE = 'true';
process.env.NODE_ENV = 'test';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { handleConversationRoutes } = require('../src/api/conversation-routes.js');
const { globalJobQueueManager } = require('../src/execution/job-queue-manager.js');

test('Chat Forensics: inspect-file endpoint evaluates APK and high-entropy files', async () => {
  // Mock request/response
  const mockPayload = {
    name: 'test-app.apk',
    size: 5242880,
    sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    entropy: 7.94,
    format: 'ANDROID_APK',
    details: {
      manifest: 'AndroidManifest.xml Presente',
      dexFiles: 'classes.dex, classes2.dex'
    },
    strings: ['https://api.fenix.os', '192.168.1.100'],
    createJob: true
  };

  const req = {
    method: 'POST',
    url: '/api/v2/chat/inspect-file',
    headers: { 'content-type': 'application/json' },
    [Symbol.asyncIterator]: async function* () {
      yield Buffer.from(JSON.stringify(mockPayload));
    }
  };

  let statusCode = null;
  let responseData = null;
  const res = {
    writeHead: (code, headers) => { statusCode = code; },
    setHeader: () => {},
    end: (body) => { responseData = JSON.parse(body); }
  };

  const handled = await handleConversationRoutes(req, res);
  assert.equal(handled, true, 'Route must be handled');
  assert.equal(statusCode, 200, 'HTTP status must be 200');
  assert.equal(responseData.ok, true, 'Response must be ok');
  assert.equal(responseData.file.name, 'test-app.apk');
  assert.equal(responseData.file.entropyVerdict, 'ENCRYPTED_OR_PACKED');
  assert.equal(responseData.file.format, 'ANDROID_APK');
  assert.ok(responseData.file.recommendations.length > 0, 'Recommendations must be present');
  assert.ok(responseData.job, 'Job must be queued when createJob: true');
  assert.equal(responseData.job.type, 'reverse_engineering');
});

test('Chat Forensics: DOM contains attach button, file input, and drop overlay', () => {
  const sidebarJs = fs.readFileSync(path.join(__dirname, '../public/fenix-mascot-sidebar.js'), 'utf-8');
  assert.ok(sidebarJs.includes('id="fsbAttachBtn"'), 'Must contain fsbAttachBtn');
  assert.ok(sidebarJs.includes('id="fsbFileInput"'), 'Must contain fsbFileInput');
  assert.ok(sidebarJs.includes('id="fsbDropOverlay"'), 'Must contain fsbDropOverlay');
  assert.ok(sidebarJs.includes('renderForensicCardInDOM'), 'Must contain renderForensicCardInDOM');
  assert.ok(sidebarJs.includes('analyzeBinaryFormat'), 'Must contain analyzeBinaryFormat');
  assert.ok(sidebarJs.includes('extractStringsAndIocs'), 'Must contain extractStringsAndIocs');
});

test('IDE Layout: IDE occupies 100% width and height without constrained margin', () => {
  const overridesCss = fs.readFileSync(path.join(__dirname, '../public/fenix-window-overrides.css'), 'utf-8');
  const ideCss = fs.readFileSync(path.join(__dirname, '../public/project-ide-live.css'), 'utf-8');
  const sidebarCss = fs.readFileSync(path.join(__dirname, '../public/fenix-mascot-sidebar.css'), 'utf-8');

  assert.ok(overridesCss.includes('#view-ide') && overridesCss.includes('width: 100% !important'), 'Overrides must set #view-ide to 100% width');
  assert.ok(ideCss.includes('.fenix-live-ide') && (ideCss.includes('width: 100%') || ideCss.includes('width:100%')), 'IDE live CSS must set 100% width');
  assert.ok(ideCss.includes('white-space: pre !important') || ideCss.includes('white-space:pre!important'), 'Line numbers & code must have white-space: pre');

  // Verify docked push does not apply nested margin-right to #view-ide
  assert.ok(!sidebarCss.includes('body.has-right-sidebar-open.fsb-docked #view-ide {\n  margin-right: var(--fsb-width)'), 'Sidebar docked must not double push #view-ide');
});

after(async () => {
  if (globalJobQueueManager && typeof globalJobQueueManager.stop === 'function') {
    await globalJobQueueManager.stop();
  }
});


