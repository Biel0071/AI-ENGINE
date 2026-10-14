'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

class ProceduralLearningEngine {
  constructor(dataFile) {
    this.dataFile = dataFile;
    this.state = {
      version: '1.0.0',
      episodes: [],
      patterns: [],
      skills: [],
      reuseEvents: [],
      updatedAt: null
    };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const parsed = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
        this.state = { ...this.state, ...parsed };
      }
    } catch (error) {
      this.state.loadError = error.message;
    }
  }

  save() {
    const dir = path.dirname(this.dataFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    this.state.updatedAt = new Date().toISOString();
    fs.writeFileSync(this.dataFile, JSON.stringify(this.state, null, 2), 'utf8');
  }

  recordMission({ mission, jobs, project }) {
    if (!mission || !Array.isArray(jobs) || !jobs.length) {
      return { learned: false, reason: 'mission/jobs unavailable' };
    }
    const evidence = buildEvidence(mission, jobs);
    const episode = buildEpisode(mission, jobs, project, evidence);
    upsertById(this.state.episodes, episode);

    if (!evidence.verified) {
      this.save();
      return { learned: false, reason: 'mission not verified', episode, evidence };
    }

    const pattern = this.#upsertPattern(episode, evidence);
    const skillCandidate = this.#maybePromoteSkill(pattern);
    this.save();
    return { learned: true, episode, pattern, skillCandidate, evidence };
  }

  findReusable({ objective = '', projectId = null, limit = 5 } = {}) {
    const terms = tokenize(objective);
    const candidates = this.state.patterns
      .filter((pattern) => pattern.status === 'VERIFIED')
      .map((pattern) => {
        const haystack = tokenize(`${pattern.title} ${pattern.intent} ${pattern.tags.join(' ')} ${pattern.steps.join(' ')}`);
        const overlap = terms.filter((term) => haystack.includes(term)).length;
        const projectBonus = projectId && pattern.sourceProjects.includes(projectId) ? 0.08 : 0;
        const score = Math.min(1, Number(pattern.confidence || 0) * 0.72 + overlap * 0.08 + projectBonus);
        return { ...pattern, reuseScore: Number(score.toFixed(3)) };
      })
      .filter((pattern) => pattern.reuseScore >= 0.35)
      .sort((a, b) => b.reuseScore - a.reuseScore)
      .slice(0, limit);

    if (candidates.length) {
      this.state.reuseEvents.push({
        id: `reuse-${crypto.randomUUID()}`,
        projectId,
        objective: String(objective).slice(0, 500),
        patternIds: candidates.map((item) => item.id),
        createdAt: new Date().toISOString()
      });
      for (const pattern of candidates) {
        const existing = this.state.patterns.find((item) => item.id === pattern.id);
        if (existing) {
          existing.lastUsed = new Date().toISOString();
          existing.reuseCount = Number(existing.reuseCount || 0) + 1;
        }
      }
      this.save();
    }

    return { patterns: candidates, count: candidates.length };
  }

  summary() {
    const patterns = this.state.patterns;
    const verified = patterns.filter((item) => item.status === 'VERIFIED');
    const validations = patterns.reduce((sum, item) => sum + Number(item.validationCount || 0), 0);
    const successes = patterns.reduce((sum, item) => sum + Number(item.successCount || 0), 0);
    const failures = patterns.reduce((sum, item) => sum + Number(item.failureCount || 0), 0);
    const reused = patterns.filter((item) => Number(item.reuseCount || 0) > 0);
    const skillCandidates = this.state.skills.filter((item) => item.status === 'CANDIDATE');
    return {
      status: 'AVAILABLE',
      updatedAt: this.state.updatedAt,
      episodes: this.state.episodes.length,
      patterns: patterns.length,
      verifiedPatterns: verified.length,
      skills: this.state.skills.length,
      skillCandidates: skillCandidates.length,
      reuseEvents: this.state.reuseEvents.length,
      patternReuseRate: patterns.length ? round(reused.length / patterns.length) : null,
      qaSuccessRate: successes + failures ? round(successes / (successes + failures)) : null,
      validations,
      topPatterns: [...patterns].sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0)).slice(0, 8),
      recentEpisodes: this.state.episodes.slice(-8).reverse(),
      graph: this.graph()
    };
  }

  graph() {
    const nodes = [];
    const edges = [];
    for (const episode of this.state.episodes.slice(-20)) {
      nodes.push(node(`mission:${episode.missionId}`, 'MISSION', episode.title, episode));
      nodes.push(node(`project:${episode.projectId || 'unknown'}`, 'PROJECT', episode.projectName || episode.projectId || 'unknown', { projectId: episode.projectId }));
      edges.push(edge(`project:${episode.projectId || 'unknown'}`, 'mission:' + episode.missionId, 'EXECUTED'));
      for (const job of episode.jobs.slice(0, 12)) {
        nodes.push(node(`job:${job.id}`, 'JOB', job.type, job));
        edges.push(edge('mission:' + episode.missionId, 'job:' + job.id, 'HAS_JOB'));
        if (job.agentId) {
          nodes.push(node(`agent:${job.agentId}`, 'AGENT', job.agentId, { agentId: job.agentId }));
          edges.push(edge('job:' + job.id, 'agent:' + job.agentId, 'RUN_BY'));
        }
      }
    }
    for (const pattern of this.state.patterns.slice(-20)) {
      nodes.push(node(`pattern:${pattern.id}`, 'PATTERN', pattern.title, pattern));
      for (const missionId of pattern.sourceMissions.slice(-8)) {
        edges.push(edge(`mission:${missionId}`, `pattern:${pattern.id}`, 'EXTRACTED'));
      }
      for (const skillId of pattern.skillIds || []) {
        const skill = this.state.skills.find((item) => item.id === skillId);
        nodes.push(node(`skill:${skillId}`, 'SKILL', skill?.name || skillId, skill || { id: skillId }));
        edges.push(edge(`pattern:${pattern.id}`, `skill:${skillId}`, 'PROMOTES'));
      }
    }
    return {
      nodes: uniqueBy(nodes, 'id'),
      edges: uniqueBy(edges, (item) => `${item.from}:${item.to}:${item.type}`)
    };
  }

  #upsertPattern(episode, evidence) {
    const signature = patternSignature(episode);
    const id = `ptn-${hash(signature).slice(0, 12)}`;
    const now = new Date().toISOString();
    let pattern = this.state.patterns.find((item) => item.id === id);
    if (!pattern) {
      pattern = {
        id,
        title: patternTitle(episode),
        intent: episode.intent,
        scope: 'PROJECT_AND_ORGANIZATION',
        status: 'VERIFIED',
        confidence: evidence.confidence,
        evidence: [],
        steps: proceduralSteps(episode),
        tags: episode.tags,
        sourceJobs: [],
        sourceMissions: [],
        sourceProjects: [],
        validationCount: 0,
        successCount: 0,
        failureCount: 0,
        reuseCount: 0,
        skillIds: [],
        firstSeen: now,
        lastValidated: now,
        lastUsed: null,
        version: 1
      };
      this.state.patterns.push(pattern);
    }

    pattern.validationCount += 1;
    pattern.successCount += 1;
    pattern.lastValidated = now;
    pattern.confidence = round(Math.min(0.99, (Number(pattern.confidence || 0.5) + evidence.confidence) / 2 + Math.min(0.12, pattern.validationCount * 0.015)));
    pattern.sourceJobs = unique([...pattern.sourceJobs, ...episode.jobs.map((job) => job.id)]);
    pattern.sourceMissions = unique([...pattern.sourceMissions, episode.missionId]);
    pattern.sourceProjects = unique([...pattern.sourceProjects, episode.projectId].filter(Boolean));
    pattern.evidence = uniqueBy([...pattern.evidence, ...evidence.items], 'id').slice(-20);
    pattern.tags = unique([...pattern.tags, ...episode.tags]);
    return pattern;
  }

  #maybePromoteSkill(pattern) {
    if (pattern.validationCount < 3 && pattern.reuseCount < 2) return null;
    const id = `skill-${pattern.id.replace(/^ptn-/, '')}`;
    let skill = this.state.skills.find((item) => item.id === id);
    if (!skill) {
      skill = {
        id,
        name: pattern.title.replace(/ pattern$/i, ' skill'),
        description: `Candidate skill generated from verified procedural pattern ${pattern.id}.`,
        status: 'CANDIDATE',
        patternId: pattern.id,
        requiredContext: ['project DNA', 'mission objective', 'validated evidence'],
        steps: pattern.steps,
        validation: ['QA_TESTS passed', 'VISUAL_QA passed when UI is affected', 'GIT_DIFF captured', 'MEMORY_WRITE completed'],
        examples: pattern.sourceMissions.slice(-3),
        failureModes: ['missing project registry', 'no deterministic tests', 'visual shell rate limit'],
        createdAt: new Date().toISOString()
      };
      this.state.skills.push(skill);
      pattern.skillIds = unique([...(pattern.skillIds || []), id]);
    }
    return skill;
  }
}

