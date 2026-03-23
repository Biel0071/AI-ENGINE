const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const state = {
  active: false,
  intervalMs: 15 * 60 * 1000,
  timer: null,
  projectRoot: null,
  autoApply: true,
  smartDecisionMode: false,
  humanApprovalMode: true,
  runs: 0,
  errors: 0,
  lastRunAt: null,
  lastReport: null,
};

const TEXT_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.css']);
const IGNORE_SEGMENTS = new Set(['node_modules', 'dist', '.git', '.next', 'coverage', 'media', 'build', '.cache', '.turbo']);
const IMPACT_WEIGHT = { high: 3, medium: 2, low: 1 };
const PRIORITY_WEIGHT = {
  business: 0.5,
  ux: 0.3,
  stability: 0.2,
};

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readText(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return '';
  }
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function appendText(filePath, content) {
  await ensureDir(path.dirname(filePath));
  await fs.appendFile(filePath, content, 'utf8');
}

async function listProjectFiles(rootDir) {
  const queue = [rootDir];
  const files = [];

  while (queue.length) {
    const current = queue.pop();
    if (!current) {
      continue;
    }

    let entries = [];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      const relative = path.relative(rootDir, full).replace(/\\/g, '/');
      if (!relative) {
        continue;
      }

      if (entry.isDirectory()) {
        const segments = relative.split('/');
        if (segments.some((segment) => IGNORE_SEGMENTS.has(segment))) {
          continue;
        }
        queue.push(full);
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (TEXT_EXTENSIONS.has(extension)) {
        files.push({ fullPath: full, relativePath: relative, extension });
      }
    }
  }

  return files;
}

