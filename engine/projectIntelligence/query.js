// FÊNIX OS — Project Intelligence 20X — CONSULTAS AO MAPA (FASE 8/9/18)
// Permite responder perguntas estruturais SEM abrir arquivos.
// Uso:
//   node engine/projectIntelligence/query.js who-uses <arquivo|trecho>
//   node engine/projectIntelligence/query.js screen <ID|trecho>
//   node engine/projectIntelligence/query.js api </api/trecho>
//   node engine/projectIntelligence/query.js module <nome>
//   node engine/projectIntelligence/query.js file <arquivo>
//   node engine/projectIntelligence/query.js search <palavra>
//   node engine/projectIntelligence/query.js context-pack "<tarefa>"
'use strict';

const fsp = require('node:fs/promises');
const path = require('node:path');
const L = require('./lib');

async function load() {
  const skelFile = path.join(L.OUTPUT_DIR, 'skeleton.json');
  try {
    return {
      skeleton: JSON.parse(await fsp.readFile(skelFile, 'utf8')),
      graph: JSON.parse(await fsp.readFile(path.join(L.OUTPUT_DIR, 'graph.json'), 'utf8')),
    };
  } catch {
    console.error('Índice ausente. Rode primeiro: node engine/projectIntelligence/build.js');
    process.exit(1);
  }
}

function fuzzyMatch(haystack, needle) {
  const h = haystack.toLowerCase(), n = needle.toLowerCase();
  return h.includes(n) || n.split(/[\s/]+/).some((t) => t.length > 2 && h.includes(t));
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  const { skeleton, graph } = await load();
  const out = (obj) => console.log(JSON.stringify(obj, null, 2));

  if (cmd === 'who-uses') {
    const target = args.join(' ');
    const hits = Object.entries(graph.consumers || {}).filter(([f]) => fuzzyMatch(f, target));
    out(hits.map(([file, consumers]) => ({ file, consumers })));
  } else if (cmd === 'api') {
    const target = args.join(' ');
    const providers = graph.edges.filter((e) => e.type === 'EXPOSES_ENDPOINT' && fuzzyMatch(e.to, target))
      .map((e) => ({ endpoint: e.to, exposedBy: e.from }));
    const callers = Object.entries(skeleton).filter(([, s]) => [...(s.endpoints || []), ...(s.apiRefs || [])].some((a) => fuzzyMatch(a, target)))
      .map(([f]) => f);
    out({ providers, consumedByFiles: callers });
  } else if (cmd === 'screen') {
    const id = (args.join(' ') || '').toUpperCase();
    // Lê SCREEN_REGISTRY.md derivado — fonte única da verdade das telas reais
    const reg = await fsp.readFile(path.join(L.ROOT, 'SCREEN_REGISTRY.md'), 'utf8').catch(() => '');
    const section = reg.split(/^## /m).find((s) => s.toUpperCase().startsWith(id) || fuzzyMatch(s, id));
    out({ screen: section ? '## ' + section.trim() : 'não encontrado; rode build.js e confira SCREEN_REGISTRY.md' });
  } else if (cmd === 'module') {
    const target = args.join(' ');
    const files = Object.entries(skeleton).filter(([f, s]) => fuzzyMatch(s.module, target) || fuzzyMatch(f, target));
    out(files.map(([f, s]) => ({ file: f, language: s.language, lines: s.lines, classes: s.classes?.slice(0, 5), endpoints: s.endpoints?.length || 0 })));
  } else if (cmd === 'file') {
    const target = args.join(' ');
    const found = Object.entries(skeleton).find(([f]) => f === target || fuzzyMatch(f, target));
    if (!found) return out({ error: 'arquivo não indexado' });
    const [f, s] = found;
    out({ file: f, ...s, importedBy: (graph.consumers || {})[f] || [], importsResolved: graph.edges.filter((e) => e.from === f && e.type === 'IMPORTS').map((e) => e.to) });
  } else if (cmd === 'search') {
    const target = args.join(' ').toLowerCase();
    const hits = [];
    for (const [f, s] of Object.entries(skeleton)) {
      const dump = JSON.stringify(s).toLowerCase();
      if (dump.includes(target)) hits.push(f);
    }
    out({ count: hits.length, files: hits.slice(0, 40) });
  } else if (cmd === 'context-pack') {
    // FASE 9 — TASK_CONTEXT_PACK: módulos relevantes + arquivos + APIs + riscos, compacto.
    const task = args.join(' ').toLowerCase();
    const terms = task.split(/[^a-z0-9/]+/).filter((t) => t.length > 3);
    const scored = {};
    const bump = (f, pts) => { if (f) scored[f] = (scored[f] || 0) + pts; };
    for (const [f, s] of Object.entries(skeleton)) {
      let score = 0;
      for (const t of terms) {
        if (f.toLowerCase().includes(t)) score += 5;
        if ((s.classes || []).some((c) => c.toLowerCase().includes(t))) score += 4;
        if ((s.functions || []).some((c) => c.toLowerCase().includes(t))) score += 3;
        if ([...(s.endpoints || []), ...(s.apiRefs || [])].some((a) => a.toLowerCase().includes(t))) score += 6;
      }
      if (score) bump(f, score);
    }
    const top = Object.entries(scored).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const relevantApis = new Set();
    for (const [f] of top) for (const ep of skeleton[f].endpoints || []) relevantApis.add(ep);
    const deps = new Set();
    for (const [f] of top) for (const e of graph.edges) if (e.from === f && (e.type === 'IMPORTS')) deps.add(e.to);
    const risks = top.filter(([f]) => ((graph.consumers || {})[f] || []).length > 3).map(([f]) => `${f} tem ${(graph.consumers[f] || []).length} consumidores — mudança aqui exige rodar testes do grg`);
    out({
      task: args.join(' '),
      levelUsed: 'LEVEL 1 (skeleton) — nenhum arquivo aberto',
      relevantFiles: top.map(([f, sc]) => ({ file: f, score: sc, lines: skeleton[f].lines, module: skeleton[f].module })),
      relevantApis: [...relevantApis].slice(0, 20),
      dependenciesOfRelevant: [...deps],
      memoryHints: ['consultar ai-os/MEMORY/decisions/ e DECISION_MEMORY.md antes de decidir'],
      testsToRun: top.some(([f]) => f.startsWith('grg/')) ? ['cd grg && node --test test/'] : ['npm run test:engine'],
      risks,
    });
  } else {
    console.log(`Comandos: who-uses | screen | api | module | file | search | context-pack`);
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