function buildEvidence(mission, jobs) {
  const failed = jobs.filter((job) => job.status === 'FAILED' || job.status === 'BLOCKED');
  const qa = jobs.find((job) => job.type === 'QA_TESTS' && job.status === 'COMPLETED');
  const visual = jobs.find((job) => job.type === 'VISUAL_QA' && job.status === 'COMPLETED');
  const git = jobs.find((job) => job.type === 'GIT_DIFF' && job.status === 'COMPLETED');
  const final = jobs.find((job) => job.type === 'FINAL_REVIEW' && job.status === 'COMPLETED');
  const visualRequired = Boolean(mission.intent?.domains?.visualQa);
  const verified = failed.length === 0 && Boolean(qa) && Boolean(git) && (!visualRequired || Boolean(visual));
  const confidence = round(0.52 + (qa ? 0.16 : 0) + (visual || !visualRequired ? 0.12 : 0) + (git ? 0.08 : 0) + (final ? 0.08 : 0) - failed.length * 0.2);
  return {
    verified,
    confidence: Math.max(0.1, Math.min(0.99, confidence)),
    items: [
      qa && evidenceItem('tests', qa),
      visual && evidenceItem('visual', visual),
      git && evidenceItem('git', git),
      final && evidenceItem('final-review', final)
    ].filter(Boolean)
  };
}

