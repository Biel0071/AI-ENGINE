'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const resolveProfile = require('../public/city-agent-visual-profile');
const { AgentAvatarRegistry } = require('../src/agents/agent-avatar-registry');
const worldSource = fs.readFileSync(path.join(__dirname, '../public/fenix-world-3d.js'), 'utf8');
const outfitSource = worldSource.slice(
  worldSource.indexOf('_createAvatarOutfitDetails('),
  worldSource.indexOf('_createAvatarAccessoryDetails(')
);
const editorSource = fs.readFileSync(path.join(__dirname, '../public/iso-city.js'), 'utf8');
const higCss = fs.readFileSync(path.join(__dirname, '../public/fenix-hig-system.css'), 'utf8');

test('role-derived City profiles distinguish real specialist metadata', () => {
  const security = resolveProfile({ id: 'a-1', role: 'Security Engineer', department: 'Security' });
  const data = resolveProfile({ id: 'a-2', role: 'Data Analyst', department: 'Research' });
  const platform = resolveProfile({ id: 'a-3', role: 'Platform Engineer', department: 'Infrastructure' });

  assert.notEqual(security.shirtColor, data.shirtColor);
  assert.notEqual(data.shirtColor, platform.shirtColor);
  assert.notEqual(security.hairColor, platform.hairColor);
  assert.notEqual(security.accentColor, platform.accentColor);
  assert.notEqual(security.accessory, platform.accessory);
  assert.equal(security.icon, '🛡️');
  assert.equal(data.icon, '📊');
});

