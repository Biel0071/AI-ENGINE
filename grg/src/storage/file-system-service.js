const fs = require('node:fs/promises');
const path = require('node:path');

class FileSystemService {
  constructor(workspaceRoot) {
    if (!workspaceRoot) {
      throw new Error('Workspace Root is mandatory for FileSystemService');
    }
    this.workspaceRoot = path.resolve(workspaceRoot);
  }

  _resolveAndValidatePath(targetPath) {
    const resolvedPath = path.resolve(this.workspaceRoot, targetPath || '.');
    if (!resolvedPath.startsWith(this.workspaceRoot)) {
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

  async rename(oldPath, newPath) {
    const safeOldPath = this._resolveAndValidatePath(oldPath);
    const safeNewPath = this._resolveAndValidatePath(newPath);
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

module.exports = { FileSystemService };
