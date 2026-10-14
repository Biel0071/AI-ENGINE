const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

class ProjectRegistry {
  constructor(dataFile) {
    this.dataFile = dataFile;
    this.projects = new Map();
    this.load();
  }

  load() {
    if (fs.existsSync(this.dataFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf-8'));
        if (data.projects) {
          let changed = false;
          for (const p of data.projects) {
            if (!p.operationalTwin) {
              p.operationalTwin = defaultOperationalTwin(p, p.dna);
              changed = true;
            }
            this.projects.set(p.projectId, p);
          }
          if (changed) this.save();
        }
      } catch (e) {
        console.error('Failed to load project registry:', e);
      }
    }
  }

  save() {
    const dir = path.dirname(this.dataFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.dataFile, JSON.stringify({
      projects: Array.from(this.projects.values())
    }, null, 2), 'utf-8');
  }

  register(payload) {
    const projectId = payload.projectId || crypto.randomUUID();
    const dna = payload.dna || null;
    const project = {
      projectId,
      name: payload.name || 'Unnamed Project',
      workspace: payload.workspace || process.cwd(),
      repository: payload.repository || '',
      branch: payload.branch || 'main',
      stack: payload.stack || 'unknown',
      status: payload.status || 'ACTIVE',
      autonomyLevel: payload.autonomyLevel !== undefined ? payload.autonomyLevel : 1, // 0-7
      allowedTools: payload.allowedTools || ['fs_read'],
      allowedAgents: payload.allowedAgents || ['*'],
      allowedModels: payload.allowedModels || ['*'],
      deploymentPolicy: payload.deploymentPolicy || 'require_approval',
      previewUrl: payload.previewUrl || '',
      dna,
      operationalTwin: payload.operationalTwin || defaultOperationalTwin(payload, dna),
      lastAnalyzedAt: payload.lastAnalyzedAt || null,
      registeredAt: new Date().toISOString()
    };
    this.projects.set(projectId, project);
    this.save();
    return project;
  }

  update(projectId, updates) {
    if (!this.projects.has(projectId)) return null;
    const project = this.projects.get(projectId);
    Object.assign(project, updates);
    if (!project.operationalTwin) project.operationalTwin = defaultOperationalTwin(project, project.dna);
    this.projects.set(projectId, project);
    this.save();
    return project;
  }

  get(projectId) {
    return this.projects.get(projectId) || null;
  }

  list() {
    return Array.from(this.projects.values());
  }

  delete(projectId) {
    const r = this.projects.delete(projectId);
    this.save();
    return r;
  }
}

function defaultOperationalTwin(project = {}, dna = null) {
  const domain = inferDomain(project, dna);
  const baseFloors = [
    floor(0, 'control-room', 'RECEPCAO / CONTROL ROOM', ['missions', 'events', 'incidents']),
    floor(1, 'executive', 'EXECUTIVE / ADMIN', ['governance', 'approval', 'strategy']),
    floor(2, 'projects', 'PROJECTS', ['registry', 'workspace', 'project-map']),
    floor(3, 'software-factory', 'SOFTWARE FACTORY', ['architecture', 'implementation', 'review']),
    floor(4, 'frontend', 'FRONTEND', ['components', 'styling', 'accessibility', 'responsive']),
    floor(5, 'backend', 'BACKEND', ['api', 'services', 'database', 'auth']),
    floor(6, 'qa-testing', 'QA / TESTING', ['unit', 'integration', 'e2e', 'browser']),
    floor(7, 'visual-engine', 'VISUAL ENGINE', ['visual-state', 'visual-qa', 'visual-fix']),
    floor(8, 'ai-agents', 'AI / AGENTS', workforceRooms(domain)),
    floor(9, 'rag-memory', 'RAG / MEMORY', ['rag', 'memory', 'patterns', 'decisions']),
    floor(10, 'mcp-integrations', 'MCP / INTEGRATIONS', ['mcp', 'browser', 'github', 'connectors']),
    floor(11, 'devops-vps', 'DEVOPS / VPS', ['runtime', 'workers', 'preview', 'git']),
    floor(12, 'observability', 'OBSERVABILITY', ['health', 'metrics', 'logs', 'repair'])
  ];
  return {
    schemaVersion: 1,
    name: project.towerName || 'FENIX TOWER',
    domain,
    floors: baseFloors,
    generatedAt: new Date().toISOString(),
    source: 'project-registry'
  };
}

function floor(level, key, label, rooms) {
  return {
    level,
    key,
    label,
    rooms: rooms.map((room) => ({ key: String(room).toLowerCase().replace(/[^a-z0-9]+/g, '-'), label: String(room).toUpperCase() }))
  };
}

function inferDomain(project, dna) {
  const text = `${project.name || ''} ${project.stack || ''} ${dna?.name || ''} ${JSON.stringify(dna || {})}`.toLowerCase();
  if (/commerce|checkout|payment|catalog|order|shop|store/.test(text)) return 'commerce';
  if (/crm|whatsapp|pipeline|contact|lead|customer/.test(text)) return 'crm';
  if (/saas|tenant|billing|subscription/.test(text)) return 'saas';
  if (/fenix|agent|runtime|mission|worker/.test(text)) return 'software-factory';
  return 'generic';
}

function workforceRooms(domain) {
  if (domain === 'commerce') return ['commerce architect', 'checkout engineer', 'payment integration', 'catalog agent', 'qa commerce'];
  if (domain === 'crm') return ['crm architect', 'whatsapp agent', 'pipeline agent', 'contact agent', 'automation agent'];
  if (domain === 'saas') return ['saas architect', 'auth agent', 'billing agent', 'tenant agent', 'api agent'];
  return ['architect', 'frontend engineer', 'backend engineer', 'qa engineer', 'visual qa', 'reviewer'];
}

module.exports = { ProjectRegistry };
