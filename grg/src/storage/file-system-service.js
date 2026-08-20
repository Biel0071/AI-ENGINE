const fs = require('node:fs/promises');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const path = require('node:path');

const execFileAsync = promisify(execFile);

class FileSystemService {
  constructor(workspaceRoot) {
    if (!workspaceRoot) {
      throw new Error('Workspace Root is mandatory for FileSystemService');
    }
    this.workspaceRoot = path.resolve(workspaceRoot);
  }

  _resolveAndValidatePath(targetPath) {
    const resolvedPath = path.resolve(this.workspaceRoot, targetPath || '.');
    const relative = path.relative(this.workspaceRoot, resolvedPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`Security Violation: Path traversal detected. Access outside workspace root is forbidden.`);
    }
    return resolvedPath;
  }

  async exists(targetPath) {
    const safePath = this._resolveAndValidatePath(targetPath);
    try {
      await fs.access(safePath);
      return true;
    } catch {
      return false;
    }
  }

  async stat(targetPath) {
    const safePath = this._resolveAndValidatePath(targetPath);
    return await fs.stat(safePath);
  }

  async listDirectory(targetPath) {
    const safePath = this._resolveAndValidatePath(targetPath);
    const entries = await fs.readdir(safePath, { withFileTypes: true });
    return entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
      path: path.posix.join(targetPath || '', entry.name) // Use posix for frontend consistency
    })).sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  async readFile(targetPath, encoding = 'utf-8') {
    const safePath = this._resolveAndValidatePath(targetPath);
    return await fs.readFile(safePath, { encoding });
  }

  async writeFile(targetPath, content) {
    const safePath = this._resolveAndValidatePath(targetPath);
    await fs.mkdir(path.dirname(safePath), { recursive: true });
    await fs.writeFile(safePath, content, { encoding: 'utf-8' });
    return true;
  }

  async createFile(targetPath, content = '') {
    const safePath = this._resolveAndValidatePath(targetPath);
    const fileExists = await this.exists(targetPath);
    if (fileExists) {
      throw new Error(`File already exists at ${targetPath}`);
    }
    await fs.writeFile(safePath, content, { encoding: 'utf-8' });
    return true;
  }

  async createDirectory(targetPath) {
    const safePath = this._resolveAndValidatePath(targetPath);
    await fs.mkdir(safePath, { recursive: true });
    return true;
  }

  async cloneRepository({ url, directory = null, branch = null } = {}) {
    const repoUrl = normalizeGitUrl(url);
    const targetName = safeDirectoryName(directory || repoUrl.split('/').pop().replace(/\.git$/i, ''));
    if (!targetName) throw new Error('target directory is required');
    await fs.mkdir(this.workspaceRoot, { recursive: true });
    const targetPath = this._resolveAndValidatePath(targetName);
    const targetExists = await this.exists(targetName);
    if (targetExists) {
      const gitDir = path.join(targetPath, '.git');
      try {
        await fs.access(gitDir);
        return { status: 'EXISTS', path: targetPath, relativePath: targetName, url: repoUrl };
      } catch {
        throw new Error(`Target path already exists and is not a git repository: ${targetName}`);
      }
    }
    const args = ['clone', '--depth', '1', '--single-branch'];
    if (branch) args.push('--branch', String(branch));
    args.push(repoUrl, targetPath);
    const result = await execFileAsync('git', args, { cwd: this.workspaceRoot, timeout: 180_000, windowsHide: true });
    return { status: 'CLONED', path: targetPath, relativePath: targetName, url: repoUrl, stdout: result.stdout || '', stderr: result.stderr || '' };
  }

  async rename(oldPath, newPath) {
    const safeOldPath = this._resolveAndValidatePath(oldPath);
    const safeNewPath = this._resolveAndValidatePath(newPath);
    try {
      await fs.access(safeNewPath);
      throw new Error(`Destination already exists: ${newPath}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    await fs.mkdir(path.dirname(safeNewPath), { recursive: true });
    await fs.rename(safeOldPath, safeNewPath);
    return true;
  }

  async move(srcPath, destPath) {
    return this.rename(srcPath, destPath); // In Node, rename functions as move across same filesystem
  }

  async copy(srcPath, destPath) {
    const safeSrc = this._resolveAndValidatePath(srcPath);
    const safeDest = this._resolveAndValidatePath(destPath);
    await fs.cp(safeSrc, safeDest, { recursive: true });
    return true;
  }

  async delete(targetPath) {
    const safePath = this._resolveAndValidatePath(targetPath);
    await fs.rm(safePath, { recursive: true, force: true });
    return true;
  }
}

function normalizeGitUrl(value) {
  const url = String(value || '').trim();
  if (!url) throw new Error('repository url is required');
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error('repository url must be a valid HTTPS URL'); }
  if (parsed.protocol !== 'https:') throw new Error('repository url must use https');
  if (!/^(github\.com|gitlab\.com|bitbucket\.org)$/i.test(parsed.hostname)) throw new Error('only GitHub, GitLab and Bitbucket HTTPS repositories are allowed');
  parsed.hash = '';
  parsed.search = '';
  return parsed.toString().replace(/\/$/, '').replace(/\.git$/i, '') + '.git';
}

function safeDirectoryName(value) {
  return String(value || '').trim().replace(/\.git$/i, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

module.exports = { FileSystemService };
