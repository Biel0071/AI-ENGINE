const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { GitWorkspaceWriteCapability } = require('../repo-intel/git-write-capability');

const IGNORE = new Set(['.git', 'node_modules', 'dist', 'build', '.next', '.turbo', '.data', 'coverage', 'vendor', 'backups']);
const writers = new Map();

async function handleProjectWorkspaceRoutes(req, res, url, app, sendJson, readJson, { tenantId, actorId }) {
  const reply = (status, payload) => { sendJson(res, status, payload); return true; };
  const match = url.pathname.match(/^\/api\/fenix\/projects\/([^/]+)\/(tree|file)$/);
  if (!match || !['GET', 'PUT'].includes(req.method)) return false;
  const [, projectId, action] = match;
  const write = req.method === 'PUT';
  if (write && action !== 'file') return false;
  await app.controlPlane.authorize(tenantId, actorId, write ? 'project:write' : 'project:read');
  if (write) await app.controlPlane.authorize(tenantId, actorId, 'memory:write');
  let project = (await app.store.read()).projects.find((item) => item.tenantId === tenantId && item.id === projectId);
  if (!project?.workspace) {
    const { getProjectById } = require('../projects/project-registry');
    const regProj = getProjectById(projectId);
    if (regProj && (regProj.localPath || regProj.workspace)) {
      project = {
        id: regProj.id,
        tenantId,
        name: regProj.name,
        workspace: regProj.localPath || regProj.workspace,
      };
    }
  }
  if (!project?.workspace) return reply(404, { error: 'Project Kernel workspace not found' });
  let root;
  try { root = fs.realpathSync(project.workspace); } catch { return reply(404, { error: 'Project workspace is unavailable' }); }
  if (action === 'tree') return reply(200, { projectId, tree: scan(root, root, 0), source: 'project-kernel-workspace' });
  const body = write ? await readJson(req) : null;
  const relative = write ? body?.path : url.searchParams.get('path');
  const target = safeFile(root, relative);
  if (!target) return reply(400, { error: 'Invalid project-relative file path' });
  let stat;
  try { stat = fs.statSync(target); } catch { return reply(404, { error: 'File not found' }); }
  if (!stat.isFile() || stat.size > 1024 * 1024) return reply(413, { error: 'Only regular text files up to 1 MB are supported' });
  const content = fs.readFileSync(target, 'utf8');
  const hash = sha(content);
  if (!write) return reply(200, { projectId, path: relative, content, hash, size: stat.size });
  if (typeof body.content !== 'string' || Buffer.byteLength(body.content) > 1024 * 1024) return reply(413, { error: 'Content must be text up to 1 MB' });
  if (!body.expectedHash || body.expectedHash !== hash) return reply(409, { error: 'File changed since it was opened; reload before saving', currentHash: hash });
  const writerKey = `${tenantId}:${projectId}`;
  let writer = writers.get(writerKey);
  if (!writer || writer.workspaceRoot !== root) { writer = new GitWorkspaceWriteCapability({ workspaceRoot: root }); writers.set(writerKey, writer); }
  const { execFile } = require('node:child_process');
  const { promisify } = require('node:util');
  const git = promisify(execFile);
  const head = (await git('git', ['rev-parse', 'HEAD'], { cwd: root, timeout: 30_000, windowsHide: true })).stdout.trim();
  await writer.write({ operation: 'modify', path: relative, content: body.content, expectedHead: head, requireClean: false });
  const nextHash = sha(body.content);
  const savedAt = new Date().toISOString();
  const record = { projectId, path: relative, previousHash: hash, hash: nextHash, bytes: Buffer.byteLength(body.content), savedAt };
  const recorded = { auditId: null, memoryId: null, memoryVersion: null, eventId: null, memoryRecorded: false };
  try {
    recorded.auditId = (await app.audit.record({ tenantId, actorId, action: 'project.ide.file.saved', resource: record })).id;
    const memory = await app.memoryEngine.remember(tenantId, actorId, {
      kind: 'project', projectId, title: `IDE: ${relative}`,
      content: `Arquivo ${relative} salvo na IDE em ${savedAt}. SHA-256 anterior: ${hash}. SHA-256 atual: ${nextHash}. Tamanho: ${record.bytes} bytes.`,
      stableKey: `ide-file:${projectId}:${relative}`, classification: 'internal', confidence: 1,
      tags: ['ide', 'project-change'], provenance: { type: 'project-ide', reference: `${projectId}:${relative}`, evidence: [nextHash] },
    });
    recorded.memoryId = memory.id; recorded.memoryVersion = memory.version; recorded.memoryRecorded = true;
    recorded.eventId = (await app.fabricEvents.publish({ tenantId, stream: `project:${projectId}`, type: 'project.ide.file.saved', source: 'project-ide', subject: projectId, data: { ...record, actorId, memoryId: memory.id } })).id;
  } catch (error) {
    console.error('[ProjectIDE] File saved but history recording failed:', error);
    return reply(200, { ok: true, projectId, path: relative, hash: nextHash, savedAt, ...recorded, warning: 'File saved, but project history could not be fully recorded' });
  }
  return reply(200, { ok: true, projectId, path: relative, hash: nextHash, savedAt, ...recorded });
}

function safeFile(root, relative) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || relative.includes('\\') || relative.includes('\0')) return null;
  const segments = relative.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..' || segment.startsWith('.') || IGNORE.has(segment))) return null;
  const target = path.resolve(root, ...segments);
  const resolved = path.relative(root, target);
  if (!resolved || resolved.startsWith('..') || path.isAbsolute(resolved)) return null;
  try { if (fs.realpathSync(target) !== target) return null; } catch { return null; }
  return target;
}

function scan(root, directory, depth) {
  if (depth > 3) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((item) => !item.name.startsWith('.') && !IGNORE.has(item.name) && !item.isSymbolicLink())
    .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))
    .slice(0, 60)
    .map((item) => {
      const absolute = path.join(directory, item.name);
      const relative = path.relative(root, absolute).replace(/\\/g, '/');
      if (item.isDirectory()) return { name: item.name, path: relative, type: 'directory', children: scan(root, absolute, depth + 1) };
      return { name: item.name, path: relative, type: 'file' };
    });
}

function sha(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
module.exports = { handleProjectWorkspaceRoutes, safeFile };
