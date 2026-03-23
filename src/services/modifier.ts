import fs from 'fs';
import path from 'path';
import { ProjectMap } from './projectAnalyzer';

export function modifyFile(filePath: string, transform: (code: string) => string): void {
  const code = fs.readFileSync(filePath, 'utf-8');
  const updated = transform(code);

  if (updated !== code) {
    fs.writeFileSync(filePath, updated, 'utf-8');
  }
}

function findCandidateFile(map: ProjectMap, instruction: string): string | null {
  const lower = instruction.toLowerCase();

  const pageCandidates = Object.values(map.pages);
  const componentCandidates = Object.values(map.components);
  const allFrontend = [...pageCandidates, ...componentCandidates];

  const appCandidate = allFrontend.find((item) => /app\.tsx$/i.test(item));
  const layoutCandidate = allFrontend.find((item) => /layout/i.test(path.basename(item)));

  if (lower.includes('campanha') || lower.includes('campaign')) {
    if (lower.includes('preview') && (lower.includes('lateral') || lower.includes('side'))) {
      return appCandidate || layoutCandidate || allFrontend[0] || null;
    }

    const campaignPage = allFrontend.find((item) => /campaign|campanha/i.test(path.basename(item)));
    if (campaignPage) {
      return campaignPage;
    }

    if (appCandidate) {
      return appCandidate;
    }
  }

  if (lower.includes('route') || lower.includes('rota')) {
    return Object.values(map.routes)[0] || null;
  }

  if (lower.includes('service') || lower.includes('servico') || lower.includes('serviço')) {
    return Object.values(map.backend).find((item) => /service/i.test(path.basename(item))) || null;
  }

  return allFrontend[0] || Object.values(map.backend)[0] || null;
}

function applyUiTransform(code: string, instruction: string): string {
  const lower = instruction.toLowerCase();
  let updated = code;

  if (lower.includes('preview') && (lower.includes('lateral') || lower.includes('side'))) {
    updated = updated
      .replace(
        'className="campaign-container"',
        'className="campaign-container grid grid-cols-1 gap-4 lg:grid-cols-2"',
      )
      .replace(
        'className="mt-4 grid gap-4 lg:grid-cols-2"',
        'className="mt-4 grid gap-4 lg:grid-cols-[1.4fr,1fr]"',
      );
  }

  if (lower.includes('loading') && !updated.includes('LoadingState')) {
    updated = updated.replace(
      'return (',
      'const isLoading = false;\n\n  return (',
    );
  }

  return updated;
}

export interface UpdateResult {
  filePath: string;
  updated: boolean;
}

export function applySmartUpdate(map: ProjectMap, instruction: string): UpdateResult {
  const primaryFilePath = findCandidateFile(map, instruction);

  const fallbackPool = [
    primaryFilePath,
    ...Object.values(map.pages),
    ...Object.values(map.components),
  ].filter((item, index, list): item is string => Boolean(item) && list.indexOf(item) === index);

  if (fallbackPool.length === 0) {
    throw new Error('No candidate file found from project-map.');
  }

  for (const filePath of fallbackPool) {
    const previous = fs.readFileSync(filePath, 'utf-8');
    const next = applyUiTransform(previous, instruction);

    if (next !== previous) {
      fs.writeFileSync(filePath, next, 'utf-8');
      return { filePath, updated: true };
    }
  }

  return { filePath: fallbackPool[0], updated: false };
}
