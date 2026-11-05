'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
let catalogCache = null;

function catalogPath() {
  if (process.env.FENIX_LOCAL_PROJECT_CATALOG) return process.env.FENIX_LOCAL_PROJECT_CATALOG;
  if (process.env.NODE_ENV === 'test' || process.env.NODE_TEST_CONTEXT) return null;
  const userPath = path.join(os.homedir(), 'Desktop', 'PROJETOS', 'projetos.json');
  if (fs.existsSync(userPath)) return userPath;
  const repoFallback = path.resolve(__dirname, '..', '..', 'memory', 'local-catalog-manifest.json');
  if (fs.existsSync(repoFallback)) return repoFallback;
  return userPath;
}

function getLocalProjects(options = {}) {
  const useCache = Object.keys(options).length === 0;
  const { filePath = catalogPath(), existsSync = fs.existsSync, realpathSync = fs.realpathSync, lstatSync = fs.lstatSync } = options;
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) return [];
  let items;
  let stat;
  try {
    const catalogLink = lstatSync(filePath);
    if (catalogLink.isSymbolicLink()) {
      if (useCache) catalogCache = null;
      return [];
    }
    stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size > 2 * 1024 * 1024) {
      if (useCache) catalogCache = null;
      return [];
    }
    if (useCache && catalogCache?.filePath === filePath && catalogCache.mtimeMs === stat.mtimeMs && catalogCache.size === stat.size && Date.now() - catalogCache.cachedAt < 5000) {
      return catalogCache.projects.map((project) => ({ ...project }));
    }
    items = JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')).items;
  } catch {
    if (useCache) catalogCache = null;
    return [];
  }
  if (!Array.isArray(items)) return [];

  const projects = items.slice(0, 500).flatMap((entry) => {
    const id = typeof entry?.id === 'string' ? entry.id.trim() : '';
    const name = typeof entry?.name === 'string' ? entry.name.trim() : '';
    const listedPath = typeof entry?.path === 'string' ? entry.path.trim() : '';
    const isAbsoluteListedPath = path.isAbsolute(listedPath) || path.win32.isAbsolute(listedPath);
    if (!/^[a-z0-9][a-z0-9._-]{0,99}$/i.test(id) || !name || !listedPath || listedPath.length > 2048 || !isAbsoluteListedPath) return [];

    const absolutePath = path.isAbsolute(listedPath) ? path.resolve(listedPath) : path.win32.normalize(listedPath);
    let workspace = null;
    let entryFile = null;
    try {
      const listedStat = lstatSync(absolutePath);
      if (listedStat.isSymbolicLink()) return [];
      const realListedPath = realpathSync(absolutePath);
      if (listedStat.isDirectory()) workspace = realListedPath;
      else if (listedStat.isFile()) {
        workspace = realpathSync(path.dirname(realListedPath));
        entryFile = path.basename(realListedPath);
      }
    } catch { /* Keep unavailable catalogue entries visible without a workspace. */ }
    if (workspace && !existsSync(workspace)) workspace = null;

    return [{
      id,
      projectId: id,
      name,
      displayName: name,
      description: `Projeto local do grupo ${entry.group || 'Sem grupo'}.`,
      workspace,
      listedPath: absolutePath,
      entryFile,
      localPort: catalogPort(entry.localPort),
      apiPort: catalogPort(entry.apiPort),
      mode: typeof entry.mode === 'string' ? entry.mode : null,
      projectVersion: safeProjectVersion(entry.version) || readPackageVersion(workspace),
      localUrl: safeHttpUrl(entry.localUrl),
      healthUrl: safeHttpUrl(entry.healthUrl),
      remoteUrl: safeHttpUrl(entry.remoteUrl || entry.url),
      remoteHealthUrl: safeHttpUrl(entry.remoteHealthUrl),
      repository: typeof entry.github === 'string' ? entry.github : null,
      logoId: safeLogoId(entry.logoId),
      logoUrl: safeLogoId(entry.logoId) ? `/api/fenix/projects/local-${encodeURIComponent(id)}/logo` : null,
      catalogGroup: typeof entry.group === 'string' ? entry.group : null,
      versionRole: typeof entry.versionRole === 'string' ? entry.versionRole : null,
      source: 'LOCAL_PROJECT_CATALOG',
      workspaceAvailable: Boolean(workspace),
      lifecycle: 'EVOLUTION',
      maturity: 'DISCOVERED',
      status: workspace ? 'LOCAL_CATALOG' : 'WORKSPACE_UNAVAILABLE',
      absorbed: false,
    }];
  });
  if (useCache) catalogCache = { filePath, mtimeMs: stat.mtimeMs, size: stat.size, cachedAt: Date.now(), projects };
  return projects.map((project) => ({ ...project }));
}

function getLocalProjectById(id, options) {
  if (typeof id !== 'string' || !id) return null;
  const projects = getLocalProjects(options);
  const exact = projects.find((entry) => entry.id === id);
  const catalogId = exact ? id : id.startsWith('local-') ? id.slice('local-'.length) : id;
  const project = exact || projects.find((entry) => entry.id === catalogId);
  return project ? { ...project, id, projectId: id, catalogId: project.id } : null;
}

function safeHttpUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch { return null; }
}

function catalogPort(value) {
  const port = Number(value);
  return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : null;
}

function safeLogoId(value) {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/i.test(value) ? value : null;
}

function safeProjectVersion(value) {
  return typeof value === 'string' && /^[0-9][0-9A-Za-z.+-]{0,63}$/.test(value) ? value : null;
}

function readPackageVersion(workspace) {
  if (!workspace) return null;
  try {
    const packagePath = path.join(workspace, 'package.json');
    const stat = fs.lstatSync(packagePath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 256 * 1024) return null;
    const version = JSON.parse(fs.readFileSync(packagePath, 'utf8')).version;
    return safeProjectVersion(version);
  } catch { return null; }
}

module.exports = { catalogPath, getLocalProjects, getLocalProjectById };
