const fs = require('node:fs');
const path = require('node:path');

function buildCandidates(project, registryProject) {
  const projectId = project?.id || project?.projectId || registryProject?.id || registryProject?.projectId;
  let localCatalogWorkspace = null;
  try {
    const catalog = require('./local-project-catalog');
    localCatalogWorkspace = catalog.getLocalProjectById(projectId)?.workspace ||
      (projectId === 'fenix-os' ? catalog.getLocalProjectById('fenix')?.workspace : null) ||
      (projectId === 'fenix' ? catalog.getLocalProjectById('fenix-os')?.workspace : null) || null;
  } catch { /* The local catalogue is optional on servers without a desktop workspace. */ }
  const apiPlatformWorkspaces = (projectId === 'api-platform' || projectId === 'api-platform-hub' || projectId === 'api-platform-fenix')
    ? [
      process.env.FENIX_API_PLATFORM_WORKSPACE,
      path.resolve(__dirname, '../../../../projects/API-PLATAFORM'),
      path.resolve(__dirname, '../../../../api-platform-provider-hub'),
      '/opt/grg-fenix/workspaces/api-platform',
      '/app/workspaces/api-platform',
    ]
    : [];
  const isFenixProject = project?.catalogId === 'fenix' || projectId === 'fenix-os' || projectId === 'ai-engine' || projectId === 'fenix' || projectId === 'ai-engine-core';
  const fenixGitWorkspaces = isFenixProject
    ? [
      process.env.FENIX_GIT_REPO_PATH,
      path.resolve(__dirname, '../../../..'),
      path.resolve(__dirname, '../../..'),
      path.resolve(__dirname, '../..'),
      '/opt/AI-ENGINE',
      '/opt/fenix-os',
    ]
    : [];
  return [
    project?.workspace,
    registryProject?.localPath,
    registryProject?.workspace,
    registryProject?.vpsPath,
    registryProject?.productionPath,
    localCatalogWorkspace,
    ...fenixGitWorkspaces,
    ...apiPlatformWorkspaces,
  ].filter((candidate) => typeof candidate === 'string' && candidate.trim());
}

function resolveProjectWorkspace(project, registryProject, existsSync = fs.existsSync) {
  const candidates = buildCandidates(project, registryProject);
  return candidates.find((candidate) => existsSync(candidate)) || null;
}

function resolveProjectGitWorkspace(project, registryProject, existsSync = fs.existsSync) {
  const candidates = buildCandidates(project, registryProject);
  const gitCandidate = candidates.find((candidate) => existsSync(candidate) && existsSync(path.join(candidate, '.git')));
  return gitCandidate || candidates.find((candidate) => existsSync(candidate)) || null;
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
module.exports = { resolveProjectWorkspace, resolveProjectGitWorkspace, resolveProjectBranch };
