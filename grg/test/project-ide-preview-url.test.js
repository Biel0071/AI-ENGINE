'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PROJECTS } = require('../src/projects/project-registry');

const ideSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'project-ide-live.js'), 'utf8');
const shellSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const resolverSource = ideSource.match(/function getPreviewUrlForProject\(project\) \{([\s\S]*?)\n  \}/)?.[1];
assert.ok(resolverSource, 'IDE preview URL resolver must exist');
const resolvePreviewUrl = new Function('project', 'window', resolverSource);
const screenResolverSource = ideSource.match(/function getPreviewUrlForScreen\(project, screen\) \{([\s\S]*?)\n  \}/)?.[1];
assert.ok(screenResolverSource, 'IDE screen preview resolver must exist');
const resolveScreenPreviewUrl = new Function('project', 'screen', 'window', 'getPreviewUrlForProject', screenResolverSource);

test('IDE ZapAI preview uses its registered frontend binding, not the API port', () => {
  const zapai = PROJECTS.find(project => project.id === 'zapai-crm');
  const frontendBinding = zapai.deployment.bindings.find(binding => /front.?end/i.test(binding.label));

  assert.ok(frontendBinding?.url);
  assert.equal(resolvePreviewUrl(zapai, { location: { origin: 'http://fenix.test' } }), frontendBinding.url);
  assert.notEqual(new URL(frontendBinding.url).port, String(zapai.backend.port));
});

test('IDE API Platform preview resolves the dashboard binding, never the API health port', () => {
  const apiPlatform = PROJECTS.find(project => project.id === 'api-platform');
  const dashboard = apiPlatform.deployment.bindings.find(binding => binding.label === 'Dashboard');

  assert.equal(resolvePreviewUrl(apiPlatform, { location: { origin: 'http://fenix.test' } }), dashboard.url);
  assert.equal(new URL(dashboard.url).port, String(apiPlatform.frontend.port));
  assert.notEqual(new URL(dashboard.url).port, String(apiPlatform.backend.port));
});

test('IDE rejects a stale frontend port that points at the API and uses a valid frontend binding', () => {
  const project = {
    id: 'zapai-crm',
    frontend: { port: 4025 },
    backend: { port: 4025 },
    deployment: { bindings: [
      { label: 'Frontend HTTPS', port: 1000, url: 'https://zapai.example.test:1000/' },
      { label: 'API health', port: 4025, url: 'http://zapai.example.test:4025/health' }
    ] }
  };

  assert.equal(resolvePreviewUrl(project, { location: { origin: 'http://fenix.test' } }), 'https://zapai.example.test:1000/');
});

test('IDE opens in code-only mode for existing and new sessions until Split is selected', () => {
  assert.match(ideSource, /mode:\s*localStorage\.getItem\('fenix_ide_mode_v2'\)\s*\|\|\s*'code'/);
  assert.match(ideSource, /localStorage\.setItem\('fenix_ide_mode_v2',\s*newMode\)/);
  assert.match(ideSource, /Preview sem resposta após 15 s/);
  assert.match(shellSource, /role="separator" aria-orientation="vertical"/);
  assert.match(ideSource, /divider\.addEventListener\('keydown'/);
  assert.match(ideSource, /setSplitRatio\(offsetX \/ totalWidth\)/);
});

test('IDE shows no preview for projects without a registered frontend instead of substituting Fenix UI', () => {
  assert.equal(resolvePreviewUrl({ id: 'fenix-os' }, { location: { origin: 'http://fenix.test' } }), '');
  assert.equal(resolvePreviewUrl({ id: 'api-platform' }, { location: { origin: 'http://fenix.test' } }), '');
  assert.equal(resolvePreviewUrl({ id: 'local-project' }, { location: { origin: 'http://fenix.test' } }), '');
  assert.match(shellSource, /Este projeto não tem um endereço de frontend publicado/);
  assert.match(ideSource, /if \(!url\)[\s\S]*?frameWrap\.style\.display = ''[\s\S]*?unavailable\.style\.display = 'flex'/);
  assert.match(ideSource, /if \(frame\?\.getAttribute\('src'\)\) frame\.setAttribute\('src', 'about:blank'\)/);
});

test('IDE opens a selected Screen DNA route on the registered frontend binding', () => {
  const project = { id: 'demo', deployment: { bindings: [{ label: 'Frontend', port: 4173, url: 'https://demo.example.test/' }] } };
  const url = resolveScreenPreviewUrl(project, { route: '/settings/users' }, { location: { origin: 'http://fenix.test' } }, (value) => resolvePreviewUrl(value, { location: { origin: 'http://fenix.test' } }));
  assert.equal(url, 'https://demo.example.test/settings/users');
});

test('IDE previews a measured project HTML source through the authenticated Project Mirror', () => {
  const project = { id: 'demo', workspace: 'C:/workspace/demo' };
  const url = resolveScreenPreviewUrl(project, { route: '#settings', sourceFile: 'dist/index.html' }, { location: { origin: 'http://fenix.test' } }, (value) => resolvePreviewUrl(value, { location: { origin: 'http://fenix.test' } }));
  assert.equal(url, '/api/project-mirror/preview?path=C%3A%2Fworkspace%2Fdemo&file=dist%2Findex.html#settings');
});

test('IDE screen preview rejects external or traversal routes and falls back to the project preview', () => {
  const project = { id: 'demo', workspace: 'C:/workspace/demo' };
  const url = resolveScreenPreviewUrl(project, { route: 'https://outside.example.test', sourceFile: '../private.html' }, { location: { origin: 'http://fenix.test' } }, (value) => resolvePreviewUrl(value, { location: { origin: 'http://fenix.test' } }));
  assert.equal(url, '');
});

test('IDE reports missing Git measurements instead of inventing a branch or version', () => {
  assert.match(ideSource, /const branchLabel = gitState\?\.branch \? `Branch \$\{gitState\.branch\}` : 'Branch não medida'/);
  assert.match(ideSource, /const commitLabel = gitState\?\.head \? `Commit \$\{gitState\.head\.slice\(0, 7\)\}` : 'Commit não medido'/);
  assert.doesNotMatch(ideSource, /gitState\?\.branch\s*\|\|\s*'main'/);
  assert.doesNotMatch(ideSource, /gitState\?\.head[^\n]*\|\|\s*'v8\.3'/);
});
test('IDE never substitutes Fenix files for another project or an empty workspace', () => {
  const treeLoader = ideSource.match(/async function loadTree[\s\S]*?\n  }/)?.[0] || '';
  const fileOpener = ideSource.match(/async function openFile[\s\S]*?\n  }/)?.[0] || '';
  assert.ok(treeLoader.includes("state.projectId === 'fenix-os'"));
  assert.ok(fileOpener.includes("state.projectId === 'fenix-os'"));
  assert.match(treeLoader, /Nenhum arquivo no workspace/);
  assert.doesNotMatch(treeLoader, /tree\.length\s*===\s*0/);
  assert.match(treeLoader, /state\.projectId === 'fenix-os'.*?fenix-os\/tree/s);
  assert.match(fileOpener, /state\.projectId === 'fenix-os'.*?fenix-os\/file/s);
});
