const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PALETTES = ['ember', 'azure', 'violet', 'jade', 'gold', 'rose', 'cyan', 'steel'];
const BODY_TYPES = ['compact', 'standard', 'tall'];
const HAIR = ['short', 'swept', 'hood', 'visor', 'none'];
const ACCESSORIES = ['terminal', 'scanner', 'holo-pad', 'wrench', 'shield', 'memory-core', 'browser-lens'];

class AgentAvatarRegistry {
  constructor(dataFile) {
    this.dataFile = dataFile;
    this.avatars = new Map();
    this.load();
  }

  load() {
    try {
      if (!fs.existsSync(this.dataFile)) return;
      const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
      for (const avatar of data.avatars || []) {
        if (avatar.agentId) this.avatars.set(avatar.agentId, avatar);
      }
    } catch (error) {
      console.warn('[AgentAvatarRegistry] Failed to load avatars:', error.message);
    }
  }

  save() {
    const dir = path.dirname(this.dataFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.dataFile, JSON.stringify({ avatars: Array.from(this.avatars.values()) }, null, 2), 'utf8');
  }

  getOrCreate(agent) {
    const agentId = String(agent?.id || agent?.agentId || agent?.role || '').trim();
    if (!agentId) return null;
    const existing = this.avatars.get(agentId);
    if (existing) return { ...existing, runtimeIdentity: runtimeIdentity(agent) };
    const avatar = buildAvatar(agentId, agent);
    this.avatars.set(agentId, avatar);
    this.save();
    return { ...avatar, runtimeIdentity: runtimeIdentity(agent) };
  }
}

function buildAvatar(agentId, agent) {
  const hash = numberHash(agentId);
  const role = String(agent?.role || agent?.specialization || agentId);
  const createdAt = new Date().toISOString();
  return {
    agentId,
    name: agent?.name || humanize(agentId),
    style: 'fenix-rpg-business',
    appearance: {
      archetype: archetypeFor(role),
      colorProfile: PALETTES[hash % PALETTES.length],
      bodyType: BODY_TYPES[hash % BODY_TYPES.length],
      hair: HAIR[hash % HAIR.length],
      face: `face-${(hash % 5) + 1}`,
      clothing: clothingFor(role),
      accessory: accessoryFor(role, hash)
    },
    animationProfile: {
      idle: 'standby-breathe',
      working: 'station-focus',
      testing: 'scanner-sweep',
      repairing: 'maintenance-loop',
      blocked: 'alert-idle'
    },
    personalityProfile: {
      tone: 'operational',
      focus: role.toLowerCase()
    },
    createdAt,
    updatedAt: createdAt
  };
}

function runtimeIdentity(agent) {
  return {
    id: agent?.id || agent?.agentId || null,
    role: agent?.role || null,
    model: agent?.model || null,
    skill: agent?.skill || null,
    projectId: agent?.projectId || null,
    missionId: agent?.missionId || null,
    jobId: agent?.jobId || agent?.currentJob || null
  };
}

function archetypeFor(role) {
  const text = String(role || '').toLowerCase();
  if (/architect|principal|orchestrator|manager/.test(text)) return 'orchestrator';
  if (/front|visual|browser/.test(text)) return 'visual-engineer';
  if (/back|api|database/.test(text)) return 'systems-engineer';
  if (/qa|test/.test(text)) return 'quality-scout';
  if (/security/.test(text)) return 'security-warden';
  if (/memory|rag|knowledge/.test(text)) return 'memory-scribe';
  if (/repair|devops|git|deploy/.test(text)) return 'operations-tech';
  return 'runtime-specialist';
}

function clothingFor(role) {
  const text = String(role || '').toLowerCase();
  if (/manager|principal|orchestrator/.test(text)) return 'command-coat';
  if (/security/.test(text)) return 'shield-jacket';
  if (/repair|devops/.test(text)) return 'utility-suit';
  if (/visual|front/.test(text)) return 'designer-jacket';
  return 'engineer-suit';
}

function accessoryFor(role, hash) {
  const text = String(role || '').toLowerCase();
  if (/browser|visual/.test(text)) return 'browser-lens';
  if (/qa|test/.test(text)) return 'scanner';
  if (/repair|devops/.test(text)) return 'wrench';
  if (/security/.test(text)) return 'shield';
  if (/memory|rag|knowledge/.test(text)) return 'memory-core';
  if (/back|front|architect/.test(text)) return 'terminal';
  return ACCESSORIES[hash % ACCESSORIES.length];
}

function numberHash(value) {
  return crypto.createHash('sha1').update(String(value)).digest().readUInt32BE(0);
}

function humanize(value) {
  return String(value).replace(/[-_:]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

module.exports = { AgentAvatarRegistry };
