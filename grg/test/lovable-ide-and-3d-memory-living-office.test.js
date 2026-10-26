/**
 * Test Suite: Lovable IDE Split View, 3D Memory Brain Constellation, and ZAI Living Office Parity
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const IDE_FILE = path.join(__dirname, '../public/project-ide-live.js');
const MEMORY_WEBGL_FILE = path.join(__dirname, '../public/memory-brain-webgl.js');
const MEMORY_LIVE_FILE = path.join(__dirname, '../public/memory-live.js');
const ISO_CITY_FILE = path.join(__dirname, '../public/iso-city.js');

test('1. Lovable IDE Parity: Split View preview URL and anti-recursion shield', () => {
  const ideCode = fs.readFileSync(IDE_FILE, 'utf8');

  // getPreviewUrlForProject must return live preview for fenix-os
  assert.ok(ideCode.includes("'/login.html?preview=1'"), 'IDE must have default live preview target for fenix-os');

  // isRecursionUrl must allow sandboxed previews
  assert.ok(ideCode.includes("preview=1") && ideCode.includes("embedded=ide_preview"), 'isRecursionUrl must permit authorized sandboxed previews');

  // Hot-Reload bridge in saveFile
  assert.ok(ideCode.includes('FENIX_FILE_SAVED'), 'saveFile must send FENIX_FILE_SAVED message to live preview iframe');
  assert.ok(ideCode.includes('previewFrame.src = cleanBase'), 'saveFile must trigger soft hot-reload refresh of preview frame');
});

test('2. 3D Memory Brain Constellation (Video 1001656590): Volumetric Orbs, Bezier Pulses & Physics HUD', () => {
  const webglCode = fs.readFileSync(MEMORY_WEBGL_FILE, 'utf8');

  // Must export setPhysicsParams
  assert.ok(webglCode.includes('setPhysicsParams'), 'memory-brain-webgl must export setPhysicsParams');

  // Must create 3D Quadratic Bezier curves for links
  assert.ok(webglCode.includes('QuadraticBezierCurve3'), 'memory-brain-webgl must construct 3D QuadraticBezierCurve3 for links');

  // Must have pulse particles moving along edges
  assert.ok(webglCode.includes('pulseParticles'), 'memory-brain-webgl must support animated pulse particles');

  // Must render volumetric core sphere and outer halo shell
  assert.ok(webglCode.includes('coreSphereGeo') && webglCode.includes('haloSphereGeo'), 'memory-brain-webgl must render core and halo spherical meshes');

  // Check memory-live physics binding
  const liveCode = fs.readFileSync(MEMORY_LIVE_FILE, 'utf8');
  assert.ok(liveCode.includes('fenixSetPhysicsParam') && liveCode.includes('setPhysicsParams'), 'memory-live must bind sliders to setPhysicsParams');
});

test('3. ZAI Living Office & Avatars: Dual Widescreen Monitors and Expressive Avatars', () => {
  const cityCode = fs.readFileSync(ISO_CITY_FILE, 'utf8');

  // Workstations must feature dual monitors (code + telemetry)
  assert.ok(cityCode.includes('mon1X') && cityCode.includes('mon2X'), 'iso-city workstations must render dual monitors');
  assert.ok(cityCode.includes('Mesh Chair') || cityCode.includes('Ergonomic'), 'iso-city workstations must render ergonomic chairs');

  // Avatars must render ZAI specular eye highlights
  assert.ok(cityCode.includes('ZAI Specular Eye Highlights') || cityCode.includes('Math.max(0.6, headR * 0.05)'), 'iso-city must render reflective specular eye pupils');
});
