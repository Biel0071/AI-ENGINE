#!/usr/bin/env node
// Benchmark de modelos da API Platform com tarefas reais e testes de aceitação (LEVEL 2, 2026-11-11).
// Roda NA VPS: lê a chave do ambiente do processo fenix-backend; nenhuma chave sai da máquina.
// Uso: node vps-model-benchmark.js <pid-do-fenix-backend> <saida.json> [modelo1,modelo2,...]
'use strict';
const fs = require('fs');
const vm = require('vm');

const TASKS = [
  {
    id: 'average-empty', prompt: 'Write a JavaScript function average(xs) that returns the arithmetic mean of an array of numbers and returns 0 for an empty array.',
    name: 'average', tests: (f) => [f([]) === 0, f([2, 4]) === 3, f([5]) === 5],
  },
  {
    id: 'slugify-pt', prompt: 'Write a JavaScript function slugify(text) that lowercases, removes accents (e.g. "ç" -> "c", "ã" -> "a"), replaces any run of non-alphanumeric characters with a single "-" and trims "-" from both ends. slugify("  Missão Crítica: Ação!  ") must return "missao-critica-acao".',
    name: 'slugify', tests: (f) => [f('  Missão Crítica: Ação!  ') === 'missao-critica-acao', f('a--b') === 'a-b', f('') === ''],
  },
  {
    id: 'chunk', prompt: 'Write a JavaScript function chunk(list, size) that splits an array into consecutive groups of length size (the last group may be shorter). chunk([1,2,3,4,5], 2) returns [[1,2],[3,4],[5]]. If size <= 0, throw an Error.',
    name: 'chunk', tests: (f) => [JSON.stringify(f([1, 2, 3, 4, 5], 2)) === '[[1,2],[3,4],[5]]', JSON.stringify(f([], 3)) === '[]', (() => { try { f([1], 0); return false; } catch { return true; } })()],
  },
];

function envOf(pid) {
  return Object.fromEntries(fs.readFileSync(`/proc/${pid}/environ`, 'utf8').split('\0').filter(Boolean).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
}

function evaluate(code, task) {
  try {
    const context = vm.createContext({});
    vm.runInContext(`${code}\nthis.__fn = typeof ${task.name} === 'function' ? ${task.name} : null;`, context, { timeout: 1000 });
    if (!context.__fn) return { passed: 0, total: 3, error: 'function not defined' };
    const results = vm.runInContext('(' + task.tests.toString() + ')(this.__fn)', context, { timeout: 1000 });
    return { passed: results.filter(Boolean).length, total: results.length };
  } catch (error) {
    return { passed: 0, total: 3, error: String(error.message || error).slice(0, 160) };
  }
}

(async () => {
  const [pid, out, list] = process.argv.slice(2);
  const env = envOf(pid);
  const base = env.GRG_AIPLATFORM_URL; const key = env.GRG_AIPLATFORM_KEY;
  const models = (list || 'qwen2.5-coder:1.5b,qwen2.5:3b').split(',');
  const report = { startedAt: new Date().toISOString(), base: base.replace(/\/\/[^@]*@/, '//'), results: [] };
  for (const model of models) {
    for (const task of TASKS) {
      const started = Date.now();
      let row = { model, task: task.id };
      try {
        const res = await fetch(`${base}/v1/chat/completions`, {
          method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
          body: JSON.stringify({ model, temperature: 0, max_tokens: 400, messages: [
            { role: 'system', content: 'Reply with ONLY one ```js code block containing the function. No explanation.' },
            { role: 'user', content: task.prompt },
          ] }),
          signal: AbortSignal.timeout(180000),
        });
        const body = await res.json();
        const text = body.choices?.[0]?.message?.content || '';
        const code = (text.match(/```(?:js|javascript)?\n([\s\S]*?)```/) || [])[1] || text;
        row = { ...row, status: res.status, ms: Date.now() - started, tokens: body.usage?.total ?? body.usage?.total_tokens ?? null, provider: body._gateway?.provider || null, ...evaluate(code, task) };
      } catch (error) {
        row = { ...row, ms: Date.now() - started, passed: 0, total: 3, error: String(error.message || error).slice(0, 160) };
      }
      report.results.push(row);
      fs.writeFileSync(out, JSON.stringify(report, null, 2));
    }
  }
  report.summary = models.map((model) => {
    const rows = report.results.filter((r) => r.model === model);
    const passed = rows.reduce((s, r) => s + r.passed, 0); const total = rows.reduce((s, r) => s + r.total, 0);
    return { model, acceptance: `${passed}/${total}`, passRate: total ? Math.round((passed / total) * 100) : 0, avgMs: Math.round(rows.reduce((s, r) => s + (r.ms || 0), 0) / (rows.length || 1)), tokens: rows.reduce((s, r) => s + (Number(r.tokens) || 0), 0) };
  });
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
})();