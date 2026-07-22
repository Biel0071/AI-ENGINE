const path = require('node:path');
const { createHttpServerV2 } = require('./http/server-v2');
const { AccessControlledControlPlane } = require('./services/control-plane-v2');
const { JsonStore } = require('./store/json-store');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4310);
const store = new JsonStore({
  filePath: process.env.CONTROL_PLANE_DATA_FILE || path.join(root, '.data', 'state.json'),
  seedPath: path.join(root, 'data', 'seed.json'),
});
const service = new AccessControlledControlPlane(store);

service.initialize().then(() => {
  const server = createHttpServerV2({ service, publicRoot: path.join(root, 'public') });
  server.listen(port, '127.0.0.1', () => {
    process.stdout.write(`AI-ENGINE Control Plane v2: http://127.0.0.1:${port}\n`);
  });
}).catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
