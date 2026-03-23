#!/usr/bin/env node

const path = require('path');
const { analyzeProject, organizeProject, generateFeature } = require('../index');

function logInfo(message) {
  console.log(`[ai-engine] ${message}`);
}

function logError(message) {
  console.error(`[ai-engine] error: ${message}`);
}

function showSafeModeLog(result) {
  const organization = result && result.organization ? result.organization : result;
  const safeModeActive = Boolean(organization && organization.safeModeActive === true);
  const structuralChangesAllowed = Boolean(organization && organization.structuralChangesAllowed === true);

  if (safeModeActive || !structuralChangesAllowed) {
    logInfo('SAFE MODE ACTIVE - no structural changes applied');
  }
}

function printHelp() {
  console.log([
    'AI Engine CLI (V1.0.0)',
    '',
    'Usage:',
    '  ai-engine analyze [path]',
    '  ai-engine organize [path]',
    '  ai-engine generate [feature] [path]',
    '  ai-engine create [project-type] [path]',
    '',
    'Examples:',
    '  ai-engine analyze .',
    '  ai-engine organize .',
    '  ai-engine generate campaigns .',
    '  ai-engine create crm .',
  ].join('\n'));
}

function resolvePath(inputPath) {
  return path.resolve(inputPath || process.cwd());
}

function normalizeFeature(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function runAnalyze(targetPath) {
  const projectPath = resolvePath(targetPath);
  const analysis = await analyzeProject(projectPath);

  logInfo(`analyze success: ${projectPath}`);
  console.log(JSON.stringify({
    path: projectPath,
    totalFiles: analysis.summary.totalFiles,
    frontendFiles: analysis.summary.frontendFiles,
    backendFiles: analysis.summary.backendFiles,
    routes: analysis.routes.length,
    components: analysis.components.length,
  }, null, 2));
}

async function runOrganize(targetPath) {
  const projectPath = resolvePath(targetPath);
  const result = await organizeProject(projectPath);

  showSafeModeLog(result);
  logInfo(`organize success: ${projectPath}`);
  console.log(JSON.stringify({
    path: projectPath,
    safeModeActive: result.safeModeActive,
    structuralChangesAllowed: result.structuralChangesAllowed,
    dryRun: result.dryRun,
    moved: result.moves.length,
    preview: result.preview.length,
    suggestions: result.improvements && result.improvements.suggestions ? result.improvements.suggestions.length : 0,
  }, null, 2));
}

async function runGenerate(feature, targetPath) {
  const normalized = normalizeFeature(feature);
  if (!normalized) {
    throw new Error('Feature is required. Usage: ai-engine generate [feature] [path]');
  }

  const projectPath = resolvePath(targetPath);
  const result = await generateFeature(projectPath, normalized);

  showSafeModeLog(result);
  logInfo(`generate success: ${normalized}`);
  console.log(JSON.stringify({
    path: projectPath,
    feature: result.feature,
    generatedFiles: Array.isArray(result.files) ? result.files.length : 0,
    safeModeActive: result.organization ? result.organization.safeModeActive : undefined,
    structuralChangesAllowed: result.organization ? result.organization.structuralChangesAllowed : undefined,
    moved: result.organization && Array.isArray(result.organization.moves) ? result.organization.moves.length : 0,
    preview: result.organization && Array.isArray(result.organization.preview) ? result.organization.preview.length : 0,
  }, null, 2));
}

async function runCreate(projectType, targetPath) {
  const normalizedType = normalizeFeature(projectType);
  if (!normalizedType) {
    throw new Error('Project type is required. Usage: ai-engine create [project-type] [path]');
  }

  const projectPath = resolvePath(targetPath);
  const featureName = `${normalizedType}-starter`;

  logInfo(`create mode: using controlled generation for project-type "${normalizedType}"`);
  const result = await generateFeature(projectPath, featureName);

  showSafeModeLog(result);
  logInfo(`create success: ${normalizedType}`);
  console.log(JSON.stringify({
    path: projectPath,
    projectType: normalizedType,
    generatedFeature: result.feature,
    generatedFiles: Array.isArray(result.files) ? result.files.length : 0,
    safeModeActive: result.organization ? result.organization.safeModeActive : undefined,
    structuralChangesAllowed: result.organization ? result.organization.structuralChangesAllowed : undefined,
  }, null, 2));
}

async function main() {
  const [, , command, arg1, arg2] = process.argv;

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  switch (command) {
    case 'analyze':
      await runAnalyze(arg1 || '.');
      return;
    case 'organize':
      await runOrganize(arg1 || '.');
      return;
    case 'generate':
      await runGenerate(arg1, arg2 || '.');
      return;
    case 'create':
      await runCreate(arg1, arg2 || '.');
      return;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

main().catch((error) => {
  logError(error && error.message ? error.message : String(error));
  process.exit(1);
});
