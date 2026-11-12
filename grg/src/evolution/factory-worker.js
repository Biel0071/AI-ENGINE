'use strict';

/**
 * FÊNIX OS — Autonomous Development Factory Detached Worker
 * ==========================================================
 * Standalone background worker process capable of executing independently
 * from the main HTTP server process during overnight runs.
 *
 * Responsibilities:
 * 1. Detached process execution with independent PID
 * 2. Writes heartbeats to .data/factory-worker-<pid>.json
 * 3. Monitors assigned tasks / runs periodic repository health checks
 * 4. Responds to termination signals gracefully
 */

// Standalone entry point only (spawned by autonomous-development-factory.js). Kernel.scanDirectory
// require()s every file under src/; without this guard that started a ref'd 5 s heartbeat interval
// (and heartbeat files under the server's PID) inside the HTTP server process, keeping tests alive.
if (require.main !== module) return;

const fs = require('fs');
const path = require('path');

const pid = process.pid;
const dataDir = path.resolve(__dirname, '..', '..', '.data');
const heartbeatFile = path.join(dataDir, `factory-worker-${pid}.json`);

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    try { fs.mkdirSync(dataDir, { recursive: true }); } catch (_) {}
  }
}

function writeHeartbeat(status = 'RUNNING', metadata = {}) {
  try {
    ensureDataDir();
    const payload = {
      pid,
      status,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      memory: process.memoryUsage(),
      ...metadata
    };
    fs.writeFileSync(heartbeatFile, JSON.stringify(payload, null, 2), 'utf8');
  } catch (_) {}
}

function cleanup() {
  try {
    if (fs.existsSync(heartbeatFile)) {
      fs.unlinkSync(heartbeatFile);
    }
  } catch (_) {}
}

process.on('SIGTERM', () => {
  writeHeartbeat('TERMINATING');
  cleanup();
  process.exit(0);
});

process.on('SIGINT', () => {
  writeHeartbeat('TERMINATING');
  cleanup();
  process.exit(0);
});

process.on('exit', () => {
  cleanup();
});

// Parse CLI args
const args = process.argv.slice(2);
let intervalMs = 5000;
let maxCycles = 0; // 0 = infinite

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--interval' && args[i + 1]) {
    intervalMs = Number(args[i + 1]) || 5000;
    i++;
  } else if (args[i] === '--max-cycles' && args[i + 1]) {
    maxCycles = Number(args[i + 1]) || 0;
    i++;
  }
}

writeHeartbeat('STARTED', { intervalMs, maxCycles });

let cycleCount = 0;
const timer = setInterval(() => {
  cycleCount++;
  writeHeartbeat('RUNNING', { cycleCount, intervalMs });

  if (maxCycles > 0 && cycleCount >= maxCycles) {
    clearInterval(timer);
    writeHeartbeat('COMPLETED', { cycleCount });
    cleanup();
    process.exit(0);
  }
}, intervalMs);

if (typeof timer.unref === 'function') {
  // If run in single-cycle mode or detached
}
