const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class RealWorldExecutor {
  constructor(workspaceManager, eventBus) {
    this.workspaceManager = workspaceManager;
    this.eventBus = eventBus;
  }

  resolveWorkspace(projectId) {
    if (this.workspaceManager) {
      const prj = this.workspaceManager.getProject(projectId);
      if (prj && prj.rootPath) return prj.rootPath;
    }
    // Fallback sandbox
    return path.resolve('C:/projetos', projectId);
  }

  isSafeCommand(cmd) {
    const safe = ['npm test', 'npm run build', 'tsc', 'eslint', 'git status', 'git diff'];
    const dangerous = ['rm', 'delete', 'drop', 'reset --hard', 'force push'];
    const lowered = cmd.toLowerCase();
    
    if (dangerous.some(d => lowered.includes(d))) return 'DANGEROUS';
    if (safe.some(s => lowered.includes(s))) return 'SAFE';
    return 'WARNING';
  }

  executeTerminal(projectId, command) {
    const cwd = this.resolveWorkspace(projectId);
    const safety = this.isSafeCommand(command);
    
    if (safety === 'DANGEROUS') {
      throw new Error('Command blocked by safety rules (DANGEROUS).');
    }

    try {
      if (this.eventBus) this.eventBus.emit('tool.started', { tool: 'terminal.execute', command, cwd });
      const stdout = execSync(command, { cwd, encoding: 'utf8', stdio: 'pipe' });
      if (this.eventBus) this.eventBus.emit('tool.completed', { tool: 'terminal.execute', command, exitCode: 0 });
      return { success: true, exitCode: 0, stdout };
    } catch (err) {
      if (this.eventBus) this.eventBus.emit('tool.completed', { tool: 'terminal.execute', command, exitCode: err.status || 1 });
      return { success: false, exitCode: err.status || 1, stderr: err.stderr || err.message, stdout: err.stdout };
    }
  }

  applyFilePatch(projectId, relPath, newContent) {
    const cwd = this.resolveWorkspace(projectId);
    const fullPath = path.join(cwd, relPath);
    
    if (!fullPath.startsWith(cwd)) {
      throw new Error('Path traversal blocked.');
    }

    if (this.eventBus) this.eventBus.emit('tool.started', { tool: 'filesystem.write', file: relPath });
    
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(fullPath, newContent, 'utf8');
    
    if (this.eventBus) this.eventBus.emit('tool.completed', { tool: 'filesystem.write', file: relPath });
    if (this.eventBus) this.eventBus.emit('file.changed', { file: relPath });
    return true;
  }

  readFile(projectId, relPath) {
    const cwd = this.resolveWorkspace(projectId);
    const fullPath = path.join(cwd, relPath);
    if (!fs.existsSync(fullPath)) return null;
    return fs.readFileSync(fullPath, 'utf8');
  }

  async runAutonomousBuild(projectId) {
    if (this.eventBus) this.eventBus.emit('build.started', { projectId });
    const result = this.executeTerminal(projectId, 'npm run build');
    if (this.eventBus) this.eventBus.emit('build.completed', { projectId, success: result.success });
    return result;
  }

  async runAutonomousTest(projectId) {
    if (this.eventBus) this.eventBus.emit('test.started', { projectId });
    const result = this.executeTerminal(projectId, 'npm test');
    if (this.eventBus) this.eventBus.emit('test.completed', { projectId, success: result.success });
    return result;
  }
}

module.exports = { RealWorldExecutor };
