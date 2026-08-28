const { spawn } = require('node:child_process');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');

const ALLOWED_COMMANDS = new Set([
  'npm', 'pnpm', 'yarn', 
  'git', 'docker', 'node', 'python'
]);

// Basic argument whitelist per command for extra safety (optional but good practice)
const ALLOWED_SUBCOMMANDS = {
  npm: new Set(['install', 'run', 'test', 'build', 'start', 'ci']),
  git: new Set(['status', 'add', 'commit', 'push', 'pull', 'checkout', 'branch', 'diff', 'fetch', 'merge', 'stash', 'log']),
  docker: new Set(['compose', 'ps', 'logs'])
};

function resolveInvocation(command, args, options = {}) {
  const platform = options.platform || process.platform;
  const env = options.env || process.env;
  const execPath = options.execPath || process.execPath;
  const exists = options.exists || fs.existsSync;
  if (platform !== 'win32' || !['npm', 'pnpm', 'yarn'].includes(command)) return { command, args };

  const configured = env[`FENIX_${command.toUpperCase()}_CLI`];
  const programFiles = env.ProgramFiles || 'C:\\Program Files';
  const candidates = {
    npm: [configured, path.join(path.dirname(execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'), path.join(programFiles, 'nodejs', 'node_modules', 'npm', 'bin', 'npm-cli.js')],
    pnpm: [configured, path.join(programFiles, 'nodejs', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs')],
    yarn: [configured, path.join(programFiles, 'nodejs', 'node_modules', 'yarn', 'bin', 'yarn.js')],
  }[command].filter(Boolean);
  const cli = candidates.find((candidate) => exists(candidate));
  if (!cli) throw new Error(`ExecutionEngine cannot locate the ${command} CLI on Windows; configure FENIX_${command.toUpperCase()}_CLI`);
  return { command: execPath, args: [cli, ...args] };
}

class ExecutionEngine {
  constructor(eventBus, workspaceRoot) {
    this.bus = eventBus;
    this.workspaceRoot = workspaceRoot;
    this.activeSessions = new Map();
    this.completedSessions = new Map();
  }

  _validateCommand(cmd, args) {
    if (!ALLOWED_COMMANDS.has(cmd)) {
      throw new Error(`ExecutionEngine Security Violation: Command '${cmd}' is not in the whitelist.`);
    }

    if (ALLOWED_SUBCOMMANDS[cmd] && args.length > 0) {
      // Very basic sub-command check (just the first argument)
      const subcmd = args[0];
      // Note: This check is relaxed for tools like node and python where args are files
      if (!ALLOWED_SUBCOMMANDS[cmd].has(subcmd) && !subcmd.startsWith('-')) {
         // Some commands might have dynamic arguments, but if there's a strict list, we enforce it.
         // For git/docker/npm we strictly enforce the first word
         if (['git', 'docker', 'npm'].includes(cmd)) {
           throw new Error(`ExecutionEngine Security Violation: Subcommand '${subcmd}' for '${cmd}' is not allowed.`);
         }
      }
    }
  }

  execute(sessionId, commandString, options = {}) {
    const { 
      cwd = this.workspaceRoot, 
      timeoutMs = 60000, 
      env = process.env 
    } = options;

    // Very naive parser for simple commands. A real terminal would accept the string 
    // and we'd parse it. We assume no shell meta-characters like | or && for this secure version.
    const parts = commandString.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    if (parts.length === 0) throw new Error('Empty command');
    
    const cmd = parts[0];
    const args = parts.slice(1).map(p => p.replace(/^"|"$/g, '')); // remove quotes

    this._validateCommand(cmd, args);

    const invocation = resolveInvocation(cmd, args, { env });
    const child = spawn(invocation.command, invocation.args, {
      cwd,
      env,
      shell: false // Enforce NO shell execution to prevent injection (&&, ;, |)
    });

    const session = {
      id: sessionId,
      process: child,
      command: commandString,
      cwd,
      status: 'RUNNING',
      startTime: Date.now(),
      output: []
    };

    this.activeSessions.set(sessionId, session);
    this.bus.emit('dev:terminalStarted', { sessionId, command: commandString });

    let timeoutId = null;
    if (timeoutMs) {
      timeoutId = setTimeout(() => {
        this.cancel(sessionId, 'Timeout exceeded');
      }, timeoutMs);
    }

    child.stdout.on('data', (data) => {
      session.output.push({ type: 'stdout', data: data.toString(), at: new Date().toISOString() });
      this.bus.emit('dev:terminalOutput', {
        sessionId,
        type: 'stdout',
        data: data.toString()
      });
    });

    child.stderr.on('data', (data) => {
      session.output.push({ type: 'stderr', data: data.toString(), at: new Date().toISOString() });
      this.bus.emit('dev:terminalOutput', {
        sessionId,
        type: 'stderr',
        data: data.toString()
      });
    });

    return new Promise((resolve) => {
      child.on('close', (code) => {
        if (timeoutId) clearTimeout(timeoutId);
        session.status = 'FINISHED';
        session.exitCode = code;
        session.durationMs = Date.now() - session.startTime;
        this.activeSessions.delete(sessionId);
        this.completedSessions.set(sessionId, session);
        this._trimCompleted();
        
        this.bus.emit('dev:terminalFinished', {
          sessionId,
          exitCode: code,
          durationMs: session.durationMs
        });
        
        resolve({ code });
      });

      child.on('error', (err) => {
        if (timeoutId) clearTimeout(timeoutId);
        session.status = 'FAILED';
        session.exitCode = 1;
        session.error = err.message;
        session.durationMs = Date.now() - session.startTime;
        this.activeSessions.delete(sessionId);
        session.output.push({ type: 'stderr', data: `Error: ${err.message}\n`, at: new Date().toISOString() });
        this.completedSessions.set(sessionId, session);
        this._trimCompleted();
        
        this.bus.emit('dev:terminalOutput', {
          sessionId,
          type: 'stderr',
          data: `Error: ${err.message}\n`
        });
        
        this.bus.emit('dev:terminalFinished', {
          sessionId,
          exitCode: 1,
          error: err.message,
          durationMs: Date.now() - session.startTime
        });
        
        resolve({ code: 1, error: err.message });
      });
    });
  }

  cancel(sessionId, reason = 'User cancelled') {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;
    
    this.bus.emit('dev:terminalOutput', {
      sessionId,
      type: 'stderr',
      data: `[Session Cancelled: ${reason}]\n`
    });

    session.process.kill('SIGINT');
    setTimeout(() => {
      if (this.activeSessions.has(sessionId)) {
        session.process.kill('SIGKILL');
      }
    }, 2000);
    
    return true;
  }

  getSession(sessionId) {
    const session = this.activeSessions.get(sessionId) || this.completedSessions.get(sessionId);
    if (!session) return null;
    return {
      id: session.id,
      command: session.command,
      cwd: session.cwd,
      status: session.status,
      exitCode: session.exitCode ?? null,
      error: session.error || null,
      durationMs: session.durationMs ?? (Date.now() - session.startTime),
      output: session.output || [],
    };
  }

  _trimCompleted() {
    const keep = 40;
    while (this.completedSessions.size > keep) {
      const first = this.completedSessions.keys().next().value;
      this.completedSessions.delete(first);
    }
  }
}

module.exports = { ExecutionEngine, resolveInvocation };
