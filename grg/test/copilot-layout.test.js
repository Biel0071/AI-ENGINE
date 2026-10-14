'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const sidebarJs = fs.readFileSync(path.join(publicDir, 'fenix-mascot-sidebar.js'), 'utf8');
const mascotCss = fs.readFileSync(path.join(publicDir, 'fenix-mascot-sidebar.css'), 'utf8');

test('copilot-layout: Copilot is docked as a flex child of #fenixMainBody with relative positioning', () => {
  assert.ok(sidebarJs.includes("document.getElementById('fenixMainBody')"), 'Mascot sidebar must mount to fenixMainBody or main-body');
  assert.ok(mascotCss.includes('position: relative !important'), 'In desktop layout, sidebar must be position: relative !important');
  assert.ok(mascotCss.includes('flex-shrink: 0'), 'Sidebar must be a non-shrinking flex child');
});

test('copilot-layout: 5 functional tabs are implemented in Copilot Control Center', () => {
  const tabs = ['chat', 'telemetry', 'logs', 'terminal', 'inspector'];
  tabs.forEach(tab => {
    assert.ok(sidebarJs.includes(`data-tab="${tab}"`), `Copilot tab data-tab="${tab}" must exist`);
  });
});

test('copilot-layout: Header includes context name indicator and window control buttons', () => {
  assert.ok(sidebarJs.includes('id="fsbHeaderContextName"'), 'Context indicator #fsbHeaderContextName must exist in header');
  assert.ok(sidebarJs.includes('id="fsbCompactBtn"'), 'Compact mode button #fsbCompactBtn must exist');
  assert.ok(sidebarJs.includes('id="fsbExpandBtn"'), 'Expand mode button #fsbExpandBtn must exist');
  assert.ok(sidebarJs.includes('id="fsbCollapseBtn"'), 'Collapse mode button #fsbCollapseBtn must exist');
});

test('copilot-layout: Chat viewport occupies dominant vertical height with fixed bottom input area', () => {
  assert.ok(sidebarJs.includes('id="fsbChatMessages"'), '#fsbChatMessages must exist');
  assert.ok(sidebarJs.includes('id="fsbInputArea"'), '#fsbInputArea must exist at bottom');
  assert.ok(mascotCss.includes('flex: 1'), 'Chat message list must flex-grow to occupy ~70-80% height');
});

test('copilot-layout: NLU Natural OS commands are recognized and handled', () => {
  const commands = [
    'volte para a cidade',
    'feche o copilot',
    'abra o copilot',
    'modo compacto',
    'feche o painel esquerdo',
    'abra o painel esquerdo',
    'mostre o predio',
    'segundo andar',
    'primeiro andar',
    'terceiro andar',
    'terreo',
    'acompanhe este agente',
    'mostre os agentes',
    'mostre a empresa',
    'mostre a missao',
    'coloque em split',
    'mostre o codigo',
    'abra preview'
  ];

  commands.forEach(cmd => {
    assert.ok(sidebarJs.toLowerCase().includes(cmd.toLowerCase()), `NLU command "${cmd}" must be supported`);
  });
});
