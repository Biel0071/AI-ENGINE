const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const { scanProject } = require('../projectScanner');

async function createMockProject() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-engine-scan-'));
  await fs.mkdir(path.join(root, 'backend', 'routes'), { recursive: true });
  await fs.mkdir(path.join(root, 'frontend', 'src'), { recursive: true });
  await fs.mkdir(path.join(root, 'services'), { recursive: true });

  await fs.writeFile(path.join(root, 'server.js'), 'console.log("server");', 'utf8');
  await fs.writeFile(path.join(root, 'backend', 'routes', 'users.routes.js'), 'module.exports = {};', 'utf8');
  await fs.writeFile(path.join(root, 'frontend', 'src', 'App.tsx'), 'export default function App(){return null;}', 'utf8');
  await fs.writeFile(path.join(root, 'services', 'mail.service.js'), 'module.exports = {};', 'utf8');
  await fs.writeFile(path.join(root, 'package.json'), '{"name":"mock-app","dependencies":{"express":"^4.0.0"}}', 'utf8');

  return root;
}

test('projectScanner builds structure and detects stack/entry points', async () => {
  const root = await createMockProject();
  const result = await scanProject(root);

  assert.ok(Array.isArray(result.files));
  assert.ok(result.files.length >= 5);
  assert.ok(result.structure && typeof result.structure === 'object');

  const stackNames = result.detectedStack.map((item) => item.name);
  assert.ok(stackNames.includes('nodejs'));

  const entryPointPaths = result.entryPoints.map((item) => item.path);
  assert.ok(entryPointPaths.includes('server.js'));
});
