'use strict';
/**
 * FÊNIX OS — Universal Image Generation & Open-Source Creative Studio Engine
 * Multi-Provider Visual & Video Inference with Resilient Failover:
 * 1. Flux / Pollinations Engine (FLUX.1 Schnell / Dev — Photorealistic Products, Models, Logos)
 * 2. API Platform / ComfyUI (VPS :3001 / Local :8188 — Wan2.1, LTX-Video, CameraCtrl, BiRefNet, IOPaint, LivePortrait)
 * 3. Google Gemini Imagen (Frontier Vision / Imagen 3)
 *
 * Open-Source Creative Stack (100% GitHub):
 * - Video & Camera Control (Open-Higgsfield): Wan-Video/Wan2.1, Lightricks/LTX-Video, ComfyUI-CameraCtrl, KwaiVGI/LivePortrait
 * - Images, Logos & Layers: black-forest-labs/flux, ZhengPeng7/BiRefNet + @imgly/background-removal, Sanster/IOPaint, fabricjs/fabric.js
 * - Native Adobe Bridge: Agamnentzar/ag-psd (5-layer native binary .PSD), FCPXML (.xml + .zip for Premiere Pro & After Effects), ffmpeg.wasm
 */

const CREATIVE_FORMATS = [
  { id: '1:1', key: 'feed-1x1', label: '1:1 (Feed)', width: 1080, height: 1080, aspectRatio: '1:1', category: 'social' },
  { id: '4:5', key: 'ads-4x5', label: '4:5 (Anúncios)', width: 1080, height: 1350, aspectRatio: '4:5', category: 'ads' },
  { id: '9:16', key: 'stories-9x16', label: '9:16 (Stories/Reels)', width: 1080, height: 1920, aspectRatio: '9:16', category: 'vertical' },
  { id: '16:9', key: 'youtube-16x9', label: '16:9 (Horizontal/YouTube)', width: 1920, height: 1080, aspectRatio: '16:9', category: 'horizontal' },
  { id: '1200x420', key: 'desktop-standard', label: '1200×420 (E-commerce Desktop)', width: 1200, height: 420, aspectRatio: '20:7', category: 'ecommerce' },
  { id: '390x433', key: 'mobile-banner', label: '390×433 (E-commerce Mobile)', width: 390, height: 433, aspectRatio: '390:433', category: 'ecommerce' },
];

const CAMERA_MOTION_PRESETS = [
  {
    id: 'orbit_360',
    name: 'Orbit 360°',
    engine: 'ComfyUI-CameraCtrl',
    description: 'Rotação orbital completa de 360 graus ao redor do produto ou modelo com iluminação dinâmica',
    cameraMatrix: { yawDeg: 360, pitchDeg: 5, zoomDelta: 0.08, speed: 1.0 },
  },
  {
    id: 'dolly_zoom',
    name: 'Dolly Zoom (Vertigo)',
    engine: 'ComfyUI-CameraCtrl',
    description: 'Aproximação dramática com compressão de perspectiva de fundo estilo cinema comercial',
    cameraMatrix: { yawDeg: 0, pitchDeg: 0, zoomDelta: 0.45, fovShift: -22, speed: 1.1 },
  },
  {
    id: 'crane_up',
    name: 'Crane Up (Grua Ascendente)',
    engine: 'ComfyUI-CameraCtrl',
    description: 'Elevação vertical suave revelando o look completo ou produto do detalhe ao plano aberto',
    cameraMatrix: { yawDeg: 0, pitchDeg: 18, panY: -0.35, zoomDelta: 0.12, speed: 0.9 },
  },
  {
    id: 'pan_cinematic',
    name: 'Panorâmica Cinematográfica',
    engine: 'ComfyUI-CameraCtrl',
    description: 'Travelling lateral suave em 24fps com profundidade de campo rasa (bokeh)',
    cameraMatrix: { yawDeg: 25, panX: 0.4, pitchDeg: 0, zoomDelta: 0.05, speed: 0.85 },
  },
  {
    id: 'fashion_runway',
    name: 'Passarela Fashion',
    engine: 'Wan2.1 + CameraCtrl',
    description: 'Acompanhamento frontal de passarela com movimento fluido de tecido e caminhada realista',
    cameraMatrix: { yawDeg: 4, pitchDeg: -6, dollyZ: -0.3, zoomDelta: 0.15, speed: 1.15 },
  },
  {
    id: 'slow_motion',
    name: 'Slow Motion 120fps',
    engine: 'Wan2.1 VACE + LTX-Video',
    description: 'Câmera ultra-lenta destacando textura, caimento e partículas de luz no produto',
    cameraMatrix: { yawDeg: 8, pitchDeg: 2, zoomDelta: 0.18, timeScale: 0.35, speed: 0.4 },
  },
];

