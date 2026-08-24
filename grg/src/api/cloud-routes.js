const crypto = require('node:crypto');

async function handleCloudRoutes(req, res, url, app, sendJson, sendError, context = {}) {
  // DEV CLOUD MULTI-CLIENT API
  if (!url.pathname.startsWith('/api/dev/projects') && !url.pathname.startsWith('/api/dev/tasks') && !url.pathname.startsWith('/api/dev/jobs')) {
    return false;
  }

  const { projectRegistry, jobQueue } = app; // Assuming these are attached to app
  const method = req.method;

  // --- PROJECTS ---
  if (method === 'GET' && url.pathname === '/api/dev/projects') {
    sendJson(res, 200, { projects: projectRegistry ? projectRegistry.list() : [] });
    return true;
  }

  if (method === 'POST' && url.pathname === '/api/dev/projects') {
    const body = await readBody(req);
    const project = projectRegistry.register(body);
    sendJson(res, 201, { project });
    return true;
  }

  const projMatch = url.pathname.match(/^\/api\/dev\/projects\/([^/]+)$/);
  if (projMatch) {
    const pid = projMatch[1];
    if (method === 'GET') {
      const p = projectRegistry.get(pid);
      p ? sendJson(res, 200, { project: p }) : sendJson(res, 404, { error: 'Project not found' });
      return true;
    }
  }

  
    // --- JOBS ---
    if (method === 'GET' && url.pathname === '/api/dev/jobs') {
      if (jobQueue) {
        sendJson(res, 200, { jobs: Array.from(jobQueue.jobs.values()) || [] });
      } else {
        sendJson(res, 500, { error: 'JobQueue not configured' });
      }
      return true;
    }
    const cancelMatch = url.pathname.match(/^\/api\/dev\/jobs\/([^/]+)\/cancel$/);
    if (method === 'POST' && cancelMatch) {
      if (jobQueue) {
        const j = jobQueue.jobs.get(cancelMatch[1]);
        if (j) {
           j.status = 'CANCELLED';
           // jobQueue.save(); (Assuming save exists or just updating in memory)
           sendJson(res, 200, { message: 'Cancelled', job: j });
        } else {
           sendJson(res, 404, { error: 'Not found' });
        }
      }
      return true;
    }

    // --- TASKS ---
  if (method === 'POST' && url.pathname === '/api/dev/tasks') {
    const body = await readBody(req);
    const { prompt, projectId, client } = body;
    
    if (!prompt) {
      sendJson(res, 400, { error: 'Prompt is required' });
      return true;
    }
    
    let project = null;
    if (projectId && projectRegistry) {
      project = projectRegistry.get(projectId);
    }

    // --- COMMAND ROUTER ---
      if (prompt.startsWith('/LEARN')) {
         console.log(`[CommandRouter] Executing /LEARN on ${projectId}`);
         const ptnLib = app.patternLibrary || require('../memory/pattern-library').PatternLibrary;
         const library = new ptnLib();
         const patterns = library.extractPatterns({ projectName: project ? project.name : 'Unknown', files: ['admin.js', 'sidebar.css'] });
         sendJson(res, 200, { message: 'Learned patterns', patterns });
         return true;
      }
      if (prompt.startsWith('/PATTERNS')) {
         console.log(`[CommandRouter] Executing /PATTERNS`);
         sendJson(res, 200, { message: 'Pattern Library', patterns: [] });
         return true;
      }
      if (prompt.startsWith('/ISOLATE')) {
         if (project) {
            project.dna = project.dna || {};
            project.dna.isolationPolicy = { doNotCopy: ['visual identity', 'branding'] };
         }
         sendJson(res, 200, { message: 'Project isolated visually', dna: project.dna });
         return true;
      }
      if (prompt.startsWith('/NEW-DESIGN')) {
         console.log(`[CommandRouter] Executing /NEW-DESIGN`);
         // Trigger a massive Full Dev loop conceptually
      }

      // Step 1: Prompt Enhancer (mock or real logic here)
    const enhancedPrompt = {
      originalPrompt: prompt,
      intent: 'Determine intent from prompt',
      objective: 'Process user request',
      constraints: ['Preserve architecture', 'Safety policy from project'],
      project: project ? project.name : 'unknown',
      plan: ['analyze', 'execute', 'test']
    };

    // Step 2: Create Persistent Job (Job Queue)
    let job = null;
    if (jobQueue) {
      job = jobQueue.enqueue({
        type: 'MISSION_PLANNER', legacyType: 'dev_task',
        client: client || 'unknown',
        projectId,
        enhancedPrompt,
        autonomyLevel: project ? project.autonomyLevel : 0,
        status: 'QUEUED'
      });
    }

    // Emit event for clients (WebSocket)
    if (app.eventBus) {
      app.eventBus.emit('job.created', { jobId: job ? job.id : 'temp', client });
    }

    sendJson(res, 201, {
      message: 'Task received and enhanced. Job queued.',
      enhancedPrompt,
      job
    });
    return true;
  }

  // --- JOBS ---
  const jobMatch = url.pathname.match(/^\/api\/dev\/jobs\/([^/]+)$/);
  if (jobMatch) {
    const jid = jobMatch[1];
    if (method === 'GET') {
      const j = jobQueue ? jobQueue.get(jid) : null;
      j ? sendJson(res, 200, { job: j }) : sendJson(res, 404, { error: 'Job not found' });
      return true;
    }
  }

  return false;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(body ? JSON.parse(body) : {}));
    req.on('error', reject);
  });
}

module.exports = { handleCloudRoutes };