function normalizeForHash(content) {
  return String(content || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function detectUiInconsistencies(filesMap) {
  const issues = [];

  for (const [relativePath, content] of filesMap.entries()) {
    if (!relativePath.endsWith('.tsx')) {
      continue;
    }

    const rawSelectCount = (content.match(/<select[\s>]/g) || []).length;
    const inlineStyleCount = (content.match(/style=\{\{/g) || []).length;

    if (rawSelectCount > 0) {
      issues.push({
        type: 'ui-inconsistency',
        severity: 'medium',
        file: relativePath,
        detail: `Detected ${rawSelectCount} raw <select> usage(s). Prefer design-system Dropdown.`,
      });
    }

    if (inlineStyleCount > 0) {
      issues.push({
        type: 'ui-inconsistency',
        severity: 'low',
        file: relativePath,
        detail: `Detected ${inlineStyleCount} inline style block(s). Consider utility classes for consistency.`,
      });
    }
  }

  return issues;
}

function detectPerformanceBottlenecks(filesMap) {
  const issues = [];

  for (const [relativePath, content] of filesMap.entries()) {
    if (relativePath.endsWith('.md')) {
      continue;
    }

    const lines = String(content || '').split('\n').length;
    const useStateCount = (content.match(/\buseState\s*\(/g) || []).length;
    const renderLoopCount = (content.match(/\.map\s*\(/g) || []).length;

    if (lines > 450) {
      issues.push({
        type: 'performance',
        severity: 'medium',
        file: relativePath,
        detail: `Large file with ${lines} lines. Candidate for decomposition.`,
      });
    }

    if (useStateCount >= 10) {
      issues.push({
        type: 'performance',
        severity: 'high',
        file: relativePath,
        detail: `High local state usage (${useStateCount}). Consider custom hook extraction and memoization.`,
      });
    }

    if (renderLoopCount >= 6 && relativePath.includes('/frontend/src/')) {
      issues.push({
        type: 'performance',
        severity: 'low',
        file: relativePath,
        detail: `Multiple map renders (${renderLoopCount}). Evaluate windowing/memoization.`,
      });
    }
  }

  return issues;
}

function detectIncompleteFeatures(projectRoot, filesMap) {
  const checks = [
    {
      module: 'inbox',
      expected: 'frontend/src/components/inbox/TypingIndicator.tsx',
      improvement: 'Ensure typing animation and realtime hints are available.',
    },
    {
      module: 'contacts',
      expected: 'frontend/src/components/contacts/ContactTimeline.tsx',
      improvement: 'Add contact timeline component for history visibility.',
    },
    {
      module: 'campaigns',
      expected: 'frontend/src/components/campaigns/CampaignScheduler.tsx',
      improvement: 'Add scheduler panel for campaign time windows.',
    },
    {
      module: 'automation',
      expected: 'frontend/src/components/automation/AutomationLogsPanel.tsx',
      improvement: 'Add automation logs panel for execution trace visibility.',
    },
  ];

  return checks
    .filter((item) => !filesMap.has(item.expected))
    .map((item) => ({
      type: 'incomplete-feature',
      severity: 'medium',
      module: item.module,
      file: item.expected,
      detail: item.improvement,
      projectRoot,
    }));
}

function detectUnusedFiles(filesMap) {
  const issues = [];
  const entries = Array.from(filesMap.entries());

  for (const [relativePath, content] of entries) {
    if (!relativePath.endsWith('.tsx')) {
      continue;
    }

    if (relativePath.includes('/pages/') && !relativePath.endsWith('/index.tsx')) {
      const baseName = path.basename(relativePath, '.tsx');
      const importNeedleA = `./pages/${baseName}`;
      const importNeedleB = `../pages/${baseName}`;
      const isReferenced = entries.some(([, body]) => body.includes(importNeedleA) || body.includes(importNeedleB));

      if (!isReferenced) {
        issues.push({
          type: 'unused-file',
          severity: 'low',
          file: relativePath,
          detail: 'Potentially unused page file.',
        });
      }
    }

    if (content.includes('TODO') && content.includes('stub')) {
      issues.push({
        type: 'incomplete-feature',
        severity: 'low',
        file: relativePath,
        detail: 'Stub/TODO markers found in feature code.',
      });
    }
  }

  return issues;
}

function detectCodeDuplication(filesMap) {
  const hashToFiles = new Map();

  for (const [relativePath, content] of filesMap.entries()) {
    const normalized = normalizeForHash(content);
    if (!normalized || normalized.length < 40) {
      continue;
    }

    const hash = crypto.createHash('sha1').update(normalized).digest('hex');
    const bucket = hashToFiles.get(hash) || [];
    bucket.push(relativePath);
    hashToFiles.set(hash, bucket);
  }

  const issues = [];
  for (const files of hashToFiles.values()) {
    if (files.length < 2) {
      continue;
    }

    issues.push({
      type: 'duplication',
      severity: 'medium',
      files,
      detail: 'Exact duplicate content detected.',
    });
  }

  return issues;
}

function impactToScore(impactLevel) {
  return IMPACT_WEIGHT[impactLevel] || IMPACT_WEIGHT.low;
}

function classifyIssueImpact(issue) {
  const target = String(issue.file || issue.module || '').toLowerCase();
  const inboxCritical = /inbox|message|chat|conversation/.test(target);

  if (issue.type === 'incomplete-feature' && inboxCritical) {
    return 'high';
  }

  if (issue.type === 'performance' && issue.severity === 'high') {
    return inboxCritical ? 'high' : 'medium';
  }

  if (issue.type === 'incomplete-feature' || issue.type === 'ui-inconsistency') {
    return 'medium';
  }

  return issue.severity === 'high' ? 'medium' : 'low';
}

function classifyChangePolicy(type) {
  if (type === 'module-expansion' || type === 'incomplete-feature') {
    return {
      structural: true,
      apiContract: false,
      databaseSchema: false,
      safeType: null,
    };
  }

  if (type === 'ui-inconsistency') {
    return {
      structural: false,
      apiContract: false,
      databaseSchema: false,
      safeType: 'ui-improvement',
    };
  }

  if (type === 'performance') {
    return {
      structural: false,
      apiContract: false,
      databaseSchema: false,
      safeType: 'performance-optimization',
    };
  }

  if (type === 'duplication') {
    return {
      structural: false,
      apiContract: false,
      databaseSchema: false,
      safeType: 'safe-refactor',
    };
  }

  return {
    structural: false,
    apiContract: false,
    databaseSchema: false,
    safeType: null,
  };
}

function computeUserExperienceImpact(issue) {
  const target = String(issue.file || issue.module || '').toLowerCase();
  const isPriorityUxArea = /inbox|message|chat|conversation/.test(target);

  if (isPriorityUxArea) {
    return 'high';
  }

  if (issue.type === 'ui-inconsistency' || issue.type === 'performance') {
    return 'medium';
  }

  return 'low';
}

function computeStabilityImpact(issue) {
  if (issue.type === 'performance' || issue.type === 'duplication') {
    return 'high';
  }

  if (issue.type === 'incomplete-feature') {
    return 'medium';
  }

  return 'low';
}

function getRecommendedAction(issue) {
  if (issue.type === 'ui-inconsistency') {
    return 'Standardize with design-system components and utility classes.';
  }

  if (issue.type === 'performance') {
    return 'Split heavy components and apply memoization/windowing where safe.';
  }

  if (issue.type === 'duplication') {
    return 'Refactor duplicated code into shared utilities without contract changes.';
  }

  if (issue.type === 'incomplete-feature') {
    return 'Propose completion plan and request approval before implementation.';
  }

  return 'Review manually and schedule in product roadmap.';
}

function computePriorityScore(businessImpact, uxImpact, stabilityImpact) {
  const businessScore = impactToScore(businessImpact);
  const uxScore = impactToScore(uxImpact);
  const stabilityScore = impactToScore(stabilityImpact);

  const weighted =
    businessScore * PRIORITY_WEIGHT.business +
    uxScore * PRIORITY_WEIGHT.ux +
    stabilityScore * PRIORITY_WEIGHT.stability;

  return Number((weighted * 100 / 3).toFixed(2));
}

function getPriorityTier(priorityScore) {
  if (priorityScore >= 80) {
    return 'high';
  }
  if (priorityScore >= 55) {
    return 'medium';
  }
  return 'low';
}

function evaluateModules(filesMap) {
  const modules = [
    { name: 'inbox', pathPrefix: 'frontend/src/components/inbox/', expectedFiles: ['TypingIndicator.tsx'] },
    { name: 'contacts', pathPrefix: 'frontend/src/components/contacts/', expectedFiles: ['ContactTimeline.tsx'] },
    { name: 'campaigns', pathPrefix: 'frontend/src/components/campaigns/', expectedFiles: ['CampaignScheduler.tsx'] },
    { name: 'automation', pathPrefix: 'frontend/src/components/automation/', expectedFiles: ['AutomationLogsPanel.tsx'] },
  ];

  return modules.map((module) => {
    const moduleFiles = Array.from(filesMap.keys()).filter((p) => p.startsWith(module.pathPrefix));
    const missing = module.expectedFiles.filter((file) => !filesMap.has(`${module.pathPrefix}${file}`));
    const complete = missing.length === 0;
    const useful = moduleFiles.length > 0;

    return {
      module: module.name,
      complete,
      useful,
      missing,
      missingCount: missing.length,
    };
  });
}

function buildSmartSuggestions(analysis, moduleInsights, options = {}) {
  const suggestions = [];
  let nextId = 1;
  const now = new Date().toISOString();

  for (const issue of analysis.issues) {
    const businessImpact = classifyIssueImpact(issue);
    const uxImpact = computeUserExperienceImpact(issue);
    const stabilityImpact = computeStabilityImpact(issue);
    const policy = classifyChangePolicy(issue.type);
    const priorityScore = computePriorityScore(businessImpact, uxImpact, stabilityImpact);
    const requiresApproval = options.humanApprovalMode !== false
      ? businessImpact === 'high' || policy.structural || policy.apiContract || policy.databaseSchema
      : false;

    suggestions.push({
      id: `SI-${String(nextId++).padStart(3, '0')}`,
      type: issue.type,
      title: issue.detail,
      description: `Detected ${issue.type} in ${issue.file || issue.module || 'project'} with potential product impact.`,
      target: issue.file || issue.module || issue.files || 'project',
      impact_level: businessImpact,
      user_experience_impact: uxImpact,
      system_stability_impact: stabilityImpact,
      priority_score: priorityScore,
      priority_tier: getPriorityTier(priorityScore),
      recommended_action: getRecommendedAction(issue),
      safe_type: policy.safeType,
      structural_change: policy.structural,
      api_contract_change: policy.apiContract,
      database_schema_change: policy.databaseSchema,
      requires_approval: requiresApproval,
      status: requiresApproval ? 'requires approval' : 'proposed',
      createdAt: now,
    });
  }

  for (const insight of moduleInsights) {
    if (insight.complete) {
      continue;
    }

    const businessImpact = insight.module === 'inbox' ? 'high' : 'medium';
    const uxImpact = insight.module === 'inbox' ? 'high' : 'medium';
    const stabilityImpact = 'medium';
    const priorityScore = computePriorityScore(businessImpact, uxImpact, stabilityImpact);

    suggestions.push({
      id: `SI-${String(nextId++).padStart(3, '0')}`,
      type: 'module-expansion',
      title: `Complete ${insight.module} module with missing capabilities.`,
      description: `Module ${insight.module} is not complete. Missing: ${insight.missing.join(', ')}.`,
      target: insight.module,
      impact_level: businessImpact,
      user_experience_impact: uxImpact,
      system_stability_impact: stabilityImpact,
      priority_score: priorityScore,
      priority_tier: getPriorityTier(priorityScore),
      recommended_action: 'Define feature spec and request approval before implementation.',
      safe_type: null,
      structural_change: true,
      api_contract_change: false,
      database_schema_change: false,
      requires_approval: true,
      status: 'requires approval',
      createdAt: now,
    });
  }

  suggestions.push({
    id: `SI-${String(nextId++).padStart(3, '0')}`,
    type: 'ux-priority',
    title: 'Optimize Inbox interaction speed and message flow clarity.',
    description: 'Focus on Inbox responsiveness, reduced click-path, and clearer message actions.',
    target: 'inbox',
    impact_level: 'medium',
    user_experience_impact: 'high',
    system_stability_impact: 'high',
    priority_score: computePriorityScore('medium', 'high', 'high'),
    priority_tier: 'high',
    recommended_action: 'Apply safe UI enhancement component for faster inbox actions.',
    safe_type: 'ui-improvement',
    structural_change: false,
    api_contract_change: false,
    database_schema_change: false,
    requires_approval: false,
    status: 'proposed',
    auto_apply_key: 'create-inbox-quick-actions',
    createdAt: now,
  });

  return suggestions.sort((a, b) => {
    if (impactToScore(b.impact_level) !== impactToScore(a.impact_level)) {
      return impactToScore(b.impact_level) - impactToScore(a.impact_level);
    }

    if (impactToScore(b.user_experience_impact) !== impactToScore(a.user_experience_impact)) {
      return impactToScore(b.user_experience_impact) - impactToScore(a.user_experience_impact);
    }

    if (impactToScore(b.system_stability_impact) !== impactToScore(a.system_stability_impact)) {
      return impactToScore(b.system_stability_impact) - impactToScore(a.system_stability_impact);
    }

    return b.priority_score - a.priority_score;
  });
}

async function learnFromCode(projectRoot, filesMap) {
  const naming = {
    kebab: 0,
    camel: 0,
    pascal: 0,
    unknown: 0,
  };

  const directories = {};

  for (const relativePath of filesMap.keys()) {
    const base = path.basename(relativePath, path.extname(relativePath));

    if (/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(base)) {
      naming.kebab += 1;
    } else if (/^[a-z]+(?:[A-Z][a-z0-9]+)+$/.test(base)) {
      naming.camel += 1;
    } else if (/^[A-Z][A-Za-z0-9]+$/.test(base)) {
      naming.pascal += 1;
    } else {
      naming.unknown += 1;
    }

    const top = relativePath.split('/')[0] || 'root';
    directories[top] = (directories[top] || 0) + 1;
  }

  const learning = {
    updatedAt: new Date().toISOString(),
    naming,
    directories,
    architectureHints: [
      'Prefer modular architecture with route/controller/service/repository split.',
      'Use frontend module folders and design-system primitives for UI consistency.',
      'Keep APIs additive to preserve backward compatibility.',
    ],
  };

  const projectLearningPath = path.join(projectRoot, 'data', 'project-learning.json');
  const engineLearningPath = path.join(__dirname, '..', 'data', 'learning.json');

  let existingLearning = { updatedAt: null, projects: {} };
  if (await exists(engineLearningPath)) {
    try {
      const raw = await readText(engineLearningPath);
      existingLearning = JSON.parse(raw || '{}');
    } catch {
      existingLearning = { updatedAt: null, projects: {} };
    }
  }

  await writeJson(projectLearningPath, learning);
  await writeJson(engineLearningPath, {
    ...existingLearning,
    updatedAt: learning.updatedAt,
    projects: {
      ...(existingLearning.projects || {}),
      [projectRoot]: learning,
    },
  });

  return learning;
}

async function ensureEnhancementComponent(targetPath, title, description) {
  if (await exists(targetPath)) {
    return false;
  }

  const content = `import { Card, CardContent, CardHeader } from '../ui/card';

export function ${title}() {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-section font-semibold">${title}</h3>
      </CardHeader>
      <CardContent>
        <p className="text-body text-slate-300">${description}</p>
      </CardContent>
    </Card>
  );
}
`;

  await ensureDir(path.dirname(targetPath));
  await fs.writeFile(targetPath, content, 'utf8');
  return true;
}

async function applySafeImprovements(projectRoot, analysis, suggestions) {
  const applied = [];
  const safeCandidates = suggestions.filter((suggestion) => {
    const isHighPriority = suggestion.priority_tier === 'high';
    const safeType = suggestion.safe_type;
    const allowedSafeType = safeType === 'safe-refactor' || safeType === 'ui-improvement' || safeType === 'performance-optimization';

    return (
      isHighPriority &&
      allowedSafeType &&
      !suggestion.requires_approval &&
      !suggestion.structural_change &&
      !suggestion.api_contract_change &&
      !suggestion.database_schema_change
    );
  });

  for (const suggestion of safeCandidates) {
    if (suggestion.auto_apply_key === 'create-inbox-quick-actions') {
      const inboxQuickActions = path.join(projectRoot, 'frontend', 'src', 'components', 'inbox', 'InboxQuickActions.tsx');
      if (await ensureEnhancementComponent(inboxQuickActions, 'InboxQuickActions', 'Quick actions that reduce response time in the inbox workflow.')) {
        applied.push('Created inbox quick actions enhancement component.');
      }
    }
  }

  const suggestionsPath = path.join(projectRoot, 'data', 'engine_suggestions.json');
  await writeJson(suggestionsPath, {
    generatedAt: new Date().toISOString(),
    summary: analysis.summary,
    suggestions,
  });
  applied.push('Updated structured suggestions file.');

  return {
    applied,
    suggestionsPath,
  };
}

function toMarkdownReport(report) {
  const lines = [];
  lines.push(`## ${new Date().toISOString()} - Self-Improving Cycle`);
  lines.push('');
  lines.push(`- Source: ${report.source}`);
  lines.push(`- Files scanned: ${report.analysis.summary.filesScanned}`);
  lines.push(`- Issues found: ${report.analysis.summary.issueCount}`);
  lines.push(`- Suggestions generated: ${report.suggestions.length}`);
  lines.push(`- Safe improvements applied: ${report.safeImprovements?.applied?.length || 0}`);
  lines.push('');

  const topSuggestions = report.suggestions.slice(0, 8);
  if (topSuggestions.length) {
    lines.push('### Top Prioritized Suggestions');
    for (const suggestion of topSuggestions) {
      lines.push(
        `- [${suggestion.impact_level}] score=${suggestion.priority_score} ${suggestion.type} - ${suggestion.title} (${suggestion.target})${suggestion.requires_approval ? ' [requires approval]' : ''}`
      );
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function updateDocumentation(projectRoot, report) {
  const docsDir = path.join(projectRoot, 'docs');
  const engineLogPath = path.join(docsDir, 'ENGINE_LOG.md');
  const improvementsPath = path.join(docsDir, 'IMPROVEMENTS.md');

  if (!(await exists(engineLogPath))) {
    await appendText(engineLogPath, '# ENGINE LOG\n\n');
  }

  if (!(await exists(improvementsPath))) {
    await appendText(improvementsPath, '# IMPROVEMENTS\n\n');
  }

  const reportText = toMarkdownReport(report);
  await appendText(engineLogPath, reportText);
  await appendText(improvementsPath, reportText);

  return {
    engineLogPath,
    improvementsPath,
  };
}

async function runAnalysis(projectRoot) {
  const files = await listProjectFiles(projectRoot);
  const filesMap = new Map();

  for (const file of files) {
    filesMap.set(file.relativePath, await readText(file.fullPath));
  }

  const issues = [
    ...detectCodeDuplication(filesMap),
    ...detectUnusedFiles(filesMap),
    ...detectUiInconsistencies(filesMap),
    ...detectPerformanceBottlenecks(filesMap),
    ...detectIncompleteFeatures(projectRoot, filesMap),
  ];

  return {
    summary: {
      filesScanned: files.length,
      issueCount: issues.length,
    },
    issues,
    filesMap,
  };
}

async function runImprovementCycle({ projectRoot, autoApply = true, smartDecisionMode = state.smartDecisionMode, source = 'manual' } = {}) {
  const resolvedRoot = projectRoot || state.projectRoot;
  if (!resolvedRoot) {
    throw new Error('projectRoot is required to run self-improving cycle.');
  }

  const analysis = await runAnalysis(resolvedRoot);
  const moduleInsights = evaluateModules(analysis.filesMap);
  const learning = await learnFromCode(resolvedRoot, analysis.filesMap);
  const suggestions = buildSmartSuggestions(analysis, moduleInsights, {
    smartDecisionMode,
    humanApprovalMode: state.humanApprovalMode,
  });
  const safeImprovements = autoApply
    ? await applySafeImprovements(resolvedRoot, analysis, suggestions)
    : { applied: [] };

  const report = {
    generatedAt: new Date().toISOString(),
    source,
    analysis: {
      summary: analysis.summary,
      issues: analysis.issues,
    },
    moduleInsights,
    smartDecisionMode,
    learning,
    suggestions,
    safeImprovements,
  };

  const docsResult = await updateDocumentation(resolvedRoot, report);

  state.runs += 1;
  state.lastRunAt = report.generatedAt;
  state.lastReport = {
    ...report,
    docs: docsResult,
  };

  return state.lastReport;
}

async function tick() {
  if (!state.active || !state.projectRoot) {
    return;
  }

  try {
    await runImprovementCycle({
      projectRoot: state.projectRoot,
      autoApply: state.autoApply,
      smartDecisionMode: state.smartDecisionMode,
      source: 'continuous-loop',
    });
  } catch (error) {
    state.errors += 1;
    state.lastReport = {
      generatedAt: new Date().toISOString(),
      source: 'continuous-loop',
      error: error.message,
    };
  }
}

function startContinuousImprovement({ projectRoot, intervalMs = 15 * 60 * 1000, autoApply = true, smartDecisionMode = false } = {}) {
  if (!projectRoot) {
    throw new Error('projectRoot is required to start continuous improvement mode.');
  }

  state.projectRoot = projectRoot;
  state.intervalMs = Math.max(Number(intervalMs) || 0, 30_000);
  state.autoApply = autoApply !== false;
  state.smartDecisionMode = smartDecisionMode === true;
  state.humanApprovalMode = true;
  state.active = true;

  if (state.timer) {
    clearInterval(state.timer);
  }

  state.timer = setInterval(() => {
    void tick();
  }, state.intervalMs);

  void tick();

  return getStatus();
}

function stopContinuousImprovement() {
  if (state.timer) {
    clearInterval(state.timer);
  }

  state.timer = null;
  state.active = false;
  return getStatus();
}

function getStatus() {
  return {
    active: state.active,
    intervalMs: state.intervalMs,
    runs: state.runs,
    errors: state.errors,
    projectRoot: state.projectRoot,
    autoApply: state.autoApply,
    smartDecisionMode: state.smartDecisionMode,
    humanApprovalMode: state.humanApprovalMode,
    lastRunAt: state.lastRunAt,
    hasReport: Boolean(state.lastReport),
  };
}

module.exports = {
  getStatus,
  runImprovementCycle,
  startContinuousImprovement,
  stopContinuousImprovement,
};