const OPEN_SOURCE_STACK = [
  {
    id: 'wan-2.1',
    name: 'Wan-Video/Wan2.1 (Alibaba)',
    repo: 'https://github.com/Wan-Video/Wan2.1',
    category: 'video-engine',
    capabilities: ['img2vid', 'vace-control', 'photorealistic-motion', 'product-to-video'],
  },
  {
    id: 'ltx-video',
    name: 'Lightricks/LTX-Video',
    repo: 'https://github.com/Lightricks/LTX-Video',
    category: 'video-engine',
    capabilities: ['keyframe-chaining', 'long-video-storyboard', 'real-time-generation'],
  },
  {
    id: 'cameractrl',
    name: 'ComfyUI-CameraCtrl (Open-Higgsfield)',
    repo: 'https://github.com/hehao13/CameraCtrl',
    category: 'camera-control',
    capabilities: ['orbit_360', 'dolly_zoom', 'crane_up', 'pan_cinematic', 'fashion_runway', 'slow_motion'],
  },
  {
    id: 'liveportrait',
    name: 'KwaiVGI/LivePortrait & SadTalker',
    repo: 'https://github.com/KwaiVGI/LivePortrait',
    category: 'lip-sync',
    capabilities: ['lip-sync', 'commercial-presenter', 'facial-reenactment', 'voice-sync'],
  },
  {
    id: 'flux-1',
    name: 'black-forest-labs/flux (FLUX.1 Schnell / Dev)',
    repo: 'https://github.com/black-forest-labs/flux',
    category: 'image-logo-engine',
    capabilities: ['txt2img', 'exact-typography-logos', 'fashion-lookbook', 'product-packshot'],
  },
  {
    id: 'birefnet',
    name: 'ZhengPeng7/BiRefNet & @imgly/background-removal',
    repo: 'https://github.com/ZhengPeng7/BiRefNet',
    category: 'background-removal',
    capabilities: ['dichotomous-segmentation', 'hair-precision-cutout', 'alpha-matting', 'contact-shadow'],
  },
  {
    id: 'iopaint',
    name: 'Sanster/IOPaint (Generative Fill & Outpaint)',
    repo: 'https://github.com/Sanster/IOPaint',
    category: 'inpaint-outpaint',
    capabilities: ['object-erase', 'outpainting-aspect-expansion', '1x1-to-9x16-stories'],
  },
  {
    id: 'fabric-js',
    name: 'fabricjs/fabric.js Interactive Layer Canvas',
    repo: 'https://github.com/fabricjs/fabric.js',
    category: 'layer-editor',
    capabilities: ['multi-layer-canvas', 'typography-editor', 'offer-badges', 'contact-shadows'],
  },
  {
    id: 'ag-psd',
    name: 'Agamnentzar/ag-psd Native Photoshop Exporter',
    repo: 'https://github.com/Agamnentzar/ag-psd',
    category: 'adobe-bridge',
    capabilities: ['native-psd-binary', '5-layer-hierarchy', 'unicode-layer-names', 'rgba-channels'],
  },
  {
    id: 'premiere-fcpxml',
    name: 'Premiere Pro & After Effects FCPXML + ZIP Exporter',
    repo: 'https://github.com/Biel0071/AI-ENGINE',
    category: 'adobe-bridge',
    capabilities: ['xmeml-v5-timeline', 'after-effects-jsx', 'multi-track-audio-video', 'zip-bundle'],
  },
  {
    id: 'ffmpeg-wasm',
    name: 'ffmpegwasm/ffmpeg.wasm + Canvas Stream Renderer',
    repo: 'https://github.com/ffmpegwasm/ffmpeg.wasm',
    category: 'video-renderer',
    capabilities: ['scene-chaining', 'capcut-transitions', 'animated-subtitles', 'mp4-browser-render'],
  },
];

const PSD_CANONICAL_LAYERS = [
  { index: 1, id: 'ai-background', name: 'Camada 1: Cenário de fundo gerado por IA', role: 'background', blendMode: 'norm' },
  { index: 2, id: 'contact-shadow', name: 'Camada 2: Sombra de contato realista', role: 'shadow', blendMode: 'mul ' },
  { index: 3, id: 'product-cutout', name: 'Camada 3: Foto do produto recortada em alta resolução', role: 'product', blendMode: 'norm' },
  { index: 4, id: 'headline-cta', name: 'Camada 4: Textos de Headline / Preço / CTA', role: 'text', blendMode: 'norm' },
  { index: 5, id: 'company-logo', name: 'Camada 5: Logo da empresa', role: 'logo', blendMode: 'norm' },
];

class ImageGenerationEngine {
  constructor(options = {}) {
    this.apiPlatformUrl = options.apiPlatformUrl || process.env.API_PLATFORM_URL || 'http://209.50.241.22:3001';
    this.comfyUiUrl = options.comfyUiUrl || process.env.COMFYUI_URL || 'http://127.0.0.1:8188';
    this.geminiApiKey = options.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    this.history = [];
    this.videoHistory = [];
    this.maxHistory = 50;
  }

