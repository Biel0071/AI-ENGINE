'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { VisualTestEngine } = require('../src/qa/visual-test-engine');

function pngPixel(red, green, blue, alpha = 255) {
  const chunk = (type, data) => {
    const name = Buffer.from(type);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crcInput = Buffer.concat([name, data]);
    let crc = 0xffffffff;
    for (const byte of crcInput) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([length, name, data, crcBuffer]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0);
  header.writeUInt32BE(1, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(Buffer.from([0, red, green, blue, alpha]))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

test('visual QA does not pass when screenshots are missing or not valid PNGs', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-visual-engine-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const reference = path.join(root, 'reference.png');
  const current = path.join(root, 'current.png');
  fs.writeFileSync(reference, Buffer.from('same-byte-length-a'));
  fs.writeFileSync(current, Buffer.from('same-byte-length-b'));
  const engine = new VisualTestEngine({ storagePath: path.join(root, 'results.json'), allowedRoots: [root] });

  const invalidPng = engine.runVisualComparison({ baselineScreenshot: reference, currentScreenshot: current });
  assert.equal(invalidPng.status, 'NOT_MEASURED');
  assert.equal(invalidPng.passed, null);

  const noBaseline = engine.runVisualComparison({ currentScreenshot: current });
  assert.equal(noBaseline.status, 'NOT_MEASURED');
  assert.equal(noBaseline.passed, null);
});

test('visual QA refuses image paths outside the configured evidence roots', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-visual-engine-roots-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const allowed = path.join(root, 'allowed');
  const elsewhere = path.join(root, 'elsewhere');
  fs.mkdirSync(allowed);
  fs.mkdirSync(elsewhere);
  const allowedImage = path.join(allowed, 'capture.png');
  const outsideImage = path.join(elsewhere, 'capture.png');
  fs.writeFileSync(allowedImage, 'not-a-png');
  fs.writeFileSync(outsideImage, 'not-a-png');
  const engine = new VisualTestEngine({ storagePath: path.join(root, 'results.json'), allowedRoots: [allowed] });

  const result = engine.runVisualComparison({ baselineScreenshot: outsideImage, currentScreenshot: allowedImage });
  assert.equal(result.status, 'NOT_MEASURED');
  assert.match(result.errors[0], /raízes de QA permitidas/i);
});

test('visual QA compares decoded pixels and applies its tolerance to real PNGs', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-visual-engine-pixels-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const baseline = path.join(root, 'baseline.png');
  const identical = path.join(root, 'identical.png');
  const different = path.join(root, 'different.png');
  fs.writeFileSync(baseline, pngPixel(0, 0, 0));
  fs.writeFileSync(identical, pngPixel(0, 0, 0));
  fs.writeFileSync(different, pngPixel(255, 255, 255));
  const engine = new VisualTestEngine({ storagePath: path.join(root, 'results.json'), allowedRoots: [root] });

  const same = engine.runVisualComparison({ baselineScreenshot: baseline, currentScreenshot: identical });
  const changed = engine.runVisualComparison({ baselineScreenshot: baseline, currentScreenshot: different });
  assert.equal(same.status, 'PASSED');
  assert.equal(same.diffPercentage, 0);
  assert.equal(changed.status, 'FAILED');
  assert.equal(changed.diffPercentage, 100);
});

test('legacy size-based results are demoted when they lack a pixel measurement', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-visual-engine-legacy-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const storagePath = path.join(root, 'results.json');
  fs.writeFileSync(storagePath, JSON.stringify([{ id: 'legacy', status: 'PASSED', passed: true, diffPercentage: 0 }]));

  const engine = new VisualTestEngine({ storagePath, allowedRoots: [root] });
  assert.equal(engine.getResults()[0].status, 'NOT_MEASURED');
  assert.equal(engine.getResults()[0].passed, null);
  assert.equal(engine.getResults()[0].diffPercentage, null);
});
