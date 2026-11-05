const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { resolveProjectGitWorkspace } = require('../src/projects/project-workspace-resolver');

test('local Fenix catalog project resolves Git operations to its configured repository root', (t) => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-workspace-root-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const root = path.join(temp, 'repository');
  const nestedWorkspace = path.join(root, 'grg');
  fs.mkdirSync(path.join(root, '.git'), { recursive: true });
  fs.mkdirSync(nestedWorkspace, { recursive: true });
  const previous = process.env.FENIX_GIT_REPO_PATH;
  process.env.FENIX_GIT_REPO_PATH = root;
  t.after(() => {
    if (previous === undefined) delete process.env.FENIX_GIT_REPO_PATH;
    else process.env.FENIX_GIT_REPO_PATH = previous;
  });

  const workspace = resolveProjectGitWorkspace({ id: 'local-fenix', catalogId: 'fenix', workspace: nestedWorkspace }, null);
  assert.equal(workspace, root);
});

test('other local catalog projects keep their own workspace boundary', (t) => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-workspace-boundary-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const root = path.join(temp, 'repository');
  const nestedWorkspace = path.join(root, 'other-project');
  fs.mkdirSync(path.join(root, '.git'), { recursive: true });
  fs.mkdirSync(nestedWorkspace, { recursive: true });
  const previous = process.env.FENIX_GIT_REPO_PATH;
  process.env.FENIX_GIT_REPO_PATH = root;
  t.after(() => {
    if (previous === undefined) delete process.env.FENIX_GIT_REPO_PATH;
    else process.env.FENIX_GIT_REPO_PATH = previous;
  });

  const workspace = resolveProjectGitWorkspace({ id: 'local-other', catalogId: 'other', workspace: nestedWorkspace }, null);
  assert.equal(workspace, nestedWorkspace);
});