  /**
   * Resolves creative format dimensions from format key/id (e.g. '1:1', '9:16', '1200x420', '390x433')
   */
  resolveFormatDimensions(format, fallbackWidth = 1024, fallbackHeight = 1024) {
    if (!format) return { width: fallbackWidth, height: fallbackHeight, formatId: `${fallbackWidth}x${fallbackHeight}` };
    const norm = String(format).trim().toLowerCase().replace('×', 'x');
    const match = CREATIVE_FORMATS.find(
      f => f.id.toLowerCase() === norm || f.key.toLowerCase() === norm || `${f.width}x${f.height}` === norm
    );
    if (match) {
      return { width: match.width, height: match.height, formatId: match.id, label: match.label };
    }
    const parts = norm.split('x').map(Number);
    if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
      return { width: parts[0], height: parts[1], formatId: `${parts[0]}x${parts[1]}` };
    }
    return { width: fallbackWidth, height: fallbackHeight, formatId: `${fallbackWidth}x${fallbackHeight}` };
  }

  /**
   * Generates an image using the best available provider with automatic fallback.
   */
  async generateImage({
    prompt,
    negativePrompt = '',
    width = 1024,
    height = 1024,
    format,
    provider = 'auto',
    style = 'FASHION',
    seed = Math.floor(Math.random() * 1000000),
    sourceProject = 'fenix-os',
  } = {}) {
    const text = String(prompt || '').trim();
    if (!text) {
      throw new Error('O prompt da imagem é obrigatório.');
    }

    const resolvedDims = this.resolveFormatDimensions(format, Number(width) || 1024, Number(height) || 1024);
    const finalWidth = resolvedDims.width;
    const finalHeight = resolvedDims.height;

    const t0 = Date.now();
    const styledPrompt = this.applyStylePreset(text, style);
    const errors = [];

    // Order candidates based on requested provider
    const providersToTry = this.resolveProviderOrder(provider);

    for (const p of providersToTry) {
      try {
        let result = null;
        if (p === 'flux-fast') {
          result = await this.generateViaFlux(styledPrompt, finalWidth, finalHeight, seed);
        } else if (p === 'api-platform') {
          result = await this.generateViaApiPlatform(styledPrompt, finalWidth, finalHeight, negativePrompt);
        } else if (p === 'gemini-imagen') {
          result = await this.generateViaGemini(styledPrompt, finalWidth, finalHeight);
        }

        if (result && result.imageUrl) {
          const latencyMs = Date.now() - t0;
          const entry = {
            id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            imageUrl: result.imageUrl,
            provider: p,
            model: result.model || 'flux-1-schnell',
            prompt: text,
            styledPrompt,
            style,
            width: finalWidth,
            height: finalHeight,
            format: resolvedDims.formatId,
            latencyMs,
            sourceProject,
            createdAt: new Date().toISOString(),
          };

          this.addToHistory(entry);

          return {
            ok: true,
            ...entry,
            fallbacksAttempted: errors.length,
          };
        }
      } catch (err) {
        errors.push({ provider: p, error: err.message });
      }
    }

    const error = new Error('Nenhum provedor de imagem concluiu a geração.');
    error.name = 'ImageProvidersUnavailableError';
    error.code = 'IMAGE_PROVIDERS_UNAVAILABLE';
    error.status = 503;
    error.failures = errors.map(({ provider: failedProvider, error: message }) => ({
      provider: failedProvider,
      message: String(message).replace(/([?&](?:key|token|api_key)=)[^&\s]+/gi, '$1[redacted]').slice(0, 240),
    }));
    throw error;
  }

  /**
   * Resolves execution priority
   */
  resolveProviderOrder(preferred) {
    if (preferred === 'api-platform') return ['api-platform', 'flux-fast', 'gemini-imagen'];
    if (preferred === 'gemini-imagen') return ['gemini-imagen', 'flux-fast', 'api-platform'];
    if (preferred === 'flux-fast') return ['flux-fast', 'api-platform', 'gemini-imagen'];
    // Default 'auto': Fast photorealistic flux first, then API Platform, then Gemini
    return ['flux-fast', 'api-platform', 'gemini-imagen'];
  }

  /**
   * Applies domain-specific prompt engineering
   */
  applyStylePreset(prompt, style) {
    const s = String(style || '').toUpperCase();
    if (s === 'FASHION' || s === 'LOOKBOOK') {
      return `${prompt}, professional fashion photography, editorial lookbook style, 8k resolution, elegant studio lighting, photorealistic Brazilian model, authentic fabric texture, haute couture catalog shot`;
    }
    if (s === 'PRODUCT') {
      return `${prompt}, clean studio product photography, crisp white seamless background, soft ambient occlusion, professional retail catalog, sharp focus, 4k ultra detailed`;
    }
    if (s === 'BANNER') {
      return `${prompt}, modern e-commerce hero banner, commercial advertising composition, wide angle, vibrant atmospheric lighting, high conversion visual design`;
    }
    if (s === 'LOGO' || s === 'BRAND_LOGO') {
      return `${prompt}, minimalist vector brand logo design, exact typography lettering, clean flat emblem, isolated on pure solid background, corporate identity masterpiece, dribbble vector art`;
    }
    if (s === 'OUTPAINT' || s === 'SCENE_BACKGROUND') {
      return `${prompt}, seamless extended architectural studio background, natural depth of field, commercial advertising scenery, soft contact lighting, photorealistic 8k`;
    }
    if (s === '3D_RENDER') {
      return `${prompt}, 3d isometric render, octane render style, smooth bevels, stylized studio lighting, vibrant colors, clean architectural model`;
    }
    return prompt;
  }

  /**
   * Flux / Pollinations Generator (Immediate Photorealism)
   */
  async generateViaFlux(prompt, width, height, seed) {
    const encoded = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true&model=flux`;
    let response;
    try {
      response = await fetch(imageUrl, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(8_000) });
    } catch (error) {
      throw new Error(`Pollinations não confirmou o provedor: ${error.name === 'TimeoutError' ? 'tempo limite excedido' : 'falha de conexão'}.`);
    }
    if (!response.ok || !String(response.headers.get('content-type') || '').toLowerCase().startsWith('image/')) {
      throw new Error(`Pollinations não confirmou uma imagem válida (HTTP ${response.status}).`);
    }

    return {
      imageUrl,
      model: 'flux-1-schnell',
    };
  }

  /**
   * API Platform / ComfyUI Generator (VPS :3001)
   */
  async generateViaApiPlatform(prompt, width, height, negativePrompt) {
    const url = `${this.apiPlatformUrl}/v1/image`;
    const payload = JSON.stringify({
      prompt,
      negative_prompt: negativePrompt || 'blurry, bad quality, distorted, deformed',
      width,
      height,
      steps: 20,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`API Platform returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const imageUrl = data.image_url || data.url || data.output_url || data.images?.[0]?.url;
    if (!imageUrl) throw new Error('API Platform did not return an image URL');

    return {
      imageUrl,
      model: data.model || 'comfyui-sdxl',
    };
  }

  /**
   * Gemini Imagen Generator
   */
  async generateViaGemini(prompt, width, height) {
    if (!this.geminiApiKey) {
      throw new Error('GEMINI_API_KEY não configurada no ambiente.');
    }
    // Google Imagen endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${this.geminiApiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio: width >= height ? '1:1' : '3:4' },
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) throw new Error(`Gemini Imagen HTTP ${res.status}`);
    const data = await res.json();
    const b64 = data.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) throw new Error('No base64 image returned by Gemini');

    return {
      imageUrl: `data:image/jpeg;base64,${b64}`,
      model: 'imagen-3.0-generate-002',
    };
  }

  /**
   * Generates a brand Logo & Vector Identity (.SVG transparent + Flux raster)
   */
  async generateLogoIdentity({
    brandName,
    tagline = '',
    style = 'minimalist-monogram',
    primaryColor = '#C9927B',
    secondaryColor = '#1E293B',
    symbolType = 'monogram',
    sourceProject = 'mf-atacadista',
  } = {}) {
    const cleanBrand = String(brandName || '').trim();
    if (!cleanBrand) {
      throw new Error('O nome da marca (brandName) é obrigatório para gerar o logotipo.');
    }

    const initials = cleanBrand
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('') || cleanBrand.slice(0, 2).toUpperCase();

    const escapedBrand = cleanBrand.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const escapedTagline = String(tagline || '').trim().replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const safePrimary = String(primaryColor || '#C9927B').replace(/[&<>"']/g, '');
    const safeSecondary = String(secondaryColor || '#1E293B').replace(/[&<>"']/g, '');

    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 220" width="600" height="220" fill="none">
  <defs>
    <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${safePrimary}" />
      <stop offset="100%" stop-color="${safeSecondary}" />
    </linearGradient>
    <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.18" />
    </filter>
  </defs>
  <g filter="url(#softShadow)">
    ${symbolType === 'crest'
      ? `<polygon points="95,25 155,55 155,135 95,175 35,135 35,55" fill="url(#brandGrad)" stroke="${safePrimary}" stroke-width="3"/>`
      : symbolType === 'circle'
        ? `<circle cx="95" cy="105" r="68" fill="url(#brandGrad)" stroke="${safePrimary}" stroke-width="3"/>`
        : `<rect x="28" y="38" width="134" height="134" rx="28" fill="url(#brandGrad)" stroke="${safePrimary}" stroke-width="3"/>`
    }
    <text x="95" y="122" text-anchor="middle" font-family="Georgia, 'Playfair Display', serif" font-size="52" font-weight="700" fill="#FFFFFF" letter-spacing="2">${initials}</text>
  </g>
  <text x="190" y="${escapedTagline ? '102' : '118'}" font-family="'Inter', 'Montserrat', sans-serif" font-size="38" font-weight="800" fill="${safeSecondary}" letter-spacing="1.5">${escapedBrand}</text>
  ${escapedTagline ? `<text x="192" y="138" font-family="'Inter', sans-serif" font-size="15" font-weight="600" fill="${safePrimary}" letter-spacing="4">${escapedTagline.toUpperCase()}</text>` : ''}
</svg>`;

    const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svgContent, 'utf8').toString('base64')}`;
    const fluxPrompt = `Minimalist luxury brand logo featuring exact text "${cleanBrand}"${tagline ? ` and subtitle "${tagline}"` : ''}, ${style} style, palette ${safePrimary} and ${safeSecondary}, clean vector emblem on isolated transparent-ready neutral background, sharp typography`;

    let rasterImageUrl = null;
    let providerUsed = 'svg-vector-engine';
    try {
      const gen = await this.generateImage({
        prompt: fluxPrompt,
        style: 'LOGO',
        width: 1024,
        height: 1024,
        sourceProject,
      });
      rasterImageUrl = gen.imageUrl;
      providerUsed = `${gen.provider}+svg-vector`;
    } catch (_) {
      // Fallback cleanly to deterministic transparent SVG data URL when external raster provider is offline
      rasterImageUrl = svgDataUrl;
    }

    return {
      ok: true,
      brandName: cleanBrand,
      tagline,
      initials,
      style,
      primaryColor: safePrimary,
      secondaryColor: safeSecondary,
      svgContent,
      svgDataUrl,
      rasterImageUrl,
      provider: providerUsed,
      engine: 'black-forest-labs/flux + SVG Vector Identity',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Builds a ComfyUI Open-Higgsfield / Wan2.1 / LTX-Video / CameraCtrl / LivePortrait / BiRefNet / IOPaint workflow graph
   */
  buildComfyWorkflow({
    task = 'img2vid',
    engine = 'Wan2.1',
    prompt = '',
    imageUrl = '',
    cameraPreset = 'orbit_360',
    durationSeconds = 5,
    fps = 24,
    width = 1080,
    height = 1920,
    lipSyncText = '',
    lipSyncAudioUrl = '',
  } = {}) {
    const preset = CAMERA_MOTION_PRESETS.find(c => c.id === cameraPreset) || CAMERA_MOTION_PRESETS[0];
    const totalFrames = Math.max(24, Math.min(720, Math.round(durationSeconds * fps)));

    const workflow = {
      _meta: {
        generator: 'Fênix OS Open-Higgsfield Creative Studio',
        engine,
        task,
        cameraPreset: preset.id,
        totalFrames,
        fps,
        resolution: `${width}x${height}`,
        createdAt: new Date().toISOString(),
      },
      nodes: {
        '1': {
          class_type: 'LoadImage',
          inputs: { image: imageUrl || 'input_product_cutout.png' },
        },
        '2': {
          class_type: 'BiRefNet_Rembg',
          inputs: {
            image: ['1', 0],
            model: 'ZhengPeng7/BiRefNet-general',
            refine_foreground: true,
            hair_detail_preservation: true,
          },
        },
        '3': {
          class_type: 'CameraCtrlPoseTrajectory',
          inputs: {
            preset: preset.id,
            yaw_deg: preset.cameraMatrix.yawDeg || 0,
            pitch_deg: preset.cameraMatrix.pitchDeg || 0,
            zoom_delta: preset.cameraMatrix.zoomDelta || 0.1,
            speed: preset.cameraMatrix.speed || 1.0,
            frame_length: totalFrames,
          },
        },
        '4': {
          class_type: engine === 'LTX-Video' ? 'LTXVImgToVideoChain' : 'Wan21ImageToVideoVACE',
          inputs: {
            image: ['2', 0],
            camera_pose: ['3', 0],
            prompt: `${prompt || 'Commercial product showcase'}, ${preset.name} camera movement, photorealistic 8k`,
            width,
            height,
            num_frames: totalFrames,
            fps,
            steps: 25,
            cfg: 6.5,
          },
        },
      },
    };

    if (lipSyncText || lipSyncAudioUrl) {
      workflow.nodes['5'] = {
        class_type: 'LivePortraitLipSyncNode',
        inputs: {
          source_video: ['4', 0],
          speech_script: lipSyncText,
          driving_audio: lipSyncAudioUrl || 'tts_offer_voiceover.wav',
          lip_sync_precision: 'high',
          head_pose_natural: true,
        },
      };
    }

    return workflow;
  }

  /**
   * Generates a Short Video Clip specification + workflow (5s-15s, Higgsfield CameraCtrl + LivePortrait)
   */
  async generateVideoClip({
    prompt,
    imageUrl = '',
    engine = 'Wan-Video/Wan2.1',
    cameraPreset = 'orbit_360',
    durationSeconds = 5,
    format = '9:16',
    offerHeadline = '',
    offerPrice = '',
    offerCta = 'Comprar Agora',
    lipSyncEnabled = false,
    lipSyncScript = '',
    sourceProject = 'mf-atacadista',
  } = {}) {
    const cleanPrompt = String(prompt || '').trim();
    if (!cleanPrompt && !imageUrl) {
      throw new Error('Informe um prompt ou imagem base para gerar o vídeo.');
    }

    const dims = this.resolveFormatDimensions(format, 1080, 1920);
    const clampedDuration = Math.max(5, Math.min(15, Number(durationSeconds) || 5));
    const preset = CAMERA_MOTION_PRESETS.find(c => c.id === cameraPreset) || CAMERA_MOTION_PRESETS[0];

    const workflow = this.buildComfyWorkflow({
      task: 'short-commercial-video',
      engine,
      prompt: cleanPrompt,
      imageUrl,
      cameraPreset: preset.id,
      durationSeconds: clampedDuration,
      fps: 24,
      width: dims.width,
      height: dims.height,
      lipSyncText: lipSyncEnabled ? lipSyncScript : '',
    });

    const clipEntry = {
      id: `vid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: 'short-video',
      engine,
      cameraPreset: preset,
      durationSeconds: clampedDuration,
      fps: 24,
      width: dims.width,
      height: dims.height,
      format: dims.formatId,
      prompt: cleanPrompt,
      sourceImageUrl: imageUrl,
      offerOverlay: {
        headline: offerHeadline,
        price: offerPrice,
        cta: offerCta,
      },
      lipSync: {
        enabled: Boolean(lipSyncEnabled),
        engine: 'KwaiVGI/LivePortrait',
        script: lipSyncScript || '',
      },
      comfyWorkflow: workflow,
      sourceProject,
      createdAt: new Date().toISOString(),
    };

    this.videoHistory.unshift(clipEntry);
    if (this.videoHistory.length > this.maxHistory) {
      this.videoHistory.pop();
    }

    return {
      ok: true,
      ...clipEntry,
    };
  }

  /**
   * Generates a Multi-Scene Chained Storyboard for Long Videos (30s, 1min, 3min+)
   * Uses LTX-Video & Wan2.1 Scene Chaining + Transitions + Voiceover + Soundtrack
   */
  generateStoryboard({
    title = 'Campanha Comercial Multi-Cenas',
    prompt = 'Coleção Moda & E-commerce',
    targetDurationSeconds = 30,
    format = '9:16',
    scenes = [],
    voiceoverScript = '',
    soundtrackStyle = 'upbeat-fashion-house',
    transitionStyle = 'capcut-zoom',
    sourceProject = 'mf-atacadista',
  } = {}) {
    const dims = this.resolveFormatDimensions(format, 1080, 1920);
    const totalDuration = Math.max(15, Math.min(300, Number(targetDurationSeconds) || 30));
    const clipDuration = 5;
    const requestedSceneCount = Array.isArray(scenes) && scenes.length > 0
      ? scenes.length
      : Math.max(3, Math.ceil(totalDuration / clipDuration));

    const cameraCycle = CAMERA_MOTION_PRESETS.map(p => p.id);
    const transitionCycle = ['cross-dissolve', 'capcut-zoom', 'whip-pan', 'slide-up', 'glitch-flash'];

    let runningStartSec = 0;
    const resolvedScenes = Array.from({ length: requestedSceneCount }, (_, idx) => {
      const custom = scenes[idx] || {};
      const camId = custom.cameraPreset || cameraCycle[idx % cameraCycle.length];
      const camObj = CAMERA_MOTION_PRESETS.find(c => c.id === camId) || CAMERA_MOTION_PRESETS[0];
      const dur = Number(custom.durationSeconds) > 0 ? Number(custom.durationSeconds) : clipDuration;
      const startSec = runningStartSec;
      runningStartSec += dur;
      return {
        sceneNumber: idx + 1,
        id: custom.id || `scene_${idx + 1}`,
        title: custom.title || `Cena ${idx + 1} — ${camObj.name}`,
        prompt: custom.prompt || `${prompt} — tomada ${idx + 1} (${camObj.name})`,
        imageUrl: custom.imageUrl || '',
        durationSeconds: dur,
        startTimeSeconds: startSec,
        endTimeSeconds: startSec + dur,
        cameraPreset: camId,
        cameraPresetName: camObj.name,
        transition: custom.transition || (idx === 0 ? 'cut' : (transitionStyle || transitionCycle[idx % transitionCycle.length])),
        subtitleText: custom.subtitleText || (voiceoverScript ? voiceoverScript.split(/[.!?]+/).filter(Boolean)[idx]?.trim() || `Destaque ${idx + 1}` : `Cena ${idx + 1}: Oferta Especial`),
        voiceoverSegment: custom.voiceoverSegment || `Locução cena ${idx + 1}`,
        engine: idx % 2 === 0 ? 'Wan-Video/Wan2.1' : 'Lightricks/LTX-Video',
        keyframeChainedFrom: idx > 0 ? (custom.keyframeChainedFrom || `scene_${idx}`) : null,
      };
    });

    const computedDuration = resolvedScenes.reduce((acc, s) => acc + s.durationSeconds, 0);

    return {
      ok: true,
      id: `sb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title,
      prompt,
      format: dims.formatId,
      width: dims.width,
      height: dims.height,
      fps: 24,
      targetDurationSeconds: totalDuration,
      totalDurationSeconds: computedDuration,
      sceneCount: resolvedScenes.length,
      chainingEngine: 'Lightricks/LTX-Video + Wan-Video/Wan2.1 Scene Chaining',
      rendererEngine: 'ffmpeg.wasm + Canvas Stream',
      soundtrackStyle,
      transitionStyle,
      voiceoverScript,
      scenes: resolvedScenes,
      sourceProject,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Builds a genuine Adobe Photoshop (.PSD) v1 binary buffer with the 5 canonical separated layers.
   * Compatible with Agamnentzar/ag-psd structure and opens natively in Adobe Photoshop.
   */
  buildPsdBuffer({
    width = 1080,
    height = 1080,
    layers = [],
  } = {}) {
    // Clamp dimensions for fast server-side binary construction while preserving exact aspect ratio metadata
    const w = Math.max(16, Math.min(4096, Math.round(Number(width) || 1080)));
    const h = Math.max(16, Math.min(4096, Math.round(Number(height) || 1080)));

    const normalizeBlendMode = (bm) => {
      const raw = String(bm || 'norm').toLowerCase();
      if (raw === 'mult' || raw === 'multiply' || raw === 'mul ') return 'mul ';
      if (raw === 'scrn' || raw === 'screen') return 'scrn';
      if (raw === 'over' || raw === 'overlay') return 'over';
      return ((bm || 'norm') + '    ').slice(0, 4);
    };

    const encodePackBitsUniformRow = (rowWidth, byteVal) => {
      const rleBytes = [];
      let rem = rowWidth;
      while (rem > 0) {
        const chunk = Math.min(128, rem);
        if (chunk >= 2) {
          rleBytes.push((257 - chunk) & 0xFF, byteVal & 0xFF);
        } else {
          rleBytes.push(0, byteVal & 0xFF);
        }
        rem -= chunk;
      }
      return Buffer.from(rleBytes);
    };

    const buildRleUniformChannel = (lw, lh, byteVal) => {
      const rowBuf = encodePackBitsUniformRow(lw, byteVal);
      const headerAndCounts = Buffer.alloc(2 + lh * 2);
      headerAndCounts.writeUInt16BE(1, 0); // Compression 1 = RLE PackBits
      for (let y = 0; y < lh; y++) {
        headerAndCounts.writeUInt16BE(rowBuf.length, 2 + y * 2);
      }
      const rowsPayload = Buffer.alloc(rowBuf.length * lh);
      for (let y = 0; y < lh; y++) {
        rowBuf.copy(rowsPayload, y * rowBuf.length);
      }
      return Buffer.concat([headerAndCounts, rowsPayload]);
    };

    const resolvedLayers = PSD_CANONICAL_LAYERS.map((canon, idx) => {
      const custom = layers[idx] || layers.find(l => l.id === canon.id || l.index === canon.index) || {};
      const top = Math.max(0, Math.min(h - 1, Math.round(Number(custom.top) || 0)));
      const left = Math.max(0, Math.min(w - 1, Math.round(Number(custom.left) || 0)));
      const rawBottom = custom.bottom != null ? Math.round(Number(custom.bottom)) : h;
      const rawRight = custom.right != null ? Math.round(Number(custom.right)) : w;
      const bottom = Math.max(top + 1, Math.min(h, rawBottom));
      const right = Math.max(left + 1, Math.min(w, rawRight));

      return {
        name: custom.name || canon.name,
        blendMode: normalizeBlendMode(custom.blendMode || canon.blendMode),
        opacity: custom.opacity != null ? Math.max(0, Math.min(255, Math.round(Number(custom.opacity)))) : 255,
        visible: custom.visible !== false,
        top,
        left,
        bottom,
        right,
        rgbaColor: Array.isArray(custom.rgbaColor) && custom.rgbaColor.length === 4
          ? custom.rgbaColor
          : idx === 0 ? [28, 32, 48, 255]
          : idx === 1 ? [0, 0, 0, 140]
          : idx === 2 ? [245, 240, 235, 255]
          : idx === 3 ? [255, 215, 0, 255]
          : [201, 146, 123, 255],
      };
    });

    // 1. PSD Header (26 bytes)
    const header = Buffer.alloc(26);
    header.write('8BPS', 0, 4, 'ascii');
    header.writeUInt16BE(1, 4); // Version 1
    // 6 bytes reserved (0)
    header.writeUInt16BE(4, 12); // 4 channels (RGBA)
    header.writeUInt32BE(h, 14); // Height
    header.writeUInt32BE(w, 18); // Width
    header.writeUInt16BE(8, 22); // 8 bits per channel
    header.writeUInt16BE(3, 24); // RGB color mode (3)

    // 2. Color Mode Data (4 bytes = 0)
    const colorModeData = Buffer.alloc(4, 0);

    // 3. Image Resources (4 bytes = 0)
    const imageResources = Buffer.alloc(4, 0);

    // 4. Layer and Mask Information
    const layerRecords = [];
    const channelDataBuffers = [];

    for (const layer of resolvedLayers) {
      const lw = Math.max(1, layer.right - layer.left);
      const lh = Math.max(1, layer.bottom - layer.top);

      // Encode RLE channels for A (-1), R (0), G (1), B (2)
      const [rVal, gVal, bVal, aVal] = layer.rgbaColor;
      const chBufA = buildRleUniformChannel(lw, lh, aVal);
      const chBufR = buildRleUniformChannel(lw, lh, rVal);
      const chBufG = buildRleUniformChannel(lw, lh, gVal);
      const chBufB = buildRleUniformChannel(lw, lh, bVal);

      // Build extra data (Mask 4B + Blending ranges 4B + Pascal Name padded to 4B + Unicode 'luni' block)
      const asciiName = layer.name.replace(/[^\x20-\x7E]/g, '?').slice(0, 255);
      const nameByteLen = Buffer.byteLength(asciiName, 'ascii');
      const pascalTotalLen = Math.ceil((1 + nameByteLen) / 4) * 4;
      const pascalBuf = Buffer.alloc(pascalTotalLen, 0);
      pascalBuf.writeUInt8(nameByteLen, 0);
      pascalBuf.write(asciiName, 1, nameByteLen, 'ascii');

      // Unicode layer name ('8BIM' + 'luni' + length + UTF-16BE string)
      const utf16Chars = layer.name.length;
      const luniPayloadLen = Math.ceil((4 + utf16Chars * 2) / 4) * 4;
      const luniBuf = Buffer.alloc(12 + luniPayloadLen, 0);
      luniBuf.write('8BIM', 0, 4, 'ascii');
      luniBuf.write('luni', 4, 4, 'ascii');
      luniBuf.writeUInt32BE(luniPayloadLen, 8);
      luniBuf.writeUInt32BE(utf16Chars, 12);
      for (let c = 0; c < utf16Chars; c++) {
        luniBuf.writeUInt16BE(layer.name.charCodeAt(c), 16 + c * 2);
      }

      const extraDataLen = 4 + 4 + pascalBuf.length + luniBuf.length;
      const recBuf = Buffer.alloc(16 + 2 + 24 + 4 + 4 + 4 + 4 + extraDataLen, 0);
      let offset = 0;
      recBuf.writeInt32BE(layer.top, offset); offset += 4;
      recBuf.writeInt32BE(layer.left, offset); offset += 4;
      recBuf.writeInt32BE(layer.bottom, offset); offset += 4;
      recBuf.writeInt32BE(layer.right, offset); offset += 4;
      recBuf.writeUInt16BE(4, offset); offset += 2; // 4 channels: A (-1), R (0), G (1), B (2)

      const channelPairs = [[-1, chBufA], [0, chBufR], [1, chBufG], [2, chBufB]];
      for (const [cid, cBuf] of channelPairs) {
        recBuf.writeInt16BE(cid, offset); offset += 2;
        recBuf.writeUInt32BE(cBuf.length, offset); offset += 4;
      }

      recBuf.write('8BIM', offset, 4, 'ascii'); offset += 4;
      recBuf.write(layer.blendMode, offset, 4, 'ascii'); offset += 4;
      recBuf.writeUInt8(layer.opacity, offset); offset += 1;
      recBuf.writeUInt8(0, offset); offset += 1; // clipping
      recBuf.writeUInt8(layer.visible ? 0x08 : 0x0A, offset); offset += 1; // flags
      recBuf.writeUInt8(0, offset); offset += 1; // filler
      recBuf.writeUInt32BE(extraDataLen, offset); offset += 4;
      recBuf.writeUInt32BE(0, offset); offset += 4; // layer mask length = 0
      recBuf.writeUInt32BE(0, offset); offset += 4; // blending ranges length = 0
      pascalBuf.copy(recBuf, offset); offset += pascalBuf.length;
      luniBuf.copy(recBuf, offset); offset += luniBuf.length;

      layerRecords.push(recBuf);
      channelDataBuffers.push(chBufA, chBufR, chBufG, chBufB);
    }

    const layerCountBuf = Buffer.alloc(2);
    layerCountBuf.writeInt16BE(resolvedLayers.length, 0);

    const layerInfoBody = Buffer.concat([layerCountBuf, ...layerRecords, ...channelDataBuffers]);
    const paddedLayerInfoBody = layerInfoBody.length % 2 === 1
      ? Buffer.concat([layerInfoBody, Buffer.alloc(1, 0)])
      : layerInfoBody;

    const layerInfoLenBuf = Buffer.alloc(4);
    layerInfoLenBuf.writeUInt32BE(paddedLayerInfoBody.length, 0);

    const globalMaskLenBuf = Buffer.alloc(4, 0);
    const layerAndMaskBody = Buffer.concat([layerInfoLenBuf, paddedLayerInfoBody, globalMaskLenBuf]);
    const layerAndMaskLenBuf = Buffer.alloc(4);
    layerAndMaskLenBuf.writeUInt32BE(layerAndMaskBody.length, 0);

    // 5. Composite Image Data (RLE PackBits compressed base canvas)
    const numScanlines = 4 * h;
    const singleScanline = encodePackBitsUniformRow(w, 28);
    const scanlineCountsBuf = Buffer.alloc(numScanlines * 2);
    for (let i = 0; i < numScanlines; i++) {
      scanlineCountsBuf.writeUInt16BE(singleScanline.length, i * 2);
    }
    const compHeader = Buffer.alloc(2);
    compHeader.writeUInt16BE(1, 0); // 1 = RLE PackBits
    const allScanlines = Buffer.alloc(singleScanline.length * numScanlines);
    for (let i = 0; i < numScanlines; i++) {
      singleScanline.copy(allScanlines, i * singleScanline.length);
    }

    const psdBuffer = Buffer.concat([
      header,
      colorModeData,
      imageResources,
      layerAndMaskLenBuf,
      layerAndMaskBody,
      compHeader,
      scanlineCountsBuf,
      allScanlines,
    ]);

    return {
      buffer: psdBuffer,
      byteLength: psdBuffer.length,
      signature: '8BPS',
      width: w,
      height: h,
      layers: resolvedLayers.map((l, idx) => ({
        index: idx + 1,
        name: l.name,
        blendMode: l.blendMode,
        opacity: l.opacity,
        visible: l.visible,
        top: l.top,
        left: l.left,
        bottom: l.bottom,
        right: l.right,
        width: l.right - l.left,
        height: l.bottom - l.top,
        bounds: { top: l.top, left: l.left, bottom: l.bottom, right: l.right },
      })),
    };
  }

  /**
   * Builds a Final Cut Pro XML (xmeml v5) Timeline compatible with Adobe Premiere Pro & After Effects
   */
  buildPremiereXml({
    projectName = 'Estudio_Criativo_Fenix',
    width = 1080,
    height = 1920,
    fps = 24,
    scenes = [],
    voiceoverFile = 'audio/locucao_oferta.wav',
    soundtrackFile = 'audio/trilha_comercial.wav',
  } = {}) {
    const escXml = (val) => String(val || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    const safeName = escXml(projectName || 'Estudio_Criativo_Fenix');
    const resolvedScenes = Array.isArray(scenes) && scenes.length > 0
      ? scenes
      : this.generateStoryboard({ title: String(projectName || 'Estudio_Criativo_Fenix') }).scenes;

    let currentFrame = 0;
    const clipItemsXml = resolvedScenes.map((s, idx) => {
      const durFrames = Math.max(24, Math.round((Number(s.durationSeconds) || 5) * fps));
      const startFrame = currentFrame;
      const endFrame = currentFrame + durFrames;
      currentFrame = endFrame;
      const fileId = `file-scene-${idx + 1}`;
      const clipName = escXml(s.title || `Cena_${idx + 1}`);
      const baseClipFile = `scene_${String(idx + 1).padStart(2, '0')}_${escXml(s.cameraPreset || 'motion')}.mp4`;
      const fileName = `clips/${baseClipFile}`;

      return `          <clipitem id="clipitem-${idx + 1}">
            <name>${clipName}</name>
            <duration>${durFrames}</duration>
            <rate><timebase>${fps}</timebase><ntsc>FALSE</ntsc></rate>
            <start>${startFrame}</start>
            <end>${endFrame}</end>
            <in>0</in>
            <out>${durFrames}</out>
            <file id="${fileId}">
              <name>${baseClipFile}</name>
              <pathurl>${fileName}</pathurl>
              <rate><timebase>${fps}</timebase><ntsc>FALSE</ntsc></rate>
              <duration>${durFrames}</duration>
              <media>
                <video>
                  <samplecharacteristics>
                    <width>${width}</width>
                    <height>${height}</height>
                  </samplecharacteristics>
                </video>
              </media>
            </file>
            <comments>
              <mastercomment1>${escXml(s.cameraPresetName || s.cameraPreset || 'CameraCtrl')}</mastercomment1>
              <mastercomment2>${escXml(s.subtitleText || '')}</mastercomment2>
            </comments>
          </clipitem>`;
    }).join('\n');

    const totalFrames = Math.max(24, currentFrame);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="5">
  <sequence id="sequence-1">
    <name>${safeName}</name>
    <duration>${totalFrames}</duration>
    <rate>
      <timebase>${fps}</timebase>
      <ntsc>FALSE</ntsc>
    </rate>
    <timecode>
      <rate><timebase>${fps}</timebase><ntsc>FALSE</ntsc></rate>
      <string>00:00:00:00</string>
      <frame>0</frame>
      <displayformat>NDF</displayformat>
    </timecode>
    <media>
      <video>
        <format>
          <samplecharacteristics>
            <rate><timebase>${fps}</timebase><ntsc>FALSE</ntsc></rate>
            <width>${width}</width>
            <height>${height}</height>
            <pixelaspectratio>square</pixelaspectratio>
            <anamorphic>FALSE</anamorphic>
          </samplecharacteristics>
        </format>
        <track>
${clipItemsXml}
        </track>
      </video>
      <audio>
        <track>
          <clipitem id="audio-voiceover-1">
            <name>Locucao_Comercial_IA</name>
            <duration>${totalFrames}</duration>
            <rate><timebase>${fps}</timebase><ntsc>FALSE</ntsc></rate>
            <start>0</start>
            <end>${totalFrames}</end>
            <in>0</in>
            <out>${totalFrames}</out>
            <file id="file-voiceover">
              <name>locucao_oferta.wav</name>
              <pathurl>${escXml(voiceoverFile)}</pathurl>
            </file>
          </clipitem>
        </track>
        <track>
          <clipitem id="audio-soundtrack-1">
            <name>Trilha_Sonora_Background</name>
            <duration>${totalFrames}</duration>
            <rate><timebase>${fps}</timebase><ntsc>FALSE</ntsc></rate>
            <start>0</start>
            <end>${totalFrames}</end>
            <in>0</in>
            <out>${totalFrames}</out>
            <file id="file-soundtrack">
              <name>trilha_comercial.wav</name>
              <pathurl>${escXml(soundtrackFile)}</pathurl>
            </file>
          </clipitem>
        </track>
      </audio>
    </media>
  </sequence>
</xmeml>`;

    return {
      ok: true,
      projectName: String(projectName || 'Estudio_Criativo_Fenix'),
      width,
      height,
      fps,
      totalFrames,
      totalDurationSeconds: Number((totalFrames / fps).toFixed(2)),
      sceneCount: resolvedScenes.length,
      xml,
    };
  }

  addToHistory(entry) {
    this.history.unshift(entry);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }
  }

  getHistory() {
    return [...this.history];
  }

  getVideoHistory() {
    return [...this.videoHistory];
  }

  getCreativeFormats() {
    return [...CREATIVE_FORMATS];
  }

  getCameraMotionPresets() {
    return [...CAMERA_MOTION_PRESETS];
  }

  getOpenSourceStack() {
    return [...OPEN_SOURCE_STACK];
  }

  getCanonicalPsdLayers() {
    return [...PSD_CANONICAL_LAYERS];
  }

  getProviders() {
    return [
      { id: 'flux-fast', name: 'Flux.1 Schnell (Pollinations)', status: 'UNVERIFIED', capabilities: ['txt2img', 'fashion', 'logos', 'ultra-fast'] },
      { id: 'api-platform', name: 'API Platform ComfyUI (:3001)', status: 'UNVERIFIED', capabilities: ['txt2img', 'img2img', 'wan2.1', 'ltx-video', 'cameractrl', 'birefnet', 'iopaint', 'liveportrait'] },
      { id: 'gemini-imagen', name: 'Google Imagen 3', status: this.geminiApiKey ? 'CONFIGURED_UNVERIFIED' : 'NOT_CONFIGURED', capabilities: ['txt2img', 'photorealism'] },
    ];
  }
}

let instance = null;
function getImageEngine(options) {
  if (!instance) {
    instance = new ImageGenerationEngine(options);
  }
  return instance;
}

module.exports = {
  ImageGenerationEngine,
  getImageEngine,
  CREATIVE_FORMATS,
  CAMERA_MOTION_PRESETS,
  OPEN_SOURCE_STACK,
  PSD_CANONICAL_LAYERS,
};
