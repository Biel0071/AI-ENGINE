import fs from 'fs';
import path from 'path';

export interface ProjectMap {
  pages: Record<string, string>;
  components: Record<string, string>;
  backend: Record<string, string>;
  routes: Record<string, string>;
}

function resolveEngineRoot(): string {
  const parentName = path.basename(path.dirname(__dirname));
  if (parentName === 'dist-engine') {
    return path.resolve(__dirname, '..', '..');
  }
  return path.resolve(__dirname, '..');
}

function shouldSkipDirectory(dirName: string): boolean {
  return ['node_modules', '.git', 'dist', 'dist-engine', '.next', '.turbo'].includes(dirName);
}

function normalizeFilePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

export function analyzeProject(basePath: string): ProjectMap {
  if (!fs.existsSync(basePath)) {
    throw new Error(`Base path not found: ${basePath}`);
  }

  const map: ProjectMap = {
    pages: {},
    components: {},
    backend: {},
    routes: {},
  };

  function scan(dir: string): void {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of files) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (shouldSkipDirectory(entry.name)) {
          continue;
        }
        scan(fullPath);
        continue;
      }

      const fileName = entry.name;
      const normalizedPath = normalizeFilePath(fullPath);
      const lowerDir = normalizeFilePath(dir).toLowerCase();
      const lowerName = fileName.toLowerCase();

      if (fileName.endsWith('.tsx')) {
        if (lowerDir.includes('/pages') || lowerName.includes('page')) {
          map.pages[fileName] = normalizedPath;
        } else {
          map.components[fileName] = normalizedPath;
        }
      }

      if (lowerName.includes('controller') || lowerName.includes('service') || lowerName.includes('repository')) {
        map.backend[fileName] = normalizedPath;
      }

      if (lowerName.includes('routes') || lowerName.includes('route')) {
        map.routes[fileName] = normalizedPath;
      }
    }
  }

  scan(basePath);

  const engineRoot = resolveEngineRoot();
  const memoryDir = path.join(engineRoot, 'memory');
  const mapFile = path.join(memoryDir, 'project-map.json');
  fs.mkdirSync(memoryDir, { recursive: true });
  fs.writeFileSync(mapFile, JSON.stringify(map, null, 2));

  return map;
}
