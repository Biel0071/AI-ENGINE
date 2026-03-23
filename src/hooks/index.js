const fs = require('fs/promises');
const path = require('path');
const { analyzeEvent } = require('../../intelligence/dev-engine/analyzer');
const { parseCommand } = require('../../system/planner/commandParser');
const { scanProject, detectProjectProfile } = require('../../system/project-scanner');
const { generateSaaSArtifact } = require('../../intelligence/generators/saasGenerator');
const {
  getStatus,
  runImprovementCycle,
  startContinuousImprovement,
  stopContinuousImprovement,
} = require('../selfImprovingEngine');

const DEFAULT_CONFIG = {
  mode: 'development',
  uiStyle: 'premium',
  autoImprove: true,
  smartDecisionMode: true,
};

async function readConfig(projectRoot) {
  const candidatePaths = [
    path.join(projectRoot, 'ai-engine.config.json'),
    path.join(__dirname, '..', '..', 'ai-engine.config.json'),
  ];

  for (const filePath of candidatePaths) {
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed };
    } catch {
      continue;
    }
  }

  return { ...DEFAULT_CONFIG };
}

function inspect(event) {
  return analyzeEvent(event);
}

function resolveProjectRoot(options = {}) {
  if (options.projectRoot) {
    return path.resolve(options.projectRoot);
  }

  if (options.cwd) {
    return path.resolve(options.cwd);
  }

  return process.cwd();
}

async function generateFromPrompt(command, options = {}) {
  return runCommand(command, options);
}

async function runCommand(rawCommand, options = {}) {
  const parsed = parseCommand(rawCommand);

  if (!parsed.recognized) {
    return {
      success: false,
      action: parsed.action,
      command: parsed.command,
      message: 'Unsupported command. Use: create module/screen/feature/workflow <name>.',
      parsed,
    };
  }

  const projectRoot = resolveProjectRoot(options);
  const config = await readConfig(projectRoot);
  const smartDecisionMode = options.smartDecisionMode === true || parsed.options.smartDecisionMode || config.smartDecisionMode;

  if (parsed.action === 'self-improve-start') {
    return {
      success: true,
      action: parsed.action,
      status: startContinuousImprovement({
        projectRoot,
        intervalMs: options.intervalMs,
        autoApply: options.autoApply ?? config.autoImprove,
        smartDecisionMode,
      }),
      projectProfile: await detectProjectProfile(projectRoot),
      message: smartDecisionMode
        ? 'Smart Decision Engine Mode activated.'
        : 'Self-Improving Engine Mode activated.',
    };
  }

  if (parsed.action === 'self-improve-stop') {
    return {
      success: true,
      action: parsed.action,
      status: stopContinuousImprovement(),
      message: 'Self-Improving Engine Mode stopped.',
    };
  }

  if (parsed.action === 'self-improve-status') {
    return {
      success: true,
      action: parsed.action,
      status: getStatus(),
      projectProfile: await detectProjectProfile(projectRoot),
    };
  }

  if (parsed.action === 'self-improve-run') {
    const report = await runImprovementCycle({
      projectRoot,
      autoApply: options.autoApply ?? config.autoImprove,
      smartDecisionMode,
      source: options.source || 'command',
    });

    return {
      success: true,
      action: parsed.action,
      projectProfile: await detectProjectProfile(projectRoot),
      report,
    };
  }

  if (parsed.action === 'create-module' || parsed.action === 'create-feature') {
    return generateSaaSArtifact({
      projectRoot,
      action: parsed.action,
      entityName: parsed.entity.name,
      premiumUI: parsed.options.premiumUI || config.uiStyle === 'premium' || options.premiumUI === true,
    });
  }

  if (parsed.action === 'create-screen') {
    return generateSaaSArtifact({
      projectRoot,
      action: parsed.action,
      entityName: parsed.entity.name,
      premiumUI: true,
    });
  }

  if (parsed.action === 'create-workflow') {
    return generateSaaSArtifact({
      projectRoot,
      action: parsed.action,
      entityName: parsed.entity.name,
      premiumUI: parsed.options.premiumUI || config.uiStyle === 'premium' || options.premiumUI === true,
    });
  }

  return {
    success: false,
    action: parsed.action,
    command: parsed.command,
    message: 'No execution path available for this command.',
    parsed,
  };
}

async function scan(commandOrEntityName, options = {}) {
  const parsed = parseCommand(commandOrEntityName);
  const entityName = parsed.recognized
    ? parsed.entity?.name
    : String(commandOrEntityName || '').trim().toLowerCase();

  if (!entityName) {
    return {
      success: false,
      message: 'entityName or command is required.',
    };
  }

  return scanProject({
    projectRoot: resolveProjectRoot(options),
    entityName,
  });
}

module.exports = {
  inspect,
  generateFromPrompt,
  getSelfImproveStatus: getStatus,
  readConfig,
  runCommand,
  scan,
  runImprovementCycle,
  scanProject: scan,
  startContinuousImprovement,
  stopContinuousImprovement,
};
