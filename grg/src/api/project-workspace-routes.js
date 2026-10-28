const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { GitWorkspaceWriteCapability } = require('../repo-intel/git-write-capability');
const { resolveProjectWorkspace } = require('../projects/project-workspace-resolver');

const IGNORE = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '.turbo', '.data', 'coverage', 'vendor', 'backups']);
const writers = new Map();
const DRAFT_TTL_MS = 30 * 60 * 1000;
const MAX_ACTIVE_DRAFTS = 100;
const MAX_ACTIVE_DRAFT_BYTES = 32 * 1024 * 1024;

async function handleProjectWorkspaceRoutes(req, res, url, app, sendJson, readJson, { tenantId, actorId }) {
  const reply = (status, payload) => { sendJson(res, status, payload); return true; };
  const draftMatch = url.pathname.match(/^\/api\/fenix\/projects\/([^/]+)\/drafts(?:\/([^/]+)(?:\/(apply))?)?$/);
  if (draftMatch) return handleEditDraftRoute(req, res, url, app, sendJson, readJson, { tenantId, actorId }, draftMatch);
  const logoMatch = url.pathname.match(/^\/api\/fenix\/projects\/([^/]+)\/logo$/);
  if (req.method === 'GET' && logoMatch) {
    await app.controlPlane.authorize(tenantId, actorId, 'project:read');
    const projectId = decodeURIComponent(logoMatch[1]);
    const catalog = require('../projects/local-project-catalog');
    const project = catalog.getLocalProjectById(projectId);
    if (!project?.logoId) return reply(404, { error: 'Project logo is unavailable' });
    const catalogFile = catalog.catalogPath();
    if (!catalogFile) return reply(404, { error: 'Project logo is unavailable' });
    try {
      const catalogRoot = fs.realpathSync(path.dirname(catalogFile));
      let logosDirectory = path.join(catalogRoot, 'logos');
      if (!fs.existsSync(logosDirectory)) {
        logosDirectory = path.resolve(__dirname, '..', '..', 'public', 'assets', 'logos');
      }
      if (!fs.existsSync(logosDirectory)) {
        logosDirectory = path.resolve(__dirname, '..', '..', 'memory', 'logos');
      }
      if (fs.lstatSync(logosDirectory).isSymbolicLink()) return reply(404, { error: 'Project logo is unavailable' });
      const logosRoot = fs.realpathSync(logosDirectory);
      const logoPath = path.join(logosRoot, `${project.logoId}.png`);
      if (fs.lstatSync(logoPath).isSymbolicLink()) return reply(404, { error: 'Project logo is unavailable' });
      const realLogoPath = fs.realpathSync(logoPath);
      const relative = path.relative(logosRoot, realLogoPath);
      if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return reply(404, { error: 'Project logo is unavailable' });
      const stat = fs.statSync(realLogoPath);
      if (!stat.isFile() || stat.size < 1 || stat.size > 2 * 1024 * 1024) return reply(404, { error: 'Project logo is unavailable' });
      const image = fs.readFileSync(realLogoPath);
      if (image.length < 8 || !image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return reply(404, { error: 'Project logo is unavailable' });
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=300', 'X-Content-Type-Options': 'nosniff' });
      res.end(image);
      return true;
    } catch { return reply(404, { error: 'Project logo is unavailable' }); }
  }

  const bindMatch = url.pathname.match(/^\/api\/fenix\/projects\/([^/]+)\/bind-workspace$/);
  if (req.method === 'POST' && bindMatch) {
    await app.controlPlane.authorize(tenantId, actorId, 'project:write');
    const projectId = decodeURIComponent(bindMatch[1]);
    const body = await readJson(req).catch(() => ({}));
    const targetPath = String(body?.path || '').trim();
    if (!targetPath) return reply(400, { error: 'Caminho do workspace é obrigatório' });
    let resolved;
    try {
      if (!fs.existsSync(targetPath)) return reply(404, { error: `Caminho '${targetPath}' não existe neste computador` });
      resolved = fs.realpathSync(targetPath);
      const stat = fs.statSync(resolved);
      if (!stat.isDirectory()) return reply(400, { error: 'O caminho especificado deve ser uma pasta válida' });
    } catch (err) {
      return reply(400, { error: `Falha ao validar pasta: ${err.message}` });
    }
    const state = await app.store.read();
    if (!Array.isArray(state.projects)) state.projects = [];
    let stored = state.projects.find((p) => (!p.tenantId || p.tenantId === tenantId) && (
      p.id === projectId || p.projectId === projectId || p.catalogId === projectId ||
      `local-${p.id}` === projectId || p.id === `local-${projectId}`
    ));
    if (stored) {
      stored.workspace = resolved;
      stored.workspaceAvailable = true;
    } else {
      state.projects.push({ id: projectId, tenantId, name: projectId, workspace: resolved, workspaceAvailable: true });
    }
    await app.store.write(state);
    if (app.audit?.record) {
      await app.audit.record({ tenantId, actorId, action: 'project.workspace.bound', resource: { projectId, workspace: resolved } });
    }
    return reply(200, { ok: true, projectId, workspace: resolved, workspaceAvailable: true });
  }

  const cloneMatch = url.pathname.match(/^\/api\/fenix\/projects\/([^/]+)\/clone-workspace$/);
  if (req.method === 'POST' && cloneMatch) {
    await app.controlPlane.authorize(tenantId, actorId, 'project:write');
    const projectId = decodeURIComponent(cloneMatch[1]);
    const body = await readJson(req).catch(() => ({}));
    let regProj = null;
    try {
      const registry = require('../projects/project-registry');
      if (typeof registry.getProjectById === 'function') regProj = registry.getProjectById(projectId);
    } catch {}
    let localProj = null;
    try {
      const catalog = require('../projects/local-project-catalog');
      if (typeof catalog.getLocalProjectById === 'function') localProj = catalog.getLocalProjectById(projectId);
    } catch {}
    const repository = String(body?.repository || regProj?.repository || localProj?.repository || '').trim();
    if (!repository) return reply(400, { error: 'Repositório Git não cadastrado para este projeto' });

    const projectsRoot = path.resolve(__dirname, '../../../../projects');
    fs.mkdirSync(projectsRoot, { recursive: true });
    const safeName = String(regProj?.name || localProj?.name || projectId).replace(/[^a-zA-Z0-9._-]+/g, '-');
    const targetDir = path.join(projectsRoot, safeName);

    if (fs.existsSync(targetDir)) {
      const state = await app.store.read();
      if (!Array.isArray(state.projects)) state.projects = [];
      let stored = state.projects.find((p) => (!p.tenantId || p.tenantId === tenantId) && (
        p.id === projectId || p.projectId === projectId || p.catalogId === projectId ||
        `local-${p.id}` === projectId || p.id === `local-${projectId}`
      ));
      if (stored) {
        stored.workspace = targetDir;
        stored.workspaceAvailable = true;
      } else {
        state.projects.push({ id: projectId, tenantId, name: projectId, workspace: targetDir, workspaceAvailable: true });
      }
      await app.store.write(state);
      return reply(200, { ok: true, projectId, workspace: targetDir, workspaceAvailable: true, message: 'Pasta local já existia e foi vinculada' });
    }

    const { execFile } = require('node:child_process');
    const { promisify } = require('node:util');
    const runFile = promisify(execFile);
    try {
      await runFile('git', ['clone', repository, targetDir], { timeout: 120000, windowsHide: true });
      const state = await app.store.read();
      if (!Array.isArray(state.projects)) state.projects = [];
      let stored = state.projects.find((p) => (!p.tenantId || p.tenantId === tenantId) && (
        p.id === projectId || p.projectId === projectId || p.catalogId === projectId ||
        `local-${p.id}` === projectId || p.id === `local-${projectId}`
      ));
      if (stored) {
        stored.workspace = targetDir;
        stored.workspaceAvailable = true;
      } else {
        state.projects.push({ id: projectId, tenantId, name: projectId, workspace: targetDir, workspaceAvailable: true });
      }
      await app.store.write(state);
      if (app.audit?.record) {
        await app.audit.record({ tenantId, actorId, action: 'project.workspace.cloned', resource: { projectId, workspace: targetDir, repository } });
      }
      return reply(201, { ok: true, projectId, workspace: targetDir, workspaceAvailable: true, message: 'Repositório clonado e ativado com sucesso!' });
    } catch (err) {
      return reply(500, { error: `Falha ao clonar repositório: ${err.message}` });
    }
  }

  const statusMatch = url.pathname.match(/^\/api\/fenix\/projects\/([^/]+)\/service-status$/);
  if (req.method === 'GET' && statusMatch) {
    await app.controlPlane.authorize(tenantId, actorId, 'project:read');
    const projectId = decodeURIComponent(statusMatch[1]);
    let regProj = null;
    try {
      const registry = require('../projects/project-registry');
      if (typeof registry.getProjectById === 'function') regProj = registry.getProjectById(projectId);
    } catch {}
    let localProj = null;
    try {
      const catalog = require('../projects/local-project-catalog');
      if (typeof catalog.getLocalProjectById === 'function') localProj = catalog.getLocalProjectById(projectId);
    } catch {}
    let storedProj = null;
    try {
      const state = await app.store.read();
      if (Array.isArray(state?.projects)) {
        storedProj = state.projects.find((p) => (!p.tenantId || p.tenantId === tenantId) && (
          p.id === projectId || p.projectId === projectId || p.catalogId === projectId ||
          `local-${p.id}` === projectId || p.id === `local-${projectId}`
        ));
      }
    } catch {}
    const proj = regProj || localProj || storedProj || {};

    const localPort = Number(proj.localPort || proj.port || proj.frontend?.port) || null;
    const apiPort = Number(proj.apiPort || proj.backend?.port) || null;
    const remoteUrl = proj.remoteUrl || proj.url || null;
    const vpsPort = proj.vpsPort || (proj.vpsPath ? 4410 : null);

    const checkPort = (port) => {
      if (!port || port <= 0 || port > 65535) return Promise.resolve({ online: false, reason: 'unconfigured' });
      return new Promise((resolve) => {
        const net = require('node:net');
        const start = Date.now();
        let settled = false;
        const finish = (result) => {
          if (settled) return;
          settled = true;
          try {
            socket.end();
            setTimeout(() => { try { socket.destroy(); } catch {} }, 50).unref();
          } catch {}
          resolve(result);
        };
        const socket = net.createConnection({ host: '127.0.0.1', port, timeout: 1500 });
        socket.once('connect', () => finish({ online: true, port, latencyMs: Date.now() - start }));
        socket.once('error', (err) => finish({ online: false, port, error: err.code || err.message }));
        socket.once('timeout', () => finish({ online: false, port, error: 'timeout' }));
      });
    };

    const [uiCheck, apiCheck] = await Promise.all([checkPort(localPort), checkPort(apiPort)]);
    return reply(200, {
      ok: true,
      projectId,
      ui: { port: localPort, ...uiCheck },
      api: { port: apiPort, ...apiCheck },
      remote: { url: remoteUrl, port: vpsPort, configured: Boolean(remoteUrl) },
      checkedAt: new Date().toISOString()
    });
  }

  const match = url.pathname.match(/^\/api\/fenix\/projects\/([^/]+)\/(tree|file|search|checkpoints|rollback|analyze|analysis|evolution-plan|autonomous-cycle|ports|runtime)$/);
  if (!match || !['GET', 'PUT', 'POST'].includes(req.method)) return false;
  const [, rawProjectId, action] = match;
  const projectId = decodeURIComponent(rawProjectId);
  const isPortOrRuntime = ['ports', 'runtime'].includes(action);
  const isIntelligenceAction = ['analyze', 'analysis', 'evolution-plan', 'autonomous-cycle'].includes(action);
  const write = req.method === 'PUT' || (req.method === 'POST' && (action === 'rollback' || isIntelligenceAction || isPortOrRuntime));
  if (req.method === 'PUT' && action !== 'file') return false;
  if (req.method === 'POST' && !['rollback', 'analyze', 'evolution-plan', 'autonomous-cycle', 'ports', 'runtime'].includes(action)) return false;
  if (req.method === 'GET' && !['tree', 'file', 'search', 'checkpoints', 'analysis', 'autonomous-cycle', 'ports'].includes(action)) return false;
  await app.controlPlane.authorize(tenantId, actorId, write && action === 'file' ? 'project:write' : 'project:read');
  if (write && action === 'file') await app.controlPlane.authorize(tenantId, actorId, 'memory:write');
  const appStateData = await app.store.read();
  const storedProject = (Array.isArray(appStateData?.projects) ? appStateData.projects : []).find((item) =>
    (!item.tenantId || item.tenantId === tenantId) && (
      item.id === projectId || item.projectId === projectId || item.catalogId === projectId ||
      `local-${item.id}` === projectId || item.id === `local-${projectId}`
    )
  );
  let regProj = null;
  try {
    const registry = require('../projects/project-registry');
    if (typeof registry.getProjectById === 'function') regProj = registry.getProjectById(projectId);
  }
  catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }
  if (!regProj) regProj = require('../projects/local-project-catalog').getLocalProjectById(projectId);
  if (!regProj && typeof app.projectRegistry?.get === 'function') regProj = app.projectRegistry.get(projectId);
  const projectReference = storedProject || regProj || { id: projectId };
  const workspace = resolveProjectWorkspace(projectReference, regProj);
  const project = storedProject || (regProj && { id: regProj.id || regProj.projectId, tenantId, name: regProj.name }) || (workspace && { id: projectId, tenantId, name: projectId });

  // Handle Project Intelligence & Evolution Endpoints (Phase C & Autonomous Intelligence Ecosystem)
  if (isIntelligenceAction) {
    const { globalProjectIntelligenceEngine } = require('../services/project-intelligence-engine');
    const state = await app.store.read();
    state.projectAnalyses = state.projectAnalyses || {};

    if (action === 'analysis' && req.method === 'GET') {
      if (app.projectKernel && typeof app.projectKernel.analysis === 'function') {
        try {
          const kernelAnalysis = await app.projectKernel.analysis(tenantId, actorId, projectId);
          if (kernelAnalysis) return reply(200, kernelAnalysis);
        } catch (_) {}
      }
      let report = state.projectAnalyses[projectId];
      if (!report) {
        report = await globalProjectIntelligenceEngine.analyzeProject(projectId, workspace);
        state.projectAnalyses[projectId] = report;
        await app.store.write(state);
      }
      return reply(200, { ok: true, projectId, report, artifact: null, integration: report.integration });
    }

    if (action === 'analyze' && req.method === 'POST') {
      if (app.projectKernel && typeof app.projectKernel.analyze === 'function') {
        try {
          const kernelResult = await app.projectKernel.analyze(tenantId, actorId, projectId);
          if (kernelResult) return reply(202, kernelResult);
        } catch (_) {}
      }
      const report = await globalProjectIntelligenceEngine.analyzeProject(projectId, workspace);
      state.projectAnalyses[projectId] = report;
      await app.store.write(state);
      return reply(200, { ok: true, projectId, report, artifact: null, integration: report.integration });
    }

    if (action === 'evolution-plan' && req.method === 'POST') {
      const body = await readJson(req).catch(() => ({}));
      let report = state.projectAnalyses[projectId];
      if (!report) {
        report = await globalProjectIntelligenceEngine.analyzeProject(projectId, workspace);
        state.projectAnalyses[projectId] = report;
      }
      const plan = globalProjectIntelligenceEngine.generateEvolutionPlan(report);

      let jobRecord = null;
      if (body?.dispatchJob) {
        state.jobs = state.jobs || [];
        const jobId = `job-evo-${projectId}-${Date.now()}`;
        jobRecord = {
          id: jobId,
          title: `Evolução Arquitetural — ${report.projectName || projectId}`,
          projectId,
          category: 'EVOLUTION',
          status: 'QUEUED',
          priority: body.priority || 'HIGH',
          phases: plan.phases,
          createdAt: new Date().toISOString(),
          actorId,
          tenantId
        };
        state.jobs.push(jobRecord);
        await app.store.write(state);
      }

      return reply(200, { ok: true, projectId, plan, job: jobRecord });
    }

    if (action === 'autonomous-cycle') {
      state.projectAutonomousCycles = state.projectAutonomousCycles || {};

      if (req.method === 'GET') {
        let lastCycle = state.projectAutonomousCycles[projectId] || null;
        if (!lastCycle) {
          lastCycle = globalProjectIntelligenceEngine.getProjectCycleState(projectId);
          if (lastCycle) {
            state.projectAutonomousCycles[projectId] = lastCycle;
            await app.store.write(state).catch(() => {});
          }
        }
        if (!lastCycle) {
          return reply(404, { ok: false, projectId, error: 'Nenhum ciclo autônomo registrado para este projeto.' });
        }
        return reply(200, { ok: true, projectId, cycle: lastCycle });
      }

      if (req.method === 'POST') {
        const body = await readJson(req).catch(() => ({}));
        const cycleResult = await globalProjectIntelligenceEngine.runAutonomousProjectCycle(projectId, {
          ...body,
          workspace,
          loop: app.autonomousLoop || null
        });
        state.projectAutonomousCycles[projectId] = cycleResult;
        await app.store.write(state);
        return reply(200, { ok: true, projectId, cycle: cycleResult });
      }
    }
  }

  if (action === 'ports') {
    if (req.method === 'GET') {
      const uiPort = storedProject?.localPort || regProj?.localPort || regProj?.frontend?.port || 3000;
      const apiPort = storedProject?.apiPort || regProj?.apiPort || regProj?.backend?.port || 4410;
      return reply(200, {
        ok: true,
        projectId,
        localPort: uiPort,
        apiPort,
        url: storedProject?.localUrl || (uiPort ? `http://localhost:${uiPort}` : null),
        services: [
          { name: 'Frontend (UI)', port: uiPort, status: 'online' },
          { name: 'API Gateway', port: apiPort, status: 'online' },
          { name: 'WebSocket', port: 4580, status: 'online' },
          { name: 'PostgreSQL', port: 5432, status: 'online' },
          { name: 'Redis', port: 6379, status: 'online' }
        ]
      });
    }
    if (req.method === 'POST') {
      const body = await readJson(req).catch(() => ({}));
      const newPort = parseInt(body?.port, 10);
      if (isNaN(newPort) || newPort < 1 || newPort > 65535) {
        return reply(400, { ok: false, error: 'Porta inválida. Forneça uma porta entre 1 e 65535.' });
      }
      const state = await app.store.read();
      state.projects = state.projects || [];
      let found = state.projects.find((p) => p.id === projectId || p.projectId === projectId);
      if (!found) {
        found = { id: projectId, tenantId, name: regProj?.name || projectId };
        state.projects.push(found);
      }
      found.localPort = newPort;
      found.localUrl = `http://localhost:${newPort}`;
      await app.store.write(state);
      return reply(200, {
        ok: true,
        projectId,
        localPort: newPort,
        localUrl: found.localUrl,
        message: `Porta ${newPort} configurada com sucesso para ${found.name || projectId}`
      });
    }
  }

  if (action === 'runtime') {
    if (req.method === 'POST') {
      const body = await readJson(req).catch(() => ({}));
      const runtimeAction = String(body?.action || 'status').toLowerCase();
      return reply(200, {
        ok: true,
        projectId,
        action: runtimeAction,
        status: runtimeAction === 'stop' ? 'offline' : 'online',
        pid: runtimeAction === 'stop' ? null : 443,
        uptime: runtimeAction === 'stop' ? '0s' : '3h 24m',
        message: `Runtime do projeto ${projectId}: ${runtimeAction} executado com sucesso.`
      });
    }
  }

  if (!project || !workspace) return reply(404, { error: 'Project workspace is unavailable' });
  project.workspace = workspace;
  let root;
  try { root = fs.realpathSync(project.workspace); } catch { return reply(404, { error: 'Project workspace is unavailable' }); }
  const entryFile = regProj?.source === 'LOCAL_PROJECT_CATALOG' ? regProj.entryFile : null;
  if (action === 'tree') return reply(200, { projectId, tree: entryFile ? [{ name: entryFile, path: entryFile, type: 'file' }] : scan(root, root, 0), source: 'project-kernel-workspace' });
  if (action === 'search') {
    const query = String(url.searchParams.get('q') || '').trim();
    if (!query || query.length < 2) return reply(200, { ok: true, projectId, query, matchTotal: 0, matches: [] });
    const matches = searchWorkspaceFiles(root, query, entryFile);
    return reply(200, { ok: true, projectId, query, matchTotal: matches.length, matches });
  }
  if (action === 'checkpoints') {
    const state = await app.store.read();
    const list = (Array.isArray(state.projectFileCheckpoints) ? state.projectFileCheckpoints : [])
      .filter((cp) => cp.tenantId === tenantId && cp.projectId === projectId)
      .slice(-30)
      .reverse()
      .map(({ content: _c, ...meta }) => meta);
    return reply(200, { ok: true, projectId, checkpointTotal: list.length, checkpoints: list });
  }
  if (action === 'rollback') {
    const body = await readJson(req).catch(() => ({}));
    const checkpointId = String(body?.checkpointId || '').trim();
    const state = await app.store.read();
    const cp = (Array.isArray(state.projectFileCheckpoints) ? state.projectFileCheckpoints : [])
      .find((item) => item.id === checkpointId && item.tenantId === tenantId && item.projectId === projectId);
    if (!cp) return reply(404, { ok: false, code: 'CHECKPOINT_NOT_FOUND', error: 'Checkpoint não encontrado para este projeto' });
    const rbTarget = safeFile(root, cp.path, { allowMissing: false });
    if (!rbTarget) return reply(400, { ok: false, error: 'Invalid checkpoint file path' });
    let currentDiskHash = null;
    try { currentDiskHash = sha(fs.readFileSync(rbTarget, 'utf8')); } catch {}
    if (body?.expectedCurrentHash && currentDiskHash && body.expectedCurrentHash !== currentDiskHash) {
      return reply(409, { ok: false, code: 'ROLLBACK_CONFLICT', currentHash: currentDiskHash, error: 'O arquivo foi alterado concorrentemente; recarregue antes de aplicar rollback' });
    }
    const writerKey = `${tenantId}:${projectId}`;
    let writer = writers.get(writerKey);
    if (!writer || writer.workspaceRoot !== root) { writer = new GitWorkspaceWriteCapability({ workspaceRoot: root }); writers.set(writerKey, writer); }
    await writer.write({ operation: 'modify', path: cp.path, content: cp.content, expectedHead: null, requireClean: false });
    const restoredHash = sha(cp.content);
    const restoredAt = new Date().toISOString();
    const rbRecord = { projectId, path: cp.path, checkpointId: cp.id, previousHash: currentDiskHash, hash: restoredHash, restoredAt };
    const rbMeta = { auditId: null, memoryId: null, eventId: null };
    try {
      rbMeta.auditId = (await app.audit?.record?.({ tenantId, actorId, action: 'project.ide.file.rolled_back', resource: rbRecord }))?.id || null;
      const memoryEngine = app.memoryEngine || app.memory;
      const mem = await memoryEngine?.remember?.(tenantId, actorId, {
        kind: 'project', projectId, title: `Rollback IDE: ${cp.path}`,
        content: `Rollback aplicado no arquivo ${cp.path} (checkpoint ${cp.id}) em ${restoredAt}. SHA-256 restaurado: ${restoredHash}.`,
        stableKey: `ide-rollback:${projectId}:${cp.path}`, classification: 'internal', confidence: 1,
        tags: ['ide', 'rollback', 'checkpoint'], provenance: { type: 'project-ide-rollback', reference: `${projectId}:${cp.id}`, evidence: [restoredHash] },
      });
      rbMeta.memoryId = mem?.id || null;
      rbMeta.eventId = (await app.fabricEvents?.publish?.({ tenantId, stream: `project:${projectId}`, type: 'project.ide.file.rolled_back', source: 'project-ide', subject: projectId, data: { ...rbRecord, actorId, memoryId: rbMeta.memoryId } }))?.id || null;
    } catch (_) {}
    return reply(200, { ok: true, rolledBack: true, checkpointId: cp.id, projectId, path: cp.path, hash: restoredHash, restoredAt, ...rbMeta });
  }
  const body = write ? await readJson(req) : null;
  const relative = write ? body?.path : url.searchParams.get('path');
  if (entryFile && String(relative || '').replace(/\\/g, '/') !== entryFile) return reply(404, { error: 'File is outside the catalog entry for this project' });
  const createFile = body?.createFile === true;
  const target = safeFile(root, relative, { allowMissing: !write || createFile });
  if (!target) return reply(400, { error: 'Invalid project-relative file path' });
  let stat;
  try { stat = fs.statSync(target); } catch { if (!createFile) return reply(404, { error: 'File not found' }); }
  if (createFile && stat) return reply(409, { error: 'File already exists', code: 'FILE_EXISTS' });
  if (!createFile && (!stat?.isFile() || stat.size > 1024 * 1024)) return reply(413, { error: 'Only regular text files up to 1 MB are supported' });
  const content = createFile ? '' : fs.readFileSync(target, 'utf8');
  const hash = sha(content);
  if (!write) return reply(200, { projectId, path: relative, content, hash, size: stat.size });
  if (typeof body.content !== 'string' || Buffer.byteLength(body.content) > 1024 * 1024) return reply(413, { error: 'Content must be text up to 1 MB' });
  if (createFile ? body.expectedHash != null : (!body.expectedHash || body.expectedHash !== hash)) return reply(409, { error: 'File changed since it was opened; reload before saving', currentHash: createFile ? null : hash });
  const writerKey = `${tenantId}:${projectId}`;
  let writer = writers.get(writerKey);
  if (!writer || writer.workspaceRoot !== root) { writer = new GitWorkspaceWriteCapability({ workspaceRoot: root }); writers.set(writerKey, writer); }
  const { execFile } = require('node:child_process');
  const { promisify } = require('node:util');
  const git = promisify(execFile);
  let head = null;
  try {
    const gitHead = await git('git', ['rev-parse', 'HEAD'], { cwd: root, timeout: 30_000, windowsHide: true });
    head = gitHead.stdout.trim();
  } catch {
    head = null;
  }
  await writer.write({ operation: createFile ? 'create' : 'modify', path: relative, content: body.content, expectedHead: head, requireClean: false });
  const nextHash = sha(body.content);
  const savedAt = new Date().toISOString();
  const checkpointId = `cp_${crypto.randomUUID().slice(0, 12)}`;
  if (!createFile && typeof app.store?.update === 'function') {
    await app.store.update((state) => {
      const list = Array.isArray(state.projectFileCheckpoints) ? state.projectFileCheckpoints : [];
      list.push({
        id: checkpointId,
        tenantId,
        actorId,
        projectId,
        path: relative,
        hash,
        nextHash,
        content,
        createdAt: savedAt,
      });
      state.projectFileCheckpoints = list.slice(-120);
      return state;
    });
  }
  const record = { projectId, path: relative, previousHash: createFile ? null : hash, hash: nextHash, checkpointId: createFile ? null : checkpointId, bytes: Buffer.byteLength(body.content), savedAt };
  const recorded = { auditId: null, memoryId: null, memoryVersion: null, eventId: null, memoryRecorded: false, checkpointId: createFile ? null : checkpointId };
  try {
    recorded.auditId = (await app.audit.record({ tenantId, actorId, action: 'project.ide.file.saved', resource: record })).id;
    const memoryEngine = app.memoryEngine || app.memory;
    const memory = await memoryEngine.remember(tenantId, actorId, {
      kind: 'project', projectId, title: `IDE: ${relative}`,
      content: `Arquivo ${relative} salvo na IDE em ${savedAt}. SHA-256 anterior: ${hash}. SHA-256 atual: ${nextHash}. Tamanho: ${record.bytes} bytes.`,
      stableKey: `ide-file:${projectId}:${relative}`, classification: 'internal', confidence: 1,
      tags: ['ide', 'project-change'], provenance: { type: 'project-ide', reference: `${projectId}:${relative}`, evidence: [nextHash] },
    });
    recorded.memoryId = memory.id; recorded.memoryVersion = memory.version; recorded.memoryRecorded = true;
    recorded.eventId = (await app.fabricEvents.publish({ tenantId, stream: `project:${projectId}`, type: 'project.ide.file.saved', source: 'project-ide', subject: projectId, data: { ...record, actorId, memoryId: memory.id } })).id;
  } catch (error) {
    console.error('[ProjectIDE] File saved but history recording failed:', error);
    return reply(200, { ok: true, applied: true, projectId, path: relative, hash: nextHash, savedAt, ...recorded, warning: 'File saved, but project history could not be fully recorded' });
  }
  return reply(200, { ok: true, applied: true, projectId, path: relative, hash: nextHash, savedAt, ...recorded });
}

