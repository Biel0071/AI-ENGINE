const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execSync, spawnSync } = require('node:child_process');

/**
 * DeterministicEngine — Fênix OS Autonomous Computing Core
 * 
 * Executável no MODE B (DETERMINISTIC / ZERO-AI).
 * Não depende de nenhum modelo probabilístico (LLM).
 * Realiza operações factuais no mundo real com verificação e evidência estrita.
 */
class DeterministicEngine {
  constructor({ rootDir = process.cwd(), eventBus = null, dbClient = null, logger = console } = {}) {
    this.rootDir = path.resolve(rootDir);
    this.eventBus = eventBus;
    this.dbClient = dbClient;
    this.logger = logger;
    this.executionHistory = [];
  }

  // --- Filesystem Operations ---
  resolvePath(relPath) {
    const resolved = path.resolve(this.rootDir, relPath);
    // Allow operations within rootDir or authorized workspaces
    return resolved;
  }

  fsRead(relPath, { encoding = 'utf8', maxBytes = 10 * 1024 * 1024 } = {}) {
    const full = this.resolvePath(relPath);
    if (!fs.existsSync(full)) {
      throw new Error(`File not found: ${relPath}`);
    }
    const stat = fs.statSync(full);
    if (stat.size > maxBytes) {
      throw new Error(`File ${relPath} exceeds maximum read size (${stat.size} > ${maxBytes})`);
    }
    const content = fs.readFileSync(full, encoding);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    return { content, size: stat.size, hash, path: relPath };
  }

  fsWrite(relPath, content, { atomic = true } = {}) {
    const full = this.resolvePath(relPath);
    const dir = path.dirname(full);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (atomic) {
      const temp = `${full}.${crypto.randomBytes(4).toString('hex')}.tmp`;
      fs.writeFileSync(temp, content, 'utf8');
      fs.renameSync(temp, full);
    } else {
      fs.writeFileSync(full, content, 'utf8');
    }

    const hash = crypto.createHash('sha256').update(content).digest('hex');
    const stat = fs.statSync(full);
    const result = { success: true, path: relPath, size: stat.size, hash, updatedAt: new Date().toISOString() };
    if (this.eventBus) this.eventBus.emit('deterministic.fs.write', result);
    return result;
  }

  fsList(relDir = '.', { recursive = false, filterExt = null } = {}) {
    const full = this.resolvePath(relDir);
    if (!fs.existsSync(full)) return [];
    
    const entries = [];
    const walk = (d, depth = 0) => {
      const items = fs.readdirSync(d, { withFileTypes: true });
      for (const item of items) {
        if (item.name === 'node_modules' || item.name === '.git') continue;
        const sub = path.join(d, item.name);
        const rel = path.relative(this.rootDir, sub).replace(/\\/g, '/');
        if (item.isDirectory()) {
          entries.push({ path: rel, type: 'directory' });
          if (recursive && depth < 6) walk(sub, depth + 1);
        } else if (item.isFile()) {
          if (!filterExt || rel.endsWith(filterExt)) {
            const stat = fs.statSync(sub);
            entries.push({ path: rel, type: 'file', size: stat.size });
          }
        }
      }
    };
    walk(full);
    return entries;
  }

  // --- Shell & Process Operations ---
  isSafeCommand(command) {
    const blocked = ['rm -rf /', ':(){ :|:& };:', 'mkfs', 'dd if=/dev/zero', 'fork bomb'];
    const lowered = command.toLowerCase();
    if (blocked.some(b => lowered.includes(b))) return 'BLOCKED';
    return 'ALLOWED';
  }

