const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { slugify } = require('../kernel/ids');
const { ValidationError } = require('../kernel/errors');

const DEFAULT_DIRS = ['skills', '.codex/skills', '.agents/skills', '.claude/skills'];
const MAX_CONTEXT_CHARS = 1800;

class SkillRegistry {
  constructor({ rootDir, store, bus, controlPlane, env = process.env, extraPaths = [] }) {
    this.rootDir = rootDir || process.cwd();
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.env = env;
    this.extraPaths = extraPaths;
    this.cache = null;
    this.cacheKey = null;
  }

  async listSkills(tenantId, actorId, options = {}) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    const skills = this.#discover();
    const q = String(options.q || '').trim();
    const filtered = q ? skills.filter((skill) => this.#score(skill, q) > 0) : skills;
    return {
      skills: filtered.map((skill) => this.#publicSkill(skill)),
      total: filtered.length,
      discoveredAt: new Date().toISOString(),
      sources: this.#roots().map((root) => path.relative(this.rootDir, root) || '.'),
    };
  }

  async selectForTask(tenantId, actorId, input = {}) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    const objective = String(input.objective || input.prompt || input.query || '').trim();
    if (!objective) throw new ValidationError('objective is required');
    const agentDomain = String(input.agentDomain || input.domain || '').trim();
    const maxTokens = clampInt(input.maxTokens, 300, 4000, 1200);
    const limit = clampInt(input.limit, 1, 12, 4);
    return this.#contextPack({ objective, agentDomain, maxTokens, limit });
  }

  async contextForAgent(tenantId, actorId, agent = {}, task = {}) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    const objective = String(task.objective || task.prompt || task.type || agent.role || agent.domain || '').trim();
    const pack = this.#contextPack({
      objective,
      agentDomain: agent.domain,
      maxTokens: clampInt(task.maxTokens, 300, 4000, 900),
      limit: clampInt(task.limit, 1, 8, 3),
    });
    return {
      agentId: agent.id,
      agentDomain: agent.domain,
      ...pack,
    };
  }

  #contextPack({ objective, agentDomain, maxTokens, limit }) {
    const scored = this.#discover()
      .map((skill) => ({ skill, score: this.#score(skill, objective, agentDomain) }))
      .filter((item) => item.score > 0 || item.skill.alwaysOn)
      .sort((a, b) => b.score - a.score || a.skill.estimatedTokens - b.skill.estimatedTokens);

    const selected = [];
    let usedTokens = 0;
    for (const item of scored) {
      if (selected.length >= limit) break;
      const budgetLeft = maxTokens - usedTokens;
      if (budgetLeft < 80) break;
      const slice = this.#compactContent(item.skill, budgetLeft);
      if (!slice.content) continue;
      selected.push({
        ...this.#publicSkill(item.skill),
        score: item.score,
        context: slice.content,
        contextTokens: slice.tokens,
      });
      usedTokens += slice.tokens;
    }

    return {
      objective,
      agentDomain: agentDomain || null,
      selectedSkills: selected,
      totalSkills: this.#discover().length,
      estimatedTokens: usedTokens,
      savedBySelectiveLoad: Math.max(0, this.#discover().reduce((sum, skill) => sum + skill.estimatedTokens, 0) - usedTokens),
      prompt: selected.map((skill) => `# Skill: ${skill.name}\n${skill.context}`).join('\n\n---\n\n'),
    };
  }

  #discover() {
    const roots = this.#roots();
    const key = roots.map((root) => `${root}:${safeMtime(root)}`).join('|');
    if (this.cache && this.cacheKey === key) return this.cache;

    const files = [];
    for (const root of roots) {
      if (!fs.existsSync(root)) continue;
      if (fs.statSync(root).isFile()) {
        if (isSkillFile(root)) files.push(root);
        continue;
      }
      walk(root, files);
    }

    const byId = new Map();
    for (const file of files) {
      const parsed = parseSkillFile(file, this.rootDir);
      if (!parsed) continue;
      byId.set(parsed.id, parsed);
    }
    this.cache = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
    this.cacheKey = key;
    return this.cache;
  }

  #roots() {
    const envPaths = String(this.env.FENIX_SKILL_PATHS || '')
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean);
    const all = [
      ...DEFAULT_DIRS.map((dir) => path.join(this.rootDir, dir)),
      path.join(this.rootDir, 'skill-global'),
      path.join(this.rootDir, '..', '.agents', 'skills'),
      path.join(this.rootDir, '..', 'skill-global'),
      ...envPaths,
      ...this.extraPaths,
    ];
    return [...new Set(all.map((item) => path.resolve(this.rootDir, item)))];
  }

  #score(skill, objective = '', agentDomain = '') {
    const haystack = `${skill.name} ${skill.description} ${skill.triggers.join(' ')} ${skill.domains.join(' ')}`.toLowerCase();
    const words = tokenize(`${objective} ${agentDomain}`);
    let score = skill.alwaysOn ? 1 : 0;
    for (const word of words) {
      if (haystack.includes(word)) score += 2;
    }
    if (agentDomain && skill.domains.includes(agentDomain.toLowerCase())) score += 6;
    for (const trigger of skill.triggers) {
      if (objective.toLowerCase().includes(trigger)) score += 5;
    }
    return score;
  }

  #compactContent(skill, tokenBudget) {
    const maxChars = Math.min(MAX_CONTEXT_CHARS, Math.max(240, tokenBudget * 4));
    const body = skill.body.replace(/\n{3,}/g, '\n\n').trim().slice(0, maxChars);
    return { content: body, tokens: estimateTokens(body) };
  }

  #publicSkill(skill) {
    return {
      id: skill.id,
      name: skill.name,
      description: skill.description,
      source: skill.source,
      triggers: skill.triggers,
      domains: skill.domains,
      alwaysOn: skill.alwaysOn,
      estimatedTokens: skill.estimatedTokens,
      hash: skill.hash,
    };
  }
}

