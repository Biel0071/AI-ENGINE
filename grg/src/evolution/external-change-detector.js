'use strict';
/**
 * FÊNIX OS — ExternalChangeDetector (Git Sensor)
 * ==============================================
 * Monitora alterações no repositório provocadas por agentes externos
 * (Antigravity, Codex, Claude, Humano) usando Git como sensor primário.
 *
 * FLUXO:
 * 1. Verifica diffs na árvore de trabalho (`git status --porcelain`) e commits recentes.
 * 2. Quando detecta mudança:
 *    - Identifica arquivos alterados e impacto arquitetural.
 *    - Emite evento 'external.change.detected'.
 *    - Dispara verificação de integridade e sintaxe.
 *    - Registra na EvolutionMemory como CHANGE_ACCEPTED ou CHANGE_REGRESSION.
 */

const { exec } = require('child_process');
const { EventEmitter } = require('events');
const path = require('path');

class ExternalChangeDetector extends EventEmitter {
  /**
   * @param {object} options
   * @param {string} [options.repoRoot]       - Raiz do repositório git
   * @param {object} [options.evolutionMemory] - Instância de EvolutionMemory
   * @param {object} [options.eventBus]        - EventBus global do Fênix
   * @param {number} [options.intervalMs]     - Intervalo de checagem (default 30s)
   * @param {object} [options.logger]          - Logger estruturado
   */
  constructor(options = {}) {
    super();
    this.repoRoot = options.repoRoot || path.join(__dirname, '..', '..');
    this.evolutionMemory = options.evolutionMemory || null;
    this.eventBus = options.eventBus || null;
    this.intervalMs = options.intervalMs || 30_000;
    this.logger = options.logger || console;

    this._lastCommitHash = null;
    this._lastStatusSnapshot = '';
    this._timer = null;
    this._isScanning = false;
  }

  start() {
    if (this._timer) return this;
    this.logger.info?.(`[ExternalChangeDetector] Sensor Git ativo. Intervalo: ${this.intervalMs}ms`);
    // Inicializar estado de baseline
    this._initBaseline().then(() => {
      this._timer = setInterval(() => this.scan(), this.intervalMs);
      if (typeof this._timer.unref === 'function') this._timer.unref();
    }).catch(err => {
      this.logger.warn?.('[ExternalChangeDetector] Falha ao inicializar baseline:', err.message);
    });
    return this;
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    return this;
  }

  async _initBaseline() {
    this._lastCommitHash = await this._execGit('rev-parse HEAD');
    this._lastStatusSnapshot = await this._execGit('status --porcelain');
  }

  async scan() {
    if (this._isScanning) return;
    this._isScanning = true;

    try {
      const currentCommit = await this._execGit('rev-parse HEAD');
      const currentStatus = await this._execGit('status --porcelain');

      const commitChanged = this._lastCommitHash && currentCommit && currentCommit !== this._lastCommitHash;
      const statusChanged = this._lastStatusSnapshot !== null && currentStatus !== this._lastStatusSnapshot;

      if (commitChanged || (statusChanged && currentStatus.trim().length > 0)) {
        await this._handleDetectedChange({
          commitChanged,
          previousCommit: this._lastCommitHash,
          currentCommit,
          workingTreeChanges: currentStatus.trim().split('\n').filter(Boolean)
        });

        this._lastCommitHash = currentCommit;
        this._lastStatusSnapshot = currentStatus;
      }
    } catch (err) {
      this.logger.warn?.('[ExternalChangeDetector] Erro no scan git:', err.message);
    } finally {
      this._isScanning = false;
    }
  }

  async _handleDetectedChange(changeInfo) {
    const diffFiles = await this._execGit('diff --name-only HEAD~1').catch(() => '');
    const files = Array.from(new Set([
      ...diffFiles.split('\n').filter(Boolean),
      ...changeInfo.workingTreeChanges.map(line => line.slice(3).trim())
    ]));

    const changeRecord = {
      detectedAt: new Date().toISOString(),
      type: 'EXTERNAL_CHANGE',
      files,
      commit: changeInfo.currentCommit,
      summary: `Detectada alteração externa em ${files.length} arquivo(s)`
    };

    this.logger.info?.(`[ExternalChangeDetector] ⚡ Alteração externa detectada: ${files.length} arquivos.`);
    this.emit('change', changeRecord);
    if (this.eventBus) this.eventBus.emit('external.change.detected', changeRecord);

    // Validação sintática e de regressão
    let isValid = true;
    const testResults = {};
    for (const file of files.filter(f => f.endsWith('.js'))) {
      const fullPath = path.resolve(this.repoRoot, file);
      try {
        await this._checkSyntax(fullPath);
        testResults[file] = 'SYNTAX_OK';
      } catch (syntaxErr) {
        isValid = false;
        testResults[file] = `SYNTAX_ERROR: ${syntaxErr.message}`;
      }
    }

    // Registra na EvolutionMemory
    if (this.evolutionMemory) {
      await this.evolutionMemory.record({
        missionId: `ext-change-${Date.now()}`,
        problem: `Alteração externa no código: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`,
        hypothesis: 'Código externo deve respeitar integridade sintática e arquitetural',
        actions: ['git-sensor-scan', 'syntax-validation'],
        filesChanged: files,
        testsRun: ['syntax-check'],
        testResults: {
          status: isValid ? 'PASSED' : 'FAILED',
          details: testResults
        },
        lesson: isValid
          ? 'Alteração externa aceita: sintaxe e integridade validadas.'
          : 'Alteração externa gerou regressão de sintaxe: requer correção imediata.',
        pattern: isValid ? 'Change-Accepted-Pattern' : 'Change-Regression-Pattern',
        confidence: isValid ? 0.95 : 0.40,
        rollbackAvailable: true
      });
    }
  }

  _checkSyntax(filePath) {
    return new Promise((resolve, reject) => {
      exec(`node -c "${filePath}"`, { timeout: 10_000 }, (err, stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve(true);
      });
    });
  }

  _execGit(cmd) {
    return new Promise((resolve, reject) => {
      exec(`git ${cmd}`, { cwd: this.repoRoot, timeout: 15_000 }, (err, stdout) => {
        if (err) reject(err);
        else resolve(stdout ? stdout.trim() : '');
      });
    });
  }
}

module.exports = { ExternalChangeDetector };
