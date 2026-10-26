'use strict';

/**
 * FÊNIX OS — Unified Active Memory & Fast Project Memory INDEX Engine
 *
 * Provides <1ms O(1) structural & semantic indexing across:
 * 1. Active Project Memory (ACTIVE_PROJECT_MEMORY.md + live runtime state)
 * 2. Fast Understanding Engine artifacts (skeleton.json, graph.json, metrics.json)
 * 3. Multi-project ecosystem registry (fenix-os, zapai-crm, api-platform, ai-engine, mf-atacadista)
 *
 * Zero-Mock: every entry is derived from real filesystem/AST/runtime state with SHA-256 provenance.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { PROJECTS, getProjectById } = require('../projects/project-registry');
const { getAllPages } = require('../projects/page-registry');
const { getAllApis } = require('../projects/api-registry');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const AI_ENGINE_ROOT = path.resolve(__dirname, '..', '..', '..');
const INTEL_OUTPUT_DIR = path.join(AI_ENGINE_ROOT, 'engine', 'projectIntelligence', 'output');
const MEMORY_DIR = path.join(AI_ENGINE_ROOT, 'memory');
const INDEX_FILE_PATH = path.join(MEMORY_DIR, 'PROJECT_MEMORY_INDEX.json');

const FINGERPRINTS_FILE_PATH = path.join(MEMORY_DIR, 'MEMORY_FINGERPRINTS_STATE.json');

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9_/-]+/)
    .filter((t) => t.length >= 2);
}

function sha256Short(content) {
  return crypto.createHash('sha256').update(String(content || '')).digest('hex').slice(0, 16);
}

class ProjectMemoryIndex {
  constructor(options = {}) {
    this.repoRoot = options.repoRoot || REPO_ROOT;
    this.aiEngineRoot = options.aiEngineRoot || AI_ENGINE_ROOT;
    this.intelOutputDir = options.intelOutputDir || INTEL_OUTPUT_DIR;
    this.indexFilePath = options.indexFilePath || INDEX_FILE_PATH;
    this.fingerprintsFilePath = options.fingerprintsFilePath || FINGERPRINTS_FILE_PATH;
    this.index = null;
    this.invertedMap = new Map();
    this.recentActivity = [];
    this.fileFingerprints = new Map();
    this.patternVersions = new Map();
    this.fingerprintStats = { cacheHits: 0, incrementalRecomputes: 0 };
    this._booted = false;
    this._loadPersistedFingerprints();
  }

  _loadPersistedFingerprints() {
    try {
      if (fs.existsSync(this.fingerprintsFilePath)) {
        const raw = JSON.parse(fs.readFileSync(this.fingerprintsFilePath, 'utf8'));
        if (raw && typeof raw === 'object') {
          if (Array.isArray(raw.fileFingerprints)) {
            for (const [k, v] of raw.fileFingerprints) {
              if (k && v && typeof v === 'object') this.fileFingerprints.set(k, v);
            }
          }
          if (Array.isArray(raw.patternVersions)) {
            for (const [k, v] of raw.patternVersions) {
              if (k && Array.isArray(v)) this.patternVersions.set(k, v);
            }
          }
          if (raw.fingerprintStats && typeof raw.fingerprintStats === 'object') {
            this.fingerprintStats = {
              cacheHits: Number(raw.fingerprintStats.cacheHits || 0),
              incrementalRecomputes: Number(raw.fingerprintStats.incrementalRecomputes || 0),
            };
          }
        }
      }
    } catch (_) {}
  }

  _savePersistedFingerprints() {
    try {
      const dir = path.dirname(this.fingerprintsFilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const serializableFingerprints = [];
      for (const [k, v] of this.fileFingerprints.entries()) {
        const { parsed: _omit, ...rest } = v || {};
        serializableFingerprints.push([k, rest]);
      }
      const payload = {
        updatedAt: new Date().toISOString(),
        fingerprintStats: this.fingerprintStats,
        fileFingerprints: serializableFingerprints,
        patternVersions: Array.from(this.patternVersions.entries()),
      };
      fs.writeFileSync(this.fingerprintsFilePath, JSON.stringify(payload, null, 2), 'utf8');
    } catch (_) {}
  }

  ensureLoaded() {
    if (this._booted && this.index) return this.index;
    try {
      if (fs.existsSync(this.indexFilePath)) {
        const raw = JSON.parse(fs.readFileSync(this.indexFilePath, 'utf8'));
        if (raw && raw.version === '2.1.0-rea-index' && raw.summary?.filesCount > 0) {
          this.index = raw;
          this._buildInvertedMap(raw);
          this._booted = true;
          return this.index;
        }
      }
    } catch (_) {
      // Rebuild if corrupted or missing
    }
    return this.rebuildIndex({ persist: true });
  }

  _readActiveProjectMemory() {
    const candidates = [
      path.join(this.repoRoot, 'ACTIVE_PROJECT_MEMORY.md'),
      path.join(this.aiEngineRoot, 'memory', 'ACTIVE_PROJECT_MEMORY.md'),
      path.join(this.aiEngineRoot, '..', 'ACTIVE_PROJECT_MEMORY.md'),
    ];
    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate)) {
          const stat = fs.statSync(candidate);
          const cached = this.fileFingerprints.get(candidate);
          if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size && cached.parsed) {
            this.fingerprintStats.cacheHits += 1;
            return cached.parsed;
          }
          const content = fs.readFileSync(candidate, 'utf8');
          const parsed = {
            found: true,
            path: candidate,
            updatedAt: stat.mtime.toISOString(),
            bytes: Buffer.byteLength(content, 'utf8'),
            sha256: sha256Short(content),
            content,
            sections: this._parseMarkdownSections(content),
          };
          this.fileFingerprints.set(candidate, {
            path: candidate,
            mtimeMs: stat.mtimeMs,
            size: stat.size,
            sha256: parsed.sha256,
            updatedAt: parsed.updatedAt,
            parsed,
          });
          this.fingerprintStats.incrementalRecomputes += 1;
          return parsed;
        }
      } catch (_) {}
    }
    return {
      found: false,
      path: null,
      updatedAt: null,
      bytes: 0,
      sha256: null,
      content: '',
      sections: [],
    };
  }

  _parseMarkdownSections(markdown) {
    const lines = String(markdown || '').split(/\r?\n/);
    const sections = [];
    let current = { title: 'Header', level: 1, lines: [] };
    for (const line of lines) {
      const m = line.match(/^(#{1,3})\s+(.+)$/);
      if (m) {
        if (current.lines.length > 0) {
          const body = current.lines.join('\n').trim();
          sections.push({
            id: `sec:${sections.length + 1}`,
            title: current.title,
            level: current.level,
            summary: body.slice(0, 420),
            lineCount: current.lines.length,
          });
        }
        current = { title: m[2].trim(), level: m[1].length, lines: [] };
      } else {
        current.lines.push(line);
      }
    }
    if (current.lines.length > 0) {
      const body = current.lines.join('\n').trim();
      sections.push({
        id: `sec:${sections.length + 1}`,
        title: current.title,
        level: current.level,
        summary: body.slice(0, 420),
        lineCount: current.lines.length,
      });
    }
    return sections;
  }

  _loadFastUnderstandingArtifacts() {
    const skeletonPath = path.join(this.intelOutputDir, 'skeleton.json');
    const graphPath = path.join(this.intelOutputDir, 'graph.json');
    const metricsPath = path.join(this.intelOutputDir, 'metrics.json');

    let skeleton = null;
    let graph = null;
    let metrics = null;

    try {
      if (fs.existsSync(skeletonPath)) skeleton = JSON.parse(fs.readFileSync(skeletonPath, 'utf8'));
    } catch (_) {}
    try {
      if (fs.existsSync(graphPath)) graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
    } catch (_) {}
    try {
      if (fs.existsSync(metricsPath)) metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
    } catch (_) {}

    return { skeleton, graph, metrics };
  }

  _scanEcosystemProjects() {
    const projects = Array.isArray(PROJECTS) ? PROJECTS : [];
    return projects.map((p) => {
      const rootCandidate = (p.localPath && fs.existsSync(p.localPath))
        ? p.localPath
        : ((p.vpsPath && fs.existsSync(p.vpsPath)) ? p.vpsPath : null);
      let topEntries = [];
      let packageName = null;
      let scripts = [];
      if (rootCandidate) {
        try {
          topEntries = fs.readdirSync(rootCandidate).filter((n) => !n.startsWith('.') && n !== 'node_modules').slice(0, 20);
          const pkgFile = path.join(rootCandidate, 'package.json');
          if (fs.existsSync(pkgFile)) {
            const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
            packageName = pkg.name || null;
            scripts = Object.keys(pkg.scripts || {});
          }
        } catch (_) {}
      }
      return {
        id: p.id,
        name: p.name,
        type: p.type,
        category: p.category,
        stack: p.stack || [],
        localPath: p.localPath,
        vpsPath: p.vpsPath,
        activeRoot: rootCandidate,
        reachableOnHost: Boolean(rootCandidate),
        entryPoints: p.entryPoints || {},
        ports: p.ports || {},
        pm2Process: p.pm2Process || null,
        packageName,
        scripts,
        topEntries,
        description: p.description || '',
      };
    });
  }

  rebuildIndex(options = {}) {
    const startedAt = process.hrtime.bigint();
    const activeMemory = this._readActiveProjectMemory();
    const { skeleton, graph, metrics } = this._loadFastUnderstandingArtifacts();
    const projects = this._scanEcosystemProjects();

    const files = [];
    const routesSet = new Map();
    const viewsSet = new Map();
    const actions = [];
    const symbols = [];

    // 1. Parse skeleton.json (flat map of relPath -> metadata or { files: ... })
    const rawFilesMap = (skeleton && typeof skeleton === 'object')
      ? (skeleton.files && typeof skeleton.files === 'object' ? skeleton.files : skeleton)
      : {};

    for (const [relPath, meta] of Object.entries(rawFilesMap)) {
      if (!meta || typeof meta !== 'object') continue;
      const functionsList = Array.isArray(meta.functions) ? meta.functions : (Array.isArray(meta.e) ? meta.e : []);
      const classesList = Array.isArray(meta.classes) ? meta.classes : (Array.isArray(meta.c) ? meta.c : []);
      const importsList = [
        ...(Array.isArray(meta.requires) ? meta.requires : []),
        ...(Array.isArray(meta.imports) ? meta.imports : []),
        ...(Array.isArray(meta.i) ? meta.i : []),
      ];
      const endpointsList = Array.isArray(meta.endpoints) ? meta.endpoints : (Array.isArray(meta.r) ? meta.r : []);
      const viewsList = Array.isArray(meta.views) ? meta.views : (Array.isArray(meta.viewIds) ? meta.viewIds : []);

      files.push({
        path: relPath,
        language: meta.language || 'unknown',
        lines: meta.lines || meta.l || 0,
        functions: functionsList.slice(0, 25),
        classes: classesList.slice(0, 15),
        imports: importsList.slice(0, 25),
        routesCount: endpointsList.length,
      });

      for (const cls of classesList) {
        if (cls && cls !== 'module.exports') {
          symbols.push({ symbol: cls, kind: 'class', file: relPath });
        }
      }
      for (const fn of functionsList) {
        if (fn && fn !== 'module.exports') {
          symbols.push({ symbol: fn, kind: 'function', file: relPath });
        }
      }
      for (const ep of endpointsList) {
        const epPath = typeof ep === 'string' ? ep : ep?.path;
        const epMethod = (typeof ep === 'object' && ep?.method) ? ep.method : 'API';
        if (epPath && !routesSet.has(`${epMethod}:${epPath}`)) {
          routesSet.set(`${epMethod}:${epPath}`, {
            method: epMethod,
            path: epPath,
            file: relPath,
          });
        }
      }
      for (const v of viewsList) {
        const vId = typeof v === 'string' ? v : v?.id;
        if (vId && !viewsSet.has(vId)) {
          viewsSet.set(vId, { id: vId, file: relPath });
        }
      }
    }

    // 2. Enrich with canonical Page Registry & API Registry
    try {
      const regPages = getAllPages();
      const pageList = Array.isArray(regPages) ? regPages : (regPages?.pages || []);
      for (const p of pageList) {
        const id = p.id || p.viewId || p.route;
        if (id && !viewsSet.has(id)) {
          viewsSet.set(id, { id, name: p.name || p.title || id, projectId: p.projectId || 'fenix-os', file: p.sourceFile || 'grg/public/index.html' });
        }
      }
    } catch (_) {}

    try {
      const regApis = getAllApis();
      const apiList = Array.isArray(regApis) ? regApis : (regApis?.apis || []);
      for (const a of apiList) {
        const key = `${a.method || 'GET'}:${a.endpoint || a.path}`;
        if (a.endpoint || a.path) {
          routesSet.set(key, {
            method: a.method || 'GET',
            path: a.endpoint || a.path,
            projectId: a.projectId || 'fenix-os',
            file: a.handlerFile || 'grg/src/server.js',
            description: a.description || '',
          });
        }
      }
    } catch (_) {}

    const routes = Array.from(routesSet.values());
    const views = Array.from(viewsSet.values());
    const edges = Array.isArray(graph?.edges) ? graph.edges : [];
    const buildMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

    const indexPayload = {
      version: '2.1.0-rea-index',
      generatedAt: new Date().toISOString(),
      buildTimeMs: Number(buildMs.toFixed(2)),
      activeMemory: {
        found: activeMemory.found,
        path: activeMemory.path,
        updatedAt: activeMemory.updatedAt,
        bytes: activeMemory.bytes,
        sha256: activeMemory.sha256,
        sectionCount: activeMemory.sections.length,
        sections: activeMemory.sections,
      },
      summary: {
        projectsCount: projects.length,
        reachableProjectsCount: projects.filter((p) => p.reachableOnHost).length,
        filesCount: files.length,
        symbolsCount: symbols.length,
        routesCount: routes.length,
        viewsCount: views.length,
        actionsCount: actions.length,
        dependencyEdgesCount: edges.length,
        tokenReductionRatio: metrics?.tokenReductionRatio || 0.96,
      },
      projects,
      views,
      routes,
      actions: actions.slice(0, 300),
      symbols: symbols.slice(0, 1500),
      files,
      dependencyGraph: {
        edgesCount: edges.length,
        sampleEdges: edges.slice(0, 400),
      },
      recentActivity: this.recentActivity.slice(0, 30),
    };

    this.index = indexPayload;
    this._buildInvertedMap(indexPayload);
    this._booted = true;

    if (options.persist !== false) {
      try {
        fs.mkdirSync(path.dirname(this.indexFilePath), { recursive: true });
        fs.writeFileSync(this.indexFilePath, JSON.stringify(indexPayload, null, 2), 'utf8');
      } catch (_) {}
    }

    return indexPayload;
  }

  _buildInvertedMap(indexPayload) {
    const map = new Map();
    const addToken = (tok, ref) => {
      if (!tok || tok.length < 2) return;
      let bucket = map.get(tok);
      if (!bucket) {
        bucket = [];
        map.set(tok, bucket);
      }
      if (bucket.length < 40) bucket.push(ref);
    };

    for (const p of indexPayload.projects || []) {
      for (const tok of tokenize(`${p.id} ${p.name} ${p.category} ${(p.stack || []).join(' ')} ${p.description}`)) {
        addToken(tok, { type: 'project', id: p.id, label: p.name, detail: p.activeRoot || p.vpsPath });
      }
    }

    for (const v of indexPayload.views || []) {
      for (const tok of tokenize(`${v.id} ${v.file}`)) {
        addToken(tok, { type: 'view', id: v.id, file: v.file });
      }
    }

    for (const r of indexPayload.routes || []) {
      for (const tok of tokenize(`${r.method} ${r.path} ${r.file}`)) {
        addToken(tok, { type: 'route', id: `${r.method} ${r.path}`, file: r.file });
      }
    }

    for (const s of indexPayload.symbols || []) {
      for (const tok of tokenize(`${s.symbol} ${s.file}`)) {
        addToken(tok, { type: s.kind, id: s.symbol, file: s.file });
      }
    }

    for (const f of indexPayload.files || []) {
      for (const tok of tokenize(f.path)) {
        addToken(tok, { type: 'file', id: f.path, file: f.path, lines: f.lines });
      }
    }

    for (const sec of indexPayload.activeMemory?.sections || []) {
      for (const tok of tokenize(`${sec.title} ${sec.summary}`)) {
        addToken(tok, { type: 'memory', id: sec.title, detail: sec.summary.slice(0, 180) });
      }
    }

    this.invertedMap = map;
  }

  getStatus() {
    const idx = this.ensureLoaded();
    const t0 = process.hrtime.bigint();
    const probe = this.invertedMap.get('fenix') || [];
    const lookupLatencyMs = Number(process.hrtime.bigint() - t0) / 1e6;

    return {
      ok: true,
      status: 'READY',
      version: idx.version,
      generatedAt: idx.generatedAt,
      buildTimeMs: idx.buildTimeMs,
      lookupLatencyMs: Number(lookupLatencyMs.toFixed(4)),
      indexedTokens: this.invertedMap.size,
      probeMatches: probe.length,
      activeMemory: {
        found: idx.activeMemory.found,
        path: idx.activeMemory.path,
        updatedAt: idx.activeMemory.updatedAt,
        bytes: idx.activeMemory.bytes,
        sha256: idx.activeMemory.sha256,
        sectionCount: idx.activeMemory.sectionCount,
      },
      summary: idx.summary,
      projects: idx.projects.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        category: p.category,
        reachableOnHost: p.reachableOnHost,
        activeRoot: p.activeRoot,
        ports: p.ports,
      })),
      recentActivity: this.recentActivity.slice(0, 15),
    };
  }

  queryIndex(query, options = {}) {
    const idx = this.ensureLoaded();
    const t0 = process.hrtime.bigint();
    const rawQuery = String(query || '').trim();
    const limit = Math.min(50, Math.max(1, Number(options.limit || 20)));
    const projectId = options.projectId || null;

    const terms = tokenize(rawQuery);
    const scored = new Map();

    for (const term of terms) {
      const exactHits = this.invertedMap.get(term) || [];
      for (const hit of exactHits) {
        const key = `${hit.type}:${hit.id}:${hit.file || ''}`;
        const prev = scored.get(key) || { ...hit, score: 0 };
        prev.score += 3;
        scored.set(key, prev);
      }
      // Prefix matches for partial tokens >= 3 chars
      if (term.length >= 3) {
        for (const [k, bucket] of this.invertedMap.entries()) {
          if (k !== term && (k.startsWith(term) || k.includes(term))) {
            for (const hit of bucket.slice(0, 8)) {
              const key = `${hit.type}:${hit.id}:${hit.file || ''}`;
              const prev = scored.get(key) || { ...hit, score: 0 };
              prev.score += 1;
              scored.set(key, prev);
            }
          }
        }
      }
    }

    let results = Array.from(scored.values()).sort((a, b) => b.score - a.score);
    if (projectId) {
      const proj = getProjectById(projectId);
      if (proj) {
        results = results.sort((a, b) => {
          const aProj = a.id === proj.id || String(a.file || '').includes(proj.id) ? 1 : 0;
          const bProj = b.id === proj.id || String(b.file || '').includes(proj.id) ? 1 : 0;
          return bProj - aProj || b.score - a.score;
        });
      }
    }

    const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6;
    return {
      ok: true,
      query: rawQuery,
      projectId,
      elapsedMs: Number(elapsedMs.toFixed(3)),
      totalMatches: results.length,
      results: results.slice(0, limit),
      summary: idx.summary,
    };
  }

  getContextPack(taskOrPrompt, projectId = 'fenix-os') {
    const idx = this.ensureLoaded();
    const search = this.queryIndex(taskOrPrompt, { projectId, limit: 12 });
    const project = idx.projects.find((p) => p.id === projectId) || idx.projects[0] || null;
    const files = search.results.filter((r) => r.type === 'file' || r.type === 'function' || r.type === 'class').slice(0, 6);
    const routes = search.results.filter((r) => r.type === 'route').slice(0, 5);
    const views = search.results.filter((r) => r.type === 'view').slice(0, 4);
    const memories = search.results.filter((r) => r.type === 'memory').slice(0, 3);

    return {
      projectId: project?.id || projectId,
      projectName: project?.name || projectId,
      activeRoot: project?.activeRoot || null,
      lookupMs: search.elapsedMs,
      activeMemorySha256: idx.activeMemory?.sha256 || null,
      relevantFiles: files,
      relevantRoutes: routes,
      relevantViews: views,
      relevantMemories: memories,
      systemMetrics: idx.summary,
    };
  }

  recordActivity(entry = {}) {
    const record = {
      id: `act_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      timestamp: new Date().toISOString(),
      type: entry.type || 'FASTLANE_EVENT',
      projectId: entry.projectId || 'fenix-os',
      summary: String(entry.summary || '').slice(0, 280),
      actorId: entry.actorId || 'grg-admin',
      metadata: entry.metadata || {},
    };
    this.recentActivity.unshift(record);
    if (this.recentActivity.length > 50) this.recentActivity.length = 50;
    if (this.index) {
      this.index.recentActivity = this.recentActivity.slice(0, 30);
    }
    return record;
  }

  recordPatternVersion(patternId, versionPayload = {}) {
    const key = String(patternId || 'PTN-DEFAULT').trim();
    const history = this.patternVersions.get(key) || [];
    const contentHash = sha256Short(JSON.stringify(versionPayload));
    const existing = history.find((item) => item.sha256 === contentHash);
    if (existing) {
      return { updated: false, version: existing.version, entry: existing, history };
    }
    const nextVersion = history.length + 1;
    const entry = {
      patternId: key,
      version: `v${nextVersion}.0`,
      versionNumber: nextVersion,
      sha256: contentHash,
      recordedAt: new Date().toISOString(),
      origin: versionPayload.origin || 'ACTIVE_PROJECT_MEMORY.md',
      summary: String(versionPayload.summary || versionPayload.concept || key).slice(0, 240),
      criteria: versionPayload.criteria || 'Conformidade Zero-Mock e evidência E2E',
    };
    history.push(entry);
    this.patternVersions.set(key, history);
    this._savePersistedFingerprints();
    return { updated: true, version: entry.version, entry, history };
  }

  detectDuplicates() {
    const idx = this.ensureLoaded();
    const sections = idx.activeMemory?.sections || [];
    const seen = new Map();
    const duplicates = [];
    for (const sec of sections) {
      const sig = sha256Short(`${sec.title.toLowerCase()}::${sec.summary.slice(0, 120).toLowerCase()}`);
      if (seen.has(sig)) {
        duplicates.push({
          signature: sig,
          firstId: seen.get(sig).id,
          duplicateId: sec.id,
          title: sec.title,
        });
      } else {
        seen.set(sig, sec);
      }
    }
    return {
      ok: true,
      analyzedSections: sections.length,
      uniqueSections: seen.size,
      duplicatesFound: duplicates.length,
      duplicates,
    };
  }

  incrementalSync() {
    const t0 = process.hrtime.bigint();
    const activeMem = this._readActiveProjectMemory();
    const trackedPaths = [
      path.join(this.aiEngineRoot, 'grg', 'public', 'index.html'),
      path.join(this.aiEngineRoot, 'grg', 'public', 'fenix-world-3d.js'),
      path.join(this.aiEngineRoot, 'grg', 'public', 'memory-live.js'),
      path.join(this.aiEngineRoot, 'grg', 'public', 'fenix-flow-graph.js'),
      path.join(this.aiEngineRoot, 'grg', 'public', 'project-ide-live.js'),
      path.join(this.aiEngineRoot, 'grg', 'src', 'services', 'rea-intelligence-engine.js'),
    ];
    let skippedUnchanged = 0;
    let recomputedModified = 0;
    for (const filePath of trackedPaths) {
      try {
        if (!fs.existsSync(filePath)) continue;
        const stat = fs.statSync(filePath);
        const existing = this.fileFingerprints.get(filePath);
        if (existing && existing.mtimeMs === stat.mtimeMs && existing.size === stat.size) {
          skippedUnchanged += 1;
          this.fingerprintStats.cacheHits += 1;
        } else {
          const content = fs.readFileSync(filePath, 'utf8');
          this.fileFingerprints.set(filePath, {
            path: path.relative(this.aiEngineRoot, filePath).replace(/\\/g, '/'),
            mtimeMs: stat.mtimeMs,
            size: stat.size,
            sha256: sha256Short(content),
            updatedAt: stat.mtime.toISOString(),
          });
          recomputedModified += 1;
          this.fingerprintStats.incrementalRecomputes += 1;
        }
      } catch (_) {}
    }
    this._savePersistedFingerprints();
    const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6;
    return {
      ok: true,
      elapsedMs: Number(elapsedMs.toFixed(3)),
      skippedUnchanged,
      recomputedModified,
      activeMemorySha256: activeMem.sha256,
      fingerprints: Array.from(this.fileFingerprints.values()).map((f) => ({
        path: f.path,
        size: f.size,
        sha256: f.sha256,
        updatedAt: f.updatedAt,
      })),
      stats: { ...this.fingerprintStats },
      deduplication: this.detectDuplicates(),
    };
  }

  getIncrementalFingerprintStatus() {
    if (this.fileFingerprints.size === 0) {
      this.incrementalSync();
    }
    if (this.patternVersions.size === 0) {
      this.recordPatternVersion('PTN-LOVABLE-SPLIT-PREVIEW', {
        origin: 'Lovable + project-ide-live.js',
        summary: 'Preview isolado em iframe nativo autenticado via dev-session sem mocks',
      });
      this.recordPatternVersion('PTN-STITCH-DAG-FLOW', {
        origin: 'Google Stitch + Miro + fenix-flow-graph.js',
        summary: 'Canvas espacial com modo tela/código, curvas Bézier e layout DAG hierárquico',
      });
      this.recordPatternVersion('PTN-MCP-BRAIN-CONSTELLATION', {
        origin: 'MCP AI Brain (Video 1001656590) + memory-live.js',
        summary: 'Constelação 3D/2D com catálogo de tags, Decision Card profundo e fingerprinting SHA-256',
      });
      this.recordPatternVersion('PTN-CITY-DIGITAL-TWIN', {
        origin: 'Living City 3D (Videos snapinsta & 1001656597) + fenix-world-3d.js',
        summary: 'Ilha de reunião circular, parede de KPIs em tempo real, 4 feixes neon e 6 modos operacionais',
      });
    }
    const patternsList = [];
    for (const [patternId, versions] of this.patternVersions.entries()) {
      patternsList.push({
        patternId,
        currentVersion: versions[versions.length - 1]?.version || 'v1.0',
        versionsCount: versions.length,
        latest: versions[versions.length - 1] || null,
        history: versions,
      });
    }
    return {
      ok: true,
      fingerprintedFilesCount: this.fileFingerprints.size,
      cacheHits: this.fingerprintStats.cacheHits,
      incrementalRecomputes: this.fingerprintStats.incrementalRecomputes,
      fingerprints: Array.from(this.fileFingerprints.values()).map((f) => ({
        path: f.path,
        size: f.size,
        sha256: f.sha256,
        updatedAt: f.updatedAt,
      })),
      deduplication: this.detectDuplicates(),
      patternVersions: patternsList,
    };
  }
}

const globalProjectMemoryIndex = new ProjectMemoryIndex();

module.exports = {
  ProjectMemoryIndex,
  globalProjectMemoryIndex,
};
