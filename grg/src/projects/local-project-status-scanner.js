'use strict';

const net = require('node:net');
const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');

let statusCache = {
  timestamp: 0,
  data: {}
};
const CACHE_TTL_MS = 5000;

function getCatalogPath() {
  if (process.env.FENIX_LOCAL_PROJECT_CATALOG) return process.env.FENIX_LOCAL_PROJECT_CATALOG;
  const userPath = path.join(os.homedir(), 'Desktop', 'PROJETOS', 'projetos.json');
  if (fs.existsSync(userPath)) return userPath;
  const repoFallback = path.resolve(__dirname, '..', '..', 'memory', 'local-catalog-manifest.json');
  if (fs.existsSync(repoFallback)) return repoFallback;
  return userPath;
}

function getLogsDir() {
  const catalog = getCatalogPath();
  const dir = path.join(path.dirname(catalog), 'logs');
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
  }
  return dir;
}

function loadCatalogItems() {
  const filePath = getCatalogPath();
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
    const json = JSON.parse(raw);
    return Array.isArray(json.items) ? json.items : [];
  } catch (err) {
    console.error('[Scanner] Erro ao carregar catalogo:', err.message);
    return [];
  }
}

/**
 * Testa se uma porta TCP local está em escuta
 */
function probeTcpPort(port, timeoutMs = 250) {
  const numPort = Number(port);
  if (!Number.isInteger(numPort) || numPort < 1 || numPort > 65535) {
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    let resolved = false;
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);

    const onDone = (isOpen) => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(isOpen);
      }
    };

    socket.once('connect', () => onDone(true));
    socket.once('timeout', () => onDone(false));
    socket.once('error', () => onDone(false));

    socket.connect(numPort, '127.0.0.1');
  });
}

/**
 * Testa um endpoint HTTP/HTTPS com timeout curto
 */
function probeHttp(targetUrl, timeoutMs = 600) {
  if (!targetUrl || typeof targetUrl !== 'string') return Promise.resolve(false);
  return new Promise((resolve) => {
    let parsed;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return resolve(false);
    }
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.get(parsed, { timeout: timeoutMs, headers: { 'User-Agent': 'Fenix-Project-Scanner/1.0' } }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500);
      res.resume();
    });
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
  });
}

/**
 * Escaneia o status de um item específico
 */
async function scanProject(entry) {
  const id = entry.id;
  const localPort = entry.localPort ? Number(entry.localPort) : null;
  const apiPort = entry.apiPort ? Number(entry.apiPort) : null;

  const [localPortOpen, apiPortOpen, healthOk, remoteHealthOk] = await Promise.all([
    localPort ? probeTcpPort(localPort) : Promise.resolve(false),
    apiPort ? probeTcpPort(apiPort) : Promise.resolve(false),
    entry.healthUrl ? probeHttp(entry.healthUrl) : Promise.resolve(false),
    entry.remoteHealthUrl ? probeHttp(entry.remoteHealthUrl, 750) : Promise.resolve(false)
  ]);

  const isOnline = Boolean(localPortOpen || apiPortOpen || healthOk || remoteHealthOk);
  const listeningPorts = [];
  if (localPortOpen && localPort) listeningPorts.push(localPort);
  if (apiPortOpen && apiPort) listeningPorts.push(apiPort);

  let activeUrl = null;
  if (isOnline) {
    if (localPortOpen && entry.localUrl) activeUrl = entry.localUrl;
    else if (healthOk && entry.healthUrl) activeUrl = entry.healthUrl;
    else if (remoteHealthOk && (entry.remoteUrl || entry.remoteHealthUrl)) activeUrl = entry.remoteUrl || entry.remoteHealthUrl;
    else if (entry.localUrl && (localPortOpen || healthOk)) activeUrl = entry.localUrl;
    else if (entry.remoteUrl) activeUrl = entry.remoteUrl;
  }

  return {
    id,
    online: isOnline,
    status: isOnline ? 'ONLINE' : 'OFFLINE',
    localPortOpen,
    apiPortOpen,
    healthOk: Boolean(healthOk || remoteHealthOk),
    remoteHealthOk,
    listeningPorts,
    activeUrl,
    localUrl: entry.localUrl || null,
    remoteUrl: entry.remoteUrl || null,
    healthUrl: entry.healthUrl || null,
    remoteHealthUrl: entry.remoteHealthUrl || null,
    localPort,
    apiPort,
    group: entry.group || 'Geral',
    versionRole: entry.versionRole || 'Principal',
    mode: entry.mode || 'web',
    command: entry.command || null,
    path: entry.path || null,
    lastScanned: Date.now()
  };
}

/**
 * Varre todos os projetos cadastrados com cache de 5s
 */
