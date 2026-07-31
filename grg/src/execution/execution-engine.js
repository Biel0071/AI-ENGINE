const { spawn } = require('node:child_process');
const { EventEmitter } = require('node:events');

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

class ExecutionEngine {
  constructor(eventBus, workspaceRoot) {
    this.bus = eventBus;
    this.workspaceRoot = workspaceRoot;
    this.activeSessions = new Map();
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

    const child = spawn(cmd, args, {
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
      startTime: Date.now()
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
      this.bus.emit('dev:terminalOutput', {
        sessionId,
        type: 'stdout',
        data: data.toString()
      });
    });

    child.stderr.on('data', (data) => {
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
        this.activeSessions.delete(sessionId);
        
        this.bus.emit('dev:terminalFinished', {
          sessionId,
          exitCode: code,
          durationMs: Date.now() - session.startTime
        });
        
        resolve({ code });
      });

      child.on('error', (err) => {
        if (timeoutId) clearTimeout(timeoutId);
        session.status = 'FAILED';
        this.activeSessions.delete(sessionId);
        
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
}

module.exports = { ExecutionEngine };