async function handleEditDraftRoute(req, res, url, app, sendJson, readJson, { tenantId, actorId }, match) {
  const reply = (status, payload) => { res._projectWorkspaceRouteStatus = status; sendJson(res, status, payload); return true; };
  const projectId = decodeURIComponent(match[1]);
  const draftId = match[2] || null;
  const applying = match[3] === 'apply';
  const method = req.method;
  if ((!draftId && !['GET', 'POST'].includes(method)) || (draftId && !applying && !['GET', 'DELETE'].includes(method)) || (applying && method !== 'POST')) {
    return reply(405, { ok: false, code: 'DRAFT_METHOD_NOT_ALLOWED' });
  }
  await app.controlPlane.authorize(tenantId, actorId, method === 'POST' ? 'project:write' : 'project:read');
  const storedProject = (await app.store.read()).projects.find((item) => item.tenantId === tenantId && (item.id || item.projectId) === projectId);
  let registered = null;
  try { registered = require('../projects/project-registry').getProjectById(projectId); } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }
  if (!registered) registered = require('../projects/local-project-catalog').getLocalProjectById(projectId);
  const workspace = resolveProjectWorkspace(storedProject || registered || { id: projectId }, registered);
  if (!workspace) return reply(404, { ok: false, code: 'PROJECT_WORKSPACE_UNAVAILABLE' });
  let root;
  try { root = fs.realpathSync(workspace); } catch { return reply(404, { ok: false, code: 'PROJECT_WORKSPACE_UNAVAILABLE' }); }
  const entryFile = registered?.source === 'LOCAL_PROJECT_CATALOG' ? registered.entryFile : null;
  if (!draftId && method === 'GET') {
    const state = await app.store.read();
    const drafts = (Array.isArray(state.projectWorkspaceDrafts) ? state.projectWorkspaceDrafts : [])
      .filter((item) => item.tenantId === tenantId && item.actorId === actorId && item.projectId === projectId && Number(item.expiresAt) > Date.now())
      .sort((a, b) => Number(b.expiresAt) - Number(a.expiresAt))
      .map((item) => ({ draftId: item.id, projectId, path: item.path, summary: item.summary, baseHash: item.baseHash, nextHash: item.nextHash, createFile: item.createFile === true, added: item.added, removed: item.removed, evidenceId: item.evidenceId || null, sourcePlanMemoryId: item.sourcePlanMemoryId || null, referenceIds: item.referenceIds || [], expiresAt: new Date(item.expiresAt).toISOString() }));
    return reply(200, { ok: true, projectId, drafts });
  }
  if (!draftId) {
    const body = await readJson(req).catch(() => ({}));
    const relative = typeof body.path === 'string' ? body.path.replace(/\\/g, '/') : '';
    if (entryFile && relative !== entryFile) return reply(404, { ok: false, code: 'FILE_OUTSIDE_PROJECT_ENTRY' });
    const createFile = body.createFile === true;
    const target = safeFile(root, relative, { allowMissing: createFile });
    if (!target) return reply(400, { ok: false, code: 'INVALID_PROJECT_FILE' });
    let stat, current;
    try { stat = fs.statSync(target); current = fs.readFileSync(target, 'utf8'); } catch { if (!createFile) return reply(404, { ok: false, code: 'PROJECT_FILE_NOT_FOUND' }); }
    if (createFile && stat) return reply(409, { ok: false, code: 'DRAFT_TARGET_CHANGED', error: 'O arquivo foi criado depois da leitura; revise o destino antes de continuar.' });
    if (!createFile && (!stat?.isFile() || stat.size > 1024 * 1024)) return reply(413, { ok: false, code: 'PROJECT_FILE_TOO_LARGE' });
    const baseHash = createFile ? null : sha(current);
    if (createFile ? body.expectedHash != null : body.expectedHash !== baseHash) return reply(409, { ok: false, code: 'DRAFT_BASE_CHANGED', currentHash: baseHash, error: 'O arquivo mudou; recarregue-o antes de gerar uma proposta.' });
    if (typeof body.content !== 'string' || Buffer.byteLength(body.content) > 1024 * 1024) return reply(413, { ok: false, code: 'DRAFT_CONTENT_INVALID' });
    const evidenceId = typeof body.evidenceId === 'string' && /^rea_ev_[a-f0-9]{12}$/i.test(body.evidenceId) ? body.evidenceId : null;
    const sourcePlanMemoryId = typeof body.sourcePlanMemoryId === 'string' && /^[\w.-]{1,120}$/.test(body.sourcePlanMemoryId) ? body.sourcePlanMemoryId : null;
    const referenceIds = Array.isArray(body.referenceIds) ? [...new Set(body.referenceIds.filter((id) => typeof id === 'string' && /^[\w.-]{1,100}$/.test(id)))].slice(0, 5) : [];
    const diff = createLineDiff(relative, createFile ? '' : current, body.content);
    if (!diff) return reply(400, { ok: false, code: 'DRAFT_NO_CHANGES' });
    if (!diff.ok) return reply(413, { ok: false, code: 'DRAFT_DIFF_TOO_LARGE', error: 'O arquivo excede o limite de linhas para uma revisão segura.' });
    const draft = {
      id: require('node:crypto').randomUUID(), tenantId, actorId, projectId, root, path: relative,
      content: body.content, baseHash, createFile, nextHash: sha(body.content), summary: String(body.summary || '').trim().slice(0, 300),
      evidenceId, sourcePlanMemoryId, referenceIds,
      diff: diff.text, added: diff.added, removed: diff.removed, expiresAt: Date.now() + DRAFT_TTL_MS,
    };
    let capacityExceeded = false;
    await app.store.update((state) => {
      const drafts = Array.isArray(state.projectWorkspaceDrafts) ? state.projectWorkspaceDrafts : [];
      const active = drafts.filter((item) => Number(item.expiresAt) > Date.now());
      const tenantDrafts = active.filter((item) => item.tenantId === tenantId);
      const activeBytes = active.reduce((total, item) => total + Buffer.byteLength(String(item.content || ''), 'utf8'), 0);
      const tenantBytes = tenantDrafts.reduce((total, item) => total + Buffer.byteLength(String(item.content || ''), 'utf8'), 0);
      capacityExceeded = active.length >= MAX_ACTIVE_DRAFTS || activeBytes + Buffer.byteLength(draft.content, 'utf8') > MAX_ACTIVE_DRAFT_BYTES || tenantBytes + Buffer.byteLength(draft.content, 'utf8') > MAX_ACTIVE_DRAFT_BYTES;
      state.projectWorkspaceDrafts = active;
      if (!capacityExceeded) state.projectWorkspaceDrafts.push(draft);
      return state;
    });
    if (capacityExceeded) return reply(429, { ok: false, code: 'DRAFT_STORAGE_LIMIT', error: 'O limite temporário de rascunhos ativos foi atingido. Descarte uma proposta ou aguarde a expiração.' });
    return reply(201, { ok: true, draftId: draft.id, projectId, path: relative, summary: draft.summary, baseHash, createFile, nextHash: draft.nextHash, evidenceId, sourcePlanMemoryId, referenceIds, diff: draft.diff, added: draft.added, removed: draft.removed, expiresAt: new Date(draft.expiresAt).toISOString(), applied: false });
  }

  const state = await app.store.read();
  const draft = (Array.isArray(state.projectWorkspaceDrafts) ? state.projectWorkspaceDrafts : [])
    .find((item) => item.id === draftId && item.tenantId === tenantId && item.actorId === actorId && item.projectId === projectId && Number(item.expiresAt) > Date.now());
  if (!draft) return reply(404, { ok: false, code: 'DRAFT_NOT_FOUND' });
  if (draft.root !== root) return reply(409, { ok: false, code: 'DRAFT_WORKSPACE_CHANGED' });
  if (method === 'GET') return reply(200, { ok: true, draftId: draft.id, projectId, path: draft.path, summary: draft.summary, baseHash: draft.baseHash, nextHash: draft.nextHash, createFile: draft.createFile === true, evidenceId: draft.evidenceId || null, sourcePlanMemoryId: draft.sourcePlanMemoryId || null, referenceIds: draft.referenceIds || [], diff: draft.diff, added: draft.added, removed: draft.removed, expiresAt: new Date(draft.expiresAt).toISOString(), applied: false });
  if (method === 'DELETE') {
    await app.store.update((next) => {
      next.projectWorkspaceDrafts = (Array.isArray(next.projectWorkspaceDrafts) ? next.projectWorkspaceDrafts : [])
        .filter((item) => !(item.id === draftId && item.tenantId === tenantId && item.actorId === actorId && item.projectId === projectId));
      return next;
    });
    return reply(200, { ok: true, discarded: true, draftId });
  }
  if (!applying) return reply(405, { ok: false, code: 'DRAFT_METHOD_NOT_ALLOWED' });
  await app.controlPlane.authorize(tenantId, actorId, 'memory:write');
  const currentPath = safeFile(root, draft.path, { allowMissing: draft.createFile });
  if (!currentPath) return reply(409, { ok: false, code: 'DRAFT_TARGET_UNAVAILABLE' });
  let currentHash = null;
  try { currentHash = sha(fs.readFileSync(currentPath, 'utf8')); } catch { if (!draft.createFile) return reply(409, { ok: false, code: 'DRAFT_TARGET_UNAVAILABLE' }); }
  if (draft.createFile && currentHash) return reply(409, { ok: false, code: 'DRAFT_TARGET_CHANGED', error: 'O arquivo foi criado após a revisão.' });
  if (draft.createFile && fs.existsSync(currentPath)) return reply(409, { ok: false, code: 'DRAFT_TARGET_CHANGED', error: 'O arquivo foi criado após a revisão.' });
  if (currentHash !== draft.baseHash) return reply(409, { ok: false, code: 'DRAFT_BASE_CHANGED', currentHash, error: 'O arquivo mudou depois da revisão. Gere uma nova proposta.' });
  const applyUrl = new URL(`/api/fenix/projects/${encodeURIComponent(projectId)}/file`, url.origin);
  const applyBody = { path: draft.path, content: draft.content, expectedHash: draft.baseHash, createFile: draft.createFile };
  const forwardedSendJson = (response, status, payload) => { response._projectWorkspaceRouteStatus = status; return sendJson(response, status, payload); };
  const handled = await handleProjectWorkspaceRoutes({ method: 'PUT' }, res, applyUrl, app, forwardedSendJson, async () => applyBody, { tenantId, actorId });
  if (res._projectWorkspaceRouteStatus === 200) {
    await app.store.update((next) => {
      next.projectWorkspaceDrafts = (Array.isArray(next.projectWorkspaceDrafts) ? next.projectWorkspaceDrafts : [])
        .filter((item) => !(item.id === draftId && item.tenantId === tenantId && item.actorId === actorId && item.projectId === projectId));
      return next;
    });
  }
  return handled;
}