async function scanAll(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && (now - statusCache.timestamp) < CACHE_TTL_MS && Object.keys(statusCache.data).length > 0) {
    return statusCache.data;
  }

  const items = loadCatalogItems();
  const results = await Promise.all(items.map((entry) => scanProject(entry)));
  const map = {};
  for (const item of results) {
    map[item.id] = item;
  }

  statusCache = {
    timestamp: now,
    data: map
  };

  return map;
}

/**
 * Retesta apenas um projeto e atualiza o cache
 */
async function scanOne(projectId) {
  const cleanId = String(projectId).replace(/^local-/, '');
  const items = loadCatalogItems();
  const entry = items.find((it) => it.id === cleanId || it.id === projectId);
  if (!entry) return null;

  const res = await scanProject(entry);
  if (!statusCache.data) statusCache.data = {};
  statusCache.data[cleanId] = res;
  return res;
}

/**
 * Executa o comando de inicialização do projeto em segundo plano
 */
function startProject(projectId) {
  const cleanId = String(projectId).replace(/^local-/, '');
  const items = loadCatalogItems();
  const entry = items.find((it) => it.id === cleanId);
  if (!entry) throw new Error(`Projeto '${cleanId}' não encontrado no catálogo.`);
  const localPathExists = Boolean(entry.path && fs.existsSync(entry.path));
  if (!localPathExists) {
    if (entry.remoteUrl || entry.localUrl) {
      return {
        success: true,
        pid: null,
        mode: 'remote-redirect',
        activeUrl: entry.remoteUrl || entry.localUrl,
        message: `Projeto '${entry.name}' registrado no catálogo (${entry.remoteUrl ? 'VPS/Cloud: ' + entry.remoteUrl : 'Local: ' + entry.localUrl}).`
      };
    }
    throw new Error(`Caminho local '${entry.path}' indisponível neste host (${process.platform}). Use "Rodar na VPS" ou sincronize o workspace.`);
  }
  if (!entry.command) {
    if (entry.mode === 'file' && process.platform === 'win32') {
      spawn('cmd.exe', ['/c', 'start', '""', entry.path], { detached: true, stdio: 'ignore' }).unref();
      return { success: true, pid: null, message: `Arquivo '${entry.name}' aberto com sucesso.` };
    }
    if (entry.mode === 'folder' && process.platform === 'win32') {
      return openProjectFolder(projectId);
    }
    throw new Error(`Projeto '${entry.name}' não possui comando de inicialização configurado.`);
  }

  const logsDir = getLogsDir();
  const logFile = path.join(logsDir, `${cleanId}.log`);

  try {
    fs.writeFileSync(logFile, `[${new Date().toISOString()}] Inicializando ${entry.name} via Fenix GRG...\nCmd: ${entry.command}\nCwd: ${entry.path}\n\n`);
  } catch (_) {}

  const out = fs.openSync(logFile, 'a');
  const err = fs.openSync(logFile, 'a');

  const shellCmd = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : '/bin/sh';
  const shellArgs = process.platform === 'win32' ? ['/d', '/c', entry.command] : ['-c', entry.command];

  const child = spawn(shellCmd, shellArgs, {
    cwd: entry.path,
    detached: true,
    stdio: ['ignore', out, err],
    windowsHide: true
  });

  child.unref();

  return {
    success: true,
    pid: child.pid,
    logFile,
    message: `Serviço '${entry.name}' iniciado em segundo plano (PID ${child.pid}).`
  };
}

/**
 * Abre a pasta do projeto no Windows Explorer
 */
function openProjectFolder(projectId) {
  const cleanId = String(projectId).replace(/^local-/, '');
  const items = loadCatalogItems();
  const entry = items.find((it) => it.id === cleanId);
  if (!entry) throw new Error(`Projeto '${cleanId}' não encontrado.`);
  const targetPath = entry.path;
  if (!targetPath || !fs.existsSync(targetPath)) throw new Error(`Pasta não encontrada: ${targetPath}`);

  spawn('explorer.exe', [targetPath], { detached: true, stdio: 'ignore' }).unref();
  return { success: true, path: targetPath };
}

/**
 * Lê os logs recentes de um projeto
 */
function getProjectLogs(projectId, maxLines = 100) {
  const cleanId = String(projectId).replace(/^local-/, '');
  const logsDir = getLogsDir();
  const logFile = path.join(logsDir, `${cleanId}.log`);
  if (!fs.existsSync(logFile)) return { lines: [], exists: false };

  try {
    const content = fs.readFileSync(logFile, 'utf8');
    const allLines = content.split('\n');
    const lines = allLines.slice(-maxLines);
    return { lines, exists: true, logFile };
  } catch (err) {
    return { lines: [`Erro ao ler log: ${err.message}`], exists: false };
  }
}

module.exports = {
  scanAll,
  scanOne,
  startProject,
  openProjectFolder,
  getProjectLogs,
  loadCatalogItems
};