test('unknown roles get stable, restrained variation without making status claims', () => {
  const input = { id: 'agent-42', role: 'Specialist', department: 'Operations' };
  const first = resolveProfile(input);
  const second = resolveProfile(input);

  assert.deepEqual(first, second);
  assert.match(first.shirtColor, /^#[0-9a-f]{6}$/i);
  assert.equal(Object.hasOwn(first, 'status'), false);
  assert.equal(first.source, 'role-derived');
});

test('generated avatar styling includes stable skin-tone variation independent of runtime status', () => {
  const first = resolveProfile({ id: 'agent-42', role: 'Specialist' });
  const second = resolveProfile({ id: 'agent-42', role: 'Specialist' });
  const other = resolveProfile({ id: 'agent-43', role: 'Specialist' });

  assert.match(first.skinColor, /^#[0-9a-f]{6}$/i);
  assert.equal(first.skinColor, second.skinColor);
  assert.notEqual(first.skinColor, other.skinColor);
  assert.equal(Object.hasOwn(first, 'status'), false);
});

test('customized avatar colors and supported accessories override role defaults', () => {
  const profile = resolveProfile({
    id: 'zai-visual-agent', role: 'Security Engineer', department: 'Security',
    avatar: { skin: 'tan', hairColor: 'purple', shirtColor: '#123abc', pantsColor: '#223344', shoesColor: '#556677', accessory: 'headphones' },
  });
  assert.equal(profile.source, 'custom-avatar');
  assert.equal(profile.skinColor, '#d89b6b');
  assert.equal(profile.hairColor, 0x9333ea);
  assert.equal(profile.shirtColor, '#123abc');
  assert.equal(profile.pantsColor, '#223344');
  assert.equal(profile.shoesColor, '#556677');
  assert.equal(profile.accessory, 'headset');
});

test('custom avatar body type persists as a stable City scale choice', () => {
  const compact = resolveProfile({ id: 'agent-body', role: 'Specialist', avatar: { bodyType: 'compact' } });
  const tall = resolveProfile({ id: 'agent-body', role: 'Specialist', avatar: { bodyType: 'tall' } });
  assert.equal(compact.displayScale, 1.55);
  assert.equal(tall.displayScale, 1.85);
  assert.equal(compact.bodyType, 'compact');
  assert.equal(tall.bodyType, 'tall');
  assert.equal(compact.source, 'custom-avatar');
});

test('casual avatar outfit has its own 3D geometry in City and shared preview', () => {
  assert.match(outfitSource, /outfit === 'casual'[\s\S]*?group\.add\(pocket\)/);
  assert.match(worldSource, /_createCyberHumanoid\.call\(previewBuilder[\s\S]*?visualProfile/);
});

test('ZAI has a stable Fênix identity and avatar editor choices resolve into the 3D profile', () => {
  const zai = resolveProfile({ id: 'agent-zai', name: 'ZAI', role: 'Mascote & Copilot' });
  const custom = resolveProfile({
    id: 'agent-custom', role: 'Designer',
    avatar: { outfit: 'labcoat', badge: 'diamond', accessory: 'badge' },
  });
  assert.equal(zai.key, 'zai');
  assert.equal(zai.icon, '🦅');
  assert.equal(zai.accentColor, '#22d3ee');
  assert.equal(zai.outfit, 'cyber');
  assert.equal(zai.badge, 'diamond');
  assert.equal(custom.outfit, 'labcoat');
  assert.equal(custom.badge, 'diamond');
  assert.equal(custom.accessory, 'badge');
});

test('Avatar Studio exposes editable role presets including the ZAI visual identity', () => {
  const presets = require('../public/avatar-studio-presets');
  assert.ok(presets.zai);
  assert.ok(presets.operations);
  assert.ok(presets.creative);
  assert.ok(presets.research);
  assert.equal(presets.zai.config.outfit, 'cyber');
  assert.equal(presets.zai.config.accessory, 'visor');
  assert.equal(presets.zai.config.badge, 'diamond');
  assert.equal(presets.operations.config.hairStyle, 'buzz', 'the City 3D builder uses buzz for short hair');
  assert.notEqual(presets.creative.config.shirtColor, presets.operations.config.shirtColor);
  assert.match(editorSource, /data-avatar-preset="\$\{key\}"/);
  assert.match(editorSource, /window\.FENIX_AVATAR_PRESETS\?\.\[button\.dataset\.avatarPreset\]/);
  assert.match(editorSource, /avatar-preset-buttons/);
});

test('Avatar Studio category navigation and color swatches are keyboard-operable controls', () => {
  const modalStart = editorSource.indexOf('_openAvatarEditorModal(agent)');
  const modalSource = editorSource.slice(modalStart, editorSource.indexOf('  _openCreateAgentWizard()', modalStart));
  const presetStart = modalSource.indexOf("backdrop.querySelectorAll('[data-avatar-preset]')");
  const presetEnd = modalSource.indexOf("backdrop.querySelectorAll('#skinSwatches [data-skin]').forEach(sw =>", presetStart);
  const presetHandler = modalSource.slice(presetStart, presetEnd);
  assert.match(modalSource, /<button type="button" data-avatar-target="avIdentitySection" aria-controls="avIdentitySection"/);
  assert.match(modalSource, /data-avatar-target="avFaceSection"[\s\S]{0,120}aria-current/);
  assert.match(modalSource, /class="fenix-swatch \$\{k === currentConfig\.skin \? 'active' : ''\}" type="button"/);
  assert.match(modalSource, /aria-label="Tom de pele \$\{k\}" aria-pressed=/);
  assert.match(modalSource, /s\.setAttribute\('aria-pressed', 'false'\)/);
  assert.match(modalSource, /sw\.setAttribute\('aria-pressed', 'true'\)/);
  assert.match(presetHandler, /skinSwatches[\s\S]{0,320}aria-pressed/);
  assert.match(presetHandler, /hairColorSwatches[\s\S]{0,320}aria-pressed/);
});

test('registry-generated agent appearance is translated into the 3D and pixel avatar contracts', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-avatar-contract-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const registry = new AgentAvatarRegistry(path.join(directory, 'avatars.json'));
  const browserAgent = registry
    .getOrCreate({ id: 'agent-browser', name: 'Browser Agent', role: 'Browser Automation' });
  const profile = resolveProfile({ ...browserAgent.runtimeIdentity, name: browserAgent.name, avatar: browserAgent });

  assert.equal(profile.source, 'registry-avatar');
  assert.equal(profile.outfit, 'suit');
  assert.equal(profile.accessory, 'glasses');
  assert.match(profile.shirtColor, /^#[0-9a-f]{6}$/i);
  const zai = registry.getOrCreate({ id: 'agent-zai', name: 'ZAI', role: 'Autonomous AI Companion & Copilot' });
  const zaiProfile = resolveProfile({ ...zai.runtimeIdentity, name: zai.name, avatar: zai });
  assert.equal(zaiProfile.key, 'zai');
  assert.equal(zaiProfile.outfit, 'cyber');
  assert.equal(zaiProfile.accentColor, '#22d3ee');
  assert.match(editorSource, /avatar\?\.appearance/);
  assert.match(editorSource, /AVATAR_PALETTES\.skins\[opts\.config\?\.skin\]/);
  assert.match(editorSource, /id="avBodyTypeSelect"/);
  assert.match(editorSource, /currentConfig\.bodyType = e\.target\.value/);
  assert.match(editorSource, /avatar: currentConfig/);
});

test('3D avatar builder renders the selected outfit and badge rather than only saving them', () => {
  assert.match(worldSource, /_createAvatarOutfitDetails\(visualProfile, torsoY, fallbackMaterial\)/);
  assert.match(worldSource, /const outfit = visualProfile\?\.outfit \|\| 'suit'/);
  assert.match(worldSource, /const badge = visualProfile\?\.badge/);
  assert.match(worldSource, /avatarMaterials: \{[^}]*outfitDetails/s);
  assert.match(worldSource, /replaceDetails\('accessoryDetails'/);
  assert.match(worldSource, /previous\.userData\?\.ownedMaterials/);
});

test('spiky hair preset adds a distinct silhouette to the shared 3D avatar', () => {
  const start = worldSource.indexOf('      // 3c. Hair Layering');
  const end = worldSource.indexOf('      // Neural Halo for Sora AI Core', start);
  const hairRenderer = worldSource.slice(start, end);
  assert.match(hairRenderer, /visualProfile\?\.hairStyle === 'spiky'[\s\S]*?ConeGeometry/);
});

test('avatar editor persists before applying changes and reports API failures', () => {
  assert.match(editorSource, /const isZai = agent && \(/);
  assert.match(editorSource, /outfit: agent\.avatar\.outfit \|\| \(isZai \? 'cyber' : 'suit'\)/);
  assert.match(editorSource, /currentConfig\.outfit = e\.target\.value;[\s\S]{0,80}renderPreview\(\)/);
  const saveStart = editorSource.indexOf("backdrop.querySelector('#btnAvSave')");
  const saveHandler = editorSource.slice(saveStart, editorSource.indexOf('  _openCreateAgentWizard()', saveStart));
  assert.match(saveHandler, /\/api\/v2\/agents\/\$\{encodeURIComponent\(agent\.id\)\}\/profile/);
  assert.match(saveHandler, /if \(!response\.ok \|\| result\.ok !== true\)/);
  assert.match(saveHandler, /avSaveStatus/);
  assert.match(saveHandler, /world3d\.spawnDynamicAgent/);
  assert.ok(saveHandler.indexOf('if (!response.ok') < saveHandler.indexOf('agent.avatar ='), 'local profile updates only after the server accepts the save');
});

test('avatar editor uses the City 3D model in an isolated, disposable preview', () => {
  assert.match(worldSource, /createAvatarPreview\(canvas, options = \{\}\)/);
  assert.match(worldSource, /_createCyberHumanoid\.call\(previewBuilder/);
  assert.match(worldSource, /previewBuilder\.agents = new Map\(\)/);
  assert.match(worldSource, /renderer\.dispose\(\)/);
  assert.match(editorSource, /window\.fenixWorld3D\?\.createAvatarPreview\?\.\(previewCanvas3d/);
  assert.match(editorSource, /avPreviewFallback/);
  assert.match(editorSource, /preview3d\?\.dispose\?\.\(\)/);
  const roleEditStart = editorSource.indexOf("backdrop.querySelector('#avRoleInput')", editorSource.indexOf('_openAvatarEditorModal(agent)'));
  const roleEditEnd = editorSource.indexOf("backdrop.querySelector('#avOutfitSelect')", roleEditStart);
  const roleEdit = editorSource.slice(roleEditStart, roleEditEnd);
  assert.match(roleEdit, /draftRole = e\.target\.value/);
  assert.doesNotMatch(roleEdit, /agent\.role =/);
  assert.match(editorSource, /data-avatar-target="avFaceSection"/);
  assert.match(worldSource, /pointermove/);
  assert.match(worldSource, /new T\.Box3\(\)\.setFromObject\(avatar\)/);
  assert.match(worldSource, /camera\.lookAt\(focusCenter\)/);
  assert.match(worldSource, /avatar\.userData\?\.emoteBadge, avatar\.userData\?\.emoteIcon/);
});

test('active 3D world Inspector exposes the shared avatar editor entry point', () => {
  const worldUi = fs.readFileSync(path.join(__dirname, '../public/fenix-world-ui.js'), 'utf8');
  assert.ok(editorSource.includes('window.openFenixAvatarStudio = function (agent)'));
  assert.match(worldUi, /Personalizar avatar/);
  assert.match(worldUi, /openFenixAvatarStudio\?\.\(agent\)/);
});

test('avatar preview keeps a stable camera frame so porte changes remain visible', () => {
  assert.match(worldSource, /previewFrameSize = new T\.Vector3\(2, 3\.6, 2\)/);
  assert.match(worldSource, /verticalDistance = \(previewFrameSize\.y \/ 2\)/);
});

test('custom avatar editor uses readable touch targets and responsive Fênix visual tokens', () => {
  assert.match(higCss, /\.fenix-avatar-field-row \{[^}]*min-height: 40px/s);
  assert.match(higCss, /\.fenix-avatar-modal \.fenix-avatar-preview-btn \{[^}]*min-height: 40px/s);
  assert.match(higCss, /@media \(max-width: 680px\)[\s\S]*\.fenix-avatar-modal-body \{ flex-direction: column/);
  assert.match(higCss, /\.fenix-avatar-input:focus, \.fenix-avatar-select:focus \{ border-color: #55d6c2/);
  assert.match(higCss, /\.fenix-avatar-category-nav \{[^}]*flex: 0 0 auto;[^}]*min-height: 48px/s);
});

test('dynamic character face and hair use rounded, body-relative geometry', () => {
  const start = worldSource.indexOf('    _createCyberHumanoid({');
  const end = worldSource.indexOf('    spawnDynamicAgent(payload) {', start);
  const humanoid = worldSource.slice(start, end);

  assert.match(humanoid, /new T\.SphereGeometry\(1, 16, 12\), skinMaterial\)/);
  assert.match(humanoid, /hairTop\.position\.set\(0, torsoY \+ 0\.62/);
  assert.doesNotMatch(humanoid, /hairTop\.position\.set\(0, 1\.73/);
});

test('City character accessory branches declare and retain their optional mesh for LOD', () => {
  const start = worldSource.indexOf('    _createCyberHumanoid({');
  const end = worldSource.indexOf('    _initApiPlatformComplex()', start);
  const humanoid = worldSource.slice(start, end);
  assert.match(humanoid, /let [^;]*\bextraAccessory\s*=\s*null/);
  assert.match(humanoid, /if \(extraAccessory\) detailParts\.push\(extraAccessory\)/);
});

test('avatar identity accessories stay distinct from close-up-only details', () => {
  const start = worldSource.indexOf('    _createCyberHumanoid({');
  const end = worldSource.indexOf('    _initApiPlatformComplex()', start);
  const humanoid = worldSource.slice(start, end);
  const lodStart = worldSource.indexOf('// Distance-based Character LOD', end);
  const lod = worldSource.slice(lodStart, lodStart + 700);

  assert.match(humanoid, /identityParts:\s*accessoryDetails\.children/);
  assert.doesNotMatch(humanoid, /detailParts\.push\(\.\.\.accessoryDetails\.children\)/);
  assert.match(lod, /showIdentityParts\s*=\s*camDist\s*<\s*105\s*&&\s*inFrustum/);
  assert.match(lod, /identityParts\.forEach\(p => \{ if \(p\) p\.visible = showIdentityParts; \}\)/);
});

test('runtime agents use the calibrated readable scale from their visual profile', () => {
  const profile = resolveProfile({ id: 'agent-42', role: 'Specialist', department: 'Operations' });
  assert.equal(profile.displayScale, 1.75);
  assert.equal(profile.bodyType, 'standard');
  assert.match(worldSource, /agent\.scale\.set\(calibratedScale \* bodyShape\.x, calibratedScale, calibratedScale \* bodyShape\.z\)/);
});

test('dynamic City agent updates its existing badge instead of adding a duplicate', () => {
  const start = worldSource.indexOf('    spawnDynamicAgent(payload) {');
  const end = worldSource.indexOf('    moveDynamicAgent(agentId, destination) {', start);
  const spawn = worldSource.slice(start, end);

  assert.match(spawn, /agentMesh\.userData\?\.thoughtBubble/);
  assert.match(spawn, /avatarMaterials\?\.pants/);
  assert.match(spawn, /avatarMaterials\?\.shoes/);
  assert.doesNotMatch(spawn, /new AgentThoughtBubble\(/);
});

test('agent Inspector discloses when the map position is an estimate', () => {
  const inspectorSource = fs.readFileSync(path.join(__dirname, '../public/office-live.js'), 'utf8');
  assert.match(inspectorSource, /coordinateSource === 'ESTIMATED'[\s\S]*Posi[cç][aã]o estimada/);
  assert.match(worldSource, /coordinateSource === 'ESTIMATED' \? `Posi[cç][aã]o estimada ·/);
});

test('agent thought bubbles truncate long labels instead of clipping beyond their canvas', () => {
  const bubbleSource = worldSource.slice(
    worldSource.indexOf('  class AgentThoughtBubble {'),
    worldSource.indexOf('  /* ═', worldSource.indexOf('  class AgentThoughtBubble {') + 1)
  );
  assert.match(bubbleSource, /measureText\(displayText\)\.width > maxTextWidth/);
  assert.match(bubbleSource, /displayText = displayText\.slice\(0, displayText\.length - 1\)/);
  assert.match(bubbleSource, /fillText\(displayText, 20, [^;]+\)/);
});

test('lanyard keeps the role-colored uniform visible at City scale', () => {
  const match = worldSource.match(/const lanyard = new T\.Mesh\(new T\.BoxGeometry\(([^)]+)\)/);
  assert.ok(match, 'humanoid should retain its lanyard detail');
  const dimensions = match[1].split(',').map(Number);
  assert.ok(dimensions[0] <= 0.08 && dimensions[2] <= 0.08, 'lanyard must be a narrow strap, not a chest panel');
});
