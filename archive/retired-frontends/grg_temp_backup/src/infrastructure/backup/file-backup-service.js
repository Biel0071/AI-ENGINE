const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function checksum(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

class FileBackupService {
  constructor({ clock = () => new Date() } = {}) {
    this.clock = clock;
  }

  create(sourceFile, backupDir) {
    const source = path.resolve(sourceFile);
    const destinationDir = path.resolve(backupDir);
    if (!fs.existsSync(source) || !fs.statSync(source).isFile()) throw new Error('backup source file does not exist');
    fs.mkdirSync(destinationDir, { recursive: true });
    const stamp = this.clock().toISOString().replace(/[:.]/g, '-');
    const backup = path.join(destinationDir, `${path.basename(source)}.${stamp}.bak`);
    fs.copyFileSync(source, backup, fs.constants.COPYFILE_EXCL);
    const manifest = {
      version: 1, source, backup, size: fs.statSync(backup).size,
      sha256: checksum(backup), createdAt: this.clock().toISOString(),
    };
    fs.writeFileSync(`${backup}.manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
    return manifest;
  }

  verify(backupFile) {
    const backup = path.resolve(backupFile);
    const manifestFile = `${backup}.manifest.json`;
    if (!fs.existsSync(backup) || !fs.existsSync(manifestFile)) return { ok: false, reason: 'backup or manifest missing' };
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    const actual = checksum(backup);
    return { ok: actual === manifest.sha256, expected: manifest.sha256, actual, manifest };
  }

  restore(backupFile, targetFile) {
    const backup = path.resolve(backupFile);
    const target = path.resolve(targetFile);
    const verification = this.verify(backup);
    if (!verification.ok) throw new Error(`backup verification failed: ${verification.reason || 'checksum mismatch'}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const temporary = `${target}.${crypto.randomUUID()}.restore.tmp`;
    fs.copyFileSync(backup, temporary, fs.constants.COPYFILE_EXCL);
    fs.renameSync(temporary, target);
    return { target, sha256: verification.actual, restoredAt: this.clock().toISOString() };
  }
}

module.exports = { FileBackupService, checksum };