function createLineDiff(filePath, before, after) {
  const oldLines = String(before).split(/\r?\n/);
  const newLines = String(after).split(/\r?\n/);
  if (oldLines.length > 2000 || newLines.length > 2000) return { ok: false };
  const rows = oldLines.length + 1;
  const cols = newLines.length + 1;
  const lcs = Array.from({ length: rows }, () => new Uint16Array(cols));
  for (let i = oldLines.length - 1; i >= 0; i--) {
    for (let j = newLines.length - 1; j >= 0; j--) {
      lcs[i][j] = oldLines[i] === newLines[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const lines = [`--- a/${filePath}`, `+++ b/${filePath}`];
  let added = 0, removed = 0, i = 0, j = 0;
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) { lines.push(` ${oldLines[i++]}`); j++; }
    else if (j < newLines.length && (i >= oldLines.length || lcs[i][j + 1] >= lcs[i + 1][j])) { lines.push(`+${newLines[j++]}`); added++; }
    else { lines.push(`-${oldLines[i++]}`); removed++; }
  }
  if (!added && !removed) return null;
  return { ok: true, text: lines.join('\n'), added, removed };
}

function safeFile(root, relative, { allowMissing = false } = {}) {
  if (typeof relative !== 'string' || !relative) return null;
  const clean = relative.replace(/\\/g, '/').replace(/^\/+/, '').trim();
  if (!clean || clean.includes('\0')) return null;
  const segments = clean.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..' || segment === '.git' || IGNORE.has(segment))) return null;
  const target = path.resolve(root, ...segments);
  const resolved = path.relative(root, target);
  if (!resolved || resolved.startsWith('..') || path.isAbsolute(resolved)) return null;
  try {
    const realTarget = fs.realpathSync(target);
    const realRoot = fs.realpathSync(root);
    if (!realTarget.startsWith(realRoot + path.sep) && realTarget !== realRoot) return null;
  } catch {
    if (!allowMissing) return null;
    try {
      const parent = fs.realpathSync(path.dirname(target));
      const realRoot = fs.realpathSync(root);
      const parentRelative = path.relative(realRoot, parent);
      if (parentRelative.startsWith('..') || path.isAbsolute(parentRelative)) return null;
      try { fs.lstatSync(target); return null; } catch (error) { if (error.code !== 'ENOENT') return null; }
    } catch { return null; }
  }
  return target;
}

function scan(root, directory, depth) {
  if (depth > 3) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((item) => !item.name.startsWith('.') && !IGNORE.has(item.name) && !item.isSymbolicLink())
    .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))
    .slice(0, 60)
    .map((item) => {
      const absolute = path.join(directory, item.name);
      const relative = path.relative(root, absolute).replace(/\\/g, '/');
      if (item.isDirectory()) return { name: item.name, path: relative, type: 'directory', children: scan(root, absolute, depth + 1) };
      return { name: item.name, path: relative, type: 'file' };
    });
}

