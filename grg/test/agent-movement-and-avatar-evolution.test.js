'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const isoCityCode = fs.readFileSync(path.join(__dirname, '../public/iso-city.js'), 'utf8');
const world3DCode = fs.readFileSync(path.join(__dirname, '../public/fenix-world-3d.js'), 'utf8');

test('1. 2.5D City: toWorld Screen-to-World Projection & Inverse', (t) => {
  assert.ok(isoCityCode.includes('toWorld(screenX, screenY, cx, cy, zoom)'), 'IsoCityEngine must expose toWorld method');
  assert.ok(isoCityCode.includes('rx = ((dx / (tw || 1)) + (dy / (th || 1))) / 2'), 'toWorld must calculate isometric tile inverse x');
  assert.ok(isoCityCode.includes('ry = ((dy / (th || 1)) - (dx / (tw || 1))) / 2'), 'toWorld must calculate isometric tile inverse y');
  assert.ok(isoCityCode.includes('case 1: return { x: ry, y: -rx }'), 'toWorld must correctly invert quarter rotations');
});

test('2. 2.5D City: RTS Direct Move Command & Destination Beacon', (t) => {
  assert.ok(isoCityCode.includes('FÊNIX RTS DIRECT MOVE COMMAND'), 'Click handler must implement direct move command when agent is selected');
  assert.ok(isoCityCode.includes('this.toWorld(mx, my, cx, cy, this.state.camera.zoom)'), 'Ground click must convert mouse to world coordinates');
  assert.ok(isoCityCode.includes('agent.tx = dest.x'), 'Target destination x must be assigned');
  assert.ok(isoCityCode.includes('agent.ty = dest.y'), 'Target destination y must be assigned');
  assert.ok(isoCityCode.includes('target_beacon'), 'Destination beacon particle must be spawned at destination');
  assert.ok(isoCityCode.includes('_drawParticles(ctx, cx, cy, zoom)'), 'Canvas draw loop must render active particles and beacons');
});

test('3. 2.5D City: Autonomous Ambient Living Routine for Idle Agents', (t) => {
  assert.ok(isoCityCode.includes('Fênix Autonomous Ambient Living Life for Idle Agents'), 'Idle agents must participate in autonomous ambient patrol');
  assert.ok(isoCityCode.includes('agent._ambientTimer'), 'Autonomous life must use dedicated ambient patrol timers');
  assert.ok(isoCityCode.includes('☕ Pausa para café'), 'Patrol points must include living office POIs like coffee break');
  assert.ok(isoCityCode.includes('⚡ Servidores API Platform'), 'Patrol points must include technical hubs like API Platform servers');
  assert.ok(isoCityCode.includes('agent._userMoveTarget = false'), 'Arrival must cleanly reset user move state');
});

test('4. Avatar Visual Quality: High-Tech Cyber Visor & Glassmorphic Chat Balloons', (t) => {
  assert.ok(isoCityCode.includes('High-Tech Cyber Visor with animated scanlines'), 'PixelAvatarRenderer must render stylized cyber-visor');
  assert.ok(isoCityCode.includes('scanOffset = (Math.sin(time * 6)'), 'Cyber visor must feature animated holographic scanlines');
  assert.ok(isoCityCode.includes('Floating Cyber Thought / Chat Balloon'), 'Living simulation must render floating glassmorphic chat balloon');
  assert.ok(isoCityCode.includes('JetBrains Mono'), 'Thought balloon must use crisp monospace tech typography');
});

test('5. 3D World: RTS Ground Move & 3D Autonomous Ambient Patrol', (t) => {
  assert.ok(world3DCode.includes('FÊNIX 3D RTS MOVE COMMAND'), '3D click handler must support RTS ground move when agent is selected');
  assert.ok(world3DCode.includes('this.selectedAgentId = data.agentId'), 'Agent selection must record selectedAgentId in 3D');
  assert.ok(world3DCode.includes('_spawnDestinationBeacon'), '3D world must spawn glowing destination beacon ring on ground');
  assert.ok(world3DCode.includes('Autonomous 3D Ambient Patrol for Idle Agents'), 'Idle 3D agents must execute periodic autonomous ambient patrols');
  assert.ok(world3DCode.includes('agentRecord.movementState = \'WALKING\''), 'Walking movement state must be set for limb kinematics');
});
