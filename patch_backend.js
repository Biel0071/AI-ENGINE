const fs = require('fs');

let app_code = fs.readFileSync('grg/src/app.js', 'utf8');

const insert_code = `
  const { FenixDevPipeline } = require('./software-factory/dev-pipeline.js');
  const devPipeline = new FenixDevPipeline({
    store,
    eventBus: bus,
    rootWorkspace: process.env.FENIX_WORKSPACE_ROOT || process.cwd()
  });
`;

app_code = app_code.replace(/(const controlPlane = new ControlPlaneService\(\{ store \}\);)/, '$1' + insert_code);
app_code = app_code.replace(/(const app = \{\n\s+store, bus, controlPlane,)/, '$1 devPipeline,');

fs.writeFileSync('grg/src/app.js', app_code, 'utf8');

let server_code = fs.readFileSync('grg/src/server.js', 'utf8');

const endpoint_code = `
        if (req.method === 'POST' && url.pathname === '/api/dev/pipeline') {
          await app.controlPlane.authorize(tenantId, actorId, 'runtime:execute');
          const body = await readJson(req);
          if (!body.prompt) return sendJson(res, 400, { error: 'prompt required' }, requestId);
          
          if (!app.devPipeline) return sendJson(res, 500, { error: 'devPipeline not initialized' }, requestId);
          
          const result = await app.devPipeline.execute(tenantId, actorId, {
             prompt: body.prompt,
             projectPath: body.projectPath,
             autoDeploy: body.autoDeploy
          });
          return sendJson(res, 202, { mission: result }, requestId);
        }
`;

server_code = server_code.replace('// Memory Fabric 2.0 API', endpoint_code + '\n        // Memory Fabric 2.0 API');

fs.writeFileSync('grg/src/server.js', server_code, 'utf8');