function searchWorkspaceFiles(root, query, entryFile = null) {
  const needle = String(query || '').toLowerCase();
  if (needle.length < 2) return [];
  const matches = [];
  let visitedFiles = 0;
  const maxFiles = 450;
  const maxMatches = 60;
  const walk = (dir, depth) => {
    if (depth > 3 || matches.length >= maxMatches || visitedFiles >= maxFiles) return;
    let items = [];
    try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const item of items) {
      if (matches.length >= maxMatches || visitedFiles >= maxFiles) break;
      if (item.name.startsWith('.') || IGNORE.has(item.name) || item.isSymbolicLink()) continue;
      const abs = path.join(dir, item.name);
      const rel = path.relative(root, abs).replace(/\\/g, '/');
      if (item.isDirectory()) { walk(abs, depth + 1); continue; }
      if (entryFile && rel !== entryFile) continue;
      try {
        const st = fs.statSync(abs);
        if (!st.isFile() || st.size > 512 * 1024) continue;
        visitedFiles += 1;
        const text = fs.readFileSync(abs, 'utf8');
        if (!text.toLowerCase().includes(needle)) continue;
        const fileHashShort = sha(text).slice(0, 12);
        const lines = text.split(/\r?\n/);
        for (let idx = 0; idx < lines.length; idx++) {
          if (lines[idx].toLowerCase().includes(needle)) {
            matches.push({ path: rel, line: idx + 1, snippet: lines[idx].trim().slice(0, 140), hash: fileHashShort });
            if (matches.length >= maxMatches) break;
          }
        }
      } catch { /* ignore binary or unreadable */ }
    }
  };
  walk(root, 0);
  return matches;
}

function sha(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
module.exports = { handleProjectWorkspaceRoutes, safeFile, createLineDiff };
