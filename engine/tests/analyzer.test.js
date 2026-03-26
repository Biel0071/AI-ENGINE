const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const { scanProject } = require('../projectScanner');
const { analyzeArchitecture } = require('../architectureAnalyzer');

async function createMockProject() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-engine-analyzer-'));
  await fs.mkdir(path.join(root, 'api', 'routes'), { recursive: true });
  await fs.mkdir(path.join(root, 'services'), { recursive: true });
  await fs.mkdir(path.join(root, 'frontend', 'views'), { recursive: true });

  await fs.writeFile(path.join(root, 'main.ts'), 'console.log("main");', 'utf8');
  await fs.writeFile(path.join(root, 'api', 'routes', 'orders.routes.ts'), 'export const x = 1;', 'utf8');
  await fs.writeFile(path.join(root, 'services', 'order.service.ts'), 'export const y = 2;', 'utf8');
  await fs.writeFile(path.join(root, 'frontend', 'views', 'Home.tsx'), 'export default function Home(){return null;}', 'utf8');
  await fs.writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'mock-analyzer',
      dependencies: { express: '^4.21.2' },
    }),
    'utf8'
  );

  return root;
}

test('architectureAnalyzer detects layers, flows and dependencies', async () => {
  const root = await createMockProject();
  const scanResult = await scanProject(root);
  const architecture = await analyzeArchitecture(scanResult);

  const layerNames = architecture.layers.map((layer) => layer.name);
  assert.ok(layerNames.includes('api'));
  assert.ok(layerNames.includes('services'));
  assert.ok(layerNames.includes('ui'));

  const depNames = architecture.dependencies.map((dep) => dep.name);
  assert.ok(depNames.includes('express'));
});