function buildEpisode(mission, jobs, project, evidence) {
  const finished = jobs.map((job) => new Date(job.completedAt || job.failedAt || job.updatedAt || job.createdAt || Date.now()).getTime());
  const started = jobs.map((job) => new Date(job.startedAt || job.createdAt || Date.now()).getTime());
  return {
    id: `episode-${mission.id || mission.missionId}`,
    missionId: mission.id || mission.missionId,
    title: String(mission.objective || 'Dev mission').slice(0, 140),
    status: mission.status,
    projectId: mission.projectId,
    projectName: project?.name || mission.projectId || null,
    intent: mission.intent?.kind || mission.intent || 'UNKNOWN',
    objective: mission.objective,
    validated: evidence.verified,
    confidence: evidence.confidence,
    durationMs: Math.max(...finished) - Math.min(...started),
    tags: inferTags(mission, jobs),
    jobs: jobs.map((job) => ({
      id: job.id,
      type: job.type,
      status: job.status,
      agentId: job.agentId || job.workerId || null,
      skill: job.skill || null,
      filesChanged: job.filesChanged || [],
      tests: job.tests || null,
      visualQa: job.visualQa ? { screenshot: job.visualQa.screenshot || null } : null,
      error: job.error || null
    })),
    evidence: evidence.items,
    createdAt: mission.createdAt,
    learnedAt: new Date().toISOString()
  };
}

function proceduralSteps(episode) {
  const ordered = ['DEV_CONTEXT', 'RAG_CONTEXT', 'ARCHITECTURE_REVIEW', 'AGENT_DISPATCH', 'PROJECT_ANALYSIS', 'BACKEND_IMPLEMENT', 'FRONTEND_IMPLEMENT', 'INTEGRATION_CHECK', 'QA_TESTS', 'VISUAL_QA', 'GIT_DIFF', 'MEMORY_WRITE'];
  const seen = new Set(episode.jobs.map((job) => job.type));
  return ordered.filter((type) => seen.has(type));
}

function inferTags(mission, jobs) {
  const text = `${mission.objective || ''} ${jobs.map((job) => `${job.type} ${job.skill || ''}`).join(' ')}`.toLowerCase();
  return unique([
    /crud|cliente|customer/.test(text) && 'crud',
    /visual|browser|layout|css/.test(text) && 'visual',
    /backend|api|server|runtime/.test(text) && 'backend',
    /frontend|ui|cockpit/.test(text) && 'frontend',
    /memory|pattern|learning/.test(text) && 'learning',
    /repair|fix|corrig/.test(text) && 'repair',
    /fenix/.test(text) && 'fenix-self'
  ].filter(Boolean));
}

function patternSignature(episode) {
  return `${episode.intent}:${episode.tags.sort().join(',')}:${proceduralSteps(episode).join('>')}`;
}

function patternTitle(episode) {
  const tags = episode.tags.filter((tag) => tag !== 'fenix-self');
  return `${tags.length ? tags.join(' + ') : String(episode.intent).toLowerCase()} pattern`;
}

function evidenceItem(kind, job) {
  return {
    id: `${kind}:${job.id}`,
    kind,
    jobId: job.id,
    status: job.status,
    summary: job.result?.summary || job.pipelineResult?.summary || null,
    screenshot: job.visualQa?.screenshot || job.result?.visualQa?.screenshot || null,
    tests: job.tests || job.result?.tests || null,
    capturedAt: job.completedAt || job.updatedAt || new Date().toISOString()
  };
}

function tokenize(text) {
  return unique(String(text || '').toLowerCase().split(/[^a-z0-9\u00c0-\u017f]+/).filter((term) => term.length > 2));
}

function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function round(value) {
  return Math.round(Number(value || 0) * 1000) / 1000;
}

function upsertById(arr, item) {
  const index = arr.findIndex((entry) => entry.id === item.id);
  if (index >= 0) arr[index] = item;
  else arr.push(item);
}

function unique(arr) {
  return [...new Set(arr)];
}

function uniqueBy(arr, key) {
  const seen = new Set();
  return arr.filter((item) => {
    const value = typeof key === 'function' ? key(item) : item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function node(id, type, label, evidence) {
  return { id, type, label, evidence };
}

function edge(from, to, type) {
  return { from, to, type };
}

module.exports = { ProceduralLearningEngine };
