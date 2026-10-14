'use strict';
/**
 * FÊNIX OS — Sandbox Runner
 * =========================
 * Executor de testes, sintaxe e comandos em subprocesso isolado com
 * proteção estrita contra deadlocks, timeouts e vazamento de memória.
 */

const { spawn } = require('child_process');
const crypto = require('crypto');
const path = require('path');

const DEFAULT_TIMEOUT_MS = 45_000;
const MAX_OUTPUT_BYTES = 1024 * 1024; // 1 MB buffer limit

class SandboxRunner {
  /**
   * @param {object} options
   * @param {string} [options.cwd]        - Diretório de trabalho padrão
   * @param {number} [options.timeoutMs]  - Timeout em ms
   * @param {object} [options.logger]     - Logger
   */
  constructor(options = {}) {
    this.cwd = options.cwd || path.resolve(__dirname, '..', '..');
    this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    this.logger = options.logger || console;
  }

  /**
   * Executa um comando em subprocesso isolado com controle rigoroso de ciclo de vida.
   * @param {string} command
   * @param {Array<string>} [args]
   * @param {object} [options]
   * @returns {Promise<{ exitCode: number, stdout: string, stderr: string, durationMs: number, timedOut: boolean, evidenceHash: string }>}
   */
  async runCommand(command, args = [], options = {}) {
    const cwd = options.cwd || this.cwd;
    const timeoutMs = options.timeoutMs || this.timeoutMs;
    const startedAt = Date.now();

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let killed = false;

      const child = spawn(command, args, {
        cwd,
        env: { ...process.env, ...options.env, NODE_ENV: 'test', FENIX_SANDBOX: 'true' },
        shell: false
      });

      const timer = setTimeout(() => {
        timedOut = true;
        killed = true;
        this.logger.warn?.(`[SandboxRunner] Processo ${command} excedeu timeout de ${timeoutMs}ms. Forçando encerramento.`);
        try {
          if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', child.pid, '/f', '/t']);
          } else {
            child.kill('SIGKILL');
          }
        } catch {
          // Ignorar se já fechou
        }
      }, timeoutMs);

      child.stdout?.on('data', (chunk) => {
        if (stdout.length < MAX_OUTPUT_BYTES) {
          stdout += chunk.toString();
        }
      });

      child.stderr?.on('data', (chunk) => {
        if (stderr.length < MAX_OUTPUT_BYTES) {
          stderr += chunk.toString();
        }
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        const durationMs = Date.now() - startedAt;
        const evidenceHash = this._computeEvidence(command, args, -1, stdout, err.message, durationMs);
        resolve({
          exitCode: -1,
          stdout,
          stderr: `${stderr}\n${err.message}`,
          durationMs,
          timedOut,
          evidenceHash
        });
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        const durationMs = Date.now() - startedAt;
        const exitCode = timedOut ? -99 : (code !== null ? code : 0);
        const evidenceHash = this._computeEvidence(command, args, exitCode, stdout, stderr, durationMs);

        resolve({
          exitCode,
          stdout,
          stderr,
          durationMs,
          timedOut,
          evidenceHash
        });
      });
    });
  }

  _computeEvidence(command, args, exitCode, stdout, stderr, durationMs) {
    const raw = JSON.stringify({
      cmd: `${command} ${args.join(' ')}`,
      exitCode,
      stdoutHash: crypto.createHash('sha256').update(stdout).digest('hex').slice(0, 16),
      stderrHash: crypto.createHash('sha256').update(stderr).digest('hex').slice(0, 16),
      durationMs
    });
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Executa teste Node.js em isolamento.
   * @param {string} testFilePath
   * @param {object} [options]
   */
  async runTest(testFilePath, options = {}) {
    return this.runCommand('node', [testFilePath], options);
  }

  /**
   * Valida a sintaxe de um arquivo JS via node -c.
   * @param {string} filePath
   */
  async runSyntaxCheck(filePath) {
    return this.runCommand('node', ['-c', filePath]);
  }
}

module.exports = {
  SandboxRunner,
  DEFAULT_TIMEOUT_MS
};
