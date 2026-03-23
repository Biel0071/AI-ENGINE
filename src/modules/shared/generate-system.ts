import fs from 'fs/promises';
import path from 'path';
import { interpretFeature } from './core/interpreter';
import { FeatureDefinition, GenerationResult, GeneratedFile } from './core/types';
import { generateBackend } from './intelligence/generators/backend';
import { generateFrontend } from './intelligence/generators/frontend';
import { generateApiConnector } from './intelligence/generators/api';

const ENGINE_ROOT = path.basename(__dirname) === 'dist-engine'
  ? path.resolve(__dirname, '..')
  : __dirname;

async function ensureDir(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function writeFiles(outputRoot: string, files: GeneratedFile[]): Promise<string[]> {
  const written: string[] = [];

  for (const file of files) {
    const absolutePath = path.join(outputRoot, file.path);
    await ensureDir(absolutePath);
    await fs.writeFile(absolutePath, file.content, 'utf8');
    written.push(absolutePath);
  }

  return written;
}

async function readJsonArray(filePath: string): Promise<unknown[]> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function updateMemory(feature: FeatureDefinition): Promise<void> {
  const featuresFile = path.join(ENGINE_ROOT, 'memory', 'features.json');
  const uiPatternsFile = path.join(ENGINE_ROOT, 'memory', 'ui-patterns.json');

  const features = await readJsonArray(featuresFile);
  const uiPatterns = await readJsonArray(uiPatternsFile);

  const filteredFeatures = features.filter((item) => {
    if (!item || typeof item !== 'object') {
      return true;
    }
    return (item as { feature?: string }).feature !== feature.feature;
  });

  const filteredUiPatterns = uiPatterns.filter((item) => {
    if (!item || typeof item !== 'object') {
      return true;
    }
    return (item as { feature?: string }).feature !== feature.feature;
  });

  const nextFeatures = [
    ...filteredFeatures,
    {
      feature: feature.feature,
      featureName: feature.featureName,
      modules: feature.modules,
      entities: feature.entities,
      actions: feature.actions,
      backend: feature.actions.map((item) => item.name),
      frontend: feature.uiScreens.map((item) => item.name),
      uiScreens: feature.uiScreens,
      businessRules: feature.businessRules,
      createdAt: new Date().toISOString(),
    },
  ];

  const nextUiPatterns = [
    ...filteredUiPatterns,
    {
      feature: feature.feature,
      featureName: feature.featureName,
      theme: feature.style.theme,
      lookAndFeel: feature.style.lookAndFeel,
      layout: 'sidebar_topbar',
      screens: feature.uiScreens,
      createdAt: new Date().toISOString(),
    },
  ];

  await fs.writeFile(featuresFile, JSON.stringify(nextFeatures, null, 2), 'utf8');
  await fs.writeFile(uiPatternsFile, JSON.stringify(nextUiPatterns, null, 2), 'utf8');
}

export async function generateSystem(prompt: string): Promise<GenerationResult> {
  const interpretedFeature = interpretFeature(prompt);
  const slug = interpretedFeature.feature.replace(/[^a-z0-9_-]/gi, '-');
  const outputRoot = path.join(ENGINE_ROOT, 'generated', slug);

  const backendFiles = generateBackend(interpretedFeature);
  const frontendFiles = generateFrontend(interpretedFeature);
  const apiConnectorFiles = generateApiConnector(interpretedFeature);

  const filesWritten = await writeFiles(outputRoot, [
    ...backendFiles,
    ...frontendFiles,
    ...apiConnectorFiles,
  ]);

  await updateMemory(interpretedFeature);

  return {
    prompt,
    interpretedFeature,
    outputRoot,
    filesWritten,
  };
}

async function runCli(): Promise<void> {
  const args = process.argv.slice(2);
  const prompt = args[0] === 'generate'
    ? args.slice(1).join(' ').trim()
    : args.join(' ').trim();

  if (!prompt) {
    console.log('Usage: ai-engine generate "feature"');
    return;
  }

  const result = await generateSystem(prompt);

  console.log(JSON.stringify(
    {
      prompt: result.prompt,
      interpretedFeature: result.interpretedFeature,
      outputRoot: result.outputRoot,
      filesWritten: result.filesWritten.length,
    },
    null,
    2,
  ));
}

if (require.main === module) {
  runCli().catch((error: Error) => {
    console.error('[ai-engine] generation failed:', error.message);
    process.exit(1);
  });
}
