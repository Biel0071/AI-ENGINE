'use strict';
/**
 * Test: Image Generation Engine & MF Atacadista Integration
 * Verifies:
 * 1. ImageGenerationEngine initialization & provider list
 * 2. Style preset expansion (FASHION, PRODUCT, BANNER)
 * 3. Fallback vector safety guarantee
 * 4. Image generation response schema
 * 5. History management
 * 6. MF Atacadista project mapping & presence
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { ImageGenerationEngine, getImageEngine } = require('../src/services/image-generation-engine');
const { PROJECTS, getProjectById } = require('../src/projects/project-registry');
const { globalRealityOperatorKernel } = require('../src/reality-operator/reality-operator-kernel');

test('ImageGenerationEngine: provider catalog does not claim unmeasured health', () => {
  const engine = new ImageGenerationEngine();
  const providers = engine.getProviders();

  assert.ok(Array.isArray(providers), 'Providers should be an array');
  assert.ok(providers.length >= 3, 'Should have at least 3 providers configured');

  const flux = providers.find(p => p.id === 'flux-fast');
  assert.ok(flux, 'Flux provider must exist');
  assert.equal(flux.status, 'UNVERIFIED');

  const comfy = providers.find(p => p.id === 'api-platform');
  assert.ok(comfy, 'ComfyUI / API Platform provider must exist');
});

test('ImageGenerationEngine: style presets expansion', () => {
  const engine = new ImageGenerationEngine();

  const fashionPrompt = engine.applyStylePreset('vestido estampado', 'FASHION');
  assert.ok(fashionPrompt.includes('lookbook') || fashionPrompt.includes('fashion') || fashionPrompt.includes('commercial'), 'Fashion preset applied');

  const productPrompt = engine.applyStylePreset('sapato salto alto', 'PRODUCT');
  assert.ok(productPrompt.includes('product photography') || productPrompt.includes('studio lighting'), 'Product preset applied');

  const bannerPrompt = engine.applyStylePreset('promocao de verao', 'BANNER');
  assert.ok(bannerPrompt.includes('banner') || bannerPrompt.includes('composition'), 'Banner preset applied');
});

test('ImageGenerationEngine: all unavailable providers fail honestly without saving a fake result', async () => {
  const engine = new ImageGenerationEngine();
  engine.generateViaFlux = async () => { throw new Error('provider unreachable'); };
  engine.generateViaApiPlatform = async () => { throw new Error('HTTP 503'); };
  engine.generateViaGemini = async () => { throw new Error('not configured'); };

  await assert.rejects(engine.generateImage({ prompt: 'Camisa Linho' }), (error) => {
    assert.equal(error.code, 'IMAGE_PROVIDERS_UNAVAILABLE');
    assert.equal(error.status, 503);
    assert.equal(error.failures.length, 3);
    return true;
  });
  assert.deepEqual(engine.getHistory(), []);
});

test('ImageGenerationEngine: history management', () => {
  const engine = new ImageGenerationEngine();
  engine.addToHistory({
    id: 'test_1',
    prompt: 'test prompt',
    imageUrl: 'https://example.com/test.jpg',
    sourceProject: 'mf-atacadista'
  });

  const history = engine.getHistory();
  assert.ok(history.length >= 1, 'History has items');
  assert.equal(history[0].id, 'test_1');
  assert.equal(history[0].sourceProject, 'mf-atacadista');
});

test('Project Registry: MF Atacadista first-class mapping', () => {
  const mf = PROJECTS.find(p => p.id === 'mf-atacadista');
  assert.ok(mf, 'mf-atacadista must be registered in PROJECTS');
  assert.equal(mf.name, 'MF Atacadista');
  assert.ok(Array.isArray(mf.pages), 'mf-atacadista pages array must exist');
  assert.ok(mf.pages.length >= 10, 'mf-atacadista must have at least 10 mapped pages');
  assert.ok(mf.services.includes('try-on-ai'), 'must include try-on-ai service');
  assert.ok(mf.services.includes('bulk-image-search'), 'must include bulk-image-search service');
});

test('RealityOperatorKernel: resolves MF Atacadista and its city building', () => {
  const mf = globalRealityOperatorKernel.getProject('mf-atacadista');
  assert.ok(mf, 'RealityOperatorKernel must find mf-atacadista');
  assert.equal(mf.cityBuilding, 'shopping', 'mf-atacadista must map to shopping building');
});

test('CreativeStudio: supports all 6 canonical formats including 1200x420 and 390x433', () => {
  const engine = new ImageGenerationEngine();
  const formats = engine.getCreativeFormats();
  const ids = formats.map(f => f.id);

  assert.ok(ids.includes('1:1'), 'Must support 1:1');
  assert.ok(ids.includes('4:5'), 'Must support 4:5');
  assert.ok(ids.includes('9:16'), 'Must support 9:16');
  assert.ok(ids.includes('16:9'), 'Must support 16:9');
  assert.ok(ids.includes('1200x420'), 'Must support 1200x420 desktop banner');
  assert.ok(ids.includes('390x433'), 'Must support 390x433 mobile banner');

  const desktop = engine.resolveFormatDimensions('1200x420');
  assert.equal(desktop.width, 1200);
  assert.equal(desktop.height, 420);

  const mobile = engine.resolveFormatDimensions('390x433');
  assert.equal(mobile.width, 390);
  assert.equal(mobile.height, 433);
});

test('CreativeStudio: generates transparent SVG vector logo identity and ComfyUI workflows', async () => {
  const engine = new ImageGenerationEngine();
  engine.generateImage = async () => ({ imageUrl: 'https://example.com/logo.png', provider: 'Flux.1' });

  const logo = await engine.generateLogoIdentity({
    brandName: 'MF ATACADISTA',
    tagline: 'MODA PREMIUM',
    primaryColor: '#D4AF37',
    secondaryColor: '#111827',
  });

  assert.equal(logo.brandName, 'MF ATACADISTA');
  assert.ok(logo.svgContent.includes('<svg'), 'Must generate raw SVG markup');
  assert.ok(logo.svgContent.includes('MF ATACADISTA'), 'SVG must contain exact brand typography');
  assert.ok(logo.svgDataUrl.startsWith('data:image/svg+xml;base64,'), 'Must include SVG data URI');

  const wanWf = engine.buildComfyWorkflow({
    engine: 'Wan-Video/Wan2.1',
    prompt: 'Desfile passarela',
    width: 1080,
    height: 1920,
    cameraPreset: 'fashion_runway',
    lipSyncText: 'Oferta exclusiva hoje!',
  });
  assert.equal(wanWf._meta.engine, 'Wan-Video/Wan2.1');
  assert.equal(wanWf._meta.cameraPreset, 'fashion_runway');
  assert.ok(wanWf.nodes['3'], 'Must include CameraCtrl node');
  assert.ok(wanWf.nodes['5'], 'Must include LivePortrait LipSync node');
});

test('CreativeStudio: chains multi-scene storyboards for 30s, 60s, and 180s videos and exports Premiere XML', () => {
  const engine = new ImageGenerationEngine();
  const sb60 = engine.generateStoryboard({
    prompt: 'Campanha Inverno',
    targetDurationSeconds: 60,
    format: '9:16',
    voiceoverScript: 'Chegou a nova coleção de inverno. Tecidos nobres. Preços de atacado.',
  });

  assert.equal(sb60.totalDurationSeconds, 60);
  assert.equal(sb60.sceneCount, 12);
  assert.equal(sb60.scenes.length, 12);
  assert.equal(sb60.width, 1080);
  assert.equal(sb60.height, 1920);

  const xmlRes = engine.buildPremiereXml({
    projectName: sb60.title,
    width: sb60.width,
    height: sb60.height,
    scenes: sb60.scenes,
  });
  assert.ok(xmlRes.xml.includes('<!DOCTYPE xmeml>'), 'Must generate Premiere Pro FCPXML v5');
  assert.ok(xmlRes.xml.includes('<name>scene_01_orbit_360.mp4</name>'), 'Must match file name with pathurl');
  assert.equal(xmlRes.sceneCount, 12);

  // Variable scene durations must accumulate startTimeSeconds / endTimeSeconds accurately
  const customSb = engine.generateStoryboard({
    prompt: 'Teste Duração Variável',
    scenes: [
      { title: 'A', durationSeconds: 4, cameraPreset: 'orbit_360' },
      { title: 'B', durationSeconds: 7, cameraPreset: 'dolly_zoom' },
      { title: 'C', durationSeconds: 3, cameraPreset: 'crane_up' },
    ],
  });
  assert.equal(customSb.totalDurationSeconds, 14);
  assert.deepEqual(
    customSb.scenes.map((s) => [s.startTimeSeconds, s.endTimeSeconds]),
    [
      [0, 4],
      [4, 11],
      [11, 14],
    ]
  );
});

test('CreativeStudio: exports valid binary Adobe Photoshop .PSD with 5 separated layers, mul blend mode, and full-canvas RLE bounds', () => {
  const engine = new ImageGenerationEngine();
  const psdRes = engine.buildPsdBuffer({
    width: 390,
    height: 433,
    layers: [
      { id: 'layer_1_ai_bg', name: 'Camada 1: Cenário de fundo gerado por IA', rgbaColor: [24, 28, 44, 255] },
      { id: 'layer_2_contact_shadow', name: 'Camada 2: Sombra de contato realista', blendMode: 'mult', rgbaColor: [0, 0, 0, 140] },
      { id: 'layer_3_product_cutout', name: 'Camada 3: Foto do produto recortada em alta resolução', top: 100, left: 50, rgbaColor: [220, 180, 90, 255] },
      { id: 'layer_4_typography_cta', name: 'Camada 4: Textos de Headline / Preço / CTA', rgbaColor: [255, 255, 255, 255] },
      { id: 'layer_5_company_logo', name: 'Camada 5: Logo da empresa', rgbaColor: [212, 175, 55, 255] },
    ]
  });

  const psdBuf = psdRes.buffer;
  assert.ok(Buffer.isBuffer(psdBuf), 'Must return a Buffer');
  assert.equal(psdBuf.subarray(0, 4).toString('ascii'), '8BPS', 'Must start with 8BPS signature');
  assert.equal(psdBuf.readUInt16BE(4), 1, 'PSD version must be 1');
  assert.equal(psdBuf.readUInt16BE(12), 4, 'Must have 4 channels (RGBA)');
  assert.equal(psdBuf.readUInt32BE(14), 433, 'Height must match 433');
  assert.equal(psdBuf.readUInt32BE(18), 390, 'Width must match 390');
  assert.equal(psdRes.layers.length, 5, 'Must have 5 separated canonical layers');
  assert.equal(psdRes.layers[0].width, 390, 'Layer 1 must span full canvas width (not truncated to 64px)');
  assert.equal(psdRes.layers[0].height, 433, 'Layer 1 must span full canvas height (not truncated to 64px)');
  assert.equal(psdRes.layers[1].blendMode, 'mul ', 'Multiply blend mode must be 8BPS spec "mul " (not "mult")');
  assert.ok(psdRes.layers[2].bottom > psdRes.layers[2].top, 'Layer with top=100 must have bottom > top');
  assert.ok(psdBuf.includes(Buffer.from('8BIMmul ')), 'Binary PSD must contain 8BIMmul  blend mode signature');
  assert.ok(!psdBuf.includes(Buffer.from('8BIMmult')), 'Binary PSD must NOT contain invalid 8BIMmult signature');
  assert.ok(psdBuf.includes(Buffer.from('luni')), 'Must contain Unicode layer name blocks');
});

test('UniversalSystemRoutes: serves /api/v2/creative-studio/* and /api/v2/images/formats over HTTP', async () => {
  const http = require('node:http');
  const { handleUniversalSystemRoutes } = require('../src/api/universal-system-routes');

  const sendJson = (res, status, payload) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
    return true;
  };

  const readJson = (req) => new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });

  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    const handled = await handleUniversalSystemRoutes(req, res, u, sendJson, readJson, { id: 'test' }, {});
    if (!handled) {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. GET /api/v2/images/formats
    const fmtRes = await fetch(`${baseUrl}/api/v2/images/formats`);
    assert.equal(fmtRes.status, 200);
    const fmtData = await fmtRes.json();
    assert.equal(fmtData.ok, true);
    assert.equal(fmtData.formats.length, 6);

    // 2. GET /api/v2/creative-studio/stack
    const stackRes = await fetch(`${baseUrl}/api/v2/creative-studio/stack`);
    assert.equal(stackRes.status, 200);
    const stackData = await stackRes.json();
    assert.equal(stackData.ok, true);
    assert.ok(stackData.stack.some(s => s.repo.includes('Wan-Video/Wan2.1')));
    assert.ok(stackData.stack.some(s => s.repo.includes('Agamnentzar/ag-psd')));

    // 3. POST /api/v2/creative-studio/video
    const vidRes = await fetch(`${baseUrl}/api/v2/creative-studio/video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Vestido longo festa',
        cameraPreset: 'orbit_360',
        durationSeconds: 5,
        format: '9:16',
        lipSyncEnabled: true,
        lipSyncScript: 'Oferta imperdível no atacado!'
      }),
    });
    assert.equal(vidRes.status, 200);
    const vidData = await vidRes.json();
    assert.equal(vidData.ok, true);
    assert.equal(vidData.cameraPreset.id, 'orbit_360');
    assert.equal(vidData.lipSync.enabled, true);

    // 4. POST /api/v2/creative-studio/export/psd
    const psdRes = await fetch(`${baseUrl}/api/v2/creative-studio/export/psd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ width: 1200, height: 420 }),
    });
    assert.equal(psdRes.status, 200);
    const psdData = await psdRes.json();
    assert.equal(psdData.ok, true);
    assert.equal(psdData.signature, '8BPS');
    assert.equal(psdData.width, 1200);
    assert.equal(psdData.height, 420);
    assert.equal(psdData.layers.length, 5);
    assert.ok(psdData.psdBase64.length > 50);

    // 5. POST /api/v2/creative-studio/export/premiere-xml
    const xmlRes = await fetch(`${baseUrl}/api/v2/creative-studio/export/premiere-xml`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectName: 'Campanha_MF', width: 1080, height: 1920 }),
    });
    assert.equal(xmlRes.status, 200);
    const xmlData = await xmlRes.json();
    assert.equal(xmlData.ok, true);
    assert.ok(xmlData.xml.includes('<xmeml version="5">'));
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});


