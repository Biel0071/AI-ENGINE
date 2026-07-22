const path = require('node:path');
const { createHttpServer } = require('./http/server');
const { ControlPlaneService } = require('./services/control-plane');
const { JsonStore } = require('./store/json-store');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4310);
const dataFile = process.env.CONTROL_PLANE_DATA_FILE || path.join(root, '.data', 'state.json');

const store = new JsonStore({
  filePath: dataFile,
  seedPath: path.join(root, 'data', 'seed.json'),
});
const service = new ControlPlaneService(store);
const server = createHttpServer({ service, publicRoot: path.join(root, 'public') });

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`AI-ENGINE Control Plane: http://127.0.0.1:${port}\n`);
});