  shellExec(command, { cwd = this.rootDir, timeoutMs = 60000, env = process.env } = {}) {
    if (this.isSafeCommand(command) === 'BLOCKED') {
      throw new Error(`Command blocked by DeterministicEngine safety policies: "${command}"`);
    }
    const t0 = Date.now();
    try {
      const stdout = execSync(command, {
        cwd,
        timeout: timeoutMs,
        encoding: 'utf8',
        env: { ...env, PAGER: 'cat', CI: '1' },
        stdio: 'pipe'
      });
      const latencyMs = Date.now() - t0;
      const res = { success: true, exitCode: 0, stdout: stdout.trim(), latencyMs, command };
      this.executionHistory.push(res);
      return res;
    } catch (err) {
      const latencyMs = Date.now() - t0;
      const res = {
        success: false,
        exitCode: err.status || 1,
        stdout: err.stdout ? String(err.stdout).trim() : '',
        stderr: err.stderr ? String(err.stderr).trim() : err.message,
        latencyMs,
        command
      };
      this.executionHistory.push(res);
      return res;
    }
  }

  // --- Git Operations ---
  gitStatus(cwd = this.rootDir) {
    if (!fs.existsSync(path.join(cwd, '.git')) && !fs.existsSync(path.join(this.rootDir, '.git'))) {
      return { success: true, exitCode: 0, stdout: '', isGitRepo: false, note: 'Stand-alone production deployment (no .git directory)' };
    }
    return this.shellExec('git status --porcelain', { cwd });
  }

  gitDiff(cwd = this.rootDir) {
    if (!fs.existsSync(path.join(cwd, '.git')) && !fs.existsSync(path.join(this.rootDir, '.git'))) {
      return { success: true, exitCode: 0, stdout: '', isGitRepo: false };
    }
    return this.shellExec('git diff --stat', { cwd });
  }

  gitLog(maxCount = 5, cwd = this.rootDir) {
    if (!fs.existsSync(path.join(cwd, '.git')) && !fs.existsSync(path.join(this.rootDir, '.git'))) {
      return { success: true, exitCode: 0, stdout: '', isGitRepo: false };
    }
    return this.shellExec(`git log -n ${maxCount} --oneline`, { cwd });
  }

