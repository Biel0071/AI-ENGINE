import os
import re

app_file = 'grg/src/app.js'
with open(app_file, 'r', encoding='utf-8') as f:
    app_code = f.read()

# Inject devPipeline inside createApp right after const controlPlane is defined
insert_code = '''
  const { FenixDevPipeline } = require('./software-factory/dev-pipeline.js');
  const devPipeline = new FenixDevPipeline({
    store,
    eventBus: bus,
    rootWorkspace: process.env.FENIX_WORKSPACE_ROOT || process.cwd()
  });
'''
app_code = re.sub(r'(const controlPlane = new ControlPlaneService\(\{ store \}\);)', r'\1' + insert_code, app_code)

# Add devPipeline to the app object returned
app_code = re.sub(r'(const app = \{\n\s+store, bus, controlPlane,)', r'\1 devPipeline,', app_code)

with open(app_file, 'w', encoding='utf-8') as f:
    f.write(app_code)


server_file = 'grg/src/server.js'
with open(server_file, 'r', encoding='utf-8') as f:
    server_code = f.read()

endpoint_code = '''
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
'''

server_code = server_code.replace('// Memory Fabric 2.0 API', endpoint_code + '\n        // Memory Fabric 2.0 API')

with open(server_file, 'w', encoding='utf-8') as f:
    f.write(server_code)
