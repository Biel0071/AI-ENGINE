const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DOCS_DIR = path.join(ROOT, 'system', 'docs');
const VISUAL_FILE = path.join(DOCS_DIR, 'FOLDER-VISUALIZATION.md');
const USAGE_FILE = path.join(DOCS_DIR, 'USAGE-REPORT.md');

const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const IGNORE_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'dist-engine',
  'generated',
  'future',
  'build',
  '.next',
  '.turbo',
  'coverage',
]);

function toUnixPath(value) {
  return value.replace(/\\/g, '/');
}

function depthOf(relativePath) {
  if (!relativePath) {
    return 0;
  }

  return toUnixPath(relativePath).split('/').filter(Boolean).length;
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function walk(rootPath, currentPath = rootPath, acc = { files: [], folders: [] }) {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && IGNORE_DIRS.has(entry.name)) {
      continue;
    }

    const abs = path.join(currentPath, entry.name);
    const rel = path.relative(rootPath, abs);

    if (entry.isDirectory()) {
      acc.folders.push(rel);
      await walk(rootPath, abs, acc);
    } else {
      acc.files.push(rel);
    }
  }

  return acc;
}

async function readText(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return '';
  }
}

function extractImports(content = '') {
  const imports = [];
  const patterns = [
    /import\s+[^'"`]*['"`]([^'"`]+)['"`]/g,
    /require\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
  ];

  for (const pattern of patterns) {
    let match = pattern.exec(content);
    while (match) {
      imports.push(match[1]);
      match = pattern.exec(content);
    }
  }

  return imports.filter((ref) => {
    const value = String(ref || '');
    if (!value) {
      return false;
    }

    if (value.includes('${') || value.includes('{{') || value.includes('}}')) {
      return false;
    }

    return true;
  });
}

async function resolveLocalImport(fromFileAbsolutePath, importRef) {
  if (!importRef.startsWith('.')) {
    return null;
  }

  const base = path.resolve(path.dirname(fromFileAbsolutePath), importRef);
  const candidates = [
    base,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mjs`,
    `${base}.cjs`,
    path.join(base, 'index.js'),
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ];

  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return candidate;
    }
  }

  return null;
}

function folderKeyFor(fileRelPath) {
  const normalized = toUnixPath(path.dirname(fileRelPath));
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length === 0) {
    return '';
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return `${parts[0]}/${parts[1]}`;
}

function folderTreeLines(folders = [], files = []) {
  const folderSet = new Set(folders.map(toUnixPath));
  const fileCountByFolder = new Map();

  for (const file of files) {
    const rel = toUnixPath(file);
    const folder = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '.';
    fileCountByFolder.set(folder, (fileCountByFolder.get(folder) || 0) + 1);
  }

  const top = Array.from(folderSet)
    .filter((item) => depthOf(item) === 1)
    .sort((a, b) => a.localeCompare(b));

  const lines = [];
  lines.push('Top-level folders and subfolders (depth 2):');
  lines.push('');

  for (const item of top) {
    const count = fileCountByFolder.get(item) || 0;
    lines.push(`- ${item}/ (${count} files)`);

    const children = Array.from(folderSet)
      .filter((candidate) => candidate.startsWith(`${item}/`) && depthOf(candidate) === 2)
      .sort((a, b) => a.localeCompare(b));

    for (const child of children) {
      const childCount = fileCountByFolder.get(child) || 0;
      lines.push(`  - ${child}/ (${childCount} files)`);
    }
  }

  return lines;
}

async function buildUsage(rootPath, files = []) {
  const sourceFiles = files.filter((rel) => SOURCE_EXTENSIONS.has(path.extname(rel).toLowerCase()));

  const referencedFiles = new Set();
  const unresolvedImports = [];

  for (const rel of sourceFiles) {
    const abs = path.join(rootPath, rel);
    const content = await readText(abs);
    const imports = extractImports(content);

    for (const ref of imports) {
      if (!ref.startsWith('.')) {
        continue;
      }

      const resolved = await resolveLocalImport(abs, ref);
      if (!resolved) {
        unresolvedImports.push({ from: rel, ref });
        continue;
      }

      const resolvedRel = path.relative(rootPath, resolved);
      referencedFiles.add(toUnixPath(resolvedRel));
    }
  }

  const unreferencedSourceFiles = sourceFiles
    .map((item) => toUnixPath(item))
    .filter((item) => !referencedFiles.has(item) && !item.endsWith('/index.js') && item !== 'index.js')
    .sort((a, b) => a.localeCompare(b));

  const folderUsage = new Map();
  for (const file of referencedFiles) {
    const key = folderKeyFor(file);
    folderUsage.set(key, (folderUsage.get(key) || 0) + 1);
  }

  return {
    sourceFiles: sourceFiles.map(toUnixPath),
    referencedFiles: Array.from(referencedFiles).sort((a, b) => a.localeCompare(b)),
    unreferencedSourceFiles,
    unresolvedImports,
    folderUsage,
  };
}

function usageLines(usage) {
  const lines = [];
  lines.push('Used folders (based on local imports/requires):');
  lines.push('');

  const usedFolders = Array.from(usage.folderUsage.entries())
    .sort((a, b) => b[1] - a[1]);

  if (usedFolders.length === 0) {
    lines.push('- none detected');
  } else {
    for (const [folder, count] of usedFolders) {
      lines.push(`- ${folder} -> ${count} references`);
    }
  }

  lines.push('');
  lines.push(`Total source files: ${usage.sourceFiles.length}`);
  lines.push(`Total referenced source files: ${usage.referencedFiles.length}`);
  lines.push(`Potentially unreferenced source files: ${usage.unreferencedSourceFiles.length}`);
  lines.push(`Unresolved local imports: ${usage.unresolvedImports.length}`);
  lines.push('');

  lines.push('Potentially unreferenced source files (top 80):');
  lines.push('');
  for (const item of usage.unreferencedSourceFiles.slice(0, 80)) {
    lines.push(`- ${item}`);
  }

  lines.push('');
  lines.push('Unresolved local imports (top 40):');
  lines.push('');
  for (const item of usage.unresolvedImports.slice(0, 40)) {
    lines.push(`- from ${toUnixPath(item.from)} -> ${item.ref}`);
  }

  return lines;
}

async function writeReport(filePath, title, lines) {
  const body = [
    `# ${title}`,
    '',
    `Generated at: ${new Date().toISOString()}`,
    '',
    ...lines,
    '',
  ].join('\n');

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, body, 'utf8');
}

async function run() {
  const { folders, files } = await walk(ROOT);

  const visualLines = folderTreeLines(folders, files);
  const usage = await buildUsage(ROOT, files);
  const usageReportLines = usageLines(usage);

  await writeReport(VISUAL_FILE, 'Folder Visualization', visualLines);
  await writeReport(USAGE_FILE, 'Usage Report', usageReportLines);

  console.log('[audit] generated system/docs/FOLDER-VISUALIZATION.md');
  console.log('[audit] generated system/docs/USAGE-REPORT.md');
  console.log(`[audit] source files: ${usage.sourceFiles.length}`);
  console.log(`[audit] referenced files: ${usage.referencedFiles.length}`);
  console.log(`[audit] potentially unreferenced: ${usage.unreferencedSourceFiles.length}`);
}

run().catch((error) => {
  console.error('[audit] failed:', error.message);
  process.exitCode = 1;
});