function walk(dir, files, depth = 0) {
  if (depth > 5) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files, depth + 1);
    else if (isSkillFile(full)) files.push(full);
  }
}

function isSkillFile(file) {
  const base = path.basename(file).toLowerCase();
  return base === 'skill.md' || base === 'skill-global' || base.endsWith('.skill.md');
}

function parseSkillFile(file, rootDir) {
  const raw = fs.readFileSync(file, 'utf8');
  const frontmatter = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  const meta = frontmatter ? parseFrontmatter(frontmatter[1]) : {};
  const body = frontmatter ? raw.slice(frontmatter[0].length) : raw;
  const inferredName = path.basename(path.dirname(file)) === path.basename(file)
    ? path.basename(file)
    : path.basename(path.dirname(file));
  const name = String(meta.name || inferredName || path.basename(file)).trim();
  if (!name || body.trim().length < 8) return null;
  const description = String(meta.description || firstSentence(body) || 'Reusable system skill').trim();
  const triggers = normalizeList(meta.trigger || meta.triggers || meta.keywords);
  const domains = normalizeList(meta.domain || meta.domains || meta.agent || meta.agents);
  const hash = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
  return {
    id: slugify(meta.id || name),
    name,
    description,
    triggers,
    domains,
    alwaysOn: !triggers.length,
    estimatedTokens: estimateTokens(body),
    body,
    source: path.relative(rootDir, file).replace(/\\/g, '/'),
    hash,
  };
}

function parseFrontmatter(text) {
  const meta = {};
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) {
      current = kv[1];
      meta[current] = parseValue(kv[2]);
      continue;
    }
    const item = line.match(/^\s*-\s*(.+)$/);
    if (item && current) {
      if (!Array.isArray(meta[current])) meta[current] = meta[current] ? [meta[current]] : [];
      meta[current].push(parseValue(item[1]));
    }
  }
  return meta;
}

function parseValue(value) {
  const trimmed = String(value || '').trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1).split(',').map((item) => stripQuotes(item.trim())).filter(Boolean);
  }
  return stripQuotes(trimmed);
}

function stripQuotes(value) {
  return String(value || '').replace(/^['"]|['"]$/g, '');
}

function normalizeList(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(',');
  return list.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
}

function tokenize(value) {
  return [...new Set(String(value || '').toLowerCase().match(/[a-z0-9_-]{3,}/g) || [])];
}

function firstSentence(value) {
  return String(value || '').trim().split(/\n|\. /)[0];
}

function estimateTokens(value) {
  return Math.max(1, Math.ceil(String(value || '').length / 4));
}

function clampInt(value, min, max, fallback) {
  const n = Number(value || fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function safeMtime(item) {
  try { return fs.statSync(item).mtimeMs; } catch { return 0; }
}

module.exports = { SkillRegistry, parseSkillFile };
