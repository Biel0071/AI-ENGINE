const fs = require('fs/promises');
const path = require('path');

function slugifyProjectName(projectName) {
  return String(projectName || 'unknown-project')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, payload) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

class ProjectMemoryManager {
  constructor({ projectsRoot } = {}) {
    this.projectsRoot = projectsRoot || path.resolve(__dirname, '..', 'memory', 'projects');
  }

  projectDir(projectName) {
    return path.join(this.projectsRoot, slugifyProjectName(projectName));
  }

  projectFiles(projectName) {
    const dir = this.projectDir(projectName);
    return {
      dir,
      tokens: path.join(dir, 'tokens.json'),
      insights: path.join(dir, 'insights.json'),
      history: path.join(dir, 'history.json'),
    };
  }

  async loadLatestState(projectName) {
    const files = this.projectFiles(projectName);
    const tokensData = await readJson(files.tokens, { version: 0, tokens: [] });
    const insightsData = await readJson(files.insights, { version: 0, insights: [] });
    return {
      tokens: Array.isArray(tokensData.tokens) ? tokensData.tokens : [],
      insights: Array.isArray(insightsData.insights) ? insightsData.insights : [],
      tokenVersion: Number(tokensData.version || 0),
      insightVersion: Number(insightsData.version || 0),
    };
  }

  async saveProjectAnalysis({
    projectName,
    rootPath,
    tokens,
    insights,
    changes,
    nextActions,
    architecture,
    projectSummary,
  }) {
    const files = this.projectFiles(projectName);
    await ensureDir(files.dir);

    const existingTokens = await readJson(files.tokens, { version: 0, history: [], tokens: [] });
    const existingInsights = await readJson(files.insights, { version: 0, history: [], insights: [] });
    const existingHistory = await readJson(files.history, []);

    const timestamp = new Date().toISOString();

    const nextTokenVersion = Number(existingTokens.version || 0) + 1;
    const nextInsightVersion = Number(existingInsights.version || 0) + 1;

    const tokenPayload = {
      projectName: slugifyProjectName(projectName),
      rootPath,
      version: nextTokenVersion,
      updatedAt: timestamp,
      tokens,
      history: [
        ...(existingTokens.history || []),
        {
          version: nextTokenVersion,
          updatedAt: timestamp,
          tokenCount: (tokens || []).length,
        },
      ],
    };

    const insightPayload = {
      projectName: slugifyProjectName(projectName),
      rootPath,
      version: nextInsightVersion,
      updatedAt: timestamp,
      insights,
      history: [
        ...(existingInsights.history || []),
        {
          version: nextInsightVersion,
          updatedAt: timestamp,
          insightCount: (insights || []).length,
        },
      ],
    };

    const historyEntry = {
      createdAt: timestamp,
      tokenVersion: nextTokenVersion,
      insightVersion: nextInsightVersion,
      changes: changes || [],
      nextActions: (nextActions || []).slice(0, 20),
      architectureSnapshot: {
        layers: (architecture && architecture.layers) || [],
        bottlenecks: (architecture && architecture.bottlenecks) || [],
      },
      projectSummary: {
        totalFiles: projectSummary && projectSummary.totalFiles,
        stack: (projectSummary && projectSummary.stack) || [],
        entryPoints: (projectSummary && projectSummary.entryPoints) || [],
      },
    };

    await writeJson(files.tokens, tokenPayload);
    await writeJson(files.insights, insightPayload);
    await writeJson(files.history, [...existingHistory, historyEntry]);

    return {
      projectDir: files.dir,
      tokensFile: files.tokens,
      insightsFile: files.insights,
      historyFile: files.history,
      tokenVersion: nextTokenVersion,
      insightVersion: nextInsightVersion,
    };
  }
}

module.exports = {
  ProjectMemoryManager,
  slugifyProjectName,
};
