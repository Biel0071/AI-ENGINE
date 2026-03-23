#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const runtime = require('../../hooks');

function requireBuiltModule(fileName) {
  const builtEntry = path.resolve(__dirname, '..', '..', 'system', 'dist-engine', fileName);

  if (!fs.existsSync(builtEntry)) {
    console.error('Generation engine is not built. Run: npm run build:engine');
    process.exit(1);
  }

  return require(builtEntry);
}

async function runGenerate(featurePrompt) {
  const { generateSystem } = requireBuiltModule('generateSystem.js');
  const result = await generateSystem(featurePrompt);

  console.log(JSON.stringify({
    prompt: result.prompt,
    interpretedFeature: result.interpretedFeature,
    outputRoot: result.outputRoot,
    filesWritten: result.filesWritten.length,
  }, null, 2));
}

function runMap(basePath) {
  const { analyzeProject } = requireBuiltModule(path.join('core', 'projectAnalyzer.js'));
  const map = analyzeProject(basePath || process.cwd());
  console.log(JSON.stringify(map, null, 2));
}

function runUpdate(instruction, basePath) {
  const { updateSystem } = requireBuiltModule('updateSystem.js');
  const result = updateSystem(instruction, basePath || process.cwd());
  console.log(JSON.stringify(result, null, 2));
}

async function runDev(basePath) {
  const { runDev } = requireBuiltModule(path.join('core', 'devRunner.js'));
  const result = await runDev('npm run dev', basePath || process.cwd());
  console.log(JSON.stringify(result, null, 2));
}

async function main() {
  const [, , ...args] = process.argv;
  const firstArg = args[0];
  const isGenerateCommand = firstArg === 'generate';
  const isMapCommand = firstArg === 'map';
  const isUpdateCommand = firstArg === 'update';
  const isDevCommand = firstArg === 'dev';

  if (isGenerateCommand) {
    const featurePrompt = args.slice(1).join(' ').trim();

    if (!featurePrompt) {
      console.log('Usage: ai-engine generate "feature"');
      process.exit(0);
    }

    await runGenerate(featurePrompt);
    return;
  }

  if (isMapCommand) {
    const basePath = args.slice(1).join(' ').trim() || process.cwd();
    runMap(basePath);
    return;
  }

  if (isUpdateCommand) {
    const instruction = args.slice(1).join(' ').trim();

    if (!instruction) {
      console.log('Usage: ai-engine update "instruction"');
      process.exit(0);
    }

    runUpdate(instruction, process.cwd());
    return;
  }

  if (isDevCommand) {
    await runDev(process.cwd());
    return;
  }

  const command = args.join(' ').trim();

  if (!command) {
    console.log('Usage: ai-engine <command>');
    console.log('Usage: ai-engine generate "feature"');
    console.log('Usage: ai-engine map [path]');
    console.log('Usage: ai-engine update "instruction"');
    console.log('Usage: ai-engine dev');
    console.log('Example: ai-engine "run self-improve now"');
    process.exit(0);
  }

  const result = await runtime.runCommand(command, { projectRoot: process.cwd() });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error('[ai-engine] command failed:', error.message);
  process.exit(1);
});
