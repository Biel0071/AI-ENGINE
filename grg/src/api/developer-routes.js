async function handleDeveloperRoutes(req, res, url, app, sendJson, sendError, context = {}) {
  if (!url.pathname.startsWith('/api/dev/')) return false;

  const { fileSystemService, executionEngine, eventBus } = app;
  if (!fileSystemService || !executionEngine) {
    sendError(res, 503, 'Developer features are not initialized');
    return true;
  }

  // Parse path from query
  const targetPath = url.searchParams.get('path') || '';
  const tenantId = context.tenantId || 'grg';
  const actorId = context.actorId || 'grg-admin';

  // The IDE's long-task entry point is still a developer route, but mission
  // execution must go through the canonical MissionKernel. Keep this adapter
  // for the existing frontend contract instead of maintaining a second
  // pipeline implementation.
  if (req.method === 'POST' && url.pathname === '/api/dev/pipeline') {
    if (app.controlPlane) await app.controlPlane.authorize(tenantId, actorId, 'runtime:execute');
    try {
      const payload = JSON.parse(await readBody(req) || '{}');
      const objective = String(payload.prompt || '').trim();
      if (!objective) throw new Error('prompt is required');
      const mission = await app.missions.create(tenantId, actorId, {
        projectId: payload.projectId || null,
        title: objective.slice(0, 200),
        objective,
        source: 'fenix-ide-dev-pipeline',
        steps: [
          { key: 'discover', type: 'discover', payload: {} },
          { key: 'analyze', type: 'analyze', payload: {}, dependsOn: ['discover'] },
          { key: 'generate', type: 'generate', payload: { prompt: objective, name: objective.slice(0, 80) }, dependsOn: ['analyze'] },
          { key: 'activate', type: 'activate', payload: { trigger: 'dev-pipeline' }, dependsOn: ['generate'] },
        ],
      });
      setImmediate(() => app.missions.start(tenantId, actorId, mission.id).catch(() => {}));
      sendJson(res, 202, { mission: { missionId: mission.id, status: 'QUEUED' } });
    } catch (err) { sendError(res, 400, err.message); }
    return true;
  }

  // Tarefa pequena: uma única execução no JobEngine, sem criar missão/DAG.
  if (req.method === 'POST' && url.pathname === '/api/dev/small-task') {
    if (app.controlPlane) await app.controlPlane.authorize(tenantId, actorId, 'runtime:execute');
    try {
      const payload = JSON.parse(await readBody(req) || '{}');
      const prompt = String(payload.prompt || '').trim();
      if (!prompt) throw new Error('prompt is required');
      const job = await app.jobs.submit(tenantId, actorId, {
        type: 'development.execute', source: 'web', prompt,
        projectId: payload.projectId || null,
        workspace: payload.projectPath || app.workspaceRoot || process.cwd(),
        maxAttempts: 2, riskLevel: 'MEDIUM',
        context: payload.context || {},
        payload: { prompt, projectPath: payload.projectPath || app.workspaceRoot || process.cwd(), context: payload.context || {} },
      });
      sendJson(res, 202, { jobId: job.id, status: job.status, missionId: null, jobCount: 1 });
    } catch (err) { sendError(res, 400, err.message); }
    return true;
  }

  // POST /api/dev/projects/clone (clone + couple into FENIX ecosystem)
  if (req.method === 'POST' && url.pathname === '/api/dev/projects/clone') {
    if (app.controlPlane) await app.controlPlane.authorize(tenantId, actorId, 'project:write');
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const cloned = await fileSystemService.cloneRepository({
          url: payload.url,
          directory: payload.directory,
          branch: payload.branch,
        });
        const scan = payload.scan === false || !app.oneDeploy
          ? null
          : await app.oneDeploy.scanProject(tenantId, actorId, cloned.path);
        if (eventBus) await eventBus.emit('dev:projectCloned', { path: cloned.relativePath, url: cloned.url, coupled: Boolean(scan?.coupling) });
        sendJson(res, 201, { cloned, scan });
      } catch (err) {
        sendError(res, 400, err.message);
      }
    });
    return true;
  }

  // GET /api/dev/fs (list directory)
  if (req.method === 'GET' && url.pathname === '/api/dev/fs') {
    fileSystemService.listDirectory(targetPath)
      .then(items => sendJson(res, 200, { items }))
      .catch(err => sendError(res, 403, err.message));
    return true;
  }

  // GET /api/dev/fs/file (read file)
  if (req.method === 'GET' && url.pathname === '/api/dev/fs/file') {
    fileSystemService.readFile(targetPath)
      .then(content => sendJson(res, 200, { content }))
      .catch(err => sendError(res, 404, err.message));
    return true;
  }

  // POST /api/dev/fs/file (write file)
  if (req.method === 'POST' && url.pathname === '/api/dev/fs/file') {
    readBody(req).then(async (body) => {
      try {
        const payload = JSON.parse(body);
        await fileSystemService.writeFile(targetPath, payload.content || '');
        if (eventBus) await eventBus.emit('dev:fileSaved', { path: targetPath });
        sendJson(res, 200, { success: true });
      } catch (err) {
        sendError(res, 400, err.message);
      }
    }).catch((err) => sendError(res, 400, err.message));
    return true;
  }

  // POST /api/dev/fs/move (rename/move file or directory inside workspace)
  if (req.method === 'POST' && url.pathname === '/api/dev/fs/move') {
    if (app.controlPlane) await app.controlPlane.authorize(tenantId, actorId, 'project:write');
    readBody(req).then(async (body) => {
      try {
        const payload = JSON.parse(body || '{}');
        const from = String(payload.from || '').trim();
        const to = String(payload.to || '').trim();
        if (!from || !to) throw new Error('from and to are required');
        await fileSystemService.move(from, to);
        if (eventBus) await eventBus.emit('dev:pathMoved', { from, to });
        sendJson(res, 200, { success: true, from, to });
      } catch (err) {
        sendError(res, 400, err.message);
      }
    }).catch((err) => sendError(res, 400, err.message));
    return true;
  }

  if (req.method === 'POST' && (url.pathname === '/api/dev/fs/mkdir' || url.pathname === '/api/dev/fs/delete')) {
    if (app.controlPlane) await app.controlPlane.authorize(tenantId, actorId, 'project:write');
    readBody(req).then(async (body) => {
      try {
        const payload = JSON.parse(body || '{}');
        const target = String(payload.path || '').trim();
        if (!target) throw new Error('path is required');
        if (url.pathname.endsWith('/mkdir')) await fileSystemService.mkdir(target);
        else await fileSystemService.delete(target);
        if (eventBus) await eventBus.emit(url.pathname.endsWith('/mkdir') ? 'dev:folderCreated' : 'dev:pathDeleted', { path: target });
        sendJson(res, 200, { success: true, path: target });
      } catch (err) { sendError(res, 400, err.message); }
    }).catch((err) => sendError(res, 400, err.message));
    return true;
  }

  // POST /api/dev/ai/transform-file (AI proposes a full replacement for the open file)
  if (req.method === 'POST' && url.pathname === '/api/dev/ai/transform-file') {
    if (app.controlPlane) await app.controlPlane.authorize(tenantId, actorId, 'project:write');
    const ai = app.aiRouter || app.aiGateway;
    if (!ai || typeof ai.invoke !== 'function') {
      sendError(res, 503, 'AI editor is not initialized');
      return true;
    }
    readBody(req).then(async (body) => {
      try {
        const payload = JSON.parse(body || '{}');
        const filePath = String(payload.path || targetPath || '').trim();
        const instruction = String(payload.instruction || '').trim();
        if (!filePath) throw new Error('path is required');
        if (!instruction) throw new Error('instruction is required');
        const stat = await fileSystemService.stat(filePath);
        if (!stat.isFile()) throw new Error('path must point to a file');
        if (stat.size > 180_000) throw new Error('file is too large for AI transform');
        const current = await fileSystemService.readFile(filePath);
        const prompt = buildAiEditPrompt(filePath, current, instruction);
        const out = await ai.invoke(tenantId, actorId, { taskType: 'generate', prompt, temperature: 0.2 });
        const parsed = parseAiEditResponse(out.text);
        if (!parsed.content || typeof parsed.content !== 'string') throw new Error('AI response did not include replacement content');
        if (parsed.content.length > 260_000) throw new Error('AI response is too large');
        if (eventBus) await eventBus.emit('dev:aiFileTransformed', { path: filePath, provider: out.provider, model: out.model });
        sendJson(res, 200, {
          path: filePath,
          content: parsed.content,
          summary: parsed.summary || 'Alteracao proposta pela IA.',
          provider: out.provider,
          model: out.model,
        });
      } catch (err) {
        sendError(res, 400, err.message);
      }
    }).catch((err) => sendError(res, 400, err.message));
    return true;
  }

  // POST /api/dev/terminal (execute command)
  if (req.method === 'POST' && url.pathname === '/api/dev/terminal') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { command, sessionId } = payload;
        if (!command || !sessionId) throw new Error('command and sessionId are required');
        
        // Execute command asynchronously, not blocking HTTP
        executionEngine.execute(sessionId, command).catch(e => console.error(e));
        
        sendJson(res, 202, { status: 'ACCEPTED', sessionId });
      } catch (err) {
        sendError(res, 400, err.message);
      }
    });
    return true;
  }

  const terminalSession = url.pathname.match(/^\/api\/dev\/terminal\/([^/]+)$/);
  if (req.method === 'GET' && terminalSession) {
    const session = executionEngine.getSession(decodeURIComponent(terminalSession[1]));
    if (!session) {
      sendError(res, 404, 'terminal session not found');
      return true;
    }
    sendJson(res, 200, session);
    return true;
  }

  return false;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 600_000) reject(new Error('request body too large'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function buildAiEditPrompt(filePath, content, instruction) {
  return [
    'Voce e o editor de codigo do FENIX IDE.',
    'Receba um arquivo e uma instrucao. Retorne somente JSON valido, sem markdown.',
    'Formato obrigatorio: {"summary":"resumo curto","content":"conteudo completo atualizado do arquivo"}.',
    'Preserve a linguagem, imports, estilo do arquivo e nao remova funcionalidade existente sem pedido explicito.',
    `Arquivo: ${filePath}`,
    `Instrucao: ${instruction}`,
    'Conteudo atual:',
    '```',
    content,
    '```',
  ].join('\n');
}

function parseAiEditResponse(text) {
  const raw = String(text || '').trim();
  const jsonBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = jsonBlock || raw;
  try {
    const parsed = JSON.parse(candidate);
    return {
      summary: String(parsed.summary || '').slice(0, 600),
      content: String(parsed.content || ''),
    };
  } catch {
    const code = raw.match(/```[a-z0-9-]*\s*([\s\S]*?)```/i)?.[1];
    if (code) return { summary: 'A IA retornou codigo em bloco; revise antes de salvar.', content: code.trimEnd() };
    return { summary: 'A IA retornou texto livre; revise antes de salvar.', content: raw };
  }
}

module.exports = { handleDeveloperRoutes, buildAiEditPrompt, parseAiEditResponse };
