// FÊNIX OS — Project Intelligence 20X — AUDIT (FASE 22) + PERFORMANCE (FASE 23)
// Uso: node engine/projectIntelligence/audit.js [--record]
// --record grava snapshot em output/perf-history.json para comparar evolução do
// "TIME TO UNDERSTAND TASK" entre execuções.
'use strict';

const fsp = require('node:fs/promises');
const path = require('node:path');
const L = require('./lib');

async function timed(fn) { const t = Date.now(); const r = await fn(); return { r, ms: Date.now() - t }; }

async function main() {
  const record = process.argv.includes('--record');
  const cache = await L.loadCache();
  const graphFile = path.join(L.OUTPUT_DIR, 'graph.json');
  const metricsFile = path.join(L.OUTPUT_DIR, 'metrics.json');
  let graph = null, metrics = null;
  try { graph = JSON.parse(await fsp.readFile(graphFile, 'utf8')); } catch {}
  try { metrics = JSON.parse(await fsp.readFile(metricsFile, 'utf8')); } catch {}

  // ---- Medições reais (FASE 23) ----
  const discovery = await timed(() => L.walk(L.ROOT, L.ROOT));
  const indexable = discovery.r.filter(L.isIndexable);
  const indexing = await timed(() => L.indexFiles(L.ROOT, indexable));
  const lookup = await timed(async () => {
    // MEMORY LOOKUP de exemplo: quem consome o kernel store? (via cache, sem ler arquivos)
    if (!graph) return 0;
    return Object.keys(graph.consumers || {}).filter((f) => f.includes('kernel/store')).length;
  });

  // Estalecimento / staleness
  const indexedSet = new Set(Object.keys(cache.files || {}));
  const staleIndex = indexable.filter((f) => !indexedSet.has(f)).length;
  const removedGhosts = (graph ? Object.keys(graph.consumers || {}) : []).filter((f) => !indexedSet.has(f)).length;

  // Contagens estruturais derivadas do índice
  const files = cache.files || {};
  const endpoints = new Set();
  const classes = new Set();
  const modules = new Set();
  for (const [rel, e] of Object.entries(files)) {
    modules.add(L.moduleOf(rel));
    for (const ep of e.skeleton?.endpoints || []) endpoints.add(ep);
    for (const c of e.skeleton?.classes || []) classes.add(c);
  }

  // Duplicações simples por hash idêntico (FASE 17 — detecção, não remoção)
  const byHash = {};
  for (const [rel, e] of Object.entries(files)) if (e.hash && e.hash !== 'SKIP_LARGE') (byHash[e.hash] ||= []).push(rel);
  const duplicates = Object.values(byHash).filter((g) => g.length > 1);

  // Memória existente no repo (fontes reais)
  let decisionCount = 0;
  try { decisionCount = (await fsp.readdir(path.join(L.ROOT, 'ai-os/MEMORY/decisions'))).length; } catch {}
  const memoryDocs = ['DECISION_MEMORY.md', 'ARCHITECTURE_MEMORY.md', 'TASK_MEMORY.md']
    .filter((d) => files[d] || require('node:fs').existsSync(path.join(L.ROOT, d)));

  const report = {
    PROJECT_SIZE: { totalFilesNoDeps: discovery.r.length, indexable: indexable.length },
    FILES_INDEXED: Object.keys(files).length,
    MODULES: modules.size,
    SCREENS: 4, // registradas em SCREEN_REGISTRY.md (verificadas no código)
    APIS: endpoints.size,
    COMPONENTS_CLASSES: classes.size,
    DEPENDENCIES_IMPORT_EDGES: graph ? graph.edges.filter((e) => e.type === 'IMPORTS').length : 0,
    MEMORY_ITEMS: { decisionFiles: decisionCount, projectMemoryDocs: memoryDocs },
    CACHE_HIT_RATE: +(indexing.r.stats.reused / Math.max(1, indexing.r.stats.reused + indexing.r.stats.reread)).toFixed(4),
    INDEX_HIT_RATE: metrics ? metrics.cacheHitRate : null,
    FILES_REUSED_THIS_RUN: indexing.r.stats.reused,
    FILES_REREAD_THIS_RUN: indexing.r.stats.reread,
    DUPLICATES: duplicates.map((g) => g.join(' == ')),
    ORPHANS_UNKNOWN: 'classificados em PROJECT_STRUCTURE.md (future/, generated/, graphify-out/)',
    STALE_INDEX: staleIndex,
    BROKEN_REFERENCES: metrics ? metrics.brokenReferences.length : null,
    SECRET_LEAKS_IN_INDEX: metrics ? metrics.secretLeaksInIndex : [],
    PERF_MS: {
      DISCOVERY_TIME: discovery.ms,
      INDEX_TIME_INCREMENTAL: indexing.ms,
      MEMORY_LOOKUP_TIME: lookup.ms,
      TOTAL_UNDERSTAND_TASK: discovery.ms + indexing.ms + lookup.ms,
    },
  };

  const histFile = path.join(L.OUTPUT_DIR, 'perf-history.json');
  let history = [];
  try { history = JSON.parse(await fsp.readFile(histFile, 'utf8')); } catch {}
  if (record) {
    history.push({ at: new Date().toISOString(), ...report.PERF_MS, cacheHitRate: report.CACHE_HIT_RATE });
    await fsp.writeFile(histFile, JSON.stringify(history, null, 2));
  }
  const prev = history[history.length - 2];
  if (prev) report.PERF_vs_baseline = { baselineTotalMs: prev.TOTAL_UNDERSTAND_TASK, currentTotalMs: report.PERF_MS.TOTAL_UNDERSTAND_TASK, speedup: +(prev.TOTAL_UNDERSTAND_TASK / Math.max(1, report.PERF_MS.TOTAL_UNDERSTAND_TASK)).toFixed(2) };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
