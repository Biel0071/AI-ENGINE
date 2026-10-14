'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const { SystemObserver } = require('../src/reconstruction/system-observer');
const { VisualDnaEngine } = require('../src/reconstruction/visual-dna-engine');

test('HTTP-only observation reports source evidence without fabricated layout or visibility', async (t) => {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<!doctype html><html><head><title>Fixture</title></head><body><button>Salvar</button><a href="/next">Próxima</a></body></html>');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const artifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-observer-test-'));
  t.after(() => fs.rmSync(artifactsDir, { recursive: true, force: true }));
  const observer = new SystemObserver({ artifactsDir });
  observer.hasPlaywright = false;

  const result = await observer.observeUrl(`http://127.0.0.1:${server.address().port}/`);
  const button = result.elements.find((element) => element.category === 'BUTTON');

  assert.equal(result.driver, 'http-probe');
  assert.equal(result.observationStatus, 'STATIC_HTML_ONLY');
  assert.equal(result.interactiveVerification, false);
  assert.equal(result.targetOk, true);
  assert.equal(button.isVisible, null);
  assert.equal(button.bounds, null);
  assert.equal(button.evidenceLevel, 'HTML_SOURCE');
  assert.equal(result.viewport, null);
  assert.equal(Object.hasOwn(button, 'computedStyle'), false);
  assert.equal(new VisualDnaEngine().extractVisualDna(result).status, 'NOT_MEASURED');
  assert.ok(result.latencyMs >= 0, 'HTTP response latency is measured');
});

test('browser observation distinguishes an inspected login page from a healthy target', async (t) => {
  const artifactsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-browser-observer-test-'));
  t.after(() => fs.rmSync(artifactsDir, { recursive: true, force: true }));
  const observer = new SystemObserver({ artifactsDir });
  observer.hasPlaywright = true;
  observer.playwright = {
    chromium: {
      launch: async () => ({
        newContext: async () => ({
          newPage: async () => ({
            on() {},
            goto: async () => ({ status: () => 401 }),
            waitForTimeout: async () => {},
            title: async () => 'Login',
            screenshot: async () => {},
            accessibility: { snapshot: async () => ({ role: 'WebArea', name: 'Login' }) },
            evaluate: async (callback) => callback.toString().includes('innerWidth')
              ? { width: 1280, height: 720 }
              : [{ category: 'BUTTON', tag: 'button', evidenceLevel: 'BROWSER_RENDER', computedStyle: { color: 'rgb(255, 255, 255)', backgroundColor: 'rgb(0, 128, 255)' }, isVisible: true, bounds: { x: 10, y: 20, width: 80, height: 30 } }]
          })
        }),
        close: async () => {}
      })
    }
  };

  const result = await observer.observeUrl('https://fenix.example/GRG-login');

  assert.equal(result.observationStatus, 'BROWSER_OBSERVED');
  assert.equal(result.statusCode, 401);
  assert.equal(result.targetOk, false);
  assert.equal(result.interactiveVerification, false);
  assert.equal(result.elements[0].evidenceLevel, 'BROWSER_RENDER');
  assert.deepEqual(result.viewport, { width: 1280, height: 720 });
  assert.equal(result.elements[0].computedStyle.backgroundColor, 'rgb(0, 128, 255)');
});
