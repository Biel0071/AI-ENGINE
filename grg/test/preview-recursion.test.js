'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const htmlSource = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
const ideSource = fs.readFileSync(path.join(publicDir, 'project-ide-live.js'), 'utf8');
const loginSource = fs.readFileSync(path.join(publicDir, 'login.html'), 'utf8');

test('preview-recursion: recursion banner exists in DOM', () => {
  assert.ok(htmlSource.includes('id="fenixAntiRecursionBanner"'), 'Anti recursion banner must exist in index.html');
});

test('preview-recursion: isRecursionUrl intercepts root, /app and fenix shell URLs', () => {
  assert.match(ideSource, /function isRecursionUrl\(url\)/);
  assert.match(ideSource, /lower\s*===\s*'\/app'/);
  assert.match(ideSource, /lower\.includes\('\/app#'\)/);
  assert.match(ideSource, /antiRecBanner\.style\.display\s*=\s*'flex'/);
});

test('preview-recursion: login.html ignores session auto-redirect when running in preview mode', () => {
  assert.ok(
    loginSource.includes("!new URLSearchParams(location.search).has('preview')"),
    'login.html must not redirect to /app if preview parameter is present'
  );
});
