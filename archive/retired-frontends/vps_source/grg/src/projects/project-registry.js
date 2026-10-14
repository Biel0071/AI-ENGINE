'use strict';
/**
 * FÊNIX OS V8 — Project Registry
 * Single source of truth for all managed projects.
 * Real paths verified via SSH audit on 2026-09-09.
 */

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const PROJECTS = [
  {
    projectId: 'fenix-os',
    name: 'FÊNIX OS',
    displayName: 'FÊNIX HQ',
    description: 'AI Engineering OS — Orchestrator, Memory, Agents, City',
    repository: null,
    branch: 'main',
    vpsPath: '/opt/fenix-os',
    backendPath: '/opt/fenix-os/grg',
    frontendPath: '/opt/fenix-os/grg/public',
    runtime: 'node',
    pm2Name: 'fenix-backend',
    port: 4400,
    health: 'http://localhost:4400/api/health',
    status: 'ONLINE',
    color: '#4488ff',
    palette: ['#4488ff', '#ffd700', '#001133'],
    buildingType: 'headquarters',
    icon: '🏛️',
    services: ['orchestrator', 'memory', 'agents', 'city', 'jobs', 'redis', 'postgres'],
    tags: ['core', 'ai', 'orchestrator'],
  },
  {
    projectId: 'api-platform',
    name: 'API Platform',
    displayName: 'AI Platform Tower',
    description: 'AI Provider Engine — Qwen, Ollama, Workers, Redis, Postgres',
    repository: 'https://github.com/Biel0071/AI-LLM',
    branch: 'main',
    vpsPath: '/opt/grg-fenix/workspaces/AI-PLATFORM',
    backendPath: '/opt/grg-fenix/workspaces/AI-PLATFORM/apps/api',
    frontendPath: null,
    runtime: 'docker',
    dockerContainer: 'api-platform-api-1',
    port: 3001,
    health: 'http://localhost:3001/health',
    status: 'ONLINE',
    color: '#9b59b6',
    palette: ['#9b59b6', '#2ecc71', '#0a0015'],
    buildingType: 'tower',
    icon: '🤖',
    services: ['api', 'qwen', 'ollama', 'workers', 'redis', 'postgres', 'telemetry'],
    tags: ['ai', 'api', 'provider'],
  },
  {
    projectId: 'zapai-crm',
    name: 'ZapAI CRM',
    displayName: 'ZapAI Tower',
    description: 'CRM — WhatsApp, Automation, Campaigns, Inbox, Contacts',
    repository: 'https://github.com/Biel0071/ZAPAI-FINAL',
    branch: 'main',
    vpsPath: '/opt/zapai',
    backendPath: '/opt/zapai/backend',
    frontendPath: '/opt/zapai/frontend-official',
    runtime: 'node',
    pm2Name: 'zapflow-api',
    port: null,
    health: null,
    status: 'ONLINE',
    color: '#e67e22',
    palette: ['#e67e22', '#e74c3c', '#1a0500'],
    buildingType: 'crm-tower',
    icon: '📱',
    services: ['crm', 'whatsapp', 'automation', 'campaigns', 'inbox', 'contacts', 'analytics'],
    tags: ['crm', 'whatsapp', 'saas'],
  },
];

function getGitInfo(vpsPath) {
  try {
    const branch = execSync('git -C ' + vpsPath + ' rev-parse --abbrev-ref HEAD 2>/dev/null', { timeout: 3000 }).toString().trim();
    const lastCommit = execSync('git -C ' + vpsPath + ' log --oneline -1 2>/dev/null', { timeout: 3000 }).toString().trim();
    const lastSync = execSync('git -C ' + vpsPath + ' log -1 --format=%ci 2>/dev/null', { timeout: 3000 }).toString().trim();
    return { branch, lastCommit, lastSync };
  } catch (e) {
    return { branch: 'unknown', lastCommit: null, lastSync: null };
  }
}

function countFiles(dir, ext) {
  try {
    const cmd = ext
      ? 'find ' + dir + ' -name "*.' + ext + '" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | wc -l'
      : 'find ' + dir + ' -type f -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | wc -l';
    return parseInt(execSync(cmd, { timeout: 5000 }).toString().trim(), 10);
  } catch (e) {
    return 0;
  }
}

function getProjectSnapshot(project) {
  const gitInfo = (project.repository || project.vpsPath) ? getGitInfo(project.vpsPath) : {};
  const fileCount = fs.existsSync(project.vpsPath) ? countFiles(project.vpsPath, null) : 0;
  const jsCount = fs.existsSync(project.vpsPath) ? countFiles(project.vpsPath, 'js') : 0;
  const tsCount = fs.existsSync(project.vpsPath) ? countFiles(project.vpsPath, 'ts') : 0;
  return Object.assign({}, project, gitInfo, {
    metrics: { totalFiles: fileCount, jsFiles: jsCount, tsFiles: tsCount },
    lastUpdated: new Date().toISOString(),
  });
}

async function checkHealth(project) {
  if (!project.health) return 'UNKNOWN';
  try {
    const res = await fetch(project.health, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return 'ONLINE';
    return 'DEGRADED';
  } catch (e) {
    return 'OFFLINE';
  }
}

async function getAllProjects() {
  const results = [];
  for (const p of PROJECTS) {
    const snapshot = getProjectSnapshot(p);
    const healthStatus = await checkHealth(p).catch(function() { return 'UNKNOWN'; });
    results.push(Object.assign({}, snapshot, { runtimeStatus: healthStatus }));
  }
  return results;
}

function getProjectById(id) {
  if (!id) return null;
  const lower = id.toLowerCase();
  return PROJECTS.find(function(p) {
    return p.projectId === id
      || p.projectId.toLowerCase() === lower
      || p.name.toLowerCase().includes(lower)
      || p.displayName.toLowerCase().includes(lower);
  }) || null;
}

module.exports = { PROJECTS, getAllProjects, getProjectById, getProjectSnapshot, checkHealth };
