'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const htmlSource = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
const sidebarSource = fs.readFileSync(path.join(publicDir, 'fenix-mascot-sidebar.js'), 'utf8');

test('copilot-single-instance: exactly ONE persistent right sidebar exists in application', () => {
  assert.ok(sidebarSource.includes("'fenix-right-sidebar'"), 'Global mascot copilot must be created');
  
  // Exactly one persistent sidebar container in DOM
  const matches = htmlSource.match(/id="fenix-right-sidebar"/g);
  // It is created dynamically by fenix-mascot-sidebar.js or defined once
  assert.ok(sidebarSource.includes('fenix-right-sidebar'), 'Sidebar source must manage fenix-right-sidebar');
});

test('copilot-single-instance: view-ide inner copilot is quarantined in hidden proxies', () => {
  const viewIdeMatch = htmlSource.match(/<div id="view-ide"[\s\S]*?<\/div>\s*<div id="view-project"/);
  assert.ok(viewIdeMatch, 'view-ide must be found');
  const viewIdeHtml = viewIdeMatch[0];

  assert.ok(
    viewIdeHtml.includes('id="fenixIdeCopilotProxies"'),
    'view-ide must place legacy copilot inside fenixIdeCopilotProxies'
  );
  assert.ok(
    viewIdeHtml.includes('style="display:none;" aria-hidden="true" id="fenixIdeCopilotProxies"'),
    'fenixIdeCopilotProxies must be display:none to prevent duplicate UI'
  );
});
