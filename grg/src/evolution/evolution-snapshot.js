'use strict';
/**
 * FÊNIX OS — Evolution Snapshot & Rollback Engine
 * ===============================================
 * Captura determinística do estado do sistema antes de qualquer tentativa
 * de modificação por missões de auto-evolução, com capacidade de rollback
 * atômico e verificação criptográfica SHA-256 pós-restauração.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class EvolutionSnapshot {
  /**
   * @param {object} options
   * @param {string} [options.baseDir]       - Diretório raiz do projeto
   * @param {string} [options.snapshotsDir]  - Onde armazenar os snapshots temporários
   * @param {object} [options.logger]        - Logger
   */
  constructor(options = {}) {
    this.baseDir = options.baseDir || path.resolve(__dirname, '..', '..');
    this.snapshotsDir = options.snapshotsDir || path.join(this.baseDir, '.fenix-snapshots');
    this.logger = options.logger || console;
  }

  _computeFileHash(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  _getGitInfo() {
    try {
      const commit = execSync('git rev-parse HEAD', { cwd: this.baseDir, encoding: 'utf8', timeout: 5000 }).trim();
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: this.baseDir, encoding: 'utf8', timeout: 5000 }).trim();
      const status = execSync('git status --porcelain', { cwd: this.baseDir, encoding: 'utf8', timeout: 5000 }).trim();
      return { commit, branch, dirty: status.length > 0, statusOutput: status };
    } catch {
      return { commit: 'UNKNOWN', branch: 'UNKNOWN', dirty: false, statusOutput: '' };
    }
  }

  /**
   * Cria um snapshot capturando o estado atual e arquivos alvo.
   * @param {object} params
   * @param {string} params.sessionId
   * @param {string} params.proposalId
   * @param {Array<string>} [params.targetFiles] - Arquivos que poderão ser modificados
   * @returns {Promise<object>} Objeto do snapshot
   */
  async createSnapshot(params = {}) {
    const snapshotId = `snap-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const targetDir = path.join(this.snapshotsDir, snapshotId);
    fs.mkdirSync(targetDir, { recursive: true });

    const targetFiles = Array.isArray(params.targetFiles) ? params.targetFiles : [];
    const filesMetadata = [];

    for (const relPath of targetFiles) {
      const absPath = path.isAbsolute(relPath) ? relPath : path.resolve(this.baseDir, relPath);
      const relative = path.relative(this.baseDir, absPath);
      const exists = fs.existsSync(absPath);

      let hash = null;
      let backupRel = null;

      if (exists) {
        hash = this._computeFileHash(absPath);
        // Fazer backup do arquivo
        const backupDest = path.join(targetDir, 'files', relative);
        fs.mkdirSync(path.dirname(backupDest), { recursive: true });
        fs.copyFileSync(absPath, backupDest);
        backupRel = path.relative(targetDir, backupDest);
      }

      filesMetadata.push({
        relativePath: relative,
        absolutePath: absPath,
        existed: exists,
        originalHash: hash,
        backupRelativePath: backupRel
      });
    }

    const gitInfo = this._getGitInfo();
    const snapshot = {
      snapshotId,
      sessionId: params.sessionId || null,
      proposalId: params.proposalId || null,
      createdAt: new Date().toISOString(),
      baseDir: this.baseDir,
      git: gitInfo,
      files: filesMetadata
    };

    fs.writeFileSync(path.join(targetDir, 'snapshot.json'), JSON.stringify(snapshot, null, 2), 'utf8');
    this.logger.info?.(`[EvolutionSnapshot] Snapshot ${snapshotId} criado com ${filesMetadata.length} arquivos.`);
    return snapshot;
  }

  /**
   * Executa o rollback atômico restaurando os arquivos originais e removendo arquivos criados.
   * @param {string} snapshotId
   * @returns {Promise<{ success: boolean, filesRestored: Array<string>, filesRemoved: Array<string>, verified: boolean, errors: Array<string> }>}
   */
  async rollback(snapshotId) {
    const targetDir = path.join(this.snapshotsDir, snapshotId);
    const metaPath = path.join(targetDir, 'snapshot.json');

    if (!fs.existsSync(metaPath)) {
      throw new Error(`Snapshot ${snapshotId} não encontrado em ${targetDir}`);
    }

    const snapshot = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const filesRestored = [];
    const filesRemoved = [];
    const errors = [];
    let allVerified = true;

    for (const fileMeta of snapshot.files) {
      try {
        if (fileMeta.existed) {
          // Restaurar a partir do backup
          const backupPath = path.join(targetDir, fileMeta.backupRelativePath);
          if (fs.existsSync(backupPath)) {
            fs.mkdirSync(path.dirname(fileMeta.absolutePath), { recursive: true });
            fs.copyFileSync(backupPath, fileMeta.absolutePath);

            // Verificar integridade do hash pós-restauração
            const restoredHash = this._computeFileHash(fileMeta.absolutePath);
            if (restoredHash === fileMeta.originalHash) {
              filesRestored.push(fileMeta.relativePath);
            } else {
              allVerified = false;
              errors.push(`Hash mismatch para ${fileMeta.relativePath} pós-restauração`);
            }
          } else {
            allVerified = false;
            errors.push(`Arquivo de backup não encontrado para ${fileMeta.relativePath}`);
          }
        } else {
          // O arquivo não existia antes do snapshot: se foi criado, remover
          if (fs.existsSync(fileMeta.absolutePath)) {
            fs.unlinkSync(fileMeta.absolutePath);
            filesRemoved.push(fileMeta.relativePath);
          }
        }
      } catch (err) {
        allVerified = false;
        errors.push(`Erro ao restaurar ${fileMeta.relativePath}: ${err.message}`);
      }
    }

    this.logger.info?.(`[EvolutionSnapshot] Rollback de ${snapshotId} concluído. Restaurados: ${filesRestored.length}, Removidos: ${filesRemoved.length}, Verificado: ${allVerified}`);
    return {
      success: errors.length === 0,
      filesRestored,
      filesRemoved,
      verified: allVerified,
      errors
    };
  }

  /**
   * Verifica se houve alteração (drift) nos arquivos monitorados pelo snapshot.
   * @param {string} snapshotId
   * @returns {boolean}
   */
  hasDrift(snapshotId) {
    const targetDir = path.join(this.snapshotsDir, snapshotId);
    const metaPath = path.join(targetDir, 'snapshot.json');
    if (!fs.existsSync(metaPath)) return false;

    const snapshot = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    for (const fileMeta of snapshot.files) {
      const existsNow = fs.existsSync(fileMeta.absolutePath);
      if (existsNow !== fileMeta.existed) return true;
      if (existsNow) {
        const currentHash = this._computeFileHash(fileMeta.absolutePath);
        if (currentHash !== fileMeta.originalHash) return true;
      }
    }
    return false;
  }

  /**
   * Remove o diretório temporário do snapshot.
   * @param {string} snapshotId
   */
  cleanup(snapshotId) {
    try {
      const targetDir = path.join(this.snapshotsDir, snapshotId);
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
        this.logger.info?.(`[EvolutionSnapshot] Snapshot ${snapshotId} limpo.`);
      }
    } catch (err) {
      this.logger.warn?.(`[EvolutionSnapshot] Erro ao limpar snapshot ${snapshotId}:`, err.message);
    }
  }
}

module.exports = {
  EvolutionSnapshot
};
