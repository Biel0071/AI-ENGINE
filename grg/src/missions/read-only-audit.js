const fs = require('node:fs/promises');
const path = require('node:path');
const { uuid } = require('../kernel/ids');

class ReadOnlyAuditService {
  constructor({ store, gitRead, workspaceRoot }) { this.store = store; this.gitRead = gitRead; this.workspaceRoot = workspaceRoot; }
  async run(tenantId, actorId, payload = {}) {
    const root = payload.root || '.';
    const [status, branches, log, diff, head] = await Promise.all([
      this.gitRead.execute('status', [], root), this.gitRead.execute('branches', [], root),
      this.gitRead.execute('log', [], root), this.gitRead.execute('diff', [], root), this.gitRead.execute('rev-parse', [], root),
    ]);
    const entries = await fs.readdir(path.resolve(this.workspaceRoot, root), { withFileTypes: true });
    const report = ['# FENIX Read-Only Architecture Analysis', '', `Generated at: ${new Date().toISOString()}`, '', '## Workspace', ...entries.map((entry) => `- ${entry.name}${entry.isDirectory() ? '/' : ''}`), '', '## Git status', '```text', status.stdout, '```', '', '## Branches', '```text', branches.stdout, '```', '', '## Recent commits', '```text', log.stdout, '```', '', '## Diff summary', '```text', diff.stdout, '```', '', '## HEAD', head.stdout.trim(), '', '## Safety', '- Read-only audit: no files, refs, commits, merges, pushes, or remote systems were modified.'].join('\n');
    const artifact = { id: uuid(), tenantId, projectId: payload.projectId || null, missionId: payload.missionId || null, jobId: payload.jobId || null, type: 'FENIX_READ_ONLY_ARCHITECTURE_REPORT', name: 'FENIX_ARCHITECTURE_ANALYSIS.md', content: report, createdBy: actorId, createdAt: new Date().toISOString() };
    await this.store.update((state) => { state.artifacts.push(artifact); return state; });
    return { artifactId: artifact.id, type: artifact.type, name: artifact.name, bytes: Buffer.byteLength(report, 'utf8'), head: head.stdout.trim(), branches: branches.stdout };
  }
}
module.exports = { ReadOnlyAuditService };
