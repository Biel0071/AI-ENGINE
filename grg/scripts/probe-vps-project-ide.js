'use strict';

const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const configured = Object.fromEntries(fs.readFileSync('/opt/fenix-os/grg/.env', 'utf8').split(/\r?\n/).map((line) => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  return match ? [match[1], match[2].replace(/^['"]|['"]$/g, '')] : [];
}).filter((item) => item.length === 2));
const processes = JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8', timeout: 8000 }));
const env = { ...configured, ...(processes.find((item) => item.name === 'fenix-backend')?.pm2_env || {}) };
const base = 'http://127.0.0.1:4410';

async function main() {
  const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenantId: env.FENIX_BOOTSTRAP_TENANT_ID || 'grg', userId: env.FENIX_BOOTSTRAP_ADMIN_USER, password: env.FENIX_BOOTSTRAP_ADMIN_PASSWORD }), signal: AbortSignal.timeout(12000) });
  const session = await login.json();
  if (!login.ok || !session.token) throw new Error(`login HTTP ${login.status}`);
  const headers = { authorization: `Bearer ${session.token}`, 'content-type': 'application/json' };
  const request = async (url, options = {}) => {
    const response = await fetch(`${base}${url}`, { headers, signal: AbortSignal.timeout(20000), ...options });
    const data = await response.json();
    return { status: response.status, data };
  };
  let scratch;
  try {
    const projectResponse = await request('/api/fenix/projects');
    if (process.argv.includes('--list-projects')) {
      console.log(JSON.stringify({ projects: (projectResponse.data.projects || []).map((item) => ({ id: item.id, name: item.name, workspace: item.workspace, branch: item.branch, maturity: item.maturity })) }));
      return;
    }
    const project = projectResponse.data.projects.find((item) => item.id === 'api-platform-live' && item.workspace === '/root/api-gratis');
    if (!project) throw new Error('API Platform Project Kernel workspace missing');
    if (process.argv.includes('--terminal-guard')) {
      const endpoint = '/api/v2/terminal/exec';
      const command = await request(endpoint, { method: 'POST', body: JSON.stringify({ command: 'pwd', cwd: '/opt/fenix-os/grg/src' }) });
      const outside = await request(endpoint, { method: 'POST', body: JSON.stringify({ command: 'pwd', cwd: '/root' }) });
      const ok = command.status === 200 && command.data.ok === true && command.data.stdout?.trim() === '/opt/fenix-os/grg/src' && Boolean(command.data.auditId) && outside.status === 403;
      console.log(JSON.stringify({ ok, commandStatus: command.status, commandOk: command.data.ok, cwdMatches: command.data.stdout?.trim() === '/opt/fenix-os/grg/src', audited: Boolean(command.data.auditId), outsideStatus: outside.status }));
      if (!ok) process.exitCode = 2;
      return;
    }
    if (process.argv.includes('--legacy-history')) {
      const scratchFile = `/opt/fenix-os/grg/qa-legacy-history-${crypto.randomUUID()}.txt`;
      const original = `legacy history ${crypto.randomUUID()}\n`;
      fs.writeFileSync(scratchFile, original, { mode: 0o600 });
      try {
        const endpoint = '/api/v2/projects/fenix-os/file';
        const saved = await request(endpoint, { method: 'POST', body: JSON.stringify({ path: scratchFile, content: 'edited legacy history\n' }) });
        const reverted = await request(`${endpoint}/revert`, { method: 'POST', body: JSON.stringify({ path: scratchFile }) });
        const memoryId = reverted.data.memoryId;
        const history = memoryId ? await request(`/api/memories/${encodeURIComponent(memoryId)}/history`) : { status: 0, data: {} };
        const ok = saved.status === 200 && saved.data.memoryRecorded === true && reverted.status === 200 && reverted.data.memoryRecorded === true && reverted.data.memoryId === saved.data.memoryId && reverted.data.memoryVersion >= 2 && history.status === 200 && fs.readFileSync(scratchFile, 'utf8') === original;
        console.log(JSON.stringify({ ok, saveStatus: saved.status, saveMemoryRecorded: saved.data.memoryRecorded, saveAudit: Boolean(saved.data.auditId), saveEvent: Boolean(saved.data.eventId), revertStatus: reverted.status, revertMemoryRecorded: reverted.data.memoryRecorded, revertAudit: Boolean(reverted.data.auditId), revertEvent: Boolean(reverted.data.eventId), sameMemory: reverted.data.memoryId === saved.data.memoryId, revertVersion: reverted.data.memoryVersion, historyStatus: history.status, restored: fs.readFileSync(scratchFile, 'utf8') === original }));
        if (!ok) process.exitCode = 2;
      } finally {
        fs.rmSync(scratchFile, { force: true });
        fs.rmSync(scratchFile + '.fenix-bak', { force: true });
      }
      return;
    }
    if (process.argv.includes('--legacy-guard')) {
      const sibling = fs.mkdtempSync('/opt/fenix-os-sibling-');
      try {
        const outsideFile = path.join(sibling, 'secret.txt');
        fs.writeFileSync(outsideFile, 'qa-secret\n', { mode: 0o600 });
        const valid = await request(`/api/v2/projects/fenix-os/file?path=${encodeURIComponent('/opt/fenix-os/grg/src/server.js')}`);
        const outside = await request(`/api/v2/projects/fenix-os/file?path=${encodeURIComponent(outsideFile)}`);
        const protectedFile = await request(`/api/v2/projects/fenix-os/file?path=${encodeURIComponent('/opt/fenix-os/grg/.env')}`);
        const rejectedWrite = await request('/api/v2/projects/fenix-os/file', { method: 'POST', body: JSON.stringify({ path: outsideFile, content: 'mutated' }) });
        const ok = valid.status === 200 && outside.status === 403 && protectedFile.status === 403 && rejectedWrite.status === 403 && fs.readFileSync(outsideFile, 'utf8') === 'qa-secret\n';
        console.log(JSON.stringify({ ok, valid: valid.status, outside: outside.status, protectedFile: protectedFile.status, rejectedWrite: rejectedWrite.status, outsideUnchanged: fs.readFileSync(outsideFile, 'utf8') === 'qa-secret\n' }));
        if (!ok) process.exitCode = 2;
      } finally { fs.rmSync(sibling, { recursive: true, force: true }); }
      return;
    }
    const prefix = `/api/fenix/projects/${encodeURIComponent(project.id)}`;
    if (process.argv.includes('--verify-memory')) {
      const memoryId = process.argv[process.argv.indexOf('--verify-memory') + 1];
      const history = await request(`/api/memories/${encodeURIComponent(memoryId)}/history`);
      const found = await request('/api/memories/search?q=fenix-ide-qa&kind=project&projectId=api-platform-live&limit=100');
      const remembered = found.data.results?.some((item) => item.memory?.id === memoryId);
      const ok = history.status === 200 && history.data.versions?.length > 0 && remembered;
      console.log(JSON.stringify({ ok, memoryId, historyStatus: history.status, versions: history.data.versions?.length, remembered }));
      if (!ok) process.exitCode = 2;
      return;
    }
    if (process.argv.includes('--forget-memory')) {
      const memoryId = process.argv[process.argv.indexOf('--forget-memory') + 1];
      const removed = await request(`/api/memories/${encodeURIComponent(memoryId)}`, { method: 'DELETE', body: JSON.stringify({ reason: 'Disposable IDE QA file removed after persistence verification' }) });
      console.log(JSON.stringify({ ok: removed.status === 200 && removed.data.status === 'DELETED', memoryId, status: removed.data.status }));
      return;
    }
    const tree = await request(`${prefix}/tree`);
    if (process.argv.includes('--analyze')) {
      const started = Date.now();
      const analysis = await request(`${prefix}/analyze`, { method: 'POST' });
      console.log(JSON.stringify({ analysisStatus: analysis.status, analysisError: analysis.data.error || null, durationMs: Date.now() - started, head: analysis.data.head || null }));
      return;
    }
    const realFile = await request(`${prefix}/file?path=app_front.js`);
    const denied = await request(`${prefix}/file?path=..%2F.env`);
    const name = `fenix-ide-qa-${crypto.randomUUID()}.js`;
    scratch = path.join(project.workspace, name);
    fs.writeFileSync(scratch, 'module.exports = 1;\n', { flag: 'wx', mode: 0o600 });
    const opened = await request(`${prefix}/file?path=${encodeURIComponent(name)}`);
    const saved = await request(`${prefix}/file`, { method: 'PUT', body: JSON.stringify({ path: name, content: 'module.exports = 2;\n', expectedHash: opened.data.hash }) });
    const memorySearch = await request(`/api/memory/search?q=${encodeURIComponent(name)}&kind=project&limit=20`);
    const remembered = memorySearch.data.results?.some((item) => item.memory?.id === saved.data.memoryId && item.memory?.projectId === project.id);
    const stale = await request(`${prefix}/file`, { method: 'PUT', body: JSON.stringify({ path: name, content: 'module.exports = 3;\n', expectedHash: opened.data.hash }) });
    const disk = fs.readFileSync(scratch, 'utf8');
    const ok = tree.status === 200 && tree.data.source === 'project-kernel-workspace' && realFile.status === 200 && realFile.data.content?.length > 0 && denied.status === 400 && opened.status === 200 && saved.status === 200 && saved.data.memoryRecorded === true && remembered && stale.status === 409 && disk === 'module.exports = 2;\n';
    console.log(JSON.stringify({ ok, projectId: project.id, treeEntries: tree.data.tree?.length, realFileBytes: realFile.data.size, denied: denied.status, opened: opened.status, saved: saved.status, memoryRecorded: saved.data.memoryRecorded, memoryVersion: saved.data.memoryVersion, memoryId: saved.data.memoryId, memorySearch: remembered, stale: stale.status, diskMatches: disk === 'module.exports = 2;\n' }));
    if (!ok) process.exitCode = 2;
  } finally {
    if (scratch) fs.rmSync(scratch, { force: true });
    await fetch(`${base}/api/logout`, { method: 'POST', headers, signal: AbortSignal.timeout(5000) }).catch(() => {});
  }
}
main().catch((error) => { console.error(JSON.stringify({ ok: false, reason: String(error.message || error).slice(0, 200) })); process.exitCode = 2; });
