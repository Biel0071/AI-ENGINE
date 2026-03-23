#!/usr/bin/env node

const net = require('net');
const { spawn } = require('child_process');

function usage() {
  console.error('Usage: node runWhenPortFree.js <port> <command...>');
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port: Number(port) });

    socket.on('connect', () => {
      socket.end();
      resolve(true);
    });

    socket.on('error', () => {
      resolve(false);
    });
  });
}

async function main() {
  const [, , portArg, ...commandArgs] = process.argv;

  if (!portArg || commandArgs.length === 0) {
    usage();
    process.exit(1);
  }

  const port = Number(portArg);
  const command = commandArgs.join(' ');

  if (!Number.isFinite(port) || port <= 0) {
    console.error(`[runWhenPortFree] Invalid port: ${portArg}`);
    process.exit(1);
  }

  const occupied = await isPortInUse(port);

  if (occupied) {
    console.log(`[runWhenPortFree] Port ${port} already in use. Skipping command: ${command}`);
    process.exit(0);
  }

  const child = spawn(command, {
    shell: true,
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code) => {
    process.exit(code == null ? 1 : code);
  });

  child.on('error', (error) => {
    console.error('[runWhenPortFree] Failed to start command:', error.message);
    process.exit(1);
  });

  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
}

void main();
