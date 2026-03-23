import fs from 'fs';
import path from 'path';
import { analyzeProject, ProjectMap } from './core/projectAnalyzer';
import { applySmartUpdate } from './core/modifier';

function resolveEngineRoot(): string {
  const base = path.basename(__dirname) === 'dist-engine'
    ? path.resolve(__dirname, '..')
    : __dirname;
  return base;
}

function readProjectMap(engineRoot: string): ProjectMap | null {
  const mapPath = path.join(engineRoot, 'memory', 'project-map.json');
  if (!fs.existsSync(mapPath)) {
    return null;
  }

  const raw = fs.readFileSync(mapPath, 'utf-8');
  return JSON.parse(raw) as ProjectMap;
}

export interface UpdateSystemResult {
  instruction: string;
  analyzed: boolean;
  targetFile: string;
  updated: boolean;
}

export function updateSystem(instruction: string, basePath = process.cwd()): UpdateSystemResult {
  if (!instruction.trim()) {
    throw new Error('Instruction is required.');
  }

  const engineRoot = resolveEngineRoot();
  let map = readProjectMap(engineRoot);
  let analyzed = false;

  if (!map) {
    map = analyzeProject(basePath);
    analyzed = true;
  }

  const result = applySmartUpdate(map, instruction);

  return {
    instruction,
    analyzed,
    targetFile: result.filePath,
    updated: result.updated,
  };
}
