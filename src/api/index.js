const fs = require('fs/promises');
const path = require('path');

const FRAMEWORK_HINTS = [
  { key: 'nextjs', test: (pkg) => Boolean(pkg.dependencies?.next || pkg.devDependencies?.next) },
  { key: 'react', test: (pkg) => Boolean(pkg.dependencies?.react || pkg.devDependencies?.react) },
  { key: 'express', test: (pkg) => Boolean(pkg.dependencies?.express || pkg.devDependencies?.express) },
  { key: 'nestjs', test: (pkg) => Boolean(pkg.dependencies?.['@nestjs/core'] || pkg.devDependencies?.['@nestjs/core']) },
  { key: 'vite', test: (pkg) => Boolean(pkg.devDependencies?.vite || pkg.dependencies?.vite) },
];

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function detectProjectProfile(projectRoot) {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const packageJson = await readJson(packageJsonPath);
  const hasFrontendDir = await exists(path.join(projectRoot, 'frontend'));
  const hasRoutesDir = await exists(path.join(projectRoot, 'routes'));
  const hasSrcDir = await exists(path.join(projectRoot, 'src'));

  const frameworks = FRAMEWORK_HINTS.filter((hint) => hint.test(packageJson || {})).map((hint) => hint.key);

  return {
    projectRoot,
    projectType: hasFrontendDir && hasRoutesDir ? 'fullstack' : hasFrontendDir ? 'frontend' : hasRoutesDir ? 'backend' : 'generic',
    frameworks,
    structure: {
      hasFrontendDir,
      hasRoutesDir,
      hasSrcDir,
      hasPackageJson: Boolean(packageJson),
    },
  };
}

function buildEntityPaths(projectRoot, entityName) {
  const resource = String(entityName || '').trim();

  return {
    backend: {
      routeFile: path.join(projectRoot, 'routes', `${resource}.js`),
      controllerFile: path.join(projectRoot, 'controllers', `${resource}Controller.js`),
      serviceFile: path.join(projectRoot, 'services', `${resource}Service.js`),
      repositoryFile: path.join(projectRoot, 'repositories', `${resource}Repository.js`),
    },
    frontend: {
      pageFile: path.join(projectRoot, 'frontend', 'src', 'pages', resource, 'index.tsx'),
      moduleFile: path.join(projectRoot, 'frontend', 'src', 'modules', resource),
      componentDir: path.join(projectRoot, 'frontend', 'src', 'components', resource),
    },
    docs: {
      moduleDocFile: path.join(projectRoot, 'docs', 'modules', `${resource}.md`),
    },
  };
}

async function scanProject({ projectRoot, entityName }) {
  const resource = String(entityName || '').trim();
  const findings = buildEntityPaths(projectRoot, resource);
  const profile = await detectProjectProfile(projectRoot);

  const checks = [];
  for (const scope of Object.values(findings)) {
    for (const filePath of Object.values(scope)) {
      checks.push([filePath, exists(filePath)]);
    }
  }

  const resolved = await Promise.all(checks.map(async ([filePath, check]) => [filePath, await check]));
  const existsMap = Object.fromEntries(resolved);

  return {
    entityName: resource,
    profile,
    findings,
    existsMap,
    alreadyExists: Object.values(existsMap).some(Boolean),
  };
}

module.exports = {
  detectProjectProfile,
  scanProject,
};
