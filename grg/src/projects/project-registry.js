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
          for (const p of data.projects) {
            this.projects.set(p.projectId, p);
          }
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

module.exports = { ProjectRegistry };
