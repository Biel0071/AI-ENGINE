const fs = require('node:fs/promises');
const path = require('node:path');
const { uuid } = require('../kernel/ids');
const { GitReadCapability } = require('../repo-intel/git-read-capability');

class ReadOnlyAuditService {
  constructor({ store, gitRead, workspaceRoot, allowedRoots = [], conversations = null }) {
    this.store = store;
    this.gitRead = gitRead;
    this.workspaceRoot = path.resolve(workspaceRoot);
    this.allowedRoots = [...new Set([workspaceRoot, ...allowedRoots].filter((root) => typeof root === 'string' && root.trim()).map((root) => path.resolve(root)))];
    this.conversations = conversations;
  }
  async run(tenantId, actorId, payload = {}) {
    const workspaceRoot = path.resolve(typeof payload.workspacePath === 'string' && payload.workspacePath.trim() ? payload.workspacePath : this.workspaceRoot);
    const workspaceAllowed = this.allowedRoots.some((allowedRoot) => {
      const relative = path.relative(allowedRoot, workspaceRoot);
      return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
    });
    if (!workspaceAllowed) {
      const error = new Error('read-only audit workspace is outside configured project roots');
      error.code = 'READ_ONLY_AUDIT_WORKSPACE_OUTSIDE_ALLOWED_ROOT';
      throw error;
    }
    const requestedRoot = typeof payload.root === 'string' && payload.root.trim() ? payload.root : '.';
    const targetRoot = path.resolve(workspaceRoot, requestedRoot);
    const rootRelative = path.relative(workspaceRoot, targetRoot);
    if (rootRelative === '..' || rootRelative.startsWith(`..${path.sep}`) || path.isAbsolute(rootRelative)) {
      const error = new Error('read-only audit root escapes the selected workspace');
      error.code = 'READ_ONLY_AUDIT_ROOT_OUTSIDE_WORKSPACE';
      throw error;
    }
    const root = rootRelative || '.';
    const gitRead = path.resolve(this.gitRead?.workspaceRoot || this.workspaceRoot) === workspaceRoot
      ? this.gitRead
      : new GitReadCapability({ workspaceRoot });
    if (!gitRead) throw new Error('read-only git capability is unavailable');
    const [status, branches, log, diff, head] = await Promise.all([
      gitRead.execute('status', [], root), gitRead.execute('branches', [], root),
      gitRead.execute('log', [], root), gitRead.execute('diff', [], root), gitRead.execute('rev-parse', [], root),
    ]);
    const entries = await fs.readdir(targetRoot, { withFileTypes: true });
    const report = ['# FENIX Read-Only Architecture Analysis', '', `Generated at: ${new Date().toISOString()}`, '', '## Workspace', ...entries.map((entry) => `- ${entry.name}${entry.isDirectory() ? '/' : ''}`), '', '## Git status', '```text', status.stdout, '```', '', '## Branches', '```text', branches.stdout, '```', '', '## Recent commits', '```text', log.stdout, '```', '', '## Diff summary', '```text', diff.stdout, '```', '', '## HEAD', head.stdout.trim(), '', '## Safety', '- Read-only audit: no files, refs, commits, merges, pushes, or remote systems were modified.'].join('\n');
    const artifact = { id: uuid(), tenantId, projectId: payload.projectId || null, missionId: payload.missionId || null, jobId: payload.jobId || null, type: 'FENIX_READ_ONLY_ARCHITECTURE_REPORT', name: 'FENIX_ARCHITECTURE_ANALYSIS.md', content: report, createdBy: actorId, createdAt: new Date().toISOString() };
    await this.store.update((state) => { state.artifacts.push(artifact); return state; });
    const result = {
      artifactId: artifact.id,
      type: artifact.type,
      name: artifact.name,
      bytes: Buffer.byteLength(report, 'utf8'),
      head: head.stdout.trim(),
      branches: branches.stdout,
      changedPaths: status.stdout.split(/\r?\n/).filter((line) => line.trim() && !line.startsWith('##')).length,
      diffSummary: diff.stdout.trim().split(/\r?\n/).filter(Boolean).at(-1) || 'sem diff pendente',
    };
    if (payload.conversationId && this.conversations) {
      const history = await this.conversations.history(tenantId, payload.conversationId, { actorId });
      const marker = `artifact ${artifact.id}`;
      if (!history.some((message) => message.role === 'assistant' && message.content.includes(marker))) {
        const response = [
          'Auditoria somente leitura concluída pela Tool Registry.',
          `HEAD verificado: ${result.head || 'indisponível'}.`,
          `Caminhos alterados/não rastreados: ${result.changedPaths}.`,
          `Resumo do diff: ${result.diffSummary}.`,
          `Relatório: ${result.name} (artifact ${artifact.id}, ${result.bytes} bytes).`,
          'Nenhum arquivo, serviço ou banco foi alterado pela auditoria.',
        ].join('\n');
        await this.conversations.append(tenantId, actorId, payload.conversationId, { role: 'assistant', content: response, source: 'text' });
      }
    }
    return result;
  }
}
module.exports = { ReadOnlyAuditService };
