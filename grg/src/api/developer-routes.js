function handleDeveloperRoutes(req, res, url, app, sendJson, sendError) {
  if (!url.pathname.startsWith('/api/dev/')) return false;

  const { fileSystemService, executionEngine, eventBus } = app;
  if (!fileSystemService || !executionEngine) {
    sendError(res, 503, 'Developer features are not initialized');
    return true;
  }

  // Parse path from query
  const targetPath = url.searchParams.get('path') || '';

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
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        await fileSystemService.writeFile(targetPath, payload.content || '');
        if (eventBus) eventBus.emit('dev:fileSaved', { path: targetPath });
        sendJson(res, 200, { success: true });
      } catch (err) {
        sendError(res, 400, err.message);
      }
    });
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

  return false;
}

module.exports = { handleDeveloperRoutes };
