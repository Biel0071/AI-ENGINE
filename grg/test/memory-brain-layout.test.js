'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createBrainPosition, selectVisibleNodes, selectVisibleRelations } = require('../public/memory-brain-layout');

test('memory brain positions are stable when graph filters reorder nodes', () => {
  const firstPass = ['project:fenix-os', 'agent:camila', 'mission:42'].map(createBrainPosition);
  const secondPass = ['mission:42', 'project:fenix-os', 'agent:camila'].map(createBrainPosition);

  assert.deepEqual(firstPass[0], secondPass[1]);
  assert.deepEqual(firstPass[1], secondPass[2]);
  assert.deepEqual(firstPass[2], secondPass[0]);
});

test('memory brain positions form bounded left and right hemispheres', () => {
  const positions = Array.from({ length: 400 }, (_, index) => createBrainPosition(`node:${index}`));
  const left = positions.filter((position) => position.hemisphere === 'left');
  const right = positions.filter((position) => position.hemisphere === 'right');

  assert.ok(left.length > 150 && right.length > 150);
  assert.ok(left.every(({ x, y, z }) => x < -24 && Math.abs(y) <= 130 && Math.abs(z) <= 110));
  assert.ok(right.every(({ x, y, z }) => x > 24 && Math.abs(y) <= 130 && Math.abs(z) <= 110));
});

test('memory brain sampling keeps the selected node but represents the full graph', () => {
  const nodes = Array.from({ length: 1400 }, (_, index) => ({ id: `node:${index}` }));
  const edges = nodes.slice(1, 601).map((node) => ({ from: 'node:0', to: node.id }));
  const visible = selectVisibleNodes(nodes, edges, 'node:0', 500);
  const visibleIds = new Set(visible.map(({ id }) => id));
  const selectedNeighbors = edges.filter((edge) => visibleIds.has(edge.to));

  assert.equal(visible.length, 500);
  assert.ok(visibleIds.has('node:0'));
  assert.ok(selectedNeighbors.length <= 20, 'selected-node links must not dominate the brain cloud');
  assert.ok(visible.some(({ id }) => Number(id.slice(5)) >= 601), 'the viewport sample should include entities beyond the selected node neighborhood');
});

test('memory brain sampling follows real graph paths instead of filling a disconnected star', () => {
  const nodes = Array.from({ length: 1400 }, (_, index) => ({ id: `node:${index}` }));
  const edges = [
    ...nodes.slice(1, 601).map((node) => ({ from: 'node:0', to: node.id })),
    ...nodes.slice(1, 601).map((node, index) => ({ from: node.id, to: `node:${601 + (index % 799)}` })),
    ...nodes.slice(601, 1399).map((node, index) => ({ from: node.id, to: `node:${602 + index}` })),
  ];
  const visible = selectVisibleNodes(nodes, edges, 'node:0', 500);
  const visibleIds = new Set(visible.map(({ id }) => id));
  const rootLinks = edges.filter((edge) => edge.from === 'node:0' && visibleIds.has(edge.to)).length;
  const internalLinks = edges.filter((edge) => edge.from !== 'node:0' && visibleIds.has(edge.from) && visibleIds.has(edge.to)).length;

  assert.equal(visible.length, 500);
  assert.ok(rootLinks <= 20, 'the selected entity must not create a dominant starburst');
  assert.ok(internalLinks > rootLinks, 'the sample should follow relationships and show a connected graph beyond the selected entity');
});

test('memory brain relation sampling keeps focus links sparse and preserves graph context', () => {
  const nodes = Array.from({ length: 2601 }, (_, index) => ({ id: `node:${index}` }));
  const edges = [
    ...nodes.slice(1, 1501).map((node) => ({ from: 'node:0', to: node.id })),
    ...nodes.slice(1, 2600).map((node, index) => ({ from: node.id, to: `node:${index + 2}` })),
  ];
  const visible = selectVisibleRelations(nodes, edges, 'node:0', 200);
  const focusLinks = visible.filter((edge) => edge.from === 'node:0' || edge.to === 'node:0');
  const contextLinks = visible.length - focusLinks.length;

  assert.equal(visible.length, 200);
  assert.ok(focusLinks.length <= 12, 'the selected entity must not consume the relation budget');
  assert.ok(contextLinks > focusLinks.length, 'the 3D cloud should retain meaningful connections between other visible entities');
});

test('memory brain relation sampling caps focus spokes even below the total relation budget', () => {
  const nodes = Array.from({ length: 40 }, (_, index) => ({ id: `node:${index}` }));
  const edges = [
    ...nodes.slice(1, 26).map((node) => ({ from: 'node:0', to: node.id })),
    ...nodes.slice(26, 39).map((node, index) => ({ from: node.id, to: `node:${index + 26}` })),
  ];
  const visible = selectVisibleRelations(nodes, edges, 'node:0', 100);
  const focusLinks = visible.filter((edge) => edge.from === 'node:0' || edge.to === 'node:0');

  assert.ok(focusLinks.length <= 8);
  assert.equal(visible.length - focusLinks.length, 13, 'non-focus relationships should remain available when budget allows');
});

test('memory brain layout is loaded before the graph renderer in the canonical page', () => {
  const root = path.resolve(__dirname, '../public');
  const page = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(page, /memory-brain-layout\.js\?v=6-eight-focus-links/);
  const layoutScript = page.indexOf('/memory-brain-layout.js');
  const rendererScript = page.indexOf('/memory-live.js');
  const browserWindow = {};

  vm.runInNewContext(fs.readFileSync(path.join(root, 'memory-brain-layout.js'), 'utf8'), { window: browserWindow });

  assert.ok(layoutScript >= 0 && rendererScript > layoutScript);
  assert.equal(typeof browserWindow.FenixMemoryBrainLayout.createBrainPosition, 'function');
});

test('memory renderer shares the neural brain state with graph and async callbacks', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'memory-live.js'), 'utf8');
  const installAt = source.indexOf('const install =');
  const outerScope = source.slice(0, installAt);
  const installScope = source.slice(installAt);

  assert.match(outerScope, /let neuralBrainActive\s*=\s*true/);
  assert.match(outerScope, /let init3DNeuralBrain\s*=\s*\(\)\s*=>/);
  assert.doesNotMatch(installScope, /let neuralBrainActive\s*=/);
  assert.match(installScope, /init3DNeuralBrain\s*=\s*function init3DNeuralBrain/);
});
