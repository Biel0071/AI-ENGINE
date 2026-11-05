'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const provenance = require('../public/memory-provenance');

test('memory provenance summarizes only explicit provider fields and keeps unknown sources visible', () => {
  const nodes = [
    { properties: { provider: 'openai-codex' } },
    { properties: { aiProvider: 'Anthropic Claude' } },
    { properties: { provenance: { provider: 'Qwen / Ollama' } } },
    { properties: { source: 'shared memory' } },
    { properties: { origin: 'Acme Local Model' } },
    { properties: { title: 'No provider here' } },
  ];

  const summary = provenance.summarize(nodes);

  assert.deepEqual(summary.map(({ label, count }) => [label, count]), [
    ['Acme Local Model', 1],
    ['Anthropic / Claude', 1],
    ['Misto / compartilhado', 1],
    ['OpenAI / Codex', 1],
    ['Qwen / Ollama / Fênix', 1],
  ]);
  assert.equal(provenance.resolve(nodes[5]).label, null);
  assert.equal(provenance.resolve(nodes[4]).color, '#93a4b8');
});

test('memory view renders a data-derived provenance legend beside the real graph', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'memory-live.js'), 'utf8');
  assert.match(source, /FenixMemoryProvenance/);
  assert.match(source, /fmlAiLegendEntries/);
  assert.match(source, /summarize\(state\.nodes\)/);
});
