const fs = require('node:fs');

function resolveProjectWorkspace(project, registryProject, existsSync = fs.existsSync) {
  const projectId = project?.id || project?.projectId || registryProject?.id || registryProject?.projectId;
  const apiPlatformWorkspaces = projectId === 'api-platform'
    ? [
      process.env.FENIX_API_PLATFORM_WORKSPACE,
      '/opt/grg-fenix/workspaces/api-platform',
      '/app/workspaces/api-platform',
    ]
    : [];
  const candidates = [
    project?.workspace,
    registryProject?.vpsPath,
    registryProject?.localPath,
    registryProject?.workspace,
    registryProject?.productionPath,
    ...apiPlatformWorkspaces,
  ].filter((candidate) => typeof candidate === 'string' && candidate.trim());
  return candidates.find((candidate) => existsSync(candidate)) || null;
}

function resolveProjectBranch(project, registryProject, workspace) {
  const projectId = project?.id || project?.projectId || registryProject?.id || registryProject?.projectId;
  if (projectId === 'api-platform') {
    const configuredBranch = process.env.FENIX_API_PLATFORM_BRANCH;
    const registryBranch = registryProject?.branch && registryProject.branch !== 'main' ? registryProject.branch : null;
    return configuredBranch || registryBranch || 'fenix/fenix-ide-20261009';
  }
  if (workspace && workspace !== project?.workspace) {
    return registryProject?.branch || project?.branch || null;
  }
  return project?.branch || registryProject?.branch || null;
}

module.exports = { resolveProjectWorkspace, resolveProjectBranch };
