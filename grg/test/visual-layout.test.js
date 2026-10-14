'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const htmlSource = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
const unifiedCss = fs.readFileSync(path.join(publicDir, 'unified.css'), 'utf8');
const sidebarJs = fs.readFileSync(path.join(publicDir, 'fenix-mascot-sidebar.js'), 'utf8');

test('visual-layout: Draggable layout resizers exist in index.html with correct ordering', () => {
  assert.ok(htmlSource.includes('id="fenixLeftResizer"'), '#fenixLeftResizer must exist in index.html');
  assert.ok(htmlSource.includes('id="fenixRightResizer"'), '#fenixRightResizer must exist in index.html');
  assert.ok(htmlSource.includes('id="fenixIdeSplitDivider"'), '#fenixIdeSplitDivider must exist in index.html');

  // Verify order in main-body: mainSidebarNav -> fenixLeftResizer -> views-container -> fenixRightResizer
  const navIdx = htmlSource.indexOf('id="mainSidebarNav"');
  const leftResizerIdx = htmlSource.indexOf('id="fenixLeftResizer"');
  const viewsIdx = htmlSource.indexOf('class="views-container"');
  const rightResizerIdx = htmlSource.indexOf('id="fenixRightResizer"');

  assert.ok(navIdx > 0, 'mainSidebarNav exists');
  assert.ok(leftResizerIdx > navIdx, 'fenixLeftResizer is placed after mainSidebarNav');
  assert.ok(viewsIdx > leftResizerIdx, 'views-container is placed after fenixLeftResizer');
  assert.ok(rightResizerIdx > viewsIdx, 'fenixRightResizer is placed after views-container');
});

test('visual-layout: LocalStorage persistence keys for layout and resizers are supported', () => {
  // New canonical keys
  assert.ok(htmlSource.includes('fenix.ui.leftSidebarWidth'), 'Must persist fenix.ui.leftSidebarWidth');
  assert.ok(htmlSource.includes('fenix.ui.rightCopilotWidth'), 'Must persist fenix.ui.rightCopilotWidth');
  assert.ok(htmlSource.includes('fenix.ui.leftSidebarCollapsed'), 'Must persist fenix.ui.leftSidebarCollapsed');
  
  // Legacy backward-compatibility keys
  assert.ok(htmlSource.includes('fenix_sidebar_collapsed'), 'Must support legacy fenix_sidebar_collapsed');
});

test('visual-layout: Collapse controls for Left Sidebar and Copilot are implemented', () => {
  assert.ok(htmlSource.includes('id="sidebarCollapseBtn"'), 'Left sidebar collapse toggle button must exist');
  assert.ok(htmlSource.includes('fenixCollapseLeftSidebar'), 'fenixCollapseLeftSidebar function must be registered');
  
  // Copilot header controls
  assert.ok(sidebarJs.includes('fsbCollapseBtn'), 'Copilot collapse button must exist');
  assert.ok(sidebarJs.includes('fsbCompactBtn'), 'Copilot compact button must exist');
  assert.ok(sidebarJs.includes('fsbExpandBtn'), 'Copilot expand button must exist');
});

test('visual-layout: Design tokens typography scale (10px to 32px) and spacing scale (4px to 48px) are present', () => {
  const typoTokens = [
    '--font-10: 10px',
    '--font-11: 11px',
    '--font-12: 12px',
    '--font-13: 13px',
    '--font-14: 14px',
    '--font-16: 16px',
    '--font-18: 18px',
    '--font-20: 20px',
    '--font-24: 24px',
    '--font-32: 32px'
  ];
  typoTokens.forEach(token => {
    assert.ok(unifiedCss.includes(token), `Typography token ${token} must be defined in unified.css`);
  });

  const spaceTokens = [
    '--space-4: 4px',
    '--space-8: 8px',
    '--space-12: 12px',
    '--space-16: 16px',
    '--space-20: 20px',
    '--space-24: 24px',
    '--space-32: 32px',
    '--space-40: 40px',
    '--space-48: 48px'
  ];
  spaceTokens.forEach(token => {
    assert.ok(unifiedCss.includes(token), `Spacing token ${token} must be defined in unified.css`);
  });
});