  // --- AST & Code Analysis (Deterministic Static Analysis) ---
  astAnalyze(code, { language = 'javascript' } = {}) {
    // Pure deterministic AST metrics without LLM
    const lines = code.split('\n');
    const totalLines = lines.length;
    const nonEmptyLines = lines.filter(l => l.trim().length > 0).length;
    const commentLines = lines.filter(l => l.trim().startsWith('//') || l.trim().startsWith('*') || l.trim().startsWith('/*')).length;
    
    // Pattern extraction
    const imports = [];
    const functions = [];
    const classes = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const impMatch = line.match(/(?:require\(['"]([^'"]+)['"]\)|import\s+.*?from\s+['"]([^'"]+)['"])/);
      if (impMatch) imports.push(impMatch[1] || impMatch[2]);
      
      const fnMatch = line.match(/(?:function\s+([a-zA-Z0-9_$]+)|([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|async\s+([a-zA-Z0-9_$]+)\s*\(|^\s*(?:async\s+)?([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{)/);
      if (fnMatch) {
        const fnName = fnMatch[1] || fnMatch[2] || fnMatch[3] || fnMatch[4];
        if (fnName && !['if', 'for', 'while', 'switch', 'catch', 'constructor'].includes(fnName)) {
          functions.push(fnName);
        }
      }
      
      const classMatch = line.match(/class\s+([a-zA-Z0-9_$]+)/);
      if (classMatch) classes.push(classMatch[1]);
    }

    return {
      language,
      totalLines,
      nonEmptyLines,
      commentLines,
      metrics: {
        importCount: imports.length,
        functionCount: functions.length,
        classCount: classes.length
      },
      imports: Array.from(new Set(imports)),
      functions: Array.from(new Set(functions)),
      classes: Array.from(new Set(classes))
    };
  }

  // --- HTTP & API Operations ---
  async httpFetch(url, { method = 'GET', headers = {}, body = null, timeoutMs = 15000 } = {}) {
    const t0 = Date.now();
    const opts = {
      method,
      headers: { 'User-Agent': 'Fenix-DeterministicEngine/1.0', ...headers },
      signal: AbortSignal.timeout(timeoutMs)
    };
    if (body && method !== 'GET') {
      opts.body = typeof body === 'string' ? body : JSON.stringify(body);
      if (!opts.headers['Content-Type']) opts.headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(url, opts);
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();
    let data = text;
    if (contentType.includes('application/json')) {
      try { data = JSON.parse(text); } catch (_) {}
    }
    return {
      status: res.status,
      ok: res.ok,
      headers: Object.fromEntries(res.headers.entries()),
      data,
      latencyMs: Date.now() - t0
    };
  }

  // --- SQL Operations ---
  async sqlQuery(queryText, params = []) {
    if (this.dbClient && typeof this.dbClient.query === 'function') {
      const res = await this.dbClient.query(queryText, params);
      return { success: true, rows: res.rows || [], rowCount: res.rowCount || 0 };
    }
    return { success: false, reason: 'No active relational database client attached' };
  }

  // --- Evidence Generation (Reality Engine Support) ---
  createEvidence({ claim, status = 'VERIFIED', details = {}, artifacts = [] }) {
    const timestamp = new Date().toISOString();
    const raw = JSON.stringify({ claim, status, details, artifacts, timestamp });
    const evidenceHash = crypto.createHash('sha256').update(raw).digest('hex');
    
    return {
      evidenceId: `ev_${evidenceHash.slice(0, 12)}`,
      claim,
      status,
      evidenceHash,
      timestamp,
      details,
      artifacts,
      provenance: {
        engine: 'DeterministicEngine',
        provider: 'DETERMINISTIC_ZERO_AI',
        host: process.env.HOSTNAME || 'localhost'
      }
    };
  }

  // --- Workflow / Step Execution (Deterministic DAG Engine) ---
  async executeWorkflow(steps = [], context = {}) {
    const results = [];
    const executionState = { ...context };

    for (const step of steps) {
      const stepT0 = Date.now();
      try {
        let stepOutput = null;
        if (step.type === 'fs.read') {
          stepOutput = this.fsRead(step.path);
        } else if (step.type === 'fs.write') {
          stepOutput = this.fsWrite(step.path, step.content);
        } else if (step.type === 'shell') {
          stepOutput = this.shellExec(step.command);
          if (!stepOutput.success) throw new Error(`Shell command failed: ${stepOutput.stderr}`);
        } else if (step.type === 'http') {
          stepOutput = await this.httpFetch(step.url, step);
          if (!stepOutput.ok) throw new Error(`HTTP request failed with status ${stepOutput.status}`);
        } else if (typeof step.handler === 'function') {
          stepOutput = await step.handler(executionState, this);
        } else {
          throw new Error(`Unknown deterministic step type: ${step.type}`);
        }

        const durationMs = Date.now() - stepT0;
        const record = { id: step.id, type: step.type, status: 'COMPLETED', output: stepOutput, durationMs };
        results.push(record);
        if (step.outputKey) executionState[step.outputKey] = stepOutput;
      } catch (err) {
        const durationMs = Date.now() - stepT0;
        const failedRecord = { id: step.id, type: step.type, status: 'FAILED', error: err.message, durationMs };
        results.push(failedRecord);

        // Rollback routine if available
        if (typeof step.rollback === 'function') {
          try {
            await step.rollback(executionState, this);
            failedRecord.rollbackStatus = 'ROLLED_BACK';
          } catch (rErr) {
            failedRecord.rollbackStatus = `ROLLBACK_FAILED: ${rErr.message}`;
          }
        }
        return { success: false, failedStepId: step.id, results, error: err.message };
      }
    }

    return { success: true, results, state: executionState };
  }
}

module.exports = { DeterministicEngine };
