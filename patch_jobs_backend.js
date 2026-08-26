const fs = require('fs');
let code = fs.readFileSync('grg/src/api/cloud-routes.js', 'utf8');

const jobsLogic = `
    // --- JOBS ---
    if (method === 'GET' && url.pathname === '/api/dev/jobs') {
      if (jobQueue) {
        sendJson(res, 200, { jobs: Array.from(jobQueue.jobs.values()) || [] });
      } else {
        sendJson(res, 500, { error: 'JobQueue not configured' });
      }
      return true;
    }
    const cancelMatch = url.pathname.match(/^\\/api\\/dev\\/jobs\\/([^/]+)\\/cancel$/);
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
`;

if (!code.includes('/api/dev/jobs\\/([^/]+)\\/cancel')) {
   code = code.replace('// --- TASKS ---', jobsLogic + '\n    // --- TASKS ---');
   fs.writeFileSync('grg/src/api/cloud-routes.js', code, 'utf8');
   console.log('Backend /api/dev/jobs implemented.');
} else {
   console.log('Already implemented.');
}
