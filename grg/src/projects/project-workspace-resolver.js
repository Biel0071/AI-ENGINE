const fs = require('node:fs');

function resolveProjectWorkspace(project, registryProject, existsSync = fs.existsSync) {
  const projectId = project?.id || project?.projectId || registryProject?.id || registryProject?.projectId;
  const configuredWorkspace = projectId === 'api-platform'
    ? process.env.FENIX_API_PLATFORM_WORKSPACE || '/app/workspaces/api-platform'
    : null;
  const candidates = [
    project?.workspace,
    registryProject?.vpsPath,
    registryProject?.localPath,
    registryProject?.workspace,
    registryProject?.productionPath,
    configuredWorkspace,
  ].filter((candidate) => typeof candidate === 'string' && candidate.trim());
  return candidates.find((candidate) => existsSync(candidate)) || null;
}

function resolveProjectBranch(project, registryProject, workspace) {
  if (workspace && workspace !== project?.workspace) {
    return registryProject?.branch || (project?.id === 'api-platform'
      ? process.env.FENIX_API_PLATFORM_BRANCH || 'fenix/fenix-ide-20261009'
      : project?.branch);
  }
  return project?.branch || registryProject?.branch || null;
}

module.exports = { resolveProjectWorkspace, resolveProjectBranch };
