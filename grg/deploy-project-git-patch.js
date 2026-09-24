const fs = require('node:fs');

const file = process.argv[2];
if (!file) throw new Error('server.js path required');
let source = fs.readFileSync(file, 'utf8');
const importAnchor = "const { handleProjectWorkspaceRoutes } = require('./api/project-workspace-routes');";
const callAnchor = '      if (await handleProjectWorkspaceRoutes(req, res, url, app, sendJson, readJson, { tenantId, actorId })) return;';
if (!source.includes(importAnchor) || !source.includes(callAnchor)) throw new Error('Project route anchors missing; backend left untouched');
if (!source.includes("require('./api/project-git-routes')")) {
  source = source.replace(importAnchor, `${importAnchor}\nconst { handleProjectGitRoutes } = require('./api/project-git-routes');`);
}
if (!source.includes('if (await handleProjectGitRoutes(')) {
  source = source.replace(callAnchor, `${callAnchor}\n      if (await handleProjectGitRoutes(req, res, url, app, sendJson, readJson, { tenantId, actorId })) return;`);
}
fs.writeFileSync(file, source);
