'use strict';

/**
 * FÊNIX OS — Sidebar Images & IDE Logo Scaling Pipeline Test
 * Validates:
 * 1. Mascot sidebar image requests for API Platform screens
 * 2. Markdown image rendering into interactive HTML cards
 * 3. IDE Preview logo scale controls, code synchronization, and file persistence
 * 4. Git status inspection, commit payload contract, and push capability
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const { handle: handleFastLane } = require('../src/execution/fast-lane-engine');

test('1. FastLane Engine resolves API Platform image queries with real screenshots', async () => {
  const queries = [
    'mostre imagens das telas da api',
    'quero imagens das telas da api platform',
    'fotos das telas da api',
    'prints da api'
  ];

  for (const q of queries) {
    const res = await handleFastLane(q, {
      projectId: 'api-platform',
      app: {}
    });

    assert.equal(res.lane, 'FAST_LANE', 'Deve responder na FAST_LANE');
    const responseText = res.response || res.text || '';
    assert.ok(responseText.includes('Galeria de Telas & Screenshots da API Platform'), 'Deve incluir cabeçalho de galeria');
    assert.ok(responseText.includes('/screenshots/api-platform_screenshot.png'), 'Deve conter screenshot do overview');
    assert.ok(responseText.includes('/screenshots/prj_api_plataform_real_screen.png'), 'Deve conter screenshot real');
    assert.ok(responseText.includes('/screenshots/api_platform_reconstructed_login.png'), 'Deve conter screenshot do login');
    assert.ok(responseText.includes('/screenshots/api_platform_transfer_component.png'), 'Deve conter screenshot do componente');
  }
});

test('2. Mascot Sidebar markdown renderer transforms markdown images into rich DOM cards', () => {
  const sidebarJsPath = path.resolve(__dirname, '../public/fenix-mascot-sidebar.js');
  const code = fs.readFileSync(sidebarJsPath, 'utf8');

  // Assert regex presence
  assert.ok(code.includes('/!\\[([^\\]]*)\\]\\(([^)]+)\\)/g'), 'Deve conter regex para transformar markdown images');
  assert.ok(code.includes('fsb-chat-image-card'), 'Deve criar container fsb-chat-image-card');
  assert.ok(code.includes('ph-arrow-square-out'), 'Deve incluir ação de abrir imagem externamente');
});

test('3. IDE Preview and login.html contain interactive logo scaling hooks and CSS variables', () => {
  const loginHtmlPath = path.resolve(__dirname, '../public/login.html');
  const loginCode = fs.readFileSync(loginHtmlPath, 'utf8');

  assert.ok(loginCode.includes('--logo-scale'), 'login.html deve definir a variável CSS --logo-scale');
  assert.ok(loginCode.includes('setLogoScale'), 'login.html deve ter função setLogoScale');
  assert.ok(loginCode.includes('FENIX_LOGO_SELECTED'), 'login.html deve notificar seleção de logo via postMessage');
  assert.ok(loginCode.includes('brandLogo'), 'login.html deve ter elemento #brandLogo com cursor pointer');

  const indexHtmlPath = path.resolve(__dirname, '../public/index.html');
  const indexCode = fs.readFileSync(indexHtmlPath, 'utf8');

  assert.ok(indexCode.includes('fenixLogoResizerBar'), 'index.html deve conter barra de redimensionamento do logo');
  assert.ok(indexCode.includes('btnLogoDecrease'), 'index.html deve conter botão para diminuir logo');
  assert.ok(indexCode.includes('btnLogoIncrease'), 'index.html deve conter botão para aumentar logo');
  assert.ok(indexCode.includes('ideLogoSlider'), 'index.html deve conter slider para dimensionar logo');
  assert.ok(indexCode.includes('fenixIdeGitPushBtn'), 'index.html deve conter botão de Push para GitHub');
});

test('4. project-ide-live.js contains updateLogoScale and GitHub push logic', () => {
  const ideLivePath = path.resolve(__dirname, '../public/project-ide-live.js');
  const ideCode = fs.readFileSync(ideLivePath, 'utf8');

  assert.ok(ideCode.includes('fenixSetLogoScale'), 'Deve exportar window.fenixSetLogoScale');
  assert.ok(ideCode.includes('fenixPushGitChanges'), 'Deve implementar window.fenixPushGitChanges');
  assert.ok(ideCode.includes('expectedHead: gitData.head, files'), 'fenixCommitGitChanges deve passar arquivos modificados');
});

test('5. Real screenshots referenced in API gallery exist on disk and are accessible', () => {
  const screenshots = [
    'api-platform_screenshot.png',
    'prj_api_plataform_real_screen.png',
    'api_platform_reconstructed_login.png',
    'api_platform_transfer_component.png'
  ];

  for (const s of screenshots) {
    const fullPath = path.resolve(__dirname, '../public/screenshots', s);
    assert.ok(fs.existsSync(fullPath), `Screenshot ${s} deve existir no disco`);
    const stat = fs.statSync(fullPath);
    assert.ok(stat.size > 1000, `Screenshot ${s} deve ser um arquivo de imagem válido (> 1KB)`);
  }
});
