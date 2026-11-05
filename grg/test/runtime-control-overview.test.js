'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { renderRuntimeControlOverview } = require('../public/runtime-control-overview');

test('Control visuals render measured job and agent counts with accessible progress bars', () => {
  const html = renderRuntimeControlOverview({
    runtime: {
      queue: { status: 'MEASURED', queued: 3, running: 2, completed: 4, failed: 1 },
      agents: { total: 12, working: 2, idle: 10 }
    }
  });

  assert.match(html, /Fila de jobs/);
  assert.match(html, /Concluídos/);
  assert.match(html, /<progress[^>]+aria-label="Jobs concluídos: 4"[^>]+max="10" value="4"/);
  assert.match(html, /Agentes trabalhando/);
  assert.match(html, /<progress[^>]+aria-label="Agentes trabalhando: 2"[^>]+max="12" value="2"/);
  assert.match(html, /Fonte: runtime e estado persistido/);
});

test('Control visuals distinguish missing telemetry from measured zero', () => {
  const unavailable = renderRuntimeControlOverview({ runtime: { queue: { status: 'NOT_MEASURED' }, agents: {} } });
  const measuredZero = renderRuntimeControlOverview({
    runtime: { queue: { status: 'MEASURED', queued: 0, running: 0, completed: 0, failed: 0 }, agents: { total: 0, working: 0, idle: 0 } }
  });

  assert.match(unavailable, /Fila sem medição/);
  assert.match(unavailable, /Agentes sem medição/);
  assert.match(measuredZero, /0 jobs registrados/);
  assert.match(measuredZero, /0 agentes registrados/);
});

test('canonical runtime screen loads the visual renderer and provides its mount point', () => {
  const index = fs.readFileSync(path.resolve(__dirname, '../public/index.html'), 'utf8');
  const renderer = index.indexOf('/runtime-control-overview.js');
  const controller = index.indexOf('/fenix-core-controller.js');
  const mount = index.indexOf('id="runtimeControlOverview"');

  assert.ok(renderer >= 0 && controller > renderer);
  assert.ok(mount >= 0);
});
