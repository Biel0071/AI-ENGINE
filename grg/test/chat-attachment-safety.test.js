const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

test('Chat Attachment: sha256Fallback computes accurate SHA-256 in insecure/HTTP contexts', () => {
  const sidebarCode = fs.readFileSync(path.join(__dirname, '../public/fenix-mascot-sidebar.js'), 'utf8');

  // Assert crypto.subtle is NOT invoked without defensive checks or fallback
  assert.ok(sidebarCode.includes('computeSha256(buffer)'), 'Must have computeSha256 method');
  assert.ok(sidebarCode.includes('sha256Fallback(bytes)'), 'Must have pure-JS sha256Fallback');

  // Extract sha256Fallback function from file to execute it directly in isolation
  const fnMatch = sidebarCode.match(/sha256Fallback\s*\(\s*bytes\s*\)\s*\{([\s\S]*?)\n\s*\},/);
  assert.ok(fnMatch, 'sha256Fallback method definition found');

  const sha256FallbackFn = new Function('bytes', fnMatch[1]);

  const testVectors = [
    { input: '', expected: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
    { input: 'image.png file data simulation', expected: crypto.createHash('sha256').update('image.png file data simulation').digest('hex') },
    { input: 'FÊNIX OS FORENSIC SCAN', expected: crypto.createHash('sha256').update('FÊNIX OS FORENSIC SCAN').digest('hex') },
  ];

  for (const vector of testVectors) {
    const bytes = new Uint8Array(Buffer.from(vector.input, 'utf8'));
    const actual = sha256FallbackFn(bytes);
    assert.equal(actual, vector.expected, `SHA-256 mismatch for "${vector.input}"`);
  }
});

test('Sidebar chat dispatcher does not reference an undefined trimmed variable', () => {
  const sidebarCode = fs.readFileSync(path.join(__dirname, '../public/fenix-mascot-sidebar.js'), 'utf8');
  const start = sidebarCode.indexOf('async sendChatMessage(options = {}) {');
  const end = sidebarCode.indexOf('async handleCommand(cmd) {', start);
  assert.notEqual(start, -1, 'sendChatMessage method must exist');
  assert.notEqual(end, -1, 'sendChatMessage method must have a following method boundary');

  const dispatcher = sidebarCode.slice(start, end);
  assert.doesNotMatch(dispatcher, /\btrimmed\b/, 'The dispatcher uses its normalized text variable, not an undeclared identifier');
});
