'use strict';
/**
 * FÊNIX OS V8 — Projects Registry Routes
 */

var path = require('node:path');
var fs = require('node:fs');
var { getAllProjects, getProjectById, getProjectSnapshot } = require('../projects/project-registry');
var { execSync } = require('node:child_process');

function scanDirectory(dirPath, maxDepth) {
  var results = { files: [], routes: [], services: [], components: [] };
  if (!dirPath || !fs.existsSync(dirPath)) return results;
  maxDepth = maxDepth || 3;

  function walk(dir, depth) {
    if (depth > maxDepth) return;
    var entries;
    try { entries = fs.readdirSync(dir); } catch (e) { return; }
    var skip = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.cache'];
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      if (skip.indexOf(entry) >= 0) continue;
      var full = path.join(dir, entry);
      var stat;
      try { stat = fs.statSync(full); } catch (e) { continue; }
      var rel = path.relative(dirPath, full);
      if (stat.isDirectory()) {
        walk(full, depth + 1);
      } else if (stat.isFile()) {
        if (results.files.length < 500) {
          results.files.push({ path: rel, size: stat.size, ext: path.extname(entry) });
        }
        if (entry.indexOf('route') >= 0 || entry.indexOf('router') >= 0) results.routes.push(rel);
        if (entry.indexOf('service') >= 0 || entry.indexOf('worker') >= 0 || entry.indexOf('queue') >= 0) results.services.push(rel);
        if (entry.endsWith('.tsx') || entry.endsWith('.jsx') || entry.endsWith('.vue')) results.components.push(rel);
      }
    }
  }
  walk(dirPath, 0);
  return results;
}

function getGitCommits(vpsPath, limit) {
  try {
    var out = execSync('git -C ' + vpsPath + ' log --oneline -' + (limit || 5) + ' 2>/dev/null', { timeout: 3000 });
    return out.toString().trim().split('\n').filter(Boolean).map(function(l) {
      var parts = l.split(' ');
      var hash = parts[0];
      var msg = parts.slice(1).join(' ');
      return { hash: hash, message: msg };
    });
  } catch (e) { return []; }
}

async function handleProjectsRegistryRoutes(req, res, url, app, sendJson, readJson) {
  if (req.method === 'GET' && url.pathname === '/api/v2/projects-registry') {
    var projects = await getAllProjects().catch(function(e) {
      console.error('[ProjectsRegistry] Error:', e.message);
      return [];
    });
    return sendJson(res, 200, { ok: true, projects: projects, count: projects.length, timestamp: new Date().toISOString() });
  }

  var matchGet = url.pathname.match(/^\/api\/v2\/projects-registry\/([^/]+)$/);
  if (req.method === 'GET' && matchGet) {
    var id = decodeURIComponent(matchGet[1]);
    var project = getProjectById(id);
    if (!project) return sendJson(res, 404, { ok: false, error: 'Project not found', id: id });
    var snapshot = getProjectSnapshot(project);
    var commits = getGitCommits(project.vpsPath);
    var scan = scanDirectory(project.vpsPath);
    return sendJson(res, 200, {
      ok: true,
      project: Object.assign({}, snapshot, {
        commits: commits,
        scan: { fileCount: scan.files.length, routes: scan.routes, services: scan.services, components: scan.components }
      })
    });
  }

  var matchScan = url.pathname.match(/^\/api\/v2\/projects-registry\/([^/]+)\/scan$/);
  if (req.method === 'POST' && matchScan) {
    var scanId = decodeURIComponent(matchScan[1]);
    var scanProject = getProjectById(scanId);
    if (!scanProject) return sendJson(res, 404, { ok: false, error: 'Project not found', id: scanId });
    var scanResult = scanDirectory(scanProject.vpsPath);
    var scanCommits = getGitCommits(scanProject.vpsPath);
    var scanSnapshot = getProjectSnapshot(scanProject);
    return sendJson(res, 200, {
      ok: true,
      projectId: scanProject.projectId,
      scannedAt: new Date().toISOString(),
      snapshot: Object.assign({}, scanSnapshot, {
        commits: scanCommits,
        files: scanResult.files.slice(0, 200),
        routes: scanResult.routes,
        services: scanResult.services,
        components: scanResult.components,
        totalFiles: scanResult.files.length,
      })
    });
  }

  return false;
}

module.exports = { handleProjectsRegistryRoutes };
