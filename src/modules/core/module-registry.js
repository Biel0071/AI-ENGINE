const fs = require('fs/promises');
const path = require('path');

const REGISTRY_FILE = path.join(__dirname, '..', 'data', 'module_registry.json');

const DEFAULT_REGISTRY = {
  routes: [],
  navigation: [],
  apiEndpoints: [],
  modules: [],
};

async function ensureRegistryFile() {
  await fs.mkdir(path.dirname(REGISTRY_FILE), { recursive: true });

  try {
    await fs.access(REGISTRY_FILE);
  } catch {
    await fs.writeFile(REGISTRY_FILE, JSON.stringify(DEFAULT_REGISTRY, null, 2), 'utf8');
  }
}

async function readRegistry() {
  await ensureRegistryFile();
  const raw = await fs.readFile(REGISTRY_FILE, 'utf8');

  try {
    const parsed = JSON.parse(raw);
    return {
      routes: Array.isArray(parsed.routes) ? parsed.routes : [],
      navigation: Array.isArray(parsed.navigation) ? parsed.navigation : [],
      apiEndpoints: Array.isArray(parsed.apiEndpoints) ? parsed.apiEndpoints : [],
      modules: Array.isArray(parsed.modules) ? parsed.modules : [],
    };
  } catch {
    return { ...DEFAULT_REGISTRY };
  }
}

async function writeRegistry(registry) {
  await ensureRegistryFile();
  await fs.writeFile(REGISTRY_FILE, JSON.stringify(registry, null, 2), 'utf8');
  return registry;
}

function pushUnique(array, item, comparer) {
  if (!array.some((entry) => comparer(entry, item))) {
    array.push(item);
  }
}

async function registerRoute(route) {
  const registry = await readRegistry();
  pushUnique(registry.routes, route, (left, right) => left.path === right.path && left.file === right.file);
  return writeRegistry(registry);
}

async function registerNavigation(item) {
  const registry = await readRegistry();
  pushUnique(registry.navigation, item, (left, right) => left.path === right.path);
  return writeRegistry(registry);
}

async function registerApiEndpoint(endpoint) {
  const registry = await readRegistry();
  pushUnique(
    registry.apiEndpoints,
    endpoint,
    (left, right) => left.path === right.path && left.method === right.method
  );
  return writeRegistry(registry);
}

async function registerModule(moduleEntry) {
  const registry = await readRegistry();
  pushUnique(registry.modules, moduleEntry, (left, right) => left.name === right.name);
  return writeRegistry(registry);
}

module.exports = {
  readRegistry,
  registerApiEndpoint,
  registerModule,
  registerNavigation,
  registerRoute,
};
