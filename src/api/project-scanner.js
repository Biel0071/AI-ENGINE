const fs = require('fs/promises');
const path = require('path');

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function scanProject({ projectRoot, entityName }) {
  const resource = String(entityName || '').trim();
  const findings = {
    backend: {
      routeFile: path.join(projectRoot, 'routes', `${resource}.js`),
      controllerFile: path.join(projectRoot, 'controllers', `${resource}Controller.js`),
      serviceFile: path.join(projectRoot, 'services', `${resource}Service.js`),
      repositoryFile: path.join(projectRoot, 'repositories', `${resource}Repository.js`),
      schemaFile: path.join(projectRoot, 'backend', 'modules', resource, `${resource}.schema.json`),
    },
    frontend: {
      pageFile: path.join(projectRoot, 'frontend', 'src', 'pages', resource, 'index.tsx'),
      moduleFile: path.join(projectRoot, 'frontend', 'src', 'modules', resource),
      hookFile: path.join(projectRoot, 'frontend', 'src', 'hooks', `use${resource[0]?.toUpperCase() || ''}${resource.slice(1)}.ts`),
      componentDir: path.join(projectRoot, 'frontend', 'src', 'components', resource),
    },
    docs: {
      moduleDocFile: path.join(projectRoot, 'docs', 'modules', `${resource}.md`),
    },
  };

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
    findings,
    existsMap,
    alreadyExists: Object.values(existsMap).some(Boolean),
  };
}

module.exports = {
  scanProject,
};
