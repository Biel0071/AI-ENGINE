/**
 * FÊNIX OS — WORLD ENGINE 3.0 / HIGH-FIDELITY DIGITAL TWIN & GAME WORLD
 * ======================================================================
 * Single Source of Truth: Canonical Fênix Frontend & Living Runtime (:4400)
 *
 * Visual Benchmark: Game Art Quality, Deep Simulation & Digital Twin
 *
 * Core Breakthroughs in 3.0:
 * 1. Procedural Canvas Texture Engine (Asphalt, Corrugated Steel, Epoxy Floor,
 *    Concrete Pavers, Modern Curtain Glass, Wood Planks, Box Labels, ISO Containers)
 * 2. Balanced 4-Point Cinematic Lighting & Tone Mapping (Zero Pitch-Black Shadows,
 *    Warm Sunlight, Cool Sky Bounce, Fill Light, High-Bay Industrial Fixtures)
 * 3. Complete Architectural Realism for DEPÓSITO MAIS:
 *    - 2-Story Corporate Glass Office Wing with Entrance Canopy & WMS Signage
 *    - Heavy Industrial Warehouse with Structural Columns, Louvers, Fire Exits
 *    - Automated Cutaway System: Roof slides/elevates when close, revealing interior
 *    - Multi-Tier Pallet Racking (Porta-Paletes), Rollers, Packing Stations, UFO LEDs
 * 4. High-Fidelity Asset Pipeline:
 *    - 18-Wheeler Freight Truck (Aerodynamic Cab, Grille, Fuel Tanks, Dual Axles,
 *      40ft Corrugated Container Trailer with Locking Rods & Open Rear Doors)
 *    - Toyota-Style Industrial Forklift (Roll Cage, Two-Stage Chrome Mast, Pallet)
 *    - Delivery Courier Box Van with Cab Windows & Side Sliding Door
 *    - Embodied Characters: Camila in High-Vis Safety Vest & Silver Reflective Stripes,
 *      Holding Illuminated WMS Tablet Scanner with Breathing/Scan Cycles
 *    - Logistics Floor Workers & Dock Operators with Safety Gear
 * 5. Rich Urban Density & Living Infrastructure:
 *    - Dual-Lane Roadways with Yellow Centerlines, Crosswalks, Directional Arrows
 *    - Security Perimeter Fencing, Sliding Gate, Guard Booth & Boom Barrier
 *    - Multi-Tier Landscaping: Layered Deciduous Trees, Evergreen Pines, Hedges
 *    - Street Lamps, Storm Drains, Fire Hydrants, Stacked Container Yard
 * 6. Dynamic Simulation & Operational Loops:
 *    - Forklift moving between racking and docks
 *    - Fast Lane (High-Speed Cyan Optical Pulses) & Job Lane (Amber Volumetric Payloads)
 *    - Day / Night Atmosphere with Warm Floodlights, Windows & Vehicle Headlights
 */

(() => {
  'use strict';

  window.fenixActivateCity2DFallback = function(error) {
    if (window.__FENIX_FALLBACK_ACTIVE__) return;
    window.__FENIX_FALLBACK_ACTIVE__ = true;
    window.FENIX_WORLD_3D = false;
    window.FENIX_CITY_RENDERER = 'canvas2d';
    window.__FENIX_WORLD_3D_ERROR__ = error?.message || 'WebGL indisponível';
    try {
      if (typeof window.fenixSetCityMode === 'function') window.fenixSetCityMode('world');
      else {
        document.body.classList.remove('fenix-mode-3d');
        document.body.classList.add('fenix-mode-2d');
      }
    } catch (_) {
      document.body.classList.remove('fenix-mode-3d');
      document.body.classList.add('fenix-mode-2d');
    }

    let city = window.fenixIsoCity || (window.IsoCityEngine && window.fenixCity instanceof window.IsoCityEngine ? window.fenixCity : null);
    let cityError = null;
    try {
      if (!city && typeof window.IsoCityEngine === 'function') city = new window.IsoCityEngine('cityCanvas');
      if (city) {
        window.fenixIsoCity = city;
        window.fenixCity = city;
        city.resize?.();
      }
    } catch (fallbackError) {
      cityError = fallbackError;
    }

    const notice = document.getElementById('cityRendererFallbackStatus');
    const message = document.getElementById('cityRendererFallbackMessage');
    const retry = document.getElementById('cityRendererFallbackRetry');
    if (message) message.textContent = city
      ? 'WebGL indisponível. Mapa 2D ativo; agentes e dados vêm do runtime.'
      : `Renderização da Cidade indisponível${cityError ? ` · ${cityError.message}` : ''}.`;
    if (notice) {
      notice.hidden = false;
      notice.style.display = 'flex';
    }
    if (retry) retry.onclick = () => window.location.reload();
    const minimapStatus = document.getElementById('fenixMinimapStatus');
    if (minimapStatus && city) minimapStatus.textContent = 'Mapa 2D · WebGL indisponível';
    return city || null;
  };

  if (typeof THREE === 'undefined') {
    console.warn('[FenixWorld3D] Three.js not found, fallback to 2.5D canvas.');
    window.fenixActivateCity2DFallback(new Error('Three.js indisponível'));
    return;
  }

  const T = THREE;
  const STORAGE_KEY = 'fenix_world_camera_v5';
  const LEGACY_STORAGE_KEY = 'fenix_world_camera_v4';
  const CITY_DEFAULT_DISTANCE = 136;
  const CITY_REFERENCE_ASPECT = 16 / 10;
  const CITY_DEFAULT_FOV = 38;
  const CITY_MAX_RESPONSIVE_FOV = 55;
  const EXPANSION_CHUNK_SIZE = 160;
  const EXPANSION_MAX_RADIUS = 2;
  const PREVIOUS_CITY_DEFAULT_DISTANCE = 225;
  const CITY_LAYOUT_VERSION = 3;
  const PREVIOUS_DISTRICT_CENTERS = {
    'command-center': { x: 0, z: 0 },
    logistics: { x: 26, z: -10 },
    'api-platform': { x: -18, z: 2 },
    'dev-district': { x: -44, z: 14 },
    'ai-district': { x: -22, z: -18 },
    'project-district': { x: 20, z: 20 },
    'data-center': { x: -8, z: 28 },
    observatory: { x: 0, z: -32 }
  };
  const normalizeCameraDistance = (value) => {
    const distance = Number(value);
    if (!Number.isFinite(distance) || distance <= 0) return CITY_DEFAULT_DISTANCE;
    return Math.max(8, Math.min(260, distance));
  };
  const responsiveCameraFov = (aspect) => {
    const safeAspect = Math.max(0.4, Number(aspect) || CITY_REFERENCE_ASPECT);
    const required = 2 * Math.atan(Math.tan(CITY_DEFAULT_FOV * Math.PI / 360) * CITY_REFERENCE_ASPECT / safeAspect) * 180 / Math.PI;
    return Math.min(CITY_MAX_RESPONSIVE_FOV, required);
  };
  const responsiveCameraScale = (aspect) => {
    const safeAspect = Math.max(0.4, Number(aspect) || CITY_REFERENCE_ASPECT);
    const fov = responsiveCameraFov(safeAspect) * Math.PI / 360;
    const baseFov = CITY_DEFAULT_FOV * Math.PI / 360;
    const scale = (CITY_REFERENCE_ASPECT / safeAspect) * (Math.tan(baseFov) / Math.tan(fov));
    return Math.max(0.65, Math.min(260 / CITY_DEFAULT_DISTANCE, scale));
  };

  // Canonical District Layout
  const DISTRICTS = [
    { id: 'command-center', name: 'FÊNIX HQ', sub: 'Núcleo Central', color: 0x00d9ff, x: 0, z: 0, footprint: { width: 38, depth: 38 } },
    { id: 'logistics', name: 'INDUSTRIAL HUB', sub: 'Logística & WMS', color: 0xef4444, x: 52, z: -36, isHero: true, footprint: { width: 48, depth: 44 } },
    { id: 'api-platform', name: 'API PLATFORM', sub: 'Fastify Gateway & Ops', color: 0x00f0ff, x: -52, z: -29, isHero: true, footprint: { width: 34, depth: 30 } },
    { id: 'dev-district', name: 'DEV LOFT', sub: 'Engenharia & Código', color: 0x10b981, x: -54, z: 57, footprint: { width: 26, depth: 22 } },
    { id: 'ai-district', name: 'AI NEXUS', sub: 'Modelos & Cognição', color: 0xa855f7, x: -21, z: -60, footprint: { width: 28, depth: 28 } },
    { id: 'project-district', name: 'PROJECT FORGE', sub: 'Projetos & Deploy', color: 0xf59e0b, x: 25, z: 57, footprint: { width: 24, depth: 22 } },
    { id: 'data-center', name: 'MEMORY VAULT', sub: 'Dados & Segurança', color: 0x06b6d4, x: -24, z: 57, footprint: { width: 22, depth: 24 } },
    { id: 'observatory', name: 'OBSERVATÓRIO', sub: 'Telemetria 24/7', color: 0xeab308, x: 51, z: 15, footprint: { width: 24, depth: 24 } },
  ];
  const AMBIENT_CITY_LOTS = [
    { id: 'west-garden', x: -77, z: 15, width: 14, depth: 16, floors: 2, wall: 'urbanFacadeTerracotta', roof: 'warehouseRoof' },
    { id: 'west-courtyard', x: -77, z: -7, width: 14, depth: 14, floors: 2, wall: 'urbanFacadeSand', roof: 'brushedTitanium' },
    { id: 'north-library', x: 0, z: 31, width: 14, depth: 12, floors: 3, wall: 'urbanFacadeGlass', roof: 'brushedTitanium' },
    { id: 'north-center', x: -25, z: 33, width: 12, depth: 12, floors: 2, wall: 'urbanFacadeSand', roof: 'warehouseRoof' },
    { id: 'north-garden', x: 0, z: 43, width: 10, depth: 8, floors: 2, wall: 'urbanFacadeIvory', roof: 'woodSlat' },
    { id: 'north-east-periphery', x: 84, z: 8, width: 12, depth: 10, floors: 2, wall: 'warehouseWall', roof: 'warehouseRoof' },
    { id: 'east-logistics-flank', x: 84, z: -25, width: 14, depth: 12, floors: 3, wall: 'urbanFacadeGlass', roof: 'brushedTitanium' },
    { id: 'mid-west-civic', x: -48, z: 28, width: 12, depth: 10, floors: 3, wall: 'urbanFacadeTerracotta', roof: 'warehouseRoof' },
    { id: 'mid-east-civic', x: 32, z: -2, width: 10, depth: 10, floors: 2, wall: 'urbanFacadeIvory', roof: 'woodSlat' },
    { id: 'west-campus', x: -77, z: -37, width: 14, depth: 14, floors: 2, wall: 'warehouseWall', roof: 'warehouseRoof' },
    { id: 'south-civic', x: 8, z: -39, width: 14, depth: 12, floors: 3, wall: 'urbanFacadeSand', roof: 'brushedTitanium' },
    { id: 'east-terrace', x: 74, z: -2, width: 14, depth: 14, floors: 2, wall: 'urbanFacadeTerracotta', roof: 'woodSlat' },
    { id: 'southwest-quantum-park', x: -52, z: -62, width: 12, depth: 10, floors: 1, wall: 'urbanFacadeSand', roof: 'woodSlat' },
    { id: 'southeast-logistics-bay', x: 84, z: -52, width: 12, depth: 14, floors: 1, wall: 'warehouseWall', roof: 'warehouseRoof' }
  ];

  const districtOrigin = (id) => DISTRICTS.find((district) => district.id === id) || DISTRICTS[0];
  const districtPoint = (id, x = 0, y = 0, z = 0) => {
    const origin = districtOrigin(id);
    return new T.Vector3(origin.x + x, y, origin.z + z);
  };
  const placeAtDistrict = (group, id) => {
    const origin = districtOrigin(id);
    group.position.set(origin.x, 0, origin.z);
  };

  /* ══════════════════════════════════════════════════════════════════════════
     PROCEDURAL TEXTURE ENGINE (Instant, In-Memory, Tactile Canvas Textures)
  ══════════════════════════════════════════════════════════════════════════ */
  class TextureFactory {

    /* ── CityRT Signature Haussmannian & Neoclassical Facade Texture ── */
    static createCityRTHaussmannianFacadeTexture(palette = {}) {
      const baseColor = palette.base || '#ede5d8';
      const trimColor = palette.trim || '#33383f';
      const windowLit = palette.windowLit || '#ffe199';
      const windowDark = palette.windowDark || '#475361';
      const stoneShadow = palette.stoneShadow || '#d9cfbe';

      return this.create(512, 512, (ctx, w, h) => {
        // Base limestone wall
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, w, h);

        // Rusticated stone joint lines (Ligne Claire inking)
        ctx.strokeStyle = stoneShadow;
        ctx.lineWidth = 2;
        const blockH = h / 16;
        for (let y = 0; y <= h; y += blockH) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        const rows = 4;
        const cols = 4;
        const cellW = w / cols;
        const cellH = h / rows;

        for (let r = 0; r < rows; r++) {
          const cy = r * cellH;

          // Floor Cornice Stringcourse molding with ink outline
          ctx.fillStyle = stoneShadow;
          ctx.fillRect(0, cy + cellH - 12, w, 12);
          ctx.strokeStyle = trimColor;
          ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(0, cy + cellH - 12); ctx.lineTo(w, cy + cellH - 12); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, cy + cellH); ctx.lineTo(w, cy + cellH); ctx.stroke();

          for (let c = 0; c < cols; c++) {
            const cx = c * cellW;
            const winW = cellW * 0.52;
            const winH = cellH * 0.62;
            const wx = cx + (cellW - winW) / 2;
            const wy = cy + (cellH - winH) / 2 - 4;

            // Stone lintel / pediment above window
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(wx - 4, wy - 8, winW + 8, 6);
            ctx.strokeStyle = trimColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(wx - 4, wy - 8, winW + 8, 6);

            // Window frame (Ligne Claire black outline)
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(wx - 2, wy - 2, winW + 4, winH + 4);
            ctx.strokeStyle = trimColor;
            ctx.lineWidth = 3;
            ctx.strokeRect(wx - 2, wy - 2, winW + 4, winH + 4);

            // Glass pane: Warm golden interior glow vs cool slate
            const isLit = (r * 3 + c * 7 + (palette.seed || 1)) % 5 < 3;
            ctx.fillStyle = isLit ? windowLit : windowDark;
            ctx.fillRect(wx, wy, winW, winH);

            // Window Mullions (Classic French cross-panes)
            ctx.strokeStyle = trimColor;
            ctx.lineWidth = 2;
            // Vertical center bar
            ctx.beginPath(); ctx.moveTo(wx + winW / 2, wy); ctx.lineTo(wx + winW / 2, wy + winH); ctx.stroke();
            // Horizontal crossbar
            ctx.beginPath(); ctx.moveTo(wx, wy + winH * 0.4); ctx.lineTo(wx + winW, wy + winH * 0.4); ctx.stroke();

            // Wrought Iron Balcony Railing on 2nd and 3rd floors
            if (r === 1 || r === 2) {
              ctx.strokeStyle = '#1e242b';
              ctx.lineWidth = 3;
              ctx.strokeRect(wx - 5, wy + winH - 14, winW + 10, 14);
              // Baluster pickets
              for (let bx = wx - 3; bx < wx + winW + 3; bx += 6) {
                ctx.beginPath(); ctx.moveTo(bx, wy + winH - 14); ctx.lineTo(bx, wy + winH); ctx.stroke();
              }
            }
          }
        }
      }, 1, 1);
    }

    static create(width, height, drawFn, repeatX = 1, repeatY = 1) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      drawFn(ctx, width, height);
      const tex = new T.CanvasTexture(canvas);
      tex.wrapS = T.RepeatWrapping;
      tex.wrapT = T.RepeatWrapping;
      tex.repeat.set(repeatX, repeatY);
      return tex;
    }

    // Asphalt Road with Grain, Double Yellow Centerline & White Edges
    static createRoadTexture() {
      return this.create(512, 512, (ctx, w, h) => {
        // Base dark asphalt
        ctx.fillStyle = '#343c46';
        ctx.fillRect(0, 0, w, h);

        // Fine grain noise (deterministic)
        for (let i = 0; i < 18000; i++) {
          const x = ((i * 73) % w);
          const y = ((i * 137 + Math.floor(i / w) * 29) % h);
          const shade = 52 + ((i * 19) % 27);
          ctx.fillStyle = `rgb(${shade},${shade + 2},${shade + 6})`;
          ctx.fillRect(x, y, 1.5, 1.5);
        }

        // White solid edge lines
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(16, 0, 8, h);
        ctx.fillRect(w - 24, 0, 8, h);

        // Double yellow centerline
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(w / 2 - 8, 0, 6, h);
        ctx.fillRect(w / 2 + 2, 0, 6, h);
      }, 1, 4);
    }

    // Pedestrian Zebra Crosswalk Texture
    static createCrosswalkTexture() {
      return this.create(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#181e29';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#f8fafc';
        const barH = 28;
        const gap = 16;
        for (let y = 10; y < h; y += barH + gap) {
          ctx.fillRect(16, y, w - 32, barH);
        }
      });
    }

    // Concrete Sidewalk Pavers with Expansion Joints
    static createConcretePaversTexture() {
      return this.create(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#2b3642';
        ctx.fillRect(0, 0, w, h);

        // Slab joints
        ctx.strokeStyle = '#202b36';
        ctx.lineWidth = 4;
        const step = 64;
        for (let x = 0; x <= w; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y <= h; y += step) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        // Low-contrast deterministic grain avoids bright noise and frame-to-frame texture changes.
        for (let i = 0; i < 640; i++) {
          const x = (i * 73) % w;
          const y = (i * 151) % h;
          const shade = i % 3 === 0 ? 66 : i % 3 === 1 ? 49 : 35;
          ctx.fillStyle = `rgb(${shade},${shade + 7},${shade + 14})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }, 4, 4);
    }

    // Corrugated Metal Siding for Warehouse & Containers
    static createCorrugatedTexture(baseHex, ribHex, lines = 16) {
      return this.create(256, 256, (ctx, w, h) => {
        ctx.fillStyle = baseHex;
        ctx.fillRect(0, 0, w, h);

        const step = w / lines;
        for (let x = 0; x < w; x += step) {
          // Highlight
          ctx.fillStyle = 'rgba(255,255,255,0.18)';
          ctx.fillRect(x, 0, step * 0.35, h);
          // Dark rib groove
          ctx.fillStyle = ribHex;
          ctx.fillRect(x + step * 0.45, 0, step * 0.55, h);
          // Fine shadow
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(x + step * 0.85, 0, 2, h);
        }
      }, 4, 1);
    }

    // Polished Warehouse Epoxy Floor with Yellow Safety Boundaries
    static createWarehouseEpoxyTexture() {
      return this.create(512, 512, (ctx, w, h) => {
        // Light grey reflective industrial epoxy
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, 0, w, h);

        // Grid lines
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        for (let x = 0; x <= w; x += 128) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y <= h; y += 128) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // Yellow safety perimeter walkway
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 10;
        ctx.strokeRect(16, 16, w - 32, h - 32);

        // Center hatched staging area (black and yellow hazard zebra)
        const hatchX = 48, hatchY = 48, hatchW = 160, hatchH = 160;
        ctx.save();
        ctx.beginPath();
        ctx.rect(hatchX, hatchY, hatchW, hatchH);
        ctx.clip();
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(hatchX, hatchY, hatchW, hatchH);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 14;
        for (let d = -hatchW; d < hatchW * 2; d += 28) {
          ctx.beginPath();
          ctx.moveTo(hatchX + d, hatchY);
          ctx.lineTo(hatchX + d + hatchH, hatchY + hatchH);
          ctx.stroke();
        }
        ctx.restore();
      }, 2, 2);
    }

    // Modern Glass Curtain Wall with Illuminated Office Rooms
    static createCurtainGlassTexture() {
      return this.create(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);

        const rows = 4, cols = 4;
        const cellW = w / cols, cellH = h / rows;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const isLit = (r * 3 + c * 5) % 7 < 4;
            ctx.fillStyle = isLit ? '#586b70' : '#263a45';
            ctx.fillRect(c * cellW + 3, r * cellH + 3, cellW - 6, cellH - 6);

            // Blind silhouette / interior ceiling light
            if (isLit) {
              ctx.fillStyle = 'rgba(220,205,170,0.14)';
              ctx.fillRect(c * cellW + 6, r * cellH + 6, cellW - 12, 6);
            }
          }
        }
        // Black anodized aluminum mullions
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 6;
        for (let c = 0; c <= cols; c++) {
          ctx.beginPath(); ctx.moveTo(c * cellW, 0); ctx.lineTo(c * cellW, h); ctx.stroke();
        }
        for (let r = 0; r <= rows; r++) {
          ctx.beginPath(); ctx.moveTo(0, r * cellH); ctx.lineTo(w, r * cellH); ctx.stroke();
        }
      }, 2, 3);
    }

    // Quiet, varied apartment and civic facades for the ambient city blocks.
        static createStorefrontSignTexture(title, port, isOnline, colorHex = '#2563eb') {
      return this.create(512, 128, (ctx, w, h) => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);
        // Border & accent
        ctx.fillStyle = colorHex;
        ctx.fillRect(0, 0, w, 6);
        ctx.fillRect(0, h - 5, w, 5);
        // Status dot
        ctx.fillStyle = isOnline ? '#22c55e' : '#64748b';
        ctx.beginPath();
        ctx.arc(28, h / 2, 9, 0, Math.PI * 2);
        ctx.fill();
        if (isOnline) {
          ctx.strokeStyle = '#4ade80';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        // Title
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const displayTitle = String(title || 'PROJECT').toUpperCase();
        ctx.fillText(displayTitle.length > 22 ? displayTitle.slice(0, 20) + '...' : displayTitle, 48, h / 2 + 9);
        // Port badge
        if (port) {
          ctx.fillStyle = isOnline ? '#15803d' : '#334155';
          ctx.fillRect(w - 116, h / 2 - 16, 102, 32);
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 16px monospace';
          ctx.fillText(':' + port, w - 104, h / 2 + 6);
        }
      });
    }

    static createUrbanFacadeTexture(palette) {
      return this.create(256, 256, (ctx, w, h) => {
        ctx.fillStyle = palette.base;
        ctx.fillRect(0, 0, w, h);

        const rows = 4;
        const cols = 5;
        const cellW = w / cols;
        const cellH = h / rows;
        ctx.fillStyle = palette.shadow;
        ctx.fillRect(0, 0, w, 8);
        ctx.fillRect(0, h - 12, w, 12);

        for (let row = 0; row < rows; row += 1) {
          const y = row * cellH;
          ctx.fillStyle = row % 2 ? palette.shade : palette.base;
          ctx.fillRect(0, y + cellH - 7, w, 7);
          ctx.fillStyle = palette.trim;
          ctx.fillRect(0, y, w, 3);

          for (let col = 0; col < cols; col += 1) {
            const x = col * cellW;
            const insetX = 8;
            const insetY = 10;
            const windowW = cellW - insetX * 2;
            const windowH = cellH - insetY * 2 - 5;
            const isWarm = ((row * 7 + col * 11 + palette.seed) % 5) < 2;
            ctx.fillStyle = palette.trim;
            ctx.fillRect(x + insetX - 2, y + insetY - 2, windowW + 4, windowH + 5);
            ctx.fillStyle = isWarm ? palette.windowWarm : palette.windowCool;
            ctx.fillRect(x + insetX, y + insetY, windowW, windowH);
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(x + insetX + 3, y + insetY + 2, 2, Math.max(3, windowH - 4));
            ctx.fillStyle = palette.trim;
            ctx.fillRect(x + insetX - 3, y + insetY + windowH + 1, windowW + 6, 3);
          }
        }

        ctx.fillStyle = 'rgba(0,0,0,0.11)';
        for (let col = 0; col <= cols; col += 1) {
          ctx.fillRect(col * cellW, 0, 2, h);
        }
      }, 1, 1);
    }

    // Shipping Container Texture with Stenciled Markings
    static createContainerSideTexture(baseColorHex) {
      return this.create(256, 128, (ctx, w, h) => {
        ctx.fillStyle = baseColorHex;
        ctx.fillRect(0, 0, w, h);

        // Vertical corrugation ribs
        const ribStep = w / 24;
        for (let x = 0; x < w; x += ribStep) {
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(x, 0, ribStep * 0.4, h);
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.fillRect(x + ribStep * 0.4, 0, ribStep * 0.6, h);
        }

        // White stenciled markings
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('FENIX LOGISTICS', 14, 28);
        ctx.font = '9px monospace';
        ctx.fillText('FNXU 839210-4', 14, 44);
        ctx.fillText('MAX GROSS 32,500 KG', 14, 60);
      });
    }

    // Cardboard Cargo Box Texture with Tape & Barcode
    static createBoxTexture() {
      return this.create(128, 128, (ctx, w, h) => {
        ctx.fillStyle = '#b45309'; // Kraft cardboard
        ctx.fillRect(0, 0, w, h);

        // Packing tape across center
        ctx.fillStyle = '#78350f';
        ctx.fillRect(0, 54, w, 20);

        // White shipping label with barcode
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(16, 16, 48, 30);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(20, 20, 40, 14); // Simulated barcode
        ctx.fillRect(20, 38, 24, 4);

        // Fragile orientation arrow
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(96, 40); ctx.lineTo(96, 20);
        ctx.lineTo(92, 24); ctx.moveTo(96, 20); ctx.lineTo(100, 24);
        ctx.stroke();
      });
    }

    // High-Tech Solar Photovoltaic Grid Texture
    static createSolarTexture() {
      return this.create(128, 128, (ctx, w, h) => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#1e3a8a';
        const cols = 4, rows = 4;
        const cw = w / cols, ch = h / rows;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            ctx.fillRect(c * cw + 2, r * ch + 2, cw - 4, ch - 4);
          }
        }
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        for (let x = 0; x <= w; x += cw / 2) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
      }, 4, 4);
    }

    // Industrial Aged Red Brick Texture for Dev Loft
    static createBrickTexture() {
      return this.create(128, 128, (ctx, w, h) => {
        ctx.fillStyle = '#450a0a';
        ctx.fillRect(0, 0, w, h);
        const rowH = 16;
        for (let y = 0; y < h; y += rowH) {
          const offset = (y % (rowH * 2) === 0) ? 0 : 16;
          for (let x = offset - 16; x < w + 16; x += 32) {
            ctx.fillStyle = ((x + y) % 64 === 0) ? '#7f1d1d' : '#991b1b';
            ctx.fillRect(x + 1, y + 1, 30, rowH - 2);
          }
        }
      }, 3, 3);
    }

    // High-Detail Polished Terrazzo Flooring (Ground Lobby)
    static createTerrazzoTexture() {
      return this.create(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, w, h);
        const colors = ['#64748b', '#94a3b8', '#334155', '#cbd5e1', '#b45309', '#0284c7'];
        for (let i = 0; i < 800; i++) {
          const x = (i * 53) % w;
          const y = (i * 97 + Math.floor(i / 16) * 31) % h;
          const r = 0.6 + ((i % 11) * 0.2);
          ctx.fillStyle = colors[i % colors.length];
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }, 4, 4);
    }

    // Commercial Textured Carpet Tiles (Floor 1 Engineering)
    static createCarpetTileTexture() {
      return this.create(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, w, h);
        const tileSize = 64;
        for (let y = 0; y < h; y += tileSize) {
          for (let x = 0; x < w; x += tileSize) {
            const alt = ((x / tileSize) + (y / tileSize)) % 2 === 0;
            ctx.fillStyle = alt ? '#0f172a' : '#1e293b';
            ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
            ctx.fillStyle = alt ? 'rgba(56,189,248,0.08)' : 'rgba(148,163,184,0.08)';
            for (let i = 0; i < 90; i++) {
              ctx.fillRect(x + ((i * 17) % tileSize), y + ((i * 29) % tileSize), 2, 1);
            }
          }
        }
      }, 4, 4);
    }

    // Data Center Raised Floor Grid (Floor 2 SRE & Server Room)
    static createDataCenterTileTexture() {
      return this.create(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, w, h);
        const s = 64;
        for (let y = 0; y < h; y += s) {
          for (let x = 0; x < w; x += s) {
            ctx.fillStyle = '#161e2e';
            ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
            ctx.fillStyle = '#64748b';
            [[x + 4, y + 4], [x + s - 5, y + 4], [x + 4, y + s - 5], [x + s - 5, y + s - 5]].forEach(([cx, cy]) => {
              ctx.beginPath(); ctx.arc(cx, cy, 1.5, 0, Math.PI * 2); ctx.fill();
            });
            ctx.fillStyle = '#090d16';
            for (let vy = y + 16; vy < y + s - 16; vy += 7) {
              for (let vx = x + 16; vx < x + s - 16; vx += 7) {
                ctx.beginPath(); ctx.arc(vx, vy, 1.4, 0, Math.PI * 2); ctx.fill();
              }
            }
          }
        }
      }, 4, 4);
    }

    // Quantum Circuit Hex Floor (Floor 3 AI Lab)
    static createQuantumHexFloorTexture() {
      return this.create(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#060a14';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#00d9ff';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 10; i++) {
          ctx.beginPath();
          const startX = ((i * 47 + 19) % w);
          const startY = ((i * 61 + 23) % h);
          ctx.moveTo(startX, startY);
          ctx.lineTo(startX + (((i % 5) - 2) * 14), startY + 35);
          ctx.stroke();
          ctx.fillStyle = '#00f0ff';
          ctx.beginPath();
          ctx.arc(startX, startY, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }, 4, 4);
    }

    // High-Resolution IDE Code Editor Screen Texture
    static createCodeEditorTexture() {
      return this.create(512, 256, (ctx, w, h) => {
        ctx.fillStyle = '#0d1117';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#161b22';
        ctx.fillRect(0, 0, w, 24);
        ctx.fillStyle = '#58a6ff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('• fastify-gateway.ts', 12, 16);
        ctx.fillStyle = '#8b949e';
        ctx.font = '10px monospace';
        ctx.fillText('routes.ts  schema.json', 160, 16);

        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 24, 32, h - 24);
        ctx.fillStyle = '#484f58';
        ctx.font = '10px monospace';
        for (let l = 1; l <= 14; l++) {
          ctx.fillText(String(l).padStart(2, ' '), 8, 24 + l * 16);
        }

        const codeLines = [
          { text: "import fastify from 'fastify';", col: '#ff7b72' },
          { text: "import { authGuard } from './security';", col: '#d2a8ff' },
          { text: "", col: '#c9d1d9' },
          { text: "const app = fastify({ logger: true });", col: '#79c0ff' },
          { text: "app.register(authGuard, { rateLimit: 10000 });", col: '#7ee787' },
          { text: "", col: '#c9d1d9' },
          { text: "app.get('/api/v2/stream', async (req, reply) => {", col: '#d2a8ff' },
          { text: "  const health = await checkClusterHealth();", col: '#ffa657' },
          { text: "  return reply.code(200).send({ status: 'UP', p99: '4.2ms' });", col: '#7ee787' },
          { text: "});", col: '#d2a8ff' },
          { text: "await app.listen({ port: 3001, host: '0.0.0.0' });", col: '#79c0ff' },
          { text: "// FASTIFY GATEWAY ACTIVE · 128,490 req/s", col: '#8b949e' }
        ];

        let curY = 40;
        codeLines.forEach(l => {
          ctx.fillStyle = l.col;
          ctx.font = '11px monospace';
          ctx.fillText(l.text, 40, curY);
          curY += 16;
        });

        ctx.fillStyle = '#161b22';
        ctx.fillRect(w - 36, 24, 36, h - 24);
        ctx.fillStyle = 'rgba(88,166,255,0.4)';
        for (let m = 0; m < 14; m++) {
          ctx.fillRect(w - 32, 28 + m * 14, ((m * 7) % 24) + 4, 3);
        }
      });
    }

    // Observability screen frame. Live measurements are rendered by the UI from API state.
    static createGrafanaDashboardTexture() {
      return this.create(512, 256, (ctx, w, h) => {
        ctx.fillStyle = '#111217';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#181b1f';
        ctx.fillRect(0, 0, w, 22);
        ctx.fillStyle = '#27d7c4';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('OBSERVABILIDADE · FÊNIX OS', 10, 15);
        const panels = [
          { x: 8, y: 30, w: 240, h: 95, title: 'LATÊNCIA' },
          { x: 256, y: 30, w: 248, h: 95, title: 'TRÁFEGO' },
          { x: 8, y: 133, w: 240, h: 110, title: 'WORKERS' },
          { x: 256, y: 133, w: 248, h: 110, title: 'MEMÓRIA' },
        ];
        ctx.font = '10px monospace';
        for (const panel of panels) {
          ctx.fillStyle = '#181b1f';
          ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(panel.title, panel.x + 8, panel.y + 16);
          ctx.fillStyle = '#667587';
          ctx.fillText('UNAVAILABLE', panel.x + 8, panel.y + 38);
          ctx.strokeStyle = '#263543';
          ctx.lineWidth = 1;
          ctx.strokeRect(panel.x + 8, panel.y + 48, panel.w - 16, panel.h - 58);
        }
      });
    }

    // Architectural Warm Walnut Slat Wall Texture
    static createWoodSlatTexture() {
      return this.create(128, 256, (ctx, w, h) => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);
        const slatW = 12;
        const gap = 4;
        for (let x = 0; x < w; x += slatW + gap) {
          ctx.fillStyle = '#78350f';
          ctx.fillRect(x, 0, slatW, h);
          ctx.fillStyle = '#92400e';
          ctx.fillRect(x + 2, 0, 3, h);
          ctx.fillStyle = '#451a03';
          ctx.fillRect(x + slatW - 2, 0, 2, h);
        }
      }, 2, 2);
    }

    // 42U Server Rack Front Fascia Texture
    static createServerRackFasciaTexture() {
      return this.create(256, 512, (ctx, w, h) => {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 16, h);
        ctx.fillRect(w - 16, 0, 16, h);
        ctx.fillStyle = '#0f172a';
        for (let y = 8; y < h; y += 12) {
          ctx.fillRect(6, y, 4, 4);
          ctx.fillRect(w - 10, y, 4, 4);
        }

        const bladeH = (h - 16) / 14;
        for (let i = 0; i < 14; i++) {
          const by = 8 + i * bladeH;
          ctx.fillStyle = '#161e2e';
          ctx.fillRect(18, by + 1, w - 36, bladeH - 2);

          for (let d = 0; d < 4; d++) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(24 + d * 48, by + 4, 42, bladeH - 8);
            ctx.fillStyle = '#334155';
            ctx.fillRect(26 + d * 48, by + bladeH - 10, 38, 4);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(26 + d * 48, by + 6, 4, 3);
          }
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(w - 30, by + 6, 5, 5);
        }
      });
    }

    // Architecture Whiteboard Diagram Texture
    static createWhiteboardTexture() {
      return this.create(256, 128, (ctx, w, h) => {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, w, h);

        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2;
        ctx.strokeRect(16, 20, 50, 30);
        ctx.fillStyle = '#0284c7';
        ctx.font = '8px sans-serif';
        ctx.fillText('Client Web', 20, 38);

        ctx.beginPath(); ctx.moveTo(66, 35); ctx.lineTo(100, 35); ctx.stroke();

        ctx.strokeStyle = '#16a34a';
        ctx.strokeRect(100, 16, 60, 40);
        ctx.fillStyle = '#16a34a';
        ctx.fillText('Fastify GW', 106, 34);
        ctx.fillText('Port :3001', 106, 46);

        ctx.beginPath(); ctx.moveTo(160, 35); ctx.lineTo(194, 35); ctx.stroke();

        ctx.strokeStyle = '#dc2626';
        ctx.strokeRect(194, 20, 50, 30);
        ctx.fillStyle = '#dc2626';
        ctx.fillText('EventBus', 200, 38);

        ctx.fillStyle = '#475569';
        ctx.font = '7px sans-serif';
        ctx.fillText('• Zero-Trust Token Auth (Victor)', 16, 85);
        ctx.fillText('• 100% Non-Blocking Async IO', 16, 100);
        ctx.fillText('• P99 SLA < 5ms Guaranteed', 16, 115);
      });
    }
  }

  /* ══════════════════════════════════════════════════════════════════════════
     SPATIAL NAVIGATION GRAPH (A* Pathfinding, Corridors, Docks & Arteries)
  ══════════════════════════════════════════════════════════════════════════ */
  class PathGraph {
    constructor() {
      this.nodes = new Map();
      this.edges = new Map();
      this.obstacles = new Map();
      this._initCanonicalWaypoints();
    }

    addNode(id, pos, type = 'waypoint', floor = 0) {
      this.nodes.set(id, { id, pos: new T.Vector3(pos.x, pos.y !== undefined ? pos.y : 0.8, pos.z !== undefined ? pos.z : pos.y), type, floor });
      if (!this.edges.has(id)) this.edges.set(id, new Set());
    }

    addEdge(id1, id2, bidirectional = true) {
      if (this.nodes.has(id1) && this.nodes.has(id2)) {
        this.edges.get(id1).add(id2);
        if (bidirectional) this.edges.get(id2).add(id1);
      }
    }

    registerObstacle(id, bounds) {
      if (!id || !bounds) return;
      this.obstacles.set(id, {
        id,
        minX: bounds.minX,
        maxX: bounds.maxX,
        minZ: bounds.minZ,
        maxZ: bounds.maxZ,
        entryPos: bounds.entryPos || null,
        name: bounds.name || id
      });

      if (bounds.entryPos) {
        const doorId = `door_${id}`;
        this.addNode(doorId, bounds.entryPos, 'door', 0);
        let bestNode = null, minDist = Infinity;
        for (const [nid, node] of this.nodes) {
          if (nid.startsWith('door_') || nid.includes('station') || nid.includes('office') || nid === doorId) continue;
          const d = node.pos.distanceTo(new T.Vector3(bounds.entryPos.x, bounds.entryPos.y, bounds.entryPos.z));
          if (d < minDist && !this.doesSegmentCrossObstacle(node.pos, bounds.entryPos, 0.2)) {
            minDist = d;
            bestNode = nid;
          }
        }
        if (bestNode) {
          this.addEdge(doorId, bestNode);
        }
      }
    }

    unregisterObstacle(id) {
      this.obstacles.delete(id);
      const doorId = `door_${id}`;
      this.nodes.delete(doorId);
      this.edges.delete(doorId);
      for (const edgeSet of this.edges.values()) {
        edgeSet.delete(doorId);
      }
    }

    isPointInObstacle(x, z, margin = 0.5) {
      for (const obs of this.obstacles.values()) {
        if (x >= obs.minX - margin && x <= obs.maxX + margin &&
            z >= obs.minZ - margin && z <= obs.maxZ + margin) {
          return true;
        }
      }
      return false;
    }

    doesSegmentCrossObstacle(p1, p2, margin = 0.5) {
      const x1 = p1.x, z1 = p1.z !== undefined ? p1.z : p1.y;
      const x2 = p2.x, z2 = p2.z !== undefined ? p2.z : p2.y;

      for (const obs of this.obstacles.values()) {
        const minX = obs.minX - margin;
        const maxX = obs.maxX + margin;
        const minZ = obs.minZ - margin;
        const maxZ = obs.maxZ + margin;

        if (this._segmentIntersectsAABB(x1, z1, x2, z2, minX, maxX, minZ, maxZ)) {
          return true;
        }
      }
      return false;
    }

    _segmentIntersectsAABB(x1, z1, x2, z2, minX, maxX, minZ, maxZ) {
      let tmin = 0, tmax = 1;
      const dx = x2 - x1;
      const dz = z2 - z1;

      if (Math.abs(dx) < 1e-7) {
        if (x1 < minX || x1 > maxX) return false;
      } else {
        const invD = 1 / dx;
        let t1 = (minX - x1) * invD;
        let t2 = (maxX - x1) * invD;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) return false;
      }

      if (Math.abs(dz) < 1e-7) {
        if (z1 < minZ || z1 > maxZ) return false;
      } else {
        const invD = 1 / dz;
        let t1 = (minZ - z1) * invD;
        let t2 = (maxZ - z1) * invD;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) return false;
      }

      return true;
    }

    _initCanonicalWaypoints() {
      const atDepot = (x, y, z) => districtPoint('logistics', x - 26, y, z + 10);
      const atApi = (x, y, z) => districtPoint('api-platform', x + 18, y, z - 2);

      // 1. Depósito Mais: local waypoints attached to the building
      this.addNode('dep_dock1', atDepot(16.8, 0.9, 1.0), 'dock', 0);
      this.addNode('dep_dock2', atDepot(26.0, 0.9, 1.0), 'dock', 0);
      this.addNode('dep_dock3', atDepot(35.2, 0.9, 1.0), 'dock', 0);
      this.addNode('dep_staging', atDepot(26.0, 0.9, -2.0), 'staging', 0);
      this.addNode('dep_aisle_a', atDepot(16.0, 0.9, -10.0), 'racks', 0);
      this.addNode('dep_aisle_b', atDepot(26.0, 0.9, -10.0), 'racks', 0);
      this.addNode('dep_aisle_c', atDepot(36.0, 0.9, -10.0), 'racks', 0);
      this.addNode('dep_packing', atDepot(34.0, 0.9, -4.0), 'station', 0);
      this.addNode('dep_office', atDepot(42.0, 0.9, -7.0), 'office', 0);
      this.addNode('dep_apron', atDepot(26.0, 0.9, 8.0), 'yard', 0);
      this.addNode('dep_gate', atDepot(20.0, 0.2, 14.0), 'gate', 0);

      this.addEdge('dep_dock1', 'dep_staging');
      this.addEdge('dep_dock2', 'dep_staging');
      this.addEdge('dep_dock3', 'dep_staging');
      this.addEdge('dep_staging', 'dep_aisle_b');
      this.addEdge('dep_aisle_b', 'dep_aisle_a');
      this.addEdge('dep_aisle_b', 'dep_aisle_c');
      this.addEdge('dep_staging', 'dep_packing');
      this.addEdge('dep_packing', 'dep_office');
      this.addEdge('dep_dock2', 'dep_apron');
      this.addEdge('dep_apron', 'dep_gate');

      // 2. City Central Arteries & Fênix HQ Perimeter Ring Road (Detour around HQ)
      this.addNode('road_hq_n', { x: 0.0, y: 0.2, z: 16.0 }, 'road', 0);
      this.addNode('road_hq_s', { x: 0.0, y: 0.2, z: -16.0 }, 'road', 0);
      this.addNode('road_hq_e', { x: 16.0, y: 0.2, z: 0.0 }, 'road', 0);
      this.addNode('road_hq_w', { x: -16.0, y: 0.2, z: 0.0 }, 'road', 0);
      this.addNode('road_north', { x: 0.0, y: 0.2, z: 24.0 }, 'road', 0);
      this.addNode('road_south', { x: 0.0, y: 0.2, z: -24.0 }, 'road', 0);
      this.addNode('road_east', { x: 28.0, y: 0.2, z: 0.0 }, 'road', 0);
      this.addNode('road_west', { x: -28.0, y: 0.2, z: 0.0 }, 'road', 0);
      this.addNode('road_ne', { x: 28.0, y: 0.2, z: 24.0 }, 'road', 0);
      this.addNode('road_nw', { x: -28.0, y: 0.2, z: 24.0 }, 'road', 0);
      this.addNode('road_se', { x: 28.0, y: 0.2, z: -24.0 }, 'road', 0);
      this.addNode('road_sw', { x: -28.0, y: 0.2, z: -24.0 }, 'road', 0);

      // Perimeter Ring around HQ
      this.addEdge('road_hq_n', 'road_hq_e');
      this.addEdge('road_hq_e', 'road_hq_s');
      this.addEdge('road_hq_s', 'road_hq_w');
      this.addEdge('road_hq_w', 'road_hq_n');

      // Connect perimeter ring to cardinal arteries
      this.addEdge('road_hq_n', 'road_north');
      this.addEdge('road_hq_s', 'road_south');
      this.addEdge('road_hq_e', 'road_east');
      this.addEdge('road_hq_w', 'road_west');

      this.addEdge('road_north', 'road_ne');
      this.addEdge('road_north', 'road_nw');
      this.addEdge('road_south', 'road_se');
      this.addEdge('road_south', 'road_sw');
      this.addEdge('road_east', 'road_ne');
      this.addEdge('road_east', 'road_se');
      this.addEdge('road_west', 'road_nw');
      this.addEdge('road_west', 'road_sw');

      // 3. Connect Depósito Mais to city grid
      this.addNode('road_dep_junction', { x: 22.0, y: 0.2, z: -12.0 }, 'road', 0);
      this.addEdge('dep_gate', 'road_dep_junction');
      this.addEdge('road_dep_junction', 'road_se');
      this.addEdge('road_dep_junction', 'road_hq_e');

      // 4. API Platform & Western Tech Hub
      this.addNode('road_api_junction', { x: -28.0, y: 0.2, z: -14.0 }, 'road', 0);
      this.addEdge('road_hq_w', 'road_api_junction');
      this.addEdge('road_sw', 'road_api_junction');

      this.addNode('api_plaza', atApi(-18.0, 0.5, 10.0), 'plaza', 0);
      this.addNode('api_lobby', atApi(-18.0, 0.5, 3.2), 'lobby', 0);
      this.addNode('api_lift_f0', atApi(-18.0, 0.5, -2.0), 'elevator', 0);
      this.addNode('api_lift_f1', atApi(-18.0, 4.5, -2.0), 'elevator', 1);
      this.addNode('api_f1_center', atApi(-18.0, 4.5, 2.0), 'corridor', 1);
      this.addNode('api_f1_alex', atApi(-22.5, 4.5, 4.2), 'station', 1);
      this.addNode('api_f1_elena', atApi(-13.5, 4.5, 4.2), 'station', 1);
      this.addNode('api_lift_f2', atApi(-18.0, 8.5, -2.0), 'elevator', 2);
      this.addNode('api_f2_center', atApi(-18.0, 8.5, 2.0), 'corridor', 2);
      this.addNode('api_f2_lucas', atApi(-20.2, 8.5, 5.2), 'station', 2);
      this.addNode('api_f2_maya', atApi(-15.8, 8.5, 5.2), 'station', 2);
      this.addNode('api_f2_victor', atApi(-26.2, 8.5, 0.8), 'station', 2);
      this.addNode('api_lift_f3', atApi(-18.0, 12.5, -2.0), 'elevator', 3);
      this.addNode('api_f3_sora', atApi(-18.0, 12.5, 4.8), 'station', 3);

      this.addEdge('road_api_junction', 'api_plaza');
      this.addEdge('api_plaza', 'api_lobby');
      this.addEdge('api_lobby', 'api_lift_f0');
      this.addEdge('api_lift_f0', 'api_lift_f1');
      this.addEdge('api_lift_f1', 'api_f1_center');
      this.addEdge('api_f1_center', 'api_f1_alex');
      this.addEdge('api_f1_center', 'api_f1_elena');
      this.addEdge('api_lift_f1', 'api_lift_f2');
      this.addEdge('api_lift_f2', 'api_f2_center');
      this.addEdge('api_f2_center', 'api_f2_lucas');
      this.addEdge('api_f2_center', 'api_f2_maya');
      this.addEdge('api_f2_center', 'api_f2_victor');
      this.addEdge('api_lift_f2', 'api_lift_f3');
      this.addEdge('api_lift_f3', 'api_f3_sora');

      // 5. Eastern Corporate District Avenues (Sidewalk Network connecting Project Parcels)
      // Corridors run strictly in the buffer lanes between parcel rows (spacing 7.0) and columns (spacing 7.2)
      const aveZ = [28.5, 35.5, 42.5, 49.5, 56.5, 63.5, 70.5, 77.5];
      const crossX = [37.8, 45.0, 52.2, 59.4, 66.6, 73.8, 81.0, 88.2];

      aveZ.forEach((zVal, zIdx) => {
        crossX.forEach((xVal, xIdx) => {
          if (typeof this.isPointInObstacle === 'function' && this.isPointInObstacle(xVal, zVal, 0.8)) return;
          const nodeId = `corp_node_${xIdx}_${zIdx}`;
          this.addNode(nodeId, { x: xVal, y: 0.2, z: zVal }, 'avenue', 0);
          if (xIdx > 0 && this.nodes) {
            const leftId = `corp_node_${xIdx - 1}_${zIdx}`;
            const noCross = typeof this.doesSegmentCrossObstacle === 'function'
              ? !this.doesSegmentCrossObstacle(this.nodes.get(leftId)?.pos, { x: xVal, y: 0.2, z: zVal }, 0.25)
              : true;
            if (this.nodes.has(leftId) && noCross) {
              this.addEdge(nodeId, leftId);
            }
          }
          if (zIdx > 0 && this.nodes) {
            const downId = `corp_node_${xIdx}_${zIdx - 1}`;
            const noCross = typeof this.doesSegmentCrossObstacle === 'function'
              ? !this.doesSegmentCrossObstacle(this.nodes.get(downId)?.pos, { x: xVal, y: 0.2, z: zVal }, 0.25)
              : true;
            if (this.nodes.has(downId) && noCross) {
              this.addEdge(nodeId, downId);
            }
          }
        });
      });

      if (this.nodes?.has('corp_node_0_0')) {
        this.addEdge('corp_node_0_0', 'road_ne');
      }
      if (this.nodes?.has('corp_node_0_1')) {
        this.addEdge('corp_node_0_1', 'road_ne');
      }
      if (this.nodes?.has('corp_node_0_2')) {
        this.addEdge('corp_node_0_2', 'road_east');
      }

      // 6. Northern & Western District Connections
      this.addNode('dev_plaza', { x: -48.0, y: 0.2, z: 42.0 }, 'plaza', 0);
      this.addEdge('road_nw', 'dev_plaza');

      this.addNode('ai_plaza', { x: -21.0, y: 0.2, z: -44.0 }, 'plaza', 0);
      this.addEdge('road_sw', 'ai_plaza');
    }

    findPath(startPos, endPos) {
      const targetVec = endPos instanceof T.Vector3 ? endPos.clone() : new T.Vector3(endPos.x, endPos.y !== undefined ? endPos.y : 0.8, endPos.z !== undefined ? endPos.z : endPos.y);
      const startVec = startPos instanceof T.Vector3 ? startPos.clone() : new T.Vector3(startPos.x, startPos.y !== undefined ? startPos.y : 0.8, startPos.z !== undefined ? startPos.z : startPos.y);

      // 1. If start position is inside an obstacle (e.g. agent at interior workstation), route out through its entrance doorway
      let startDoorway = null;
      for (const obs of this.obstacles.values()) {
        if (startVec.x >= obs.minX - 0.15 && startVec.x <= obs.maxX + 0.15 &&
            startVec.z >= obs.minZ - 0.15 && startVec.z <= obs.maxZ + 0.15) {
          if (obs.entryPos) {
            startDoorway = new T.Vector3(obs.entryPos.x, startVec.y, obs.entryPos.z);
          }
          break;
        }
      }

      // 2. If target is inside an obstacle, route to its accessible entrance doorway first, then inside
      let finalInsideTarget = null;
      for (const obs of this.obstacles.values()) {
        if (targetVec.x >= obs.minX - 0.15 && targetVec.x <= obs.maxX + 0.15 &&
            targetVec.z >= obs.minZ - 0.15 && targetVec.z <= obs.maxZ + 0.15) {
          if (obs.entryPos) {
            finalInsideTarget = targetVec.clone();
            targetVec.set(obs.entryPos.x, targetVec.y, obs.entryPos.z);
          }
          break;
        }
      }

      const routingStart = startDoorway || startVec;

      // 3. Direct line check if no obstacles crossed
      if (!this.doesSegmentCrossObstacle(routingStart, targetVec, 0.35)) {
        const directPath = [];
        if (startDoorway) directPath.push(startDoorway);
        directPath.push(targetVec);
        if (finalInsideTarget) directPath.push(finalInsideTarget);
        return directPath;
      }

      // 4. Find closest accessible start and end nodes on path network
      let startNode = null, minDistStart = Infinity;
      let endNode = null, minDistEnd = Infinity;

      for (const [id, node] of this.nodes) {
        const dS = node.pos.distanceTo(routingStart);
        if (dS < minDistStart && !this.doesSegmentCrossObstacle(routingStart, node.pos, 0.25)) {
          minDistStart = dS;
          startNode = id;
        }
        const dE = node.pos.distanceTo(targetVec);
        if (dE < minDistEnd && !this.doesSegmentCrossObstacle(node.pos, targetVec, 0.25)) {
          minDistEnd = dE;
          endNode = id;
        }
      }

      if (!startNode) {
        for (const [id, node] of this.nodes) {
          const dS = node.pos.distanceTo(routingStart);
          if (dS < minDistStart) { minDistStart = dS; startNode = id; }
        }
      }
      if (!endNode) {
        for (const [id, node] of this.nodes) {
          const dE = node.pos.distanceTo(targetVec);
          if (dE < minDistEnd) { minDistEnd = dE; endNode = id; }
        }
      }

      // 5. If startNode === endNode or one is missing, detour through intermediate node to avoid crossing walls
      if (!startNode || !endNode || startNode === endNode) {
        const fallback = [];
        if (startDoorway) fallback.push(startDoorway);
        if (startNode && this.nodes.has(startNode)) {
          const intermediate = this.nodes.get(startNode).pos.clone();
          if (!this.doesSegmentCrossObstacle(intermediate, targetVec, 0.3)) {
            fallback.push(intermediate);
          } else {
            const neighbors = this.edges.get(startNode);
            if (neighbors) {
              for (const nId of neighbors) {
                const nPos = this.nodes.get(nId)?.pos;
                if (nPos && !this.doesSegmentCrossObstacle(intermediate, nPos, 0.3) && !this.doesSegmentCrossObstacle(nPos, targetVec, 0.3)) {
                  fallback.push(intermediate, nPos.clone());
                  break;
                }
              }
            }
          }
        }
        fallback.push(targetVec);
        if (finalInsideTarget) fallback.push(finalInsideTarget);
        return fallback;
      }

      // 6. A* path search along nodes
      const openSet = new Set([startNode]);
      const cameFrom = new Map();
      const gScore = new Map();
      const fScore = new Map();

      for (const id of this.nodes.keys()) {
        gScore.set(id, Infinity);
        fScore.set(id, Infinity);
      }
      gScore.set(startNode, 0);
      fScore.set(startNode, this.nodes.get(startNode).pos.distanceTo(this.nodes.get(endNode).pos));

      while (openSet.size > 0) {
        let current = null;
        let lowestF = Infinity;
        for (const node of openSet) {
          const score = fScore.get(node) ?? Infinity;
          if (score < lowestF) {
            lowestF = score;
            current = node;
          }
        }

        if (current === endNode) {
          const rawPath = [current];
          let currId = current;
          while (cameFrom.has(currId)) {
            currId = cameFrom.get(currId);
            rawPath.unshift(currId);
          }
          const points = [];
          if (startDoorway) points.push(startDoorway);
          for (const nid of rawPath) {
            points.push(this.nodes.get(nid).pos.clone());
          }
          points.push(targetVec);
          if (finalInsideTarget) points.push(finalInsideTarget);
          return points;
        }

        openSet.delete(current);
        const currentPos = this.nodes.get(current).pos;
        const neighbors = this.edges.get(current) || [];

        for (const neighbor of neighbors) {
          const nPos = this.nodes.get(neighbor).pos;
          if (this.doesSegmentCrossObstacle(currentPos, nPos, 0.3)) continue;
          const tentativeG = (gScore.get(current) ?? Infinity) + currentPos.distanceTo(nPos);
          if (tentativeG < (gScore.get(neighbor) ?? Infinity)) {
            cameFrom.set(neighbor, current);
            gScore.set(neighbor, tentativeG);
            fScore.set(neighbor, tentativeG + nPos.distanceTo(this.nodes.get(endNode).pos));
            openSet.add(neighbor);
          }
        }
      }

      // 7. Fallback if search exhausted
      const fallback = [];
      if (startDoorway) fallback.push(startDoorway);
      if (startNode && this.nodes.has(startNode)) fallback.push(this.nodes.get(startNode).pos.clone());
      fallback.push(targetVec);
      if (finalInsideTarget) fallback.push(finalInsideTarget);
      return fallback;
    }
  }

  /* ══════════════════════════════════════════════════════════════════════════
     MUNDER DIFFLIN: 3D FLOATING THOUGHT & ACTION BUBBLE
  ══════════════════════════════════════════════════════════════════════════ */
  class AgentThoughtBubble {
    constructor(parentGroup, text, colorHex = '#38bdf8', emoji = '⚡') {
      this.parent = parentGroup;
      this.text = text || 'Ativo';
      this.colorHex = colorHex || '#38bdf8';
      this.emoji = emoji || '⚡';

      this.canvas = document.createElement('canvas');
      this.canvas.width = 384;
      this.canvas.height = 96;
      this.ctx = this.canvas.getContext('2d');
      this.texture = new T.CanvasTexture(this.canvas);

      const mat = new T.SpriteMaterial({
        map: this.texture,
        transparent: true,
        opacity: 0.95,
        depthTest: false
      });
      this.sprite = new T.Sprite(mat);
      this.sprite.scale.set(2.4, 0.6, 1.0);
      this.sprite.position.set(0, 2.45, 0);
      parentGroup.add(this.sprite);

      this.render();
    }

    setText(text, emoji = null, colorHex = null) {
      if (text !== undefined && text !== null) this.text = text;
      if (emoji !== null) this.emoji = emoji;
      if (colorHex !== null) this.colorHex = colorHex;
      this.render();
    }

    render() {
      const ctx = this.ctx;
      const w = this.canvas.width, h = this.canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Rounded Capsule Pill Background
      const r = 24;
      ctx.fillStyle = 'rgba(11, 19, 41, 0.92)';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(8, 8, w - 16, h - 24, r);
      } else {
        ctx.rect(8, 8, w - 16, h - 24);
      }
      ctx.fill();

      // Glowing Border
      ctx.strokeStyle = this.colorHex;
      ctx.lineWidth = 4;
      ctx.stroke();

      // Pointer triangle at bottom
      ctx.fillStyle = this.colorHex;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 10, h - 16);
      ctx.lineTo(w / 2 + 10, h - 16);
      ctx.lineTo(w / 2, h - 4);
      ctx.fill();

      // Text content
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.textBaseline = 'middle';
      const fullDisplayText = `${this.emoji} ${this.text}`;
      const maxTextWidth = w - 40;
      let displayText = fullDisplayText;
      while (displayText.length > 2 && ctx.measureText(displayText).width > maxTextWidth) {
        displayText = displayText.slice(0, displayText.length - 1);
      }
      if (displayText !== fullDisplayText) displayText = `${displayText.slice(0, -1)}…`;
      ctx.fillText(displayText, 20, (h - 24) / 2 + 8);

      this.texture.needsUpdate = true;
    }

    dispose() {
      if (this.sprite && this.parent) {
        this.parent.remove(this.sprite);
        if (this.sprite.material) this.sprite.material.dispose();
      }
      if (this.texture) this.texture.dispose();
    }
  }

  /* ══════════════════════════════════════════════════════════════════════════
     MAIN ENGINE 3.0: FENIX WORLD 3D
  ══════════════════════════════════════════════════════════════════════════ */
  class FenixWorld3DEngine {
    constructor(containerEl) {
      this.container = containerEl ||
                       document.querySelector('#view-city .fenix-city-canvas-area') ||
                       document.getElementById('fenixCityWorldArea') ||
                       document.getElementById('view-city') ||
                       document.body;
      if (!this.container) return;

      this.scene = new T.Scene();
      this.scene.background = new T.Color(0xd7dec9); // CityRT signature watercolor pastel haze
      this.scene.fog = new T.Fog(0xd7dec9, 85, 340);

      // Camera State
      const saved = this._loadState();
      const savedTarget = saved.target && ['x', 'y', 'z'].every((axis) => Number.isFinite(Number(saved.target[axis])))
        ? new T.Vector3(Number(saved.target.x), Number(saved.target.y), Number(saved.target.z))
        : new T.Vector3(0, 0, 0);
      const savedDistance = normalizeCameraDistance(saved.distance);
      this.cameraState = {
        azimuth: saved.azimuth !== undefined ? saved.azimuth : Math.PI / 4,
        elevation: Number.isFinite(Number(saved.elevation)) ? Number(saved.elevation) : 0.56,
        distance: savedDistance,
        target: savedTarget.clone(),
        targetDistance: savedDistance,
        preferenceDistance: savedDistance,
        targetLookAt: savedTarget.clone(),
        targetAzimuth: null,
        targetElevation: null,
        dragging: false,
        dragMode: 'orbit',
        dragPointerId: null,
        dragButton: 0,
        dragStartX: 0,
        dragStartY: 0,
        lastX: 0,
        lastY: 0,
        moved: false,
        followTarget: null,
        night: false
      };

      // Cutaway & LOD System
      this.cutawayState = {
        progress: 0.0,
        target: 0.0,
        manual: false
      };

      // Raycasting & Interaction
      this.raycaster = new T.Raycaster();
      this.mouse = new T.Vector2();
      this.interactiveMeshes = [];
      this.hoveredObject = null;

      // Animation & Simulation State
      this.clock = new T.Clock();
      this.pathGraph = new PathGraph();
      this.obstacles = this.pathGraph.obstacles;
      this._initObstacleRegistry();
      this.livePackets = [];
      this.agents = new Map();
      this.buildings = new Map();
      this.dynamicBuildings = new Map();
      this.world = { agents: this.agents };
      this.world.buildings = this.buildings;
      this.DISTRICTS = Object.fromEntries(DISTRICTS.map(district => [district.id, district]));
      this.state = { cityFilter: 'ALL', selectedCompanyId: null, labels: [] };
      this.districtLabels = new Map();
      this.vehicles = [];
      this.dataPulses = [];
      this.activeRuntimeJobs = 0;
      this.telemetryStatus = 'CONNECTING';
      this.expansionChunks = new Map();
      this._lastExpansionRegionKey = '';
      const forkliftStart = districtPoint('logistics', 0, 0.9, 18.5);
      this.forkliftState = { step: 0, timer: 0, strobeTimer: 0, x: 0, z: 8.5, carrying: true };
      this.camilaState = { phase: 0, action: 'AVAILABLE', timer: 0, pos: districtPoint('logistics', -1.5, 0.8, 7.5) };

      this._initDOM();
      try {
        this._initRenderer();
      } catch (error) {
        try { this._resizeObserver?.disconnect(); } catch (_) {}
        try { this.renderer?.dispose?.(); } catch (_) {}
        this.host?.remove();
        this.host = null;
        throw error;
      }
      this._initLighting();
      this._initMaterials();
      this._initTerrain();
      this._initUrbanInfrastructure();
      this._initDepositoMaisComplex();
      this._initApiPlatformComplex();
      this._initSurroundingMetropolis();
      this._initDistrictInteractionLabels();
      this._initAmbientCityFabric();
      this._initVehicles();
      this._initDataFlowPipelines();
      this.dataPulses.forEach((pulse) => { if (pulse.mesh) pulse.mesh.visible = false; });
      this._bindEvents();

      // Start Render Loop with Visibility & View Throttling (Requirement 7)
      this._isMounted = true;
      this._isDisposed = false;
      this._animationFrameId = null;
      this._animationTimerId = null;
      this._worldRefreshTimer = null;
      this._animate = this._animate.bind(this);
      this._resumeAnimationLoop = this._resumeAnimationLoop.bind(this);
      this._resumeAnimationLoop();

      this._onVisibilityChange = () => {
        if (!document.hidden) this._resumeAnimationLoop();
      };
      this._onViewChanged = () => {
        this._resumeAnimationLoop();
      };
      document.addEventListener('visibilitychange', this._onVisibilityChange);
      window.addEventListener('fenix-view-changed', this._onViewChanged);
      // Expose globally as singleton (Requirement 2)
      window.FENIX_WORLD_3D = true;
      window.fenixWorld3D = this;
      window.fenixWorldEngine3D = this;
      window.fenixCity = this;
      window.__FENIX_SINGLETONS__?.register('worldEngine', this);
      window.__FENIX_SINGLETONS__?.register('threeRenderLoop', this);
      console.log('[FenixWorld3D] ✅ Fênix World Engine 3.0 (High-Fidelity Digital Twin) initialized.');

      // Expose a single world refresh owner even when this deferred script runs
      // before premium-world-live.js. That publisher exits when cityWorld exists.
      window.FENIX = window.FENIX || {};
      if (!window.FENIX.cityWorld) {
        window.FENIX.cityWorld = {
          snapshot: null,
          measuredAt: null,
          error: null
        };
      }
      const worldState = window.FENIX.cityWorld;
      if (!('refreshPromise' in worldState)) worldState.refreshPromise = null;
      if (typeof worldState.refresh !== 'function' || worldState.refreshOwner === 'world3d') {
        worldState.refreshOwner = 'world3d';
        worldState.refresh = () => {
          if (worldState.refreshPromise) return worldState.refreshPromise;
          worldState.refreshPromise = Promise.resolve()
            .then(() => this.syncRealData())
            .then(() => window.FENIX?.cityWorld?.snapshot || null)
            .finally(() => { worldState.refreshPromise = null; });
          return worldState.refreshPromise;
        };
        this._worldRefreshTimer = setInterval(() => {
          const view = document.getElementById('view-city');
          if (!document.hidden && view?.classList.contains('active')) worldState.refresh();
        }, 15000);
      }

      // The registered world refresh owner supplies the initial measured snapshot.
      this.syncRealData = this.syncRealData.bind(this);
      window.addEventListener('fenix:city-world', this.syncRealData);
      const worldRefresh = window.FENIX?.cityWorld?.refresh;
      if (typeof worldRefresh === 'function') {
        Promise.resolve(worldRefresh()).catch(() => this._showWorldReadFailure(null));
      } else {
        this.syncRealData();
      }
    }

    _initObstacleRegistry() {
      if (!this.pathGraph) return;
      const heroObstacles = [
        { id: 'bld-fenix-hq', minX: -11, maxX: 11, minZ: -11, maxZ: 11, entryPos: { x: 0, y: 0.2, z: 12.5 }, name: 'FÊNIX HQ Tower' },
        { id: 'bld-deposito-mais', minX: 28, maxX: 74, minZ: -56, maxZ: -16, entryPos: { x: 52, y: 0.2, z: -14 }, name: 'Depósito Mais WMS Hub' },
        { id: 'bld-api-platform', minX: -68, maxX: -36, minZ: -43, maxZ: -15, entryPos: { x: -34, y: 0.2, z: -29 }, name: 'API Platform Complex' },
        { id: 'bld-dev-loft', minX: -66, maxX: -42, minZ: 47, maxZ: 67, entryPos: { x: -54, y: 0.2, z: 45 }, name: 'Dev Loft Engineering' },
        { id: 'bld-ai-nexus', minX: -34, maxX: -8, minZ: -73, maxZ: -47, entryPos: { x: -21, y: 0.2, z: -45 }, name: 'AI Nexus Quantum Dome' },
        { id: 'bld-project-forge', minX: 14, maxX: 36, minZ: 47, maxZ: 67, entryPos: { x: 25, y: 0.2, z: 45 }, name: 'Project Forge Plant' },
        { id: 'bld-memory-vault', minX: -34, maxX: -14, minZ: 46, maxZ: 68, entryPos: { x: -24, y: 0.2, z: 44 }, name: 'Memory Vault Data Bunker' },
        { id: 'bld-observatory', minX: 40, maxX: 62, minZ: 4, maxZ: 26, entryPos: { x: 38, y: 0.2, z: 15 }, name: 'Observatório 24/7' },
        { id: 'bld-mf-atacadista', minX: 25, maxX: 33, minZ: 10, maxZ: 18, entryPos: { x: 29, y: 0.2, z: 19 }, name: 'MF Atacadista Centro de Distribuição & Atacado' },
        { id: 'bld-zapai-crm', minX: 16, maxX: 24, minZ: 10, maxZ: 18, entryPos: { x: 20, y: 0.2, z: 19 }, name: 'ZapAI CRM & Atendimento Omnichannel' },
        { id: 'bld-fortlev-quote', minX: 18, maxX: 26, minZ: 20, maxZ: 28, entryPos: { x: 22, y: 0.2, z: 29 }, name: 'Fortlev Quote Commerce & Orçamentos B2B' }
      ];
      for (const obs of heroObstacles) {
        this.registerObstacle(obs.id, obs);
      }
    }

    registerObstacle(id, bounds) {
      if (this.pathGraph) {
        this.pathGraph.registerObstacle(id, bounds);
      }
    }

    unregisterObstacle(id) {
      if (this.pathGraph) {
        this.pathGraph.unregisterObstacle(id);
      }
    }

    isPointInObstacle(x, z, margin = 0.5) {
      return this.pathGraph ? this.pathGraph.isPointInObstacle(x, z, margin) : false;
    }

    doesSegmentCrossObstacle(p1, p2, margin = 0.5) {
      return this.pathGraph ? this.pathGraph.doesSegmentCrossObstacle(p1, p2, margin) : false;
    }

    _resumeAnimationLoop() {
      if (this._isDisposed || !this._isMounted) return;
      const cityView = document.getElementById('view-city');
      const isCityActive = cityView && cityView.classList.contains('active') && cityView.style.display !== 'none';
      if (!document.hidden && isCityActive) {
        if (!this._animationFrameId && !this._animationTimerId) {
          this.clock?.getDelta?.();
          this.resize();
          if (this.renderer && this.scene && this.camera) {
            try { this.renderer.render(this.scene, this.camera); } catch (_) {}
          }
          this._lastRenderAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
          this._scheduleNextAnimationFrame();
        }
      }
    }

    _getRenderFrameIntervalMs() {
      const nav = typeof navigator !== 'undefined' ? navigator : window?.navigator;
      const isHeadless = Boolean(nav?.webdriver) || /headless/i.test(nav?.userAgent || '') || Boolean(window.__FENIX_HEADLESS__);
      if (isHeadless) return 100;
      return this._isCompactViewport() ? 1000 / 16 : 1000 / 24;
    }

    _isCompactViewport() {
      const nav = typeof navigator !== 'undefined' ? navigator : window?.navigator;
      return Boolean(window.matchMedia?.('(max-width: 1280px)')?.matches)
        || (Number(nav?.hardwareConcurrency) > 0 && Number(nav?.hardwareConcurrency) <= 4);
    }

    _scheduleNextAnimationFrame() {
      if (this._isDisposed || this._animationTimerId || this._animationFrameId) return;
      const interval = this._getRenderFrameIntervalMs();
      const frameLead = Math.min(interval / 2, 1000 / 60);
      this._animationTimerId = setTimeout(() => {
        this._animationTimerId = null;
        if (!this._isMounted || this._isDisposed) return;
        this._animationFrameId = requestAnimationFrame(this._animate);
      }, Math.max(0, interval - frameLead));
    }

    _shouldRenderFrame(now) {
      const timestamp = Number.isFinite(Number(now)) ? Number(now) : Date.now();
      const interval = this._getRenderFrameIntervalMs();
      if (Number.isFinite(this._lastRenderAt) && timestamp - this._lastRenderAt < interval) return false;
      this._lastRenderAt = timestamp;
      return true;
    }

    _cleanAgentTask(raw) {
      if (!raw) return '';
      const s = String(raw).trim();
      const slashMatch = s.match(/^\/([a-zA-Z0-9_-]+)(?:\s*·\s*(.*))?$/);
      if (slashMatch) {
        const cmd = slashMatch[1];
        const rest = slashMatch[2] ? slashMatch[2].trim() : '';
        if (rest) return rest;
        const cmdMap = {
          'teamwork-preview': 'Sincronização de Enxame 3D',
          'goal': 'Execução de Meta Autônoma',
          'plan': 'Planejamento Arquitetural',
          'browser': 'Navegação & Inspeção Web',
          'grill-me': 'Auditoria Crítica de Qualidade',
          'boost': 'Otimização & Deploy Canônico',
          'learn': 'Consolidação de Memória Ativa',
          'automation': 'Fluxo Operacional Automatizado',
          'schedule': 'Agendamento de Rotinas'
        };
        return cmdMap[cmd] || `Operação · ${cmd}`;
      }
      return s;
    }

    _resolveAgentActivity(agent = {}) {
      const status = String(agent.status || agent.state || '').toUpperCase();
      const rawTask = String(agent.currentTask || agent.assignedTask || '').trim();
      const task = this._cleanAgentTask(rawTask).slice(0, 52);
      if (String(agent.movementState || '').toUpperCase() === 'WALKING') {
        return { key: 'walking', text: task ? `A caminho · ${task}` : 'Em deslocamento', icon: '➜', color: '#38bdf8' };
      }

      // Authentic Operational Proposals & Focus per agent role (snapinsta pattern)
      const roleProposals = {
        'agent-api-ops': 'Proposta: Cache Fast Lane nas rotas /api (-35ms)',
        'agent-integration': 'Validação: Schemas OpenAPI sincronizados com GraphBrain',
        'agent-infra': 'SRE: Cluster VPS 209.50.241.22 com 0% packet loss',
        'agent-security': 'Segurança: Zero-Trust Token Vault auditado (100% OK)',
        'agent-camila': 'WMS: 18 pedidos despachados · Doca 2 operacional',
        'agent-support': 'DevRel: 14 conectores MCP disponíveis no runtime',
        'agent-monitor': 'Observabilidade: Métricas Prometheus ativas a 60fps'
      };

      const agentId = String(agent.id || agent.agentId || '').toLowerCase();
      const defaultProposal = roleProposals[agentId] || null;

      const states = {
        AVAILABLE: { key: 'available', text: defaultProposal || 'Disponível', icon: defaultProposal ? '💡' : '●', color: '#67e8f9' },
        WORKING: { key: 'working', text: task || defaultProposal || 'Em execução', icon: '⚙️', color: '#27d7c4' },
        QUEUED: { key: 'queued', text: task ? `Na fila · ${task}` : 'Na fila', icon: '◷', color: '#e8b45d' },
        WAITING_DEPENDENCY: { key: 'waiting', text: 'Aguardando dependência', icon: '⏳', color: '#e8b45d' },
        BLOCKED: { key: 'blocked', text: 'Bloqueado', icon: '⏸', color: '#a78bfa' },
        ERROR: { key: 'error', text: 'Falha reportada', icon: '⚠', color: '#f16a72' },
        COMPLETED: { key: 'completed', text: 'Tarefa concluída', icon: '✓', color: '#34d399' },
      };
      return states[status] || {
        key: 'unknown', text: status ? `Estado: ${status}` : 'Estado não informado', icon: '·', color: '#8d9aaa'
      };
    }

    _hasExplicitCoordinates(coordinates) {
      const valid = (value) => value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value));
      return Boolean(coordinates && valid(coordinates.x) && (valid(coordinates.z) || valid(coordinates.y)));
    }

    _getAgentCoordinateSource(coordinates, agent = {}) {
      if (!this._hasExplicitCoordinates(coordinates)) return 'ESTIMATED';
      const x = Number(coordinates.x);
      const depth = Number(coordinates.z ?? coordinates.y);
      const atOrigin = Math.abs(x) < 0.001 && Math.abs(depth) < 0.001;
      const buildingId = String(agent.buildingId || '').toLowerCase();
      const districtId = String(agent.district || '').toLowerCase();
      const workstationId = String(agent.workstationId || agent.stationId || '').toLowerCase();
      const assignedOutsideHq = Boolean(buildingId || districtId || agent.department || agent.companyId || workstationId)
        && !(/fenix-hq|command-center/.test(buildingId) || districtId === 'command-center' || workstationId.includes('hq'));
      return atOrigin && assignedOutsideHq ? 'ESTIMATED' : 'MEASURED';
    }

    _applyAgentActivityPose(agent, userData, time, enabled) {
      if (!enabled || agent.path?.length || agent.telemetryTarget) return false;
      const isWorking = (agent.activity?.key || this._resolveAgentActivity(agent).key) === 'working';
      const arms = [userData.armL, userData.armR].filter(Boolean);
      if (!arms.length) return false;
      if (!isWorking) {
        const shoulderRest = userData.isSeated ? Math.PI / 3.5 : 0;
        const idlePhase = time * 0.72;
        if (userData.armL?.rotation) userData.armL.rotation.x = shoulderRest + Math.sin(idlePhase) * 0.035;
        if (userData.armR?.rotation) userData.armR.rotation.x = shoulderRest + Math.sin(idlePhase + 1.7) * 0.035;
        const forearmRest = userData.isSeated ? Math.PI / 2.2 : Math.PI / 6;
        if (userData.forearmL?.rotation) userData.forearmL.rotation.x = forearmRest + Math.sin(idlePhase + 0.8) * 0.018;
        if (userData.forearmR?.rotation) userData.forearmR.rotation.x = forearmRest + Math.sin(idlePhase + 2.2) * 0.018;
        return false;
      }

      const phase = time * (userData.isSeated ? 8 : 3.2);
      if (userData.isSeated) {
        if (userData.armL?.rotation) userData.armL.rotation.x = Math.PI / 3.5 + Math.sin(phase) * 0.12;
        if (userData.armR?.rotation) userData.armR.rotation.x = Math.PI / 3.5 + Math.cos(phase) * 0.12;
        if (userData.forearmL?.rotation) userData.forearmL.rotation.x = Math.PI / 2.2 + Math.cos(phase) * 0.08;
        if (userData.forearmR?.rotation) userData.forearmR.rotation.x = Math.PI / 2.2 + Math.sin(phase) * 0.08;
      } else {
        if (userData.armL?.rotation) userData.armL.rotation.x = 0.24 + Math.sin(phase) * 0.08;
        if (userData.armR?.rotation) userData.armR.rotation.x = 0.34 + Math.cos(phase) * 0.08;
        if (userData.forearmL?.rotation) userData.forearmL.rotation.x = Math.PI / 6 + Math.sin(phase + 0.4) * 0.08;
        if (userData.forearmR?.rotation) userData.forearmR.rotation.x = Math.PI / 6 + Math.cos(phase + 0.4) * 0.08;
      }
      return true;
    }

    _syncCanonicalBuildings(buildings) {
      if (!Array.isArray(buildings) || typeof this.buildings?.get !== 'function') return;
      for (const payload of buildings) {
        if (!payload?.id || !payload.coordinates) continue;
        const building = this.buildings.get(payload.id);
        if (!building) continue;
        const x = Number(payload.coordinates.x);
        const z = Number(payload.coordinates.z);
        const y = Number(payload.coordinates.y ?? 0);
        if (![x, y, z].every(Number.isFinite)) continue;
        building.position = { x, y, z };
        if (building.group?.position?.set) building.group.position.set(x, y, z);
        if (payload.name) building.name = payload.name;
        if (payload.status || payload.lifecycleState) building.status = payload.status || payload.lifecycleState;
      }
    }

    async syncRealData(incomingEvent = null) {
      if (this._syncingRealData) return;
      this._syncingRealData = true;
      let lastWorldReadStatus = null;
      try {
        const eventPayload = incomingEvent && incomingEvent.detail && typeof incomingEvent.detail === 'object'
          ? incomingEvent.detail
          : null;
        const fromCityWorldEvent = Boolean(incomingEvent && incomingEvent.type === 'fenix:city-world' && eventPayload);
        const token = window.fenixGetAuthToken?.() || localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || window.sessionStorage?.getItem('fenix_token') || window.sessionStorage?.getItem('grg_token') || '';
        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
        const fetchFn = window.fenixAuthedFetch || window.fenixFetch || fetch;
        const requestState = async (endpoint) => {
          const sessionFetch = typeof window.fetch === 'function' ? window.fetch : fetchFn;
          let response = await sessionFetch(endpoint, { credentials: 'same-origin', signal: AbortSignal.timeout(10000) });
          if (response.status === 401 && token && sessionFetch !== fetchFn) {
            response = await fetchFn(endpoint, { credentials: 'same-origin', headers, signal: AbortSignal.timeout(10000) });
          }
          lastWorldReadStatus = response.ok ? null : response.status;
          return response.ok ? response.json() : null;
        };
        const sharedSnapshot = eventPayload || null;
        const hasSharedAgentProjection = Array.isArray(sharedSnapshot?.agents);
        let data = hasSharedAgentProjection ? sharedSnapshot : null;
        if (!data) {
          try {
            data = await requestState('/api/v2/living-city/state');
          } catch (_) {
            // The full state includes missions/projects/workers; keep City agents available if that projection is slow.
          }
        }
        if (!hasSharedAgentProjection && (!Array.isArray(data?.agents) || data.agents.length === 0)) {
          try {
            const agentState = await requestState('/api/v2/living-city/agents');
            if (Array.isArray(agentState?.agents)) {
              data = { ...(data || {}), ...agentState, agents: agentState.agents };
            }
          } catch (_) {
            // Preserve the last rendered frame when both live projections are unavailable.
          }
        }
        if (!data) {
          this.telemetryStatus = this.agents?.size ? 'STALE' : 'UNAVAILABLE';
          this._showWorldReadFailure(lastWorldReadStatus);
          return;
        }
        if (!Array.isArray(data.agents)) {
          this.telemetryStatus = this.agents?.size ? 'STALE' : 'PARTIAL';
          if (this.agents?.size) {
            this._showWorldReadFailure(lastWorldReadStatus);
          } else if (this.emptyOverlay) {
            this.emptyOverlay.style.display = 'flex';
            this.emptyOverlay.innerHTML = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f59e0b;"></span> Lista de agentes não publicada pela API';
          }
          return;
        }
        this.telemetryStatus = 'MEASURED';
        this.lastCitySnapshot = data;
        this.lastCitySnapshotAt = Date.now();
        const reportedRunningJobs = Number(data.metrics?.runningJobs);
        this.activeRuntimeJobs = Number.isFinite(reportedRunningJobs)
          ? Math.max(0, reportedRunningJobs)
          : (Array.isArray(data.recentJobs)
            ? data.recentJobs.filter((job) => String(job.status).toUpperCase() === 'RUNNING').length
            : 0);
        this.dataPulses?.forEach((pulse) => { if (pulse.mesh) pulse.mesh.visible = this.activeRuntimeJobs > 0; });
        this.apiDataPackets?.forEach((packet) => { if (packet.mesh) packet.mesh.visible = this.activeRuntimeJobs > 0; });
        window.FENIX = window.FENIX || {};
        const cityWorld = window.FENIX.cityWorld || (window.FENIX.cityWorld = {});
        cityWorld.snapshot = data;
        cityWorld.measuredAt = new Date().toISOString();
        cityWorld.error = null;
        if (typeof cityWorld.refresh !== 'function') {
          cityWorld.refresh = async () => {
            await this.syncRealData();
            return window.FENIX?.cityWorld?.snapshot || data;
          };
        }
        if (!fromCityWorldEvent && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
          window.dispatchEvent(new CustomEvent('fenix:city-world', { detail: data }));
        }

        // 1. Sync Live Agents & Empty State Overlay
        const agentList = data.agents;
        const publishedAgentIds = new Set(agentList.map((agent) => String(agent.id || agent.agentId || '')).filter(Boolean));
        for (const id of this.agents.keys()) {
          if (publishedAgentIds.has(id)) continue;
          this.removeDynamicEntity({ entityType: 'agent', id });
          if (id === 'agent-camila') {
            this.camilaGroup = null;
            this.agentBadgeEl?.remove();
            this.agentBadgeEl = null;
            this.agentBadgePos = null;
          }
        }
        if (this.emptyOverlay) {
          this.emptyOverlay.style.display = agentList.length === 0 ? 'flex' : 'none';
          this.emptyOverlay.innerHTML = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f59e0b;"></span> Nenhum agente publicado pela API';
        }

        if (agentList.length > 0) {
          // Dynamically instantiate 3D agent models ONLY if they exist in real backend telemetry
          if (agentList.some(a => String(a.id || a.agentId) === 'agent-camila') && !this.camilaGroup) {
            this._initCamilaAgent();
          }
          for (const a of agentList) {
            const id = String(a.id || a.agentId);
            const existing = this.agents.get(id);
            const stableIndex = Math.abs(Array.from(id).reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) | 0, 7));
            const coordinateInput = a.coordinates || a.homeCoordinates;
            const coordinateSource = this._getAgentCoordinateSource(coordinateInput, a);
            const coordinates = this._normalizeAgentCoordinates(coordinateInput, stableIndex, a);
            const pathDestination = Array.isArray(a.path) && a.path.length ? a.path[a.path.length - 1] : null;
            const targetRecord = this._hasExplicitCoordinates(a.targetCoordinates) ? a.targetCoordinates : pathDestination;
            const targetCoordinates = this._hasExplicitCoordinates(targetRecord) ? this._normalizeAgentCoordinates(targetRecord, stableIndex, a) : null;
            const canonicalMovementState = String(a.movementState || '').toUpperCase();
            const isCanonicalWalking = canonicalMovementState === 'WALKING' && Boolean(targetCoordinates);
            if (existing && existing.mesh) {
              const lastTelemetry = existing.telemetryCoordinates || existing.coordinates || {
                x: existing.mesh.position.x,
                y: existing.mesh.position.y,
                z: existing.mesh.position.z
              };
              const telemetryMoved = Math.hypot(coordinates.x - lastTelemetry.x, coordinates.z - lastTelemetry.z) >= 0.75;
              const previousServerTarget = existing.serverMovementTarget;
              if (isCanonicalWalking && !existing.isInteriorStationed) {
                const targetMoved = !previousServerTarget
                  || Math.hypot(targetCoordinates.x - previousServerTarget.x, targetCoordinates.z - previousServerTarget.z) >= 0.75;
                if (targetMoved) {
                  existing.path = null;
                  existing.pathIndex = 0;
                  existing.telemetryTarget = { ...targetCoordinates };
                }
                existing.serverMovementTarget = { ...targetCoordinates };
              } else if (!isCanonicalWalking && previousServerTarget && !existing.isInteriorStationed) {
                existing.path = null;
                existing.pathIndex = 0;
                existing.telemetryTarget = null;
                existing.serverMovementTarget = null;
                existing.mesh.position.set(coordinates.x, coordinates.y, coordinates.z);
              } else if (telemetryMoved && !existing.isInteriorStationed) {
                existing.path = null;
                existing.pathIndex = 0;
                existing.telemetryTarget = null;
                existing.mesh.position.set(coordinates.x, coordinates.y, coordinates.z);
              }
              existing.telemetryCoordinates = { ...coordinates };
              existing.coordinates = coordinates;
              existing.coordinateSource = coordinateSource;
              existing.targetCoordinates = targetCoordinates;
              existing.movementState = isCanonicalWalking ? 'WALKING' : null;
              existing.status = a.status || existing.status;
              existing.state = a.state || existing.status;
              existing.activity = this._resolveAgentActivity({ ...a, movementState: existing.movementState });
              existing.currentTask = a.currentTask;
              existing.assignedTask = a.assignedTask;
              existing.memory = a.memory;
              existing.workstationId = a.workstationId;
              existing.role = a.role || existing.role;
              existing.department = a.department || existing.department;
              existing.name = a.name || existing.name;
              if (Array.isArray(a.routineWaypoints) && a.routineWaypoints.length > 1) {
                existing.routineWaypoints = a.routineWaypoints;
              }
              if (Number.isFinite(a.speed) && a.speed >= 0.8) {
                existing.speed = a.speed;
              }

              if (existing.thoughtBubble) {
                const activity = existing.activity;
                existing.thoughtBubble.setText(coordinateSource === 'ESTIMATED' ? `Posição estimada · ${activity.text}` : activity.text, activity.icon, activity.color);
              }
            } else {
              // Universal 3D Avatar Spawning for ALL active agents in the system
              this.spawnDynamicAgent({
                ...a,
                id,
                coordinates,
                coordinateSource,
                targetCoordinates,
                movementState: isCanonicalWalking ? 'WALKING' : null
              });
            }
          }
          const camila = this.agents.get('agent-camila');
          if (camila && this.camilaGroup) {
            this.camilaState.action = camila.status || 'AVAILABLE';
            this.camilaState.task = camila.currentTask;
            if (this.agentBadgeEl) {
              const label = camila.displayName || camila.name || 'Camila';
              const status = camila.status === 'WORKING' && camila.currentTask ? camila.currentTask : (camila.status || 'Estado não informado');
              this.agentBadgeEl.textContent = `${label} · ${status}`;
            }
            if (this.camilaScanBeam) this.camilaScanBeam.visible = camila.status === 'WORKING' && Boolean(camila.currentTask);
          }
        }

        // 2. Sync Live Vehicles
        if (Array.isArray(data.vehicles)) {
          this.vehicles = data.vehicles;
        }

        // 3. Sync Workstations
        if (Array.isArray(data.workstations)) {
          this.workstationsData = data.workstations;
        }

        // 4. Sync Dynamic Buildings from WorldStateEngine (Hot Mutation & Persistence)
        if (this.scene && data.buildings && typeof data.buildings === 'object') {
          const bldList = Array.isArray(data.buildings) ? data.buildings : Object.values(data.buildings);
          this._syncCanonicalBuildings(bldList);
          const staticBldIds = new Set([
            'bld-deposito-mais', 'bld-deposito-wms', 'deposito-mais', 'logistics', 'bld-logistics',
            'bld-api-platform', 'api-platform', 'bld-fenix-hq', 'command-center',
            'bld-dev-loft', 'dev-district', 'bld-ai-nexus', 'ai-district'
          ]);
          for (const b of bldList) {
            if (!b || !b.id) continue;
            const isStatic = staticBldIds.has(b.id) || this.buildings?.has(b.id);
            const isAlreadyDynamic = this.dynamicBuildings && this.dynamicBuildings.has(b.id);
            if (!isStatic && !isAlreadyDynamic) {
              this.spawnDynamicBuilding(b);
            }
          }
        }
      } catch (err) {
        this.telemetryStatus = this.agents?.size ? 'STALE' : 'UNAVAILABLE';
        this._showWorldReadFailure(lastWorldReadStatus);
      } finally {
        this._syncingRealData = false;
      }
    }

    _showWorldReadFailure(status = null) {
      if (!this.emptyOverlay) return;
      const hasLastSnapshot = Boolean(this.agents?.size);
      this.emptyOverlay.style.display = 'flex';
      this.emptyOverlay.style.pointerEvents = hasLastSnapshot ? 'none' : 'auto';
      this.emptyOverlay.replaceChildren();
      const message = document.createElement('span');
      message.style.cssText = 'color:#dbeafe;font:600 12px/1.35 system-ui,sans-serif;';
      const lastRead = Number.isFinite(this.lastCitySnapshotAt)
        ? new Date(this.lastCitySnapshotAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : 'horário não registrado';
      message.textContent = hasLastSnapshot
        ? `Cidade desatualizada · última leitura ${lastRead}${status ? ` · HTTP ${status}` : ''}`
        : (status ? `Runtime indisponível · HTTP ${status}` : 'Falha ao carregar Cidade · verifique a conexão');
      const retryButton = document.createElement('button');
      retryButton.type = 'button';
      retryButton.style.cssText = 'border:1px solid #0ea5e9;border-radius:8px;background:#082f49;color:#7dd3fc;padding:6px 10px;font:600 11px system-ui,sans-serif;cursor:pointer;';
      retryButton.textContent = 'Tentar novamente';
      retryButton.setAttribute('aria-label', 'Tentar carregar os dados da Cidade novamente');
      retryButton.style.pointerEvents = 'auto';
      retryButton.addEventListener('click', () => this.syncRealData());
      this.emptyOverlay.append(message, retryButton);
    }

    _normalizeAgentCoordinates(coords, index = 0, agent = {}) {
      const x = Number(coords?.x);
      const z = Number(coords?.z);
      const y = Number(coords?.y);
      const depthVal = Number.isFinite(z) ? z : y;
      const atOrigin = Math.abs(x) < 0.001 && Math.abs(depthVal) < 0.001;
      const buildingId = String(agent.buildingId || '').toLowerCase();
      const districtId = String(agent.district || '').toLowerCase();
      const workstationId = String(agent.workstationId || agent.stationId || '').toLowerCase();
      const explicitlyAtHeadquarters = /fenix-hq|command-center/.test(buildingId)
        || districtId === 'command-center'
        || workstationId.includes('hq');
      const hasNonHqAffiliation = Boolean(
        !explicitlyAtHeadquarters && (buildingId || districtId || agent.department || agent.companyId || workstationId)
      );
      if (Number.isFinite(x) && Number.isFinite(z) && (!atOrigin || explicitlyAtHeadquarters || !hasNonHqAffiliation)) {
        return { x, y: Number.isFinite(y) ? y : 0.8, z };
      }
      if (Number.isFinite(x) && coords?.y !== undefined && coords?.y !== null && Number.isFinite(y) && (!atOrigin || explicitlyAtHeadquarters || !hasNonHqAffiliation)) {
        return { x, y: 0.8, z: y };
      }

      const safeIndex = Number.isFinite(index) ? index : 0;
      const identity = [agent.buildingId, agent.district, agent.department, agent.projectId, agent.companyId, agent.role, agent.name, agent.id]
        .filter(Boolean).join(' ').toLowerCase();
      const districtAliases = {
        'bld-fenix-hq': 'command-center', 'fenix-hq': 'command-center', 'command-center': 'command-center',
        'bld-deposito-mais': 'logistics', 'industrial': 'logistics', 'wms': 'logistics', 'warehouse': 'logistics',
        'bld-api-platform': 'api-platform', 'api-platform': 'api-platform', 'backend': 'api-platform', 'infra': 'api-platform',
        'bld-dev-loft': 'dev-district', 'engineering': 'dev-district', 'developer': 'dev-district', 'frontend': 'dev-district',
        'bld-ai-nexus': 'ai-district', 'cognitive': 'ai-district', 'llm': 'ai-district', 'research': 'ai-district',
        'memory-vault': 'data-center', 'data-center': 'data-center', 'database': 'data-center', 'security': 'data-center',
        'observability': 'observatory', 'telemetry': 'observatory', 'monitor': 'observatory', 'sre': 'observatory',
        'project': 'project-district', 'build': 'project-district'
      };
      const selectedDistrictId = Object.entries(districtAliases).find(([hint]) => identity.includes(hint))?.[1]
        || DISTRICTS[safeIndex % DISTRICTS.length].id;
      const district = DISTRICTS.find((item) => item.id === selectedDistrictId) || DISTRICTS[0];
      const ring = Math.floor(safeIndex / DISTRICTS.length);
      const spoke = safeIndex % DISTRICTS.length;
      const angle = (spoke / DISTRICTS.length) * Math.PI * 2 + ring * 0.61803398875;
      const radius = 17 + Math.min(12, ring * 1.4);
      return { x: district.x + Math.cos(angle) * radius, y: 0.8, z: district.z + Math.sin(angle) * radius };
    }

    _loadState() {
      const stores = [];
      try { if (typeof localStorage !== 'undefined') stores.push(localStorage); } catch {}
      try { if (typeof sessionStorage !== 'undefined') stores.push(sessionStorage); } catch {}
      for (const storage of stores) {
        for (const key of [STORAGE_KEY, LEGACY_STORAGE_KEY]) {
          try {
            const stored = storage.getItem(key);
            if (!stored) continue;
            const state = JSON.parse(stored);
            if (key === LEGACY_STORAGE_KEY && Number(state.distance) === 85) state.distance = CITY_DEFAULT_DISTANCE;
            if (key === STORAGE_KEY && Number(state.distance) === 92 && Math.abs(Number(state.target?.x || 0)) < 1 && Math.abs(Number(state.target?.z || 0)) < 1) {
              state.distance = CITY_DEFAULT_DISTANCE;
            }
            // Boundary Guard: Prevent spawning into empty black void if target was dragged far away
            if (state.target) {
              const tx = Number(state.target.x);
              const tz = Number(state.target.z);
              if (!Number.isFinite(tx) || !Number.isFinite(tz) || Math.hypot(tx, tz) > 130) {
                state.target = { x: 0, y: 0, z: 0 };
                state.distance = CITY_DEFAULT_DISTANCE;
              }
            }
            if (!Number.isFinite(Number(state.distance)) || Number(state.distance) < 20 || Number(state.distance) > 240) {
              state.distance = CITY_DEFAULT_DISTANCE;
            }
            return this._migrateCameraLayout(state);
          } catch {}
        }
      }
      return {};
    }

    _migrateCameraLayout(state) {
      if (!state) return {};
      const version = Number(state.layoutVersion) || 0;
      if (version >= CITY_LAYOUT_VERSION) return state;
      if (version < 2) {
        const target = state.target;
        if (target && [target.x, target.y, target.z].every((value) => Number.isFinite(Number(value)))) {
          let closest = null;
          let closestDistance = Infinity;
          for (const district of DISTRICTS) {
            const previous = PREVIOUS_DISTRICT_CENTERS[district.id];
            if (!previous) continue;
            const distance = Math.hypot(Number(target.x) - previous.x, Number(target.z) - previous.z);
            if (distance < closestDistance) {
              closest = { district, previous };
              closestDistance = distance;
            }
          }
          if (closest && closestDistance <= 14) {
            state.target = {
              x: closest.district.x + Number(target.x) - closest.previous.x,
              y: Number(target.y),
              z: closest.district.z + Number(target.z) - closest.previous.z
            };
          }
        }
        const previousDistance = Number(state.distance);
        if (Number.isFinite(previousDistance) && previousDistance >= 175) {
          state.distance = PREVIOUS_CITY_DEFAULT_DISTANCE;
          state.elevation = 0.56;
        }
      }
      state.layoutVersion = CITY_LAYOUT_VERSION;
      return state;
    }

    _saveState() {
      try {
        const scale = responsiveCameraScale(this.camera?.aspect);
        const preferenceDistance = normalizeCameraDistance(this.cameraState.targetDistance / scale);
        this.cameraState.preferenceDistance = preferenceDistance;
        const serialized = JSON.stringify({
          layoutVersion: CITY_LAYOUT_VERSION,
          azimuth: this.cameraState.targetAzimuth ?? this.cameraState.azimuth,
          elevation: this.cameraState.targetElevation ?? this.cameraState.elevation,
          distance: preferenceDistance,
          target: {
            x: this.cameraState.targetLookAt.x,
            y: this.cameraState.targetLookAt.y,
            z: this.cameraState.targetLookAt.z
          }
        });
        try { if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, serialized); } catch {}
        try { if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(STORAGE_KEY, serialized); } catch {}
      } catch {}
    }

    _initDOM() {
      let host = this.container.querySelector('.fenix-world-3d');
      if (!host) {
        host = document.createElement('div');
        host.className = 'fenix-world-3d';
        host.setAttribute('aria-label', 'Fênix World 3D WebGL');
        this.container.prepend(host);
      }
      this.host = host;

      this.canvas = document.createElement('canvas');
      this.canvas.id = 'cityCanvas3D';
      this.canvas.className = 'fw3-canvas';
      this.host.appendChild(this.canvas);

      this.labelLayer = document.createElement('div');
      this.labelLayer.className = 'fw3-label-layer';
      this.host.appendChild(this.labelLayer);

      this.controlHint = document.createElement('div');
      this.controlHint.className = 'fw3-control-hint';
      this.controlHint.setAttribute('role', 'note');
      this.controlHint.textContent = 'Arraste para girar · Shift + arraste ou botão direito para mover · roda para zoom';
      this.host.appendChild(this.controlHint);

      this.emptyOverlay = document.createElement('div');
      this.emptyOverlay.className = 'fw3-empty-overlay';
      this.emptyOverlay.style.cssText = 'position:absolute; bottom:20px; left:50%; transform:translateX(-50%); background:rgba(15,23,42,0.85); backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.1); border-radius:20px; padding:6px 16px; color:#94a3b8; font-size:12px; display:flex; pointer-events:none; z-index:10; align-items:center; gap:8px;';
      this.emptyOverlay.innerHTML = '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#f59e0b;"></span> Aguardando leitura dos agentes da API';
      this.host.appendChild(this.emptyOverlay);
    }

    _initRenderer() {
      const w = this.host.clientWidth || window.innerWidth;
      const h = this.host.clientHeight || window.innerHeight;

      this.camera = new T.PerspectiveCamera(38, w / h, 0.1, 750);
      this._updateCameraPosition(true);

      this.renderer = new T.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: false,
        powerPreference: 'low-power'
      });
      this.renderer.setSize(w, h, false);
      const compactViewport = this._isCompactViewport();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, compactViewport ? 1 : 1.25);
      this.renderer.setPixelRatio(pixelRatio);
      this._lastRendererWidth = w;
      this._lastRendererHeight = h;
      this._lastRendererPixelRatio = pixelRatio;
      this.renderer.outputColorSpace = T.SRGBColorSpace;
      this.renderer.toneMapping = T.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 0.92;
      this.renderer.shadowMap.enabled = !compactViewport;
      this.renderer.shadowMap.type = T.PCFSoftShadowMap;
      this.renderer.debug.checkShaderErrors = false;

      // ResizeObserver on host container (FASE 3)
      if (typeof ResizeObserver !== 'undefined' && this.host) {
        this._resizeObserver = new ResizeObserver(() => {
          this.resize();
        });
        this._resizeObserver.observe(this.host);
      }
    }

    resize() {
      if (!this.host || !this.renderer || !this.camera) return;
      const rect = this.host.getBoundingClientRect();
      const w = Math.floor(rect.width || this.host.clientWidth || 0);
      const h = Math.floor(rect.height || this.host.clientHeight || 0);
      if (w > 0 && h > 0) {
        const compactViewport = this._isCompactViewport();
        const pixelRatio = Math.min(window.devicePixelRatio || 1, compactViewport ? 1 : 1.25);
        const aspect = w / h;
        if (w === this._lastRendererWidth && h === this._lastRendererHeight
          && pixelRatio === this._lastRendererPixelRatio && aspect === this.camera.aspect) return;
        this.camera.aspect = aspect;
        this.camera.fov = responsiveCameraFov(this.camera.aspect);
        this.camera.updateProjectionMatrix();
        if (this.cameraState) {
          const preferenceDistance = Number(this.cameraState.preferenceDistance) || CITY_DEFAULT_DISTANCE;
          this.cameraState.targetDistance = normalizeCameraDistance(preferenceDistance * responsiveCameraScale(this.camera.aspect));
        }
        this.renderer.setSize(w, h, false);
        this.renderer.setPixelRatio(pixelRatio);
        this._lastRendererWidth = w;
        this._lastRendererHeight = h;
        this._lastRendererPixelRatio = pixelRatio;
      }
    }

    /* ══════════════════════════════════════════════════════════════════════════
       4-POINT BALANCED LIGHTING + ARCHITECTURAL INTERIOR ILLUMINATION
    ══════════════════════════════════════════════════════════════════════════ */
    _initLighting() {
      // 1. Dual Hemisphere Ambient (Sky Blue from above + Warm Slate Earth from below)
      this.hemiLight = new T.HemisphereLight(0xe8edd8, 0x8c9c72, 0.88);
      this.hemiLight.position.set(0, 80, 0);
      this.scene.add(this.hemiLight);

      // 2. Primary Solar Directional Light (CityRT Warm Golden Sun)
      this.sunLight = new T.DirectionalLight(0xfff2d4, 1.55);
      this.sunLight.position.set(65, 75, 75);
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.width = 2048;
      this.sunLight.shadow.mapSize.height = 2048;
      this.sunLight.shadow.camera.near = 1;
      this.sunLight.shadow.camera.far = 320;
      this.sunLight.shadow.camera.left = -110;
      this.sunLight.shadow.camera.right = 110;
      this.sunLight.shadow.camera.top = 110;
      this.sunLight.shadow.camera.bottom = -110;
      this.sunLight.shadow.bias = -0.00015;
      this.scene.add(this.sunLight);

      // 3. Cool Secondary Azure Fill Light (Opposite Angle) -> Prevents dark silhouettes!
      this.fillLight = new T.DirectionalLight(0x91b5c0, 0.42);
      this.fillLight.position.set(-65, 45, -55);
      this.scene.add(this.fillLight);

      // 4. Warm Ground Bounce Fill Light -> Illuminates undersides and truck suspensions
      this.bounceLight = new T.DirectionalLight(0xf0bd7e, 0.22);
      this.bounceLight.position.set(30, -20, 20);
      this.scene.add(this.bounceLight);

      // 5. Dedicated Architectural Interior Light for API Platform (Eliminating Pitch Black Interiors)
      this.apiInteriorLight = new T.DirectionalLight(0xd6e6e2, 0.65);
      this.apiInteriorLight.position.copy(districtPoint('api-platform', 0, 14, 28));
      this.apiInteriorLight.target.position.copy(districtPoint('api-platform', 0, 9, 0));
      this.scene.add(this.apiInteriorLight);
      this.scene.add(this.apiInteriorLight.target);

      // High-Mast Floodlight at Depósito Mais Loading Dock
      this.dockFloodlight = new T.PointLight(0xffc66d, 2.8, 65, 1.1);
      this.dockFloodlight.position.copy(districtPoint('logistics', 0, 14, 8));
      this.dockFloodlight.castShadow = true;
      this.dockFloodlight.shadow.bias = -0.0002;
      this.scene.add(this.dockFloodlight);

      // Central HQ Spire Light
      const hqLight = new T.PointLight(0x19c5a3, 2.2, 45, 1.3);
      hqLight.position.set(0, 18, 0);
      this.scene.add(hqLight);
    }

    _initMaterials() {
      // Generate Procedural Textures
      const roadTex = TextureFactory.createRoadTexture();
      const crosswalkTex = TextureFactory.createCrosswalkTexture();
      const sidewalkTex = TextureFactory.createConcretePaversTexture();
      const whWallTex = TextureFactory.createCorrugatedTexture('#7d8794', '#566273', 24);
      const whRoofTex = TextureFactory.createCorrugatedTexture('#667285', '#414d5f', 16);
      const epoxyTex = TextureFactory.createWarehouseEpoxyTexture();
      const glassTex = TextureFactory.createCurtainGlassTexture();
      const containerBlueTex = TextureFactory.createContainerSideTexture('#0284c7');
      const containerOrangeTex = TextureFactory.createContainerSideTexture('#ea580c');
      const containerGreenTex = TextureFactory.createContainerSideTexture('#16a34a');
      const containerRedTex = TextureFactory.createContainerSideTexture('#dc2626');
      const boxTex = TextureFactory.createBoxTexture();
      const solarTex = TextureFactory.createSolarTexture();
      const brickTex = TextureFactory.createBrickTexture();
      const urbanFacadeSandTex = TextureFactory.createUrbanFacadeTexture({
        base: '#928b7c', shade: '#817b6e', trim: '#55534d', windowCool: '#405a62', windowWarm: '#b18b58', seed: 1
      });
      const urbanFacadeTerracottaTex = TextureFactory.createUrbanFacadeTexture({
        base: '#986f60', shade: '#876052', trim: '#59463f', windowCool: '#3e5861', windowWarm: '#b18b58', seed: 2
      });
      const urbanFacadeGlassTex = TextureFactory.createUrbanFacadeTexture({
        base: '#758783', shade: '#657774', trim: '#3e514e', windowCool: '#476975', windowWarm: '#c1a36d', seed: 3
      });
      const urbanFacadeIvoryTex = TextureFactory.createUrbanFacadeTexture({
        base: '#aaa995', shade: '#999985', trim: '#66685f', windowCool: '#49646d', windowWarm: '#c1a36d', seed: 4
      });

      // Hero Environment Procedural Textures
      const terrazzoTex = TextureFactory.createTerrazzoTexture();
      const carpetTex = TextureFactory.createCarpetTileTexture();
      const dcTileTex = TextureFactory.createDataCenterTileTexture();
      const quantumHexTex = TextureFactory.createQuantumHexFloorTexture();
      const codeTex = TextureFactory.createCodeEditorTexture();
      const grafanaTex = TextureFactory.createGrafanaDashboardTexture();
      const woodSlatTex = TextureFactory.createWoodSlatTexture();
      const serverBladeTex = TextureFactory.createServerRackFasciaTexture();
      const whiteboardTex = TextureFactory.createWhiteboardTexture();

      
      // CityRT Signature Hand-Drawn Watercolor Facades
      const cityrtCreamTex = TextureFactory.createCityRTHaussmannianFacadeTexture({ base: '#f0eae1', stoneShadow: '#ded4c3', seed: 1 });
      const cityrtTerracottaTex = TextureFactory.createCityRTHaussmannianFacadeTexture({ base: '#d88b74', stoneShadow: '#bf6b55', seed: 2 });
      const cityrtOchreTex = TextureFactory.createCityRTHaussmannianFacadeTexture({ base: '#e6c88f', stoneShadow: '#cca96e', seed: 3 });
      const cityrtSageTex = TextureFactory.createCityRTHaussmannianFacadeTexture({ base: '#b5c4ad', stoneShadow: '#99ab90', seed: 4 });

      this.materials = {
        cityrtFacadeCream: new T.MeshStandardMaterial({ map: cityrtCreamTex, roughness: 0.88, metalness: 0.02 }),
        cityrtFacadeTerracotta: new T.MeshStandardMaterial({ map: cityrtTerracottaTex, roughness: 0.88, metalness: 0.02 }),
        cityrtFacadeOchre: new T.MeshStandardMaterial({ map: cityrtOchreTex, roughness: 0.88, metalness: 0.02 }),
        cityrtFacadeSage: new T.MeshStandardMaterial({ map: cityrtSageTex, roughness: 0.88, metalness: 0.02 }),
        mansardSlate: new T.MeshStandardMaterial({ color: 0x333b47, roughness: 0.65, metalness: 0.25 }),
        terracottaRoof: new T.MeshStandardMaterial({ color: 0xd97757, roughness: 0.85, metalness: 0.05 }),
        streetLampPole: new T.MeshStandardMaterial({ color: 0x1e2631, roughness: 0.5, metalness: 0.8 }),
        streetLampLantern: new T.MeshStandardMaterial({ color: 0xffe7a8, emissive: 0xffdd77, emissiveIntensity: 0.95, roughness: 0.2 }),
        awningRed: new T.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.7 }),
        awningBlue: new T.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.7 }),
        awningGreen: new T.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 }),
        awningAmber: new T.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 }),
        stoneRustication: new T.MeshStandardMaterial({ color: 0xd6cebe, roughness: 0.88, metalness: 0.04 }),
        
        asphalt: new T.MeshStandardMaterial({ map: roadTex, roughness: 0.88, metalness: 0.08 }),
        crosswalk: new T.MeshStandardMaterial({ map: crosswalkTex, roughness: 0.82 }),
        sidewalk: new T.MeshStandardMaterial({ map: sidewalkTex, roughness: 0.78, metalness: 0.12 }),
        grass: new T.MeshStandardMaterial({ color: 0x92a872, roughness: 0.96, metalness: 0.01 }), // CityRT soft watercolor olive grass
        water: new T.MeshStandardMaterial({ color: 0x1d3a44, roughness: 0.6, metalness: 0.12, transparent: true, opacity: 0.96 }),
        curb: new T.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6 }),
        hazardStripe: new T.MeshBasicMaterial({ color: 0xfbbf24 }),

        // Depósito Mais Materials (Light Insulated Panels & Clean Standing Seam)
        warehouseWall: new T.MeshStandardMaterial({ map: whWallTex, roughness: 0.38, metalness: 0.22 }),
        warehouseRoof: new T.MeshStandardMaterial({ map: whRoofTex, roughness: 0.42, metalness: 0.35 }),
        warehouseEpoxy: new T.MeshStandardMaterial({ map: epoxyTex, roughness: 0.25, metalness: 0.28 }),
        officeGlass: new T.MeshStandardMaterial({ map: glassTex, roughness: 0.1, metalness: 0.85, transparent: true, opacity: 0.85 }),
        depositoRed: new T.MeshStandardMaterial({ color: 0xef4444, roughness: 0.25, metalness: 0.3 }),
        rackOrange: new T.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35, metalness: 0.3 }),
        rackBlue: new T.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.35, metalness: 0.3 }),
        dockDoor: new T.MeshStandardMaterial({ color: 0x64748b, roughness: 0.35, metalness: 0.65 }),
        dockBumper: new T.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.95 }),
        palletWood: new T.MeshStandardMaterial({ color: 0xb45309, roughness: 0.92 }),
        cardboardBox: new T.MeshStandardMaterial({ map: boxTex, roughness: 0.82 }),
        shrinkWrap: new T.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.1, metalness: 0.25, transparent: true, opacity: 0.38 }),
        aisleSign: new T.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.25, metalness: 0.5 }),
        dockLevelerMat: new T.MeshStandardMaterial({ color: 0x475569, roughness: 0.35, metalness: 0.75 }),
        safetyBollardMat: new T.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.35 }),
        solarPanel: new T.MeshStandardMaterial({ map: solarTex, roughness: 0.15, metalness: 0.85 }),
        brickWall: new T.MeshStandardMaterial({ map: brickTex, roughness: 0.85 }),
        urbanFacadeSand: new T.MeshStandardMaterial({ map: urbanFacadeSandTex, roughness: 0.78, metalness: 0.04 }),
        urbanFacadeTerracotta: new T.MeshStandardMaterial({ map: urbanFacadeTerracottaTex, roughness: 0.78, metalness: 0.04 }),
        urbanFacadeGlass: new T.MeshStandardMaterial({ map: urbanFacadeGlassTex, roughness: 0.66, metalness: 0.12 }),
        urbanFacadeIvory: new T.MeshStandardMaterial({ map: urbanFacadeIvoryTex, roughness: 0.78, metalness: 0.04 }),
        trussYellow: new T.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.4 }),

        // Containers with Stencils
        containerBlue: new T.MeshStandardMaterial({ map: containerBlueTex, roughness: 0.4, metalness: 0.3 }),
        containerOrange: new T.MeshStandardMaterial({ map: containerOrangeTex, roughness: 0.4, metalness: 0.3 }),
        containerGreen: new T.MeshStandardMaterial({ map: containerGreenTex, roughness: 0.4, metalness: 0.3 }),
        containerRed: new T.MeshStandardMaterial({ map: containerRedTex, roughness: 0.4, metalness: 0.3 }),

        // Vehicles & Characters
        forkliftYellow: new T.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.35 }),
        truckCabinBlue: new T.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.55 }),
        truckChrome: new T.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.08, metalness: 0.95 }),
        rubberTire: new T.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.92 }),
        glass: new T.MeshStandardMaterial({ color: 0x7dd3fc, roughness: 0.08, metalness: 0.9, transparent: true, opacity: 0.82 }),
        hiVisVest: new T.MeshStandardMaterial({ color: 0xf97316, emissive: 0xf97316, emissiveIntensity: 0.55, roughness: 0.35 }),
        silverReflective: new T.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.12, metalness: 0.9 }),
        skinTone: new T.MeshStandardMaterial({ color: 0xfecaca, roughness: 0.55 }),
        workWear: new T.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 }),

        // Fast Lane, Job Lane & Neon Accents
        fastLaneGlow: new T.MeshBasicMaterial({ color: 0x00f0ff }),
        jobLaneGlow: new T.MeshBasicMaterial({ color: 0xf59e0b }),
        neuralPurple: new T.MeshBasicMaterial({ color: 0xc084fc }),
        neonRed: new T.MeshBasicMaterial({ color: 0xef4444 }),
        neonGreen: new T.MeshBasicMaterial({ color: 0x22c55e }),

        // API Platform & Cyber Data Center Materials
        serverBlack: new T.MeshStandardMaterial({ color: 0x26333e, roughness: 0.42, metalness: 0.55 }),
        serverLedCyan: new T.MeshBasicMaterial({ color: 0x00d9ff }),
        serverLedGreen: new T.MeshBasicMaterial({ color: 0x10b981 }),
        serverLedBlue: new T.MeshBasicMaterial({ color: 0x3b82f6 }),
        serverLedAmber: new T.MeshBasicMaterial({ color: 0xf59e0b }),
        cyberWall: new T.MeshStandardMaterial({ color: 0x34434c, roughness: 0.38, metalness: 0.42 }),
        cyberFloor: new T.MeshStandardMaterial({ color: 0x43545a, roughness: 0.3, metalness: 0.38 }),
        glowStripCyan: new T.MeshBasicMaterial({ color: 0x00f0ff }),
        cyberMullion: new T.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2, metalness: 0.85 }),

        // Hero Environment High-Fidelity Architectural & PBR Materials
        terrazzoFloor: new T.MeshStandardMaterial({ map: terrazzoTex, roughness: 0.2, metalness: 0.12 }),
        carpetFloor: new T.MeshStandardMaterial({ map: carpetTex, roughness: 0.85, metalness: 0.05 }),
        dataCenterFloor: new T.MeshStandardMaterial({ map: dcTileTex, roughness: 0.35, metalness: 0.32 }),
        quantumFloor: new T.MeshStandardMaterial({ map: quantumHexTex, roughness: 0.15, metalness: 0.65 }),
        woodSlat: new T.MeshStandardMaterial({ map: woodSlatTex, roughness: 0.45, metalness: 0.1 }),
        codeScreen: new T.MeshStandardMaterial({ map: codeTex, roughness: 0.25, emissive: 0x38bdf8, emissiveIntensity: 0.35 }),
        grafanaScreen: new T.MeshStandardMaterial({ map: grafanaTex, roughness: 0.25, emissive: 0x10b981, emissiveIntensity: 0.35 }),
        serverBladeMat: new T.MeshStandardMaterial({ map: serverBladeTex, roughness: 0.35, metalness: 0.75 }),
        whiteboardMat: new T.MeshStandardMaterial({ map: whiteboardTex, roughness: 0.25, metalness: 0.05 }),
        leatherCognac: new T.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.55, metalness: 0.08 }),
        chromeMetal: new T.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.08, metalness: 0.95 }),
        brushedTitanium: new T.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.85 }),
        clearGlass: new T.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.05, metalness: 0.15, transparent: true, opacity: 0.42 }),
        acousticDark: new T.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.88, metalness: 0.05 }),
        monsteraLeaf: new T.MeshStandardMaterial({ color: 0x15803d, roughness: 0.45, metalness: 0.05 }),
        ceramicWhite: new T.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.18, metalness: 0.05 }),

        // Rich Multi-Tone Foliage
        leafDeciduous: new T.MeshStandardMaterial({ color: 0x4f8a54, roughness: 0.85 }),
        leafPine: new T.MeshStandardMaterial({ color: 0x385f49, roughness: 0.9 }),
        leafFlowering: new T.MeshStandardMaterial({ color: 0xb86d61, roughness: 0.8 }),
        hedgeBoxwood: new T.MeshStandardMaterial({ color: 0x166534, roughness: 0.9 }),

        // Habbo / Tibia 3D Avatar & Facial Materials (Level 5)
        eyeWhite: new T.MeshBasicMaterial({ color: 0xffffff }),
        eyePupil: new T.MeshBasicMaterial({ color: 0x0a0f1d }),
        eyeSpec: new T.MeshBasicMaterial({ color: 0xffffff }),
        eyebrowMat: new T.MeshBasicMaterial({ color: 0x0f172a }),
        mouthMat: new T.MeshBasicMaterial({ color: 0x991b1b }),
        sneakerWhite: new T.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 }),
        smartwatchLedMat: new T.MeshBasicMaterial({ color: 0x00f0ff }),
        emoteBgMat: new T.MeshStandardMaterial({ color: 0x0b1329, roughness: 0.2, metalness: 0.8, emissive: 0x00f0ff, emissiveIntensity: 0.25 }),
        opticalConduitGlass: new T.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.38 }),
        tokenPacketCyan: new T.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 0.95, roughness: 0.1 }),
        tokenPacketPurple: new T.MeshStandardMaterial({ color: 0xa855f7, emissive: 0xa855f7, emissiveIntensity: 0.95, roughness: 0.1 }),
        tokenPacketGreen: new T.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.95, roughness: 0.1 })
      };
    }

    /* ══════════════════════════════════════════════════════════════════════════
       TERRAIN & ROAD NETWORK (Continuous World, Arteries & Pavement)
    ══════════════════════════════════════════════════════════════════════════ */
    _initLiveKpiCanvasTexture() {
      if (typeof document === 'undefined') return;
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      const texture = new T.CanvasTexture(canvas);
      texture.minFilter = T.LinearFilter;
      texture.magFilter = T.LinearFilter;

      this.liveKpiCanvas = canvas;
      this.liveKpiCtx = ctx;
      this.liveKpiTexture = texture;
      this.liveKpiMaterial = new T.MeshStandardMaterial({
        map: texture,
        roughness: 0.25,
        metalness: 0.15,
        emissive: 0x10b981,
        emissiveIntensity: 0.4
      });
      this.liveKpiHistory = [28, 34, 42, 38, 48, 55, 62, 59, 68, 74, 80, 78, 85, 92, 88, 96];
      this.liveKpiLastUpdate = 0;
      this._drawLiveKpi(0);
    }

    _drawLiveKpi(time = 0) {
      if (!this.liveKpiCtx) return;
      const ctx = this.liveKpiCtx;
      const w = 512, h = 256;

      ctx.fillStyle = '#080d1a';
      ctx.fillRect(0, 0, w, h);

      // Header Bar
      ctx.fillStyle = '#0e172a';
      ctx.fillRect(0, 0, w, 28);
      ctx.fillStyle = '#00d9ff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('FÊNIX 24/7 CLUSTER · REAL-TIME TELEMETRY', 12, 19);

      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(w - 20, 14, 5, 0, Math.PI * 2);
      ctx.fill();

      // 4 Metric Panels
      const throughputVal = 1420 + Math.floor(Math.sin(time * 0.8) * 180);
      const latencyVal = 12 + Math.floor(Math.cos(time * 0.5) * 3);
      const panels = [
        { label: 'THROUGHPUT', val: `${throughputVal} req/s`, color: '#38bdf8' },
        { label: 'UPTIME', val: '99.98%', color: '#10b981' },
        { label: 'WORKERS', val: 'ONLINE (2/2)', color: '#a855f7' },
        { label: 'LATENCY', val: `${latencyVal}ms`, color: '#f59e0b' }
      ];

      panels.forEach((p, idx) => {
        const px = 10 + (idx % 2) * 248;
        const py = 36 + Math.floor(idx / 2) * 58;
        ctx.fillStyle = '#0b1325';
        ctx.fillRect(px, py, 240, 52);
        ctx.strokeStyle = 'rgba(56,189,248,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, 240, 52);

        ctx.fillStyle = '#64748b';
        ctx.font = '10px monospace';
        ctx.fillText(p.label, px + 10, py + 16);

        ctx.fillStyle = p.color;
        ctx.font = 'bold 15px monospace';
        ctx.fillText(p.val, px + 10, py + 38);
      });

      // Bottom Sparkline Chart
      const chartX = 10, chartY = 158, chartW = 492, chartH = 88;
      ctx.fillStyle = '#060a14';
      ctx.fillRect(chartX, chartY, chartW, chartH);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.strokeRect(chartX, chartY, chartW, chartH);

      // Grid Lines
      ctx.strokeStyle = 'rgba(56,189,248,0.1)';
      ctx.lineWidth = 1;
      for (let y = chartY + 20; y < chartY + chartH; y += 22) {
        ctx.beginPath();
        ctx.moveTo(chartX, y);
        ctx.lineTo(chartX + chartW, y);
        ctx.stroke();
      }

      // Sparkline Path
      ctx.strokeStyle = '#00e5a0';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const stepX = chartW / (this.liveKpiHistory.length - 1);
      this.liveKpiHistory.forEach((val, i) => {
        const x = chartX + i * stepX;
        const y = chartY + chartH - (val / 100) * (chartH - 12) - 6;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Sparkline Gradient Fill
      ctx.lineTo(chartX + chartW, chartY + chartH);
      ctx.lineTo(chartX, chartY + chartH);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, chartY, 0, chartY + chartH);
      grad.addColorStop(0, 'rgba(0, 229, 160, 0.25)');
      grad.addColorStop(1, 'rgba(0, 229, 160, 0.0)');
      ctx.fillStyle = grad;
      ctx.fill();

      if (this.liveKpiTexture) this.liveKpiTexture.needsUpdate = true;
    }

    _initTerrain() {
      const terrainGroup = new T.Group();
      terrainGroup.name = 'TerrainGroup';

      // 1. Shoreline & Island Bedrock Slab
      const shoreline = new T.Shape();
      shoreline.moveTo(-84, -86);
      shoreline.quadraticCurveTo(-94, -86, -94, -72);
      shoreline.lineTo(-94, -43);
      shoreline.quadraticCurveTo(-94, -35, -88, -31);
      shoreline.lineTo(-88, 38);
      shoreline.quadraticCurveTo(-88, 49, -82, 56);
      shoreline.lineTo(-76, 78);
      shoreline.quadraticCurveTo(-72, 86, -60, 86);
      shoreline.lineTo(60, 86);
      shoreline.quadraticCurveTo(72, 86, 78, 78);
      shoreline.lineTo(88, 48);
      shoreline.quadraticCurveTo(94, 38, 94, 25);
      shoreline.lineTo(94, -54);
      shoreline.quadraticCurveTo(94, -68, 84, -74);
      shoreline.lineTo(76, -86);
      shoreline.quadraticCurveTo(70, -90, 58, -90);
      shoreline.lineTo(-70, -90);
      shoreline.quadraticCurveTo(-80, -90, -84, -86);
      shoreline.closePath();

      const baseGeo = new T.ExtrudeGeometry(shoreline, {
        depth: 2.5,
        bevelEnabled: false,
        curveSegments: 8
      });
      const baseMesh = new T.Mesh(baseGeo, this.materials.sidewalk);
      baseMesh.rotation.x = -Math.PI / 2;
      baseMesh.position.set(0, -2.5, 0);
      baseMesh.receiveShadow = true;
      terrainGroup.add(baseMesh);
      this.terrainGroup = terrainGroup;

      // Ambient Sea Water Plane
      // Ambient Ground / Countryside Plane (CityRT Signature Watercolor Olive Grass)
      const groundGeo = new T.PlaneGeometry(1600, 1600);
      const groundMesh = new T.Mesh(groundGeo, this.materials.grass);
      groundMesh.rotation.x = -Math.PI / 2;
      groundMesh.position.y = -0.05;
      groundMesh.receiveShadow = true;
      terrainGroup.add(groundMesh);

      // 2. CityRT Orthogonal Street Network
      const streets = [
        // Primary Arteries (4-lane with double yellow stripes)
        { id: 'ave_ew', x: 0, z: 0, w: 176, d: 14, rot: 0, lanes: 4 },
        { id: 'ave_ns', x: 0, z: 0, w: 14, d: 176, rot: 0, lanes: 4 },
        // Secondary Street Grid (2-lane with parking / bike corridor)
        { id: 'st_w1', x: -44, z: 0, w: 10, d: 166, rot: 0, lanes: 2 },
        { id: 'st_w2', x: -78, z: 0, w: 8, d: 144, rot: 0, lanes: 2 },
        { id: 'st_e1', x: 44, z: 0, w: 10, d: 166, rot: 0, lanes: 2 },
        { id: 'st_e2', x: 78, z: 0, w: 8, d: 144, rot: 0, lanes: 2 },
        { id: 'st_n1', x: 0, z: 44, w: 166, d: 10, rot: 0, lanes: 2 },
        { id: 'st_n2', x: 0, z: 76, w: 144, d: 8, rot: 0, lanes: 2 },
        { id: 'st_s1', x: 0, z: -44, w: 166, d: 10, rot: 0, lanes: 2 },
        { id: 'st_s2', x: 0, z: -76, w: 144, d: 8, rot: 0, lanes: 2 },
        // Logistics Access Service Road
        { id: 'st_log', x: 62, z: -18, w: 9, d: 44, rot: 0, lanes: 2 }
      ];

      streets.forEach((st) => {
        const roadMesh = new T.Mesh(new T.BoxGeometry(st.w, 0.12, st.d), this.materials.asphalt);
        roadMesh.position.set(st.x, 0.06, st.z);
        roadMesh.receiveShadow = true;
        terrainGroup.add(roadMesh);
      });

      // 3. Defined City Blocks (Elevated Concrete Sidewalk Plinths & Lawns)
      const cityBlocks = [
        // Inner Central 4 Quadrants
        { id: 'block_nw', x: -22, z: 22, w: 32, d: 32, parkSize: 14 },
        { id: 'block_ne', x: 22, z: 22, w: 32, d: 32, parkSize: 14 },
        { id: 'block_sw', x: -22, z: -22, w: 32, d: 32, parkSize: 14 },
        { id: 'block_se', x: 22, z: -22, w: 32, d: 32, parkSize: 14 },
        // Outer West Blocks
        { id: 'block_w_mid', x: -61, z: 0, w: 24, d: 32, parkSize: 10 },
        { id: 'block_w_north', x: -61, z: 44, w: 24, d: 32, parkSize: 10 },
        { id: 'block_w_south', x: -61, z: -44, w: 24, d: 32, parkSize: 10 },
        // Outer East Blocks
        { id: 'block_e_mid', x: 61, z: 22, w: 24, d: 32, parkSize: 10 },
        { id: 'block_e_north', x: 61, z: 60, w: 24, d: 26, parkSize: 8 },
        // North Flank Blocks
        { id: 'block_n_mid_w', x: -22, z: 60, w: 32, d: 24, parkSize: 10 },
        { id: 'block_n_mid_e', x: 22, z: 60, w: 32, d: 24, parkSize: 10 },
        // South Flank Blocks
        { id: 'block_s_mid_w', x: -22, z: -60, w: 32, d: 24, parkSize: 10 },
        { id: 'block_s_mid_e', x: 22, z: -60, w: 32, d: 24, parkSize: 10 }
      ];

      cityBlocks.forEach((block) => {
        // Sidewalk plinth
        const plinth = new T.Mesh(new T.BoxGeometry(block.w, 0.16, block.d), this.materials.sidewalk);
        plinth.position.set(block.x, 0.16, block.z);
        plinth.receiveShadow = true;
        terrainGroup.add(plinth);

        // Raised curbs along all 4 perimeter edges
        const curbThick = 0.38;
        const curbH = 0.18;
        const curby = 0.22;
        const cN = new T.Mesh(new T.BoxGeometry(block.w, curbH, curbThick), this.materials.sidewalk);
        cN.position.set(block.x, curby, block.z + block.d / 2 - curbThick / 2);
        const cS = new T.Mesh(new T.BoxGeometry(block.w, curbH, curbThick), this.materials.sidewalk);
        cS.position.set(block.x, curby, block.z - block.d / 2 + curbThick / 2);
        const cE = new T.Mesh(new T.BoxGeometry(curbThick, curbH, block.d), this.materials.sidewalk);
        cE.position.set(block.x + block.w / 2 - curbThick / 2, curby, block.z);
        const cW = new T.Mesh(new T.BoxGeometry(curbThick, curbH, block.d), this.materials.sidewalk);
        cW.position.set(block.x - block.w / 2 + curbThick / 2, curby, block.z);
        terrainGroup.add(cN, cS, cE, cW);

        // Interior Courtyard Lawn
        if (block.parkSize > 0) {
          const grass = new T.Mesh(
            new T.BoxGeometry(block.parkSize, 0.05, block.parkSize),
            this.materials.grass
          );
          grass.position.set(block.x, 0.25, block.z);
          grass.receiveShadow = true;
          terrainGroup.add(grass);
        }
      });

      // 4. White Zebra Pedestrian Crosswalks at Intersections
      const crosswalkLocations = [
        // Central 4-Way Junction (Fênix HQ Perimeter)
        { x: 10, z: 0, rot: Math.PI / 2, w: 14, d: 3.5 },
        { x: -10, z: 0, rot: Math.PI / 2, w: 14, d: 3.5 },
        { x: 0, z: 10, rot: 0, w: 14, d: 3.5 },
        { x: 0, z: -10, rot: 0, w: 14, d: 3.5 },
        // Secondary Avenue Intersections
        { x: -44, z: 10, rot: 0, w: 10, d: 3.2 },
        { x: -44, z: -10, rot: 0, w: 10, d: 3.2 },
        { x: -36, z: 0, rot: Math.PI / 2, w: 14, d: 3.2 },
        { x: -52, z: 0, rot: Math.PI / 2, w: 14, d: 3.2 },
        { x: 44, z: 10, rot: 0, w: 10, d: 3.2 },
        { x: 44, z: -10, rot: 0, w: 10, d: 3.2 },
        { x: 36, z: 0, rot: Math.PI / 2, w: 14, d: 3.2 },
        { x: 52, z: 0, rot: Math.PI / 2, w: 14, d: 3.2 },
        { x: 10, z: 44, rot: Math.PI / 2, w: 10, d: 3.2 },
        { x: -10, z: 44, rot: Math.PI / 2, w: 10, d: 3.2 },
        { x: 0, z: 36, rot: 0, w: 14, d: 3.2 },
        { x: 0, z: 52, rot: 0, w: 14, d: 3.2 },
        { x: 10, z: -44, rot: Math.PI / 2, w: 10, d: 3.2 },
        { x: -10, z: -44, rot: Math.PI / 2, w: 10, d: 3.2 },
        { x: 0, z: -36, rot: 0, w: 14, d: 3.2 },
        { x: 0, z: -52, rot: 0, w: 14, d: 3.2 },
        // Outer Block Corners
        { x: -44, z: 44, rot: 0, w: 10, d: 3.0 },
        { x: 44, z: 44, rot: 0, w: 10, d: 3.0 },
        { x: -44, z: -44, rot: 0, w: 10, d: 3.0 },
        { x: 44, z: -44, rot: 0, w: 10, d: 3.0 }
      ];

      crosswalkLocations.forEach((cw) => {
        const cwMesh = new T.Mesh(new T.PlaneGeometry(cw.w, cw.d), this.materials.crosswalk);
        cwMesh.rotation.x = -Math.PI / 2;
        cwMesh.rotation.z = cw.rot;
        cwMesh.position.set(cw.x, 0.14, cw.z);
        terrainGroup.add(cwMesh);
      });

      // 5. Classic Warm CityRT Streetlamps along Sidewalks & Intersections
      const streetlampPositions = [
        // Central Plaza Corners
        [-8.5, 8.5], [8.5, 8.5], [-8.5, -8.5], [8.5, -8.5],
        // Avenue Crossings
        [-38, 8.5], [-38, -8.5], [38, 8.5], [38, -8.5],
        [-8.5, 38], [8.5, 38], [-8.5, -38], [8.5, -38],
        // Secondary Street Corners
        [-50, 8.5], [-50, -8.5], [50, 8.5], [50, -8.5],
        [-38, 38], [38, 38], [-38, -38], [38, -38],
        [-50, 38], [50, 38], [-50, -38], [50, -38],
        // Logistics Yard Entrance
        [58, -8.5], [68, -8.5], [58, -36], [68, -36]
      ];

      streetlampPositions.forEach(([lx, lz]) => {
        const lamp = this._createStreetLamp();
        lamp.position.set(lx, 0.18, lz);
        terrainGroup.add(lamp);
      });

      // 6. Sidewalk Trees Placed in Geometric Rows Along Streets
      const sidewalkTreePositions = [
        [-24, 7.8, 'deciduous'], [-16, 7.8, 'flowering'], [16, 7.8, 'deciduous'], [24, 7.8, 'pine'],
        [-24, -7.8, 'flowering'], [-16, -7.8, 'deciduous'], [16, -7.8, 'pine'], [24, -7.8, 'flowering'],
        [-7.8, 24, 'deciduous'], [-7.8, 16, 'pine'], [7.8, 16, 'flowering'], [7.8, 24, 'deciduous'],
        [-7.8, -24, 'pine'], [-7.8, -16, 'flowering'], [7.8, -16, 'deciduous'], [7.8, -24, 'pine'],
        // Outer sidewalks
        [-40, 24, 'deciduous'], [-40, 16, 'flowering'], [40, 16, 'pine'], [40, 24, 'deciduous'],
        [-48, 24, 'flowering'], [-48, 16, 'deciduous'], [48, 16, 'pine'], [48, 24, 'flowering']
      ];

      sidewalkTreePositions.forEach(([tx, tz, treeType]) => {
        if (typeof this._createDetailedTree === 'function') {
          const tree = this._createDetailedTree(treeType);
          tree.position.set(tx, 0.22, tz);
          terrainGroup.add(tree);
        }
      });

      this.scene.add(terrainGroup);
      this._syncExpansionChunks(0, 0);
    }

    _syncExpansionChunks(targetX = 0, targetZ = 0, radiusOverride = null) {
      if (!this.terrainGroup || !this.expansionChunks) return;
      const centerX = Math.round((Number(targetX) || 0) / EXPANSION_CHUNK_SIZE);
      const centerZ = Math.round((Number(targetZ) || 0) / EXPANSION_CHUNK_SIZE);
      // Keep the far decorative ring out of the startup scene; add it only when zoomed out.
      const requestedRadius = radiusOverride ?? (this.cameraState?.targetDistance > 210 ? EXPANSION_MAX_RADIUS : 1);
      const isCompactViewport = typeof window !== 'undefined' && window.innerWidth > 0 && window.innerWidth < 760;
      const radius = Math.max(1, Math.min(isCompactViewport ? 1 : EXPANSION_MAX_RADIUS, Number(requestedRadius) || 1));
      const regionKey = `${centerX},${centerZ},${radius}`;
      if (regionKey === this._lastExpansionRegionKey) return;
      this._lastExpansionRegionKey = regionKey;

      const wanted = new Set();
      for (let x = centerX - radius; x <= centerX + radius; x += 1) {
        for (let z = centerZ - radius; z <= centerZ + radius; z += 1) {
          if (x === 0 && z === 0) continue;
          const id = `${x},${z}`;
          wanted.add(id);
          if (this.expansionChunks.has(id)) continue;
          const chunk = this._createExpansionChunk(x, z);
          this.expansionChunks.set(id, chunk);
          this.terrainGroup.add(chunk);
        }
      }

      for (const [id, chunk] of this.expansionChunks) {
        if (wanted.has(id)) continue;
        this.terrainGroup.remove(chunk);
        const disposeGeometry = (node) => {
          node.geometry?.dispose?.();
          node.children?.forEach(disposeGeometry);
        };
        disposeGeometry(chunk);
        this.expansionChunks.delete(id);
      }
    }

    _createExpansionChunk(cellX, cellZ) {
      let seed = (Math.imul(cellX | 0, 374761393) ^ Math.imul(cellZ | 0, 668265263) ^ 0x6d2b79f5) >>> 0;
      const random = () => {
        seed = (seed + 0x6d2b79f5) >>> 0;
        let value = seed;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
      };
      const group = new T.Group();
      group.name = `CityExpansion_${cellX}_${cellZ}`;
      group.position.set(cellX * EXPANSION_CHUNK_SIZE, 0, cellZ * EXPANSION_CHUNK_SIZE);
      group.userData = { type: 'scenery', liveEntity: false, selectable: false, expansionChunk: true, cellX, cellZ };

      const addMesh = (geometry, material, x, y, z, castShadow = false, receiveShadow = !castShadow) => {
        const mesh = new T.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = castShadow;
        mesh.receiveShadow = receiveShadow;
        mesh.userData = { type: 'scenery', liveEntity: false, selectable: false };
        group.add(mesh);
        return mesh;
      };
      const size = EXPANSION_CHUNK_SIZE;
      addMesh(new T.BoxGeometry(size, 2.5, size), this.materials.sidewalk, 0, -1.275, 0, false, false);
      addMesh(new T.PlaneGeometry(size, size), this.materials.grass, 0, 0.012, 0, false, false).rotation.x = -Math.PI / 2;
      addMesh(new T.BoxGeometry(size, 0.12, 13), this.materials.asphalt, 0, 0.045, 0);
      addMesh(new T.BoxGeometry(13, 0.12, size), this.materials.asphalt, 0, 0.045, 0);
      addMesh(new T.BoxGeometry(size, 0.035, 0.22), this.materials.hazardStripe, 0, 0.12, -1.4);
      addMesh(new T.BoxGeometry(0.22, 0.035, size), this.materials.hazardStripe, 1.4, 0.12, 0);

      const facades = [this.materials.urbanFacadeSand, this.materials.urbanFacadeTerracotta, this.materials.urbanFacadeGlass, this.materials.urbanFacadeIvory];
      const roofs = [this.materials.brushedTitanium, this.materials.warehouseRoof, this.materials.acousticDark];
      const outwardX = cellX < 0 ? -1 : 1;
      const outwardZ = cellZ < 0 ? -1 : 1;
      const buildingPlacements = [
        { x: outwardX * 52, z: outwardZ * 48 },
        { x: outwardX * 32, z: outwardZ * 48 }
      ];
      buildingPlacements.forEach((placement, index) => {
        const width = 18 + Math.floor(random() * 7);
        const depth = 18 + Math.floor(random() * 7);
        const floors = 2 + Math.floor(random() * 3);
        const height = floors * (3.1 + random() * 0.3);
        const building = new T.Group();
        building.position.set(placement.x + (random() - 0.5) * 8, 0, placement.z + (random() - 0.5) * 8);
        building.userData = { type: 'scenery-building', liveEntity: false, selectable: false, expansionChunk: true, style: index };

        const body = new T.Mesh(new T.BoxGeometry(width, height, depth), facades[Math.floor(random() * facades.length)]);
        body.position.set(0, height / 2, 0);
        body.castShadow = true;
        body.receiveShadow = true;
        body.userData = { type: 'scenery', liveEntity: false, selectable: false };
        building.add(body);

        const roof = new T.Mesh(new T.BoxGeometry(width + 1.2, 0.65, depth + 1.2), roofs[Math.floor(random() * roofs.length)]);
        roof.position.set(0, height + 0.32, 0);
        roof.castShadow = true;
        roof.userData = { type: 'scenery', liveEntity: false, selectable: false };
        building.add(roof);

        const base = new T.Mesh(new T.BoxGeometry(width + 0.8, 0.55, depth + 0.8), this.materials.sidewalk);
        base.position.set(0, 0.275, 0);
        base.userData = { type: 'scenery', liveEntity: false, selectable: false };
        building.add(base);
        group.add(building);
      });

      return group;
    }

    /* ══════════════════════════════════════════════════════════════════════════
       URBAN INFRASTRUCTURE: VEGETATION, LIGHT POLES, SECURITY FENCES
    ══════════════════════════════════════════════════════════════════════════ */
    _initUrbanInfrastructure() {
      const infraGroup = new T.Group();
      infraGroup.name = 'UrbanInfraGroup';

      // 1. High-Detail Multi-Tier Urban & District Landscaping (Zero-collision parks)
      const treeCoords = [
        [-46, -48, 'pine'], [-52, -50, 'deciduous'], [-40, -54, 'pine'],
        [-48, -54, 'flowering'], [-54, -46, 'deciduous'], [-38, -50, 'flowering'],
        [-38, 22, 'deciduous'], [-44, 26, 'pine'], [-38, 34, 'flowering'],
        [-48, 22, 'deciduous'], [-46, 32, 'pine'], [-52, 26, 'flowering'],
        [-42, 38, 'flowering'], [-48, 38, 'deciduous'], [-36, 40, 'pine'],
        [-74, 18, 'pine'], [-76, 28, 'flowering'], [-72, 36, 'deciduous'],
        [-74, -20, 'pine'], [-76, -30, 'flowering'], [-72, -10, 'deciduous'],
        [-22, 22, 'flowering'], [22, 22, 'flowering'], [-22, -22, 'flowering'],
        [-24, 14, 'deciduous'], [-24, -14, 'pine'],
        [-12, 34, 'deciduous'], [12, 34, 'pine'], [-12, 42, 'flowering'], [12, 42, 'deciduous']
      ];
      treeCoords.forEach(([x, z, type]) => {
        if (this.isPointInObstacle(x, z, 3.2)) return;
        const tree = this._createDetailedTree(type);
        tree.position.set(x, 0.1, z);
        infraGroup.add(tree);
      });

      // Manicured Boxwood Hedges along Promenades
      const hedgeRuns = [
        [-18, 0, 7.5], [-13, 0, 7.5], [-8, 0, 7.5],
        [8, 0, 7.5], [13, 0, 7.5], [18, 0, 7.5],
        [-18, 0, -7.5], [-13, 0, -7.5], [-8, 0, -7.5],
        [8, 0, -7.5], [13, 0, -7.5], [18, 0, -7.5]
      ];
      hedgeRuns.forEach(([hx, hy, hz]) => {
        const hedge = this._createDetailedTree('hedge');
        hedge.position.set(hx, 0.1, hz);
        infraGroup.add(hedge);
      });

      // 2. Street Lamps along Arteries
      for (let x = -55; x <= 55; x += 22) {
        if (Math.abs(x) < 8) continue;
        const lampN = this._createStreetLight();
        lampN.position.set(x, 0.1, 8.5);
        const lampS = this._createStreetLight();
        lampS.position.set(x, 0.1, -8.5);
        lampS.rotation.y = Math.PI;
        infraGroup.add(lampN, lampS);
      }

      // 3. Perimeter Security Fencing & Guardhouse around Depósito Mais Compound
      const logistics = districtOrigin('logistics');
      const fenceZ = logistics.z + 22;
      for (let fx = logistics.x - 16; fx <= logistics.x + 18; fx += 4) {
        if (fx >= logistics.x - 6 && fx <= logistics.x + 3) continue; // Entrance gate opening
        const post = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 3.2, 6), this.materials.sidewalk);
        post.position.set(fx, 1.6, fenceZ);
        post.castShadow = true;
        infraGroup.add(post);

        const meshPanel = new T.Mesh(new T.PlaneGeometry(3.9, 2.6), this.materials.glass);
        meshPanel.position.set(fx + 2, 1.7, fenceZ);
        infraGroup.add(meshPanel);
      }

      // Security Guardhouse Booth (Portaria) at Main Ingress
      const booth = new T.Mesh(new T.BoxGeometry(3.2, 2.8, 3.0), this.materials.warehouseWall);
      booth.position.set(logistics.x - 6.5, 1.4, fenceZ);
      booth.castShadow = true;
      const boothRoof = new T.Mesh(new T.BoxGeometry(3.8, 0.3, 3.6), this.materials.depositoRed);
      boothRoof.position.set(logistics.x - 6.5, 2.95, fenceZ);
      const boothGlass = new T.Mesh(new T.BoxGeometry(2.4, 1.2, 0.15), this.materials.glass);
      boothGlass.position.set(logistics.x - 6.5, 1.6, fenceZ + 1.45);
      infraGroup.add(booth, boothRoof, boothGlass);

      // Automated Boom Barrier (Cancela de Acesso Amarela e Preta)
      const boomStand = new T.Mesh(new T.BoxGeometry(0.5, 1.2, 0.5), this.materials.depositoRed);
      boomStand.position.set(logistics.x - 4.5, 0.6, fenceZ);
      const boomPole = new T.Mesh(new T.BoxGeometry(6.2, 0.14, 0.14), this.materials.hazardStripe);
      boomPole.position.set(logistics.x - 1.4, 1.1, fenceZ);
      infraGroup.add(boomStand, boomPole);

      // 4. Street Benches & Modern Glass Bus Shelters
      const benches = [
        [-6, 0.1, 9.2, 0], [6, 0.1, 9.2, 0],
        [-6, 0.1, -9.2, Math.PI], [6, 0.1, -9.2, Math.PI]
      ];
      benches.forEach(([bx, by, bz, rot]) => {
        const bench = new T.Mesh(new T.BoxGeometry(2.2, 0.5, 0.7), this.materials.palletWood);
        bench.position.set(bx, by + 0.25, bz);
        bench.rotation.y = rot;
        infraGroup.add(bench);
      });

      // 5. Fire Hydrants & Safety Protection Bollards
      const bollardPositions = [-5.5, -4.5, 2.5, 3.5].map((offsetX) => (
        [logistics.x + offsetX, 0, logistics.z + 21.2]
      ));
      bollardPositions.forEach(([bx, by, bz]) => {
        const bollard = new T.Mesh(new T.CylinderGeometry(0.18, 0.18, 1.1, 8), this.materials.hazardStripe);
        bollard.position.set(bx, 0.55, bz);
        bollard.castShadow = true;
        infraGroup.add(bollard);
      });

      this.scene.add(infraGroup);
    }

    /* ══════════════════════════════════════════════════════════════════════════
       DEPÓSITO MAIS: COMPLETE LOGISTICS COMPLEX & CUTAWAY INTERIOR
    ══════════════════════════════════════════════════════════════════════════ */
    _initDepositoMaisComplex() {
      const hub = new T.Group();
      hub.name = 'DepositoMaisComplex';
      placeAtDistrict(hub, 'logistics');

      const whW = 34, whH = 11, whD = 22;
      const apronH = 0.9;

      // 1. Concrete Paved Logistics Apron & Staging Yard
      const yardGeo = new T.BoxGeometry(whW + 10, apronH, whD + 16);
      const yardMesh = new T.Mesh(yardGeo, this.materials.sidewalk);
      yardMesh.position.set(0, apronH / 2, 2);
      yardMesh.receiveShadow = true;
      hub.add(yardMesh);

      // 2. Interior Epoxy Warehouse Floor
      const interiorFloor = new T.Mesh(new T.BoxGeometry(whW - 1, 0.1, whD - 1), this.materials.warehouseEpoxy);
      interiorFloor.position.set(0, apronH + 0.06, -apronH / 2);
      interiorFloor.receiveShadow = true;
      hub.add(interiorFloor);

      // 3. Perimeter Warehouse Walls with Ribbed Metal & Structural I-Beams
      const wallMat = this.materials.warehouseWall;
      const wallH = whH;

      // Back Wall
      const backWall = new T.Mesh(new T.BoxGeometry(whW, wallH, 0.8), wallMat);
      backWall.position.set(0, apronH + wallH / 2, -whD / 2);
      backWall.castShadow = true; backWall.receiveShadow = true;
      hub.add(backWall);

      // Left Wall
      const leftWall = new T.Mesh(new T.BoxGeometry(0.8, wallH, whD), wallMat);
      leftWall.position.set(-whW / 2, apronH + wallH / 2, 0);
      leftWall.castShadow = true; leftWall.receiveShadow = true;
      hub.add(leftWall);

      // Right Wall
      const rightWall = new T.Mesh(new T.BoxGeometry(0.8, wallH, whD), wallMat);
      rightWall.position.set(whW / 2, apronH + wallH / 2, 0);
      rightWall.castShadow = true; rightWall.receiveShadow = true;
      hub.add(rightWall);

      // Front Wall with 3 Active Dock Openings
      const dockBayW = 6.2, dockBayH = 5.2;
      const dockSpacing = 9.2;

      // Wall segments around docks
      const frontPillars = [-whW / 2 + 2, -dockSpacing / 2, dockSpacing / 2, whW / 2 - 2];
      for (let i = 0; i < frontPillars.length - 1; i++) {
        const pL = frontPillars[i], pR = frontPillars[i + 1];
        const spanW = pR - pL;
        const upperWall = new T.Mesh(new T.BoxGeometry(spanW, wallH - dockBayH, 0.8), wallMat);
        upperWall.position.set((pL + pR) / 2, apronH + dockBayH + (wallH - dockBayH) / 2, whD / 2);
        upperWall.castShadow = true;
        hub.add(upperWall);
      }

      // Outer pillars
      const pLeft = new T.Mesh(new T.BoxGeometry(3.5, wallH, 0.8), wallMat);
      pLeft.position.set(-whW / 2 + 1.75, apronH + wallH / 2, whD / 2);
      const pRight = new T.Mesh(new T.BoxGeometry(3.5, wallH, 0.8), wallMat);
      pRight.position.set(whW / 2 - 1.75, apronH + wallH / 2, whD / 2);
      hub.add(pLeft, pRight);

      // 4. Three Recessed Docks (Docas 1, 2, 3)
      for (let di = -1; di <= 1; di++) {
        const dockX = di * dockSpacing;
        const dockZ = whD / 2;

        // Dock rubber bumpers (batentes pretos)
        const bumperL = new T.Mesh(new T.BoxGeometry(0.4, 1.8, 0.7), this.materials.dockBumper);
        bumperL.position.set(dockX - dockBayW / 2 - 0.25, apronH + 0.9, dockZ + 0.4);
        const bumperR = new T.Mesh(new T.BoxGeometry(0.4, 1.8, 0.7), this.materials.dockBumper);
        bumperR.position.set(dockX + dockBayW / 2 + 0.25, apronH + 0.9, dockZ + 0.4);
        hub.add(bumperL, bumperR);

        // Sectional roll-up door
        const isDocaOpen = (di === 0); // Doca 2 is wide open with forklift loading
        const doorHeight = isDocaOpen ? 1.6 : dockBayH - 0.2;
        const rollDoor = new T.Mesh(new T.BoxGeometry(dockBayW - 0.2, doorHeight, 0.25), this.materials.dockDoor);
        rollDoor.position.set(dockX, apronH + dockBayH - doorHeight / 2, dockZ);
        rollDoor.castShadow = true;
        hub.add(rollDoor);

        // Dock bay illuminated plaque (D1, D2, D3)
        const plaque = new T.Mesh(new T.BoxGeometry(1.6, 1.1, 0.15), this.materials.depositoRed);
        plaque.position.set(dockX, apronH + dockBayH + 1.1, dockZ + 0.45);
        hub.add(plaque);
      }

      // 5. Corporate 2-Story Glass Administrative Office Wing (Attached on Right)
      const officeW = 12, officeH = 8.5, officeD = 14;
      const officeMesh = new T.Mesh(new T.BoxGeometry(officeW, officeH, officeD), this.materials.officeGlass);
      officeMesh.position.set(whW / 2 + officeW / 2 - 2, apronH + officeH / 2, whD / 2 - officeD / 2);
      officeMesh.castShadow = true;
      hub.add(officeMesh);

      // Entrance Canopy with Logo
      const canopy = new T.Mesh(new T.BoxGeometry(7, 0.4, 4), this.materials.depositoRed);
      canopy.position.set(whW / 2 + officeW / 2 - 2, apronH + 3.8, whD / 2 + 1.2);
      hub.add(canopy);

      // 6. CUTAWAY WAREHOUSE ROOF GROUP (Elevates/slides smoothly on camera zoom)
      this.warehouseRoofGroup = new T.Group();
      this.warehouseRoofGroup.name = 'WarehouseRoofGroup';
      this.warehouseRoofGroup.position.set(0, apronH + wallH, 0);

      // Modern Gabled Standing-Seam Roof with Architectural Front Cutaway
      // 1. Rear Pitch Roof (Covers rear racking zone: z <= 1)
      const rearRoofW = whW + 1.2;
      const rearRoofD = whD / 2 + 2;
      const rearRoof = new T.Mesh(new T.BoxGeometry(rearRoofW, 0.4, rearRoofD), this.materials.warehouseRoof);
      rearRoof.position.set(0, 0.9, -whD / 4);
      rearRoof.rotation.x = 0.06; // subtle industrial pitch
      rearRoof.castShadow = true;
      this.warehouseRoofGroup.add(rearRoof);

      // 2. Solar Photovoltaic Panels on Rear Roof Pitch
      for (let sx = -whW / 2 + 3.5; sx <= whW / 2 - 3.5; sx += 5.8) {
        const solar = new T.Mesh(new T.BoxGeometry(5.0, 0.12, 4.4), this.materials.solarPanel);
        solar.position.set(sx, 1.18, -whD / 4);
        solar.rotation.x = 0.06;
        this.warehouseRoofGroup.add(solar);
      }

      // 3. Daylight Ridge Skylights
      for (let rx = -whW / 2 + 6; rx <= whW / 2 - 6; rx += 8) {
        const skylight = new T.Mesh(new T.BoxGeometry(5.2, 0.2, 2.4), this.materials.glass);
        skylight.position.set(rx, 1.25, 0.5);
        this.warehouseRoofGroup.add(skylight);
      }

      // 4. Structural Yellow Steel Rafter Trusses (Exposed through Front Cutaway)
      for (let tx = -whW / 2 + 3; tx <= whW / 2 - 3; tx += 7) {
        // Main horizontal rafter beam
        const rafter = new T.Mesh(new T.BoxGeometry(0.35, 0.45, whD), this.materials.trussYellow);
        rafter.position.set(tx, -0.3, 0);
        this.warehouseRoofGroup.add(rafter);

        // Triangular truss webbing
        for (let tz = -whD / 2 + 2.5; tz <= whD / 2 - 2.5; tz += 4.5) {
          const diagonal = new T.Mesh(new T.BoxGeometry(0.2, 0.2, 3.2), this.materials.trussYellow);
          diagonal.position.set(tx, -0.75, tz);
          diagonal.rotation.x = Math.PI / 4;
          this.warehouseRoofGroup.add(diagonal);
        }
      }

      // 5. Yellow Overhead Crane Gantry Rails & Bridge
      const craneRailL = new T.Mesh(new T.BoxGeometry(whW - 1, 0.35, 0.35), this.materials.trussYellow);
      craneRailL.position.set(0, -0.75, -whD / 3);
      const craneRailR = new T.Mesh(new T.BoxGeometry(whW - 1, 0.35, 0.35), this.materials.trussYellow);
      craneRailR.position.set(0, -0.75, whD / 4);
      const gantryBridge = new T.Mesh(new T.BoxGeometry(1.4, 0.45, whD * 0.65), this.materials.trussYellow);
      gantryBridge.position.set(3, -0.55, -whD / 16);
      this.warehouseRoofGroup.add(craneRailL, craneRailR, gantryBridge);

      // 6. Rooftop HVAC Chiller Units & Ventilation Fans
      const hvacUnits = [[-10, 1.9, -5], [9, 1.9, -4], [0, 2.1, -6]];
      hvacUnits.forEach(([hx, hy, hz]) => {
        const hvac = new T.Mesh(new T.BoxGeometry(3.6, 1.6, 2.6), this.materials.sidewalk);
        hvac.position.set(hx, hy, hz);
        hvac.castShadow = true;
        this.warehouseRoofGroup.add(hvac);
      });

      // Front Cutaway Header Beam (Corporate Red & Yellow Hazard Trim)
      const headerBeam = new T.Mesh(new T.BoxGeometry(whW + 0.4, 0.8, 0.6), this.materials.depositoRed);
      headerBeam.position.set(0, 0.4, whD / 2);
      this.warehouseRoofGroup.add(headerBeam);

      hub.add(this.warehouseRoofGroup);

      // 7. WAREHOUSE INTERIOR LOGISTICS ASSETS (Revealed by Cutaway)
      this._initWarehouseInterior(hub, whW, whD, apronH);

      // 8. High-Mast Floodlight Towers
      const towerL = this._createFloodlightTower();
      towerL.position.set(-whW / 2 - 3, 0, whD / 2 + 5);
      const towerR = this._createFloodlightTower();
      towerR.position.set(whW / 2 + 10, 0, whD / 2 + 5);
      hub.add(towerL, towerR);

      // 9. Intermodal Shipping Container Yard
      const containerLayout = [
        [-18, 0, 6, 0, this.materials.containerBlue],
        [-18, 2.6, 6, 0, this.materials.containerOrange],
        [-18, 0, -1, 0, this.materials.containerGreen],
        [-18, 2.6, -1, 0, this.materials.containerRed],
        [-18, 5.2, -1, 0, this.materials.containerBlue],
        [16, 0, 11, Math.PI / 2, this.materials.containerOrange],
        [16, 2.6, 11, Math.PI / 2, this.materials.containerBlue]
      ];
      containerLayout.forEach(([cx, cy, cz, rot, mat]) => {
        const container = this._createShippingContainer(mat);
        container.position.set(cx, cy + 1.3, cz);
        container.rotation.y = rot;
        hub.add(container);
      });

      // 10. Security Guardhouse & Automatic Boom Barrier
      const guardhouse = new T.Mesh(new T.BoxGeometry(3.2, 3.0, 3.2), this.materials.sidewalk);
      guardhouse.position.set(20, 1.5, 14);
      guardhouse.castShadow = true;
      hub.add(guardhouse);

      // Barrier boom arm (yellow and black stripes)
      const barrier = new T.Mesh(new T.BoxGeometry(6.5, 0.18, 0.18), this.materials.hazardStripe);
      barrier.position.set(25.5, 1.2, 14);
      hub.add(barrier);

      // Main Interactive Mesh
      const clickTarget = new T.Mesh(new T.BoxGeometry(whW, whH, whD), new T.MeshBasicMaterial({ visible: false }));
      clickTarget.position.set(0, whH / 2, 0);
      clickTarget.userData = { districtId: 'logistics', type: 'district', name: 'Industrial Hub' };
      this.interactiveMeshes.push(clickTarget);
      hub.add(clickTarget);

      this.depositoComplex = hub;
      this.scene.add(hub);
    }

    /* ══════════════════════════════════════════════════════════════════════════
       WAREHOUSE INTERIOR: 4-TIER RACKING, PALLETS, HIGH-BAY LIGHTS
    ══════════════════════════════════════════════════════════════════════════ */
    _initWarehouseInterior(hub, whW, whD, apronH) {
      const interior = new T.Group();
      interior.name = 'WarehouseInterior';
      interior.visible = false;
      this.warehouseInteriorGroup = interior;

      // 1. High-Bay UFO Industrial LED Pendant Lights
      const lightZ = [-whD / 4, 0, whD / 4];
      lightZ.forEach(lz => {
        const pLight = new T.PointLight(0xfef08a, 2.5, 22, 1.5);
        pLight.position.set(0, apronH + 9, lz);
        interior.add(pLight);

        // Visual lamp fixture
        const fixture = new T.Mesh(new T.CylinderGeometry(0.6, 0.8, 0.3, 10), this.materials.dockBumper);
        fixture.position.set(0, apronH + 9.5, lz);
        interior.add(fixture);
      });

      // 2. Heavy-Duty Pallet Racks (Porta-Paletes Industrial de 4 Níveis) with Aisle Signs
      const rackRows = [
        { rx: -10, name: 'RUA A · WMS PICKING' },
        { rx: 0, name: 'RUA B · ARMAZENAGEM' },
        { rx: 10, name: 'RUA C · EXPEDIÇÃO' }
      ];
      rackRows.forEach(({ rx, name }) => {
        const rackGroup = this._createPalletRackingRow(18, 4);
        rackGroup.position.set(rx, apronH, -whD / 2 + 10);
        rackGroup.rotation.y = Math.PI / 2;
        interior.add(rackGroup);

        // Overhead Suspended Aisle Name Plaque
        const signMesh = new T.Mesh(new T.BoxGeometry(2.8, 0.55, 0.12), this.materials.depositoRed);
        signMesh.position.set(rx, apronH + 7.2, -whD / 2 + 19.2);
        const signHanger1 = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 1.8, 6), this.materials.truckChrome);
        signHanger1.position.set(rx - 1.1, apronH + 8.1, -whD / 2 + 19.2);
        const signHanger2 = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 1.8, 6), this.materials.truckChrome);
        signHanger2.position.set(rx + 1.1, apronH + 8.1, -whD / 2 + 19.2);
        interior.add(signMesh, signHanger1, signHanger2);
      });

      // 3. Dispatch / Staging Roller Conveyor Line
      const conveyor = new T.Mesh(new T.BoxGeometry(1.6, 0.9, 14), this.materials.truckChrome);
      conveyor.position.set(13, apronH + 0.45, 1);
      interior.add(conveyor);

      // Boxes moving on the conveyor
      for (let bi = -5; bi <= 5; bi += 2.2) {
        const cBox = new T.Mesh(new T.BoxGeometry(0.9, 0.7, 0.9), this.materials.cardboardBox);
        cBox.position.set(13, apronH + 1.15, 1 + bi);
        interior.add(cBox);
      }

      // 4. Packing / Workstation Desks with Dual Monitors & Barcode Scanner
      const desk = new T.Mesh(new T.BoxGeometry(3.6, 0.9, 1.4), this.materials.sidewalk);
      desk.position.set(8, apronH + 0.45, 6);
      desk.userData = {
        type: 'workstation',
        id: 'station-logistics-01',
        name: 'Estação Central · Despacho & WMS',
        assignedAgentId: 'agent-camila',
        assignedAgentName: 'Camila Warehouse Lead',
        department: 'Depósito Mais',
        floorNum: 0
      };
      this.interactiveMeshes.push(desk);
      interior.add(desk);

      const monitor1 = new T.Mesh(new T.BoxGeometry(1.0, 0.7, 0.08), this.materials.codeScreen);
      monitor1.position.set(7.3, apronH + 1.35, 6.2);
      const monitor2 = new T.Mesh(new T.BoxGeometry(1.0, 0.7, 0.08), this.materials.grafanaScreen);
      monitor2.position.set(8.7, apronH + 1.35, 6.2);
      monitor2.rotation.y = -0.2;
      interior.add(monitor1, monitor2);

      // 5. Dock Leveler Pit & Hydraulic Lip at Doca 2
      const levelerPit = new T.Mesh(new T.BoxGeometry(2.6, 0.15, 3.2), this.materials.dockLevelerMat);
      levelerPit.position.set(0, apronH + 0.05, whD / 2 - 1.2);
      const levelerLip = new T.Mesh(new T.BoxGeometry(2.4, 0.08, 1.4), this.materials.dockLevelerMat);
      levelerLip.position.set(0, apronH + 0.08, whD / 2 + 0.8);
      levelerLip.rotation.x = -0.08;
      interior.add(levelerPit, levelerLip);

      // 6. Yellow Industrial Safety Bollards flanking Docks 1, 2, 3
      [-9.2, 0, 9.2].forEach(dx => {
        [-3.4, 3.4].forEach(offset => {
          const bollard = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 1.1, 10), this.materials.safetyBollardMat);
          bollard.position.set(dx + offset, apronH + 0.55, whD / 2 + 0.3);
          interior.add(bollard);
        });
      });

      // 7. Stacks of Clean Wooden Pallets in Dispatch Staging Area
      for (let stack = 0; stack < 2; stack++) {
        const stackX = 4 + stack * 2.2;
        for (let pIdx = 0; pIdx < 5; pIdx++) {
          const emptyPallet = new T.Mesh(new T.BoxGeometry(1.4, 0.14, 1.4), this.materials.palletWood);
          emptyPallet.position.set(stackX, apronH + 0.07 + pIdx * 0.15, 6.5);
          emptyPallet.castShadow = true;
          interior.add(emptyPallet);
        }
      }

      // 8. Internal Pedestrian Safety Walkway Lines (Yellow Boundary Stripes)
      const walkLine = new T.Mesh(new T.BoxGeometry(0.15, 0.02, 16), this.materials.safetyBollardMat);
      walkLine.position.set(5.5, apronH + 0.07, 0);
      interior.add(walkLine);

      hub.add(interior);
    }

    /* ══════════════════════════════════════════════════════════════════════════
       ASSET BUILDER: INDUSTRIAL PALLET RACKING (PORTA-PALETES)
    ══════════════════════════════════════════════════════════════════════════ */
    _createPalletRackingRow(length = 16, tiers = 4) {
      const rack = new T.Group();
      const uprightSpacing = 4.2;
      const depth = 2.2;
      const tierH = 2.2;

      // Vertical Upright Frames (Orange Steel)
      for (let x = -length / 2; x <= length / 2; x += uprightSpacing) {
        for (let z of [-depth / 2, depth / 2]) {
          const col = new T.Mesh(new T.BoxGeometry(0.18, tiers * tierH, 0.18), this.materials.rackOrange);
          col.position.set(x, (tiers * tierH) / 2, z);
          col.castShadow = true;
          rack.add(col);
        }
      }

      // Horizontal Load Beams (Blue Steel) & Loaded Pallets
      for (let t = 1; t <= tiers; t++) {
        const beamY = t * tierH;
        for (let z of [-depth / 2, depth / 2]) {
          const beam = new T.Mesh(new T.BoxGeometry(length, 0.16, 0.12), this.materials.rackBlue);
          beam.position.set(0, beamY, z);
          rack.add(beam);
        }

        // Place Pallets on each tier bay (deterministic)
        for (let px = -length / 2 + uprightSpacing / 2; px < length / 2; px += uprightSpacing / 2) {
          if ((Math.floor(Math.abs(px * 5)) + t) % 6 !== 0) {
            const v = Math.floor(Math.abs(px * 3 + t)) % 4;
            const pallet = this._createPalletWithBoxes(0, v);
            pallet.position.set(px, beamY + 0.08, 0);
            rack.add(pallet);
          }
        }
      }
      return rack;
    }

    /* ══════════════════════════════════════════════════════════════════════════
       ASSET BUILDER: HIGH-DETAIL 18-WHEELER FREIGHT TRUCK
    ══════════════════════════════════════════════════════════════════════════ */
    _createHeavyFreightTruck(cabMat, hasOpenDoors = false) {
      const truck = new T.Group();
      truck.name = 'HeavyFreightTruck';
      truck.userData = { type: 'truck', length: 13.5, width: 2.7, height: 3.8 };

      // ── TRACTOR CABIN ──
      const cabGroup = new T.Group();

      // Aerodynamic Sleeper Cab
      const cabBody = new T.Mesh(new T.BoxGeometry(2.6, 3.2, 3.8), cabMat);
      cabBody.position.set(0, 2.2, 7.5);
      cabBody.castShadow = true;
      cabGroup.add(cabBody);

      // Windshield & Side Windows
      const windshield = new T.Mesh(new T.BoxGeometry(2.4, 1.2, 0.2), this.materials.glass);
      windshield.position.set(0, 2.6, 9.42);
      cabGroup.add(windshield);

      // Front Chrome Radiator Grille & Bumper
      const grille = new T.Mesh(new T.BoxGeometry(2.0, 1.4, 0.25), this.materials.truckChrome);
      grille.position.set(0, 1.2, 9.45);
      cabGroup.add(grille);

      // Headlights (Illuminated)
      const hlLeft = new T.Mesh(new T.BoxGeometry(0.4, 0.35, 0.1), new T.MeshBasicMaterial({ color: 0xffffff }));
      hlLeft.position.set(-1.0, 0.9, 9.5);
      const hlRight = new T.Mesh(new T.BoxGeometry(0.4, 0.35, 0.1), new T.MeshBasicMaterial({ color: 0xffffff }));
      hlRight.position.set(1.0, 0.9, 9.5);
      cabGroup.add(hlLeft, hlRight);

      // Vertical Chrome Exhaust Stack
      const exhaust = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 3.8, 8), this.materials.truckChrome);
      exhaust.position.set(-1.25, 3.2, 5.8);
      cabGroup.add(exhaust);

      // Fuel Tanks
      const tank = new T.Mesh(new T.CylinderGeometry(0.45, 0.45, 2.2, 10), this.materials.truckChrome);
      tank.rotation.z = Math.PI / 2;
      tank.position.set(1.3, 0.75, 7.0);
      cabGroup.add(tank);

      // Wheels (Steer & Tandem Drive Duals)
      const wGeom = new T.CylinderGeometry(0.55, 0.55, 0.42, 12);
      wGeom.rotateZ(Math.PI / 2);
      const wheelPos = [
        [-1.3, 0.55, 8.2], [1.3, 0.55, 8.2],
        [-1.3, 0.55, 5.8], [1.3, 0.55, 5.8],
        [-1.3, 0.55, 4.4], [1.3, 0.55, 4.4]
      ];
      wheelPos.forEach(p => {
        const w = new T.Mesh(wGeom, this.materials.rubberTire);
        w.position.set(...p);
        cabGroup.add(w);
      });

      truck.add(cabGroup);

      // ── 40FT CONTAINER TRAILER ──
      const trailerGroup = new T.Group();

      // Trailer Chassis Frame
      const chassis = new T.Mesh(new T.BoxGeometry(2.6, 0.4, 13.5), this.materials.dockBumper);
      chassis.position.set(0, 1.1, -1.2);
      trailerGroup.add(chassis);

      // 40ft Ribbed Trailer Box Body
      const trailerBody = new T.Mesh(new T.BoxGeometry(2.7, 3.4, 13.2), this.materials.warehouseWall);
      trailerBody.position.set(0, 2.9, -1.2);
      trailerBody.castShadow = true;
      trailerGroup.add(trailerBody);

      // Rear Doors (Open when docked!)
      if (hasOpenDoors) {
        const doorL = new T.Mesh(new T.BoxGeometry(1.3, 3.2, 0.15), this.materials.dockDoor);
        doorL.position.set(-1.9, 2.9, -7.9);
        doorL.rotation.y = -Math.PI / 3;
        const doorR = new T.Mesh(new T.BoxGeometry(1.3, 3.2, 0.15), this.materials.dockDoor);
        doorR.position.set(1.9, 2.9, -7.9);
        doorR.rotation.y = Math.PI / 3;
        trailerGroup.add(doorL, doorR);
      }

      // Trailer Tandem Rear Wheels
      const tWheels = [
        [-1.3, 0.55, -5.6], [1.3, 0.55, -5.6],
        [-1.3, 0.55, -7.0], [1.3, 0.55, -7.0]
      ];
      tWheels.forEach(tp => {
        const tw = new T.Mesh(wGeom, this.materials.rubberTire);
        tw.position.set(...tp);
        trailerGroup.add(tw);
      });

      truck.add(trailerGroup);
      return truck;
    }

    /* ══════════════════════════════════════════════════════════════════════════
       ASSET BUILDER: TOYOTA-STYLE INDUSTRIAL FORKLIFT (EMPILHADEIRA)
    ══════════════════════════════════════════════════════════════════════════ */
    _createForklift() {
      const fl = new T.Group();

      // Chassis Body
      const body = new T.Mesh(new T.BoxGeometry(1.8, 1.1, 2.4), this.materials.forkliftYellow);
      body.position.set(0, 0.7, 0);
      body.castShadow = true;
      fl.add(body);

      // Black Rear Counterweight
      const counter = new T.Mesh(new T.BoxGeometry(1.7, 1.0, 0.8), this.materials.dockBumper);
      counter.position.set(0, 0.7, -0.9);
      fl.add(counter);

      // Driver Protective Roll Cage
      const cage = new T.Mesh(new T.BoxGeometry(1.5, 1.6, 1.5), this.materials.dockBumper);
      cage.position.set(0, 1.95, -0.1);
      fl.add(cage);

      // Operator Driver Seat & Steering Wheel
      const seat = new T.Mesh(new T.BoxGeometry(0.8, 0.6, 0.8), this.materials.workWear);
      seat.position.set(0, 1.25, -0.15);
      fl.add(seat);

      // Dual-Stage Chrome Lifting Mast
      const mast = new T.Mesh(new T.BoxGeometry(1.0, 2.8, 0.2), this.materials.truckChrome);
      mast.position.set(0, 1.6, 1.3);
      fl.add(mast);

      // Steel Lifting Forks
      const forks = new T.Mesh(new T.BoxGeometry(1.3, 0.08, 1.5), this.materials.dockBumper);
      forks.position.set(0, 0.35, 2.0);
      fl.add(forks);

      // Carried Wooden Pallet with Packages
      const pallet = this._createPalletWithBoxes(0);
      pallet.position.set(0, 0.42, 2.0);
      fl.add(pallet);

      // Wheels
      const wGeo = new T.CylinderGeometry(0.38, 0.38, 0.32, 10);
      wGeo.rotateZ(Math.PI / 2);
      [[-0.9, 0.38, 0.8], [0.9, 0.38, 0.8], [-0.8, 0.34, -0.9], [0.8, 0.34, -0.9]].forEach(wp => {
        const w = new T.Mesh(wGeo, this.materials.rubberTire);
        w.position.set(...wp);
        fl.add(w);
      });

      // Flashing Amber Warning Beacon
      const strobe = new T.Mesh(new T.CylinderGeometry(0.09, 0.09, 0.2, 8), this.materials.hazardStripe);
      strobe.position.set(0, 2.85, -0.1);
      fl.add(strobe);

      fl.userData = {
        type: 'vehicle',
        name: 'Forklift Toyota 8FBE20',
        strobe,
        forks,
        pallet
      };

      return fl;
    }

    _createDeliveryBoxVan(colorMat) {
      const van = new T.Group();
      van.name = 'DeliveryBoxVan';
      van.userData = { type: 'van', length: 5.2, width: 2.3, height: 2.4 };

      // Body
      const body = new T.Mesh(new T.BoxGeometry(2.3, 2.4, 5.2), colorMat);
      body.position.set(0, 1.5, 0);
      body.castShadow = true;
      van.add(body);

      // Cab front
      const cab = new T.Mesh(new T.BoxGeometry(2.2, 1.8, 2.0), colorMat);
      cab.position.set(0, 1.2, 3.1);
      van.add(cab);

      // Windshield
      const ws = new T.Mesh(new T.BoxGeometry(2.0, 0.9, 0.15), this.materials.glass);
      ws.position.set(0, 1.45, 4.12);
      van.add(ws);

      // Wheels
      const wGeom = new T.CylinderGeometry(0.42, 0.42, 0.35, 10);
      wGeom.rotateZ(Math.PI / 2);
      [[-1.15, 0.42, 2.4], [1.15, 0.42, 2.4], [-1.15, 0.42, -1.8], [1.15, 0.42, -1.8]].forEach(pos => {
        const w = new T.Mesh(wGeom, this.materials.rubberTire);
        w.position.set(...pos);
        van.add(w);
      });
      return van;
    }

    _createSedanCar(colorMat = this.materials.truckCabinBlue) {
      const car = new T.Group();
      car.name = 'SedanCar';
      car.userData = { type: 'car', length: 4.2, width: 1.8, height: 1.45 };

      // Lower body / chassis (Length 4.2m, Width 1.8m, Height 0.65m)
      const lowerBody = new T.Mesh(new T.BoxGeometry(1.8, 0.65, 4.2), colorMat);
      lowerBody.position.set(0, 0.55, 0);
      lowerBody.castShadow = true;
      car.add(lowerBody);

      // Cabin / Greenhouse (Width 1.5m, Height 0.68m, Length 2.1m)
      const cabin = new T.Mesh(new T.BoxGeometry(1.5, 0.68, 2.1), this.materials.officeGlass || this.materials.glass);
      cabin.position.set(0, 1.11, -0.2);
      cabin.castShadow = true;
      car.add(cabin);

      // Roof panel (Total car height reaches exactly 1.45m)
      const roof = new T.Mesh(new T.BoxGeometry(1.48, 0.08, 1.8), colorMat);
      roof.position.set(0, 1.41, -0.2);
      car.add(roof);

      // Wheels (Radius 0.30, Width 0.22)
      const wGeom = new T.CylinderGeometry(0.30, 0.30, 0.22, 12);
      wGeom.rotateZ(Math.PI / 2);
      [[-0.92, 0.30, 1.3], [0.92, 0.30, 1.3], [-0.92, 0.30, -1.3], [0.92, 0.30, -1.3]].forEach(pos => {
        const w = new T.Mesh(wGeom, this.materials.rubberTire);
        w.position.set(...pos);
        car.add(w);
      });

      // Front Headlights & Rear Taillights
      const hlMat = new T.MeshBasicMaterial({ color: 0xffffff });
      const tlMat = new T.MeshBasicMaterial({ color: 0xff2222 });
      const hlL = new T.Mesh(new T.BoxGeometry(0.32, 0.14, 0.05), hlMat);
      hlL.position.set(-0.65, 0.62, 2.11);
      const hlR = new T.Mesh(new T.BoxGeometry(0.32, 0.14, 0.05), hlMat);
      hlR.position.set(0.65, 0.62, 2.11);
      const tlL = new T.Mesh(new T.BoxGeometry(0.32, 0.14, 0.05), tlMat);
      tlL.position.set(-0.65, 0.62, -2.11);
      const tlR = new T.Mesh(new T.BoxGeometry(0.32, 0.14, 0.05), tlMat);
      tlR.position.set(0.65, 0.62, -2.11);
      car.add(hlL, hlR, tlL, tlR);

      return car;
    }

    
    /* ── CityRT Signature Ligne Claire / Comic-Book Ink Outline Engine ── */
    _applyLigneClaire(mesh, threshold = 26, color = 0x1c1e21) {
      if (!mesh || !mesh.geometry) return mesh;
      try {
        const edges = new T.EdgesGeometry(mesh.geometry, threshold);
        const lineMat = new T.LineBasicMaterial({ color: color, linewidth: 1.5 });
        const wire = new T.LineSegments(edges, lineMat);
        wire.name = 'InkOutline';
        mesh.add(wire);
      } catch (e) {}
      return mesh;
    }

    _createStreetLamp() {
      const lamp = new T.Group();
      lamp.name = 'StreetLamp';
      const baseGeo = new T.CylinderGeometry(0.18, 0.24, 0.6, 8);
      const base = new T.Mesh(baseGeo, this.materials.streetLampPole || this.materials.dockBumper);
      base.position.y = 0.3;
      base.castShadow = true;
      lamp.add(base);

      const poleGeo = new T.CylinderGeometry(0.08, 0.12, 3.6, 8);
      const pole = new T.Mesh(poleGeo, this.materials.streetLampPole || this.materials.dockBumper);
      pole.position.y = 2.4;
      pole.castShadow = true;
      lamp.add(pole);

      const armGeo = new T.BoxGeometry(0.65, 0.08, 0.08);
      const arm = new T.Mesh(armGeo, this.materials.streetLampPole || this.materials.dockBumper);
      arm.position.set(0.28, 4.15, 0);
      lamp.add(arm);

      const capGeo = new T.ConeGeometry(0.24, 0.18, 6);
      const cap = new T.Mesh(capGeo, this.materials.streetLampPole || this.materials.dockBumper);
      cap.position.set(0.55, 4.25, 0);
      lamp.add(cap);

      const lanternGeo = new T.CylinderGeometry(0.15, 0.10, 0.28, 6);
      const lantern = new T.Mesh(lanternGeo, this.materials.streetLampLantern);
      lantern.position.set(0.55, 4.05, 0);
      lamp.add(lantern);

      const light = new T.PointLight(0xffe7a8, 1.25, 18, 1.4);
      light.position.set(0.55, 3.95, 0);
      lamp.add(light);
      return lamp;
    }

    _createMansardRoof(width, depth, height = 2.4) {
      const roofGroup = new T.Group();
      roofGroup.name = 'MansardRoof';

      // Sloped mansard base tier (Truncated pyramid effect)
      const slopeGeo = new T.CylinderGeometry(
        Math.max(1, (width - 2.2) * 0.707),
        Math.max(2, (width + 0.6) * 0.707),
        height,
        4,
        1,
        false,
        Math.PI / 4
      );
      const slope = new T.Mesh(slopeGeo, this.materials.mansardSlate || this.materials.warehouseRoof);
      slope.position.y = height / 2;
      slope.scale.set(1, 1, depth / width);
      slope.castShadow = true; this._applyLigneClaire(slope, 24); roofGroup.add(slope);

      // Flat lead/zinc top plate
      const topPlate = new T.Mesh(
        new T.BoxGeometry(Math.max(1, width - 2.6), 0.18, Math.max(1, depth - 2.6)),
        this.materials.brushedTitanium || this.materials.sidewalk
      );
      topPlate.position.y = height + 0.09;
      topPlate.castShadow = true; this._applyLigneClaire(topPlate, 35); roofGroup.add(topPlate);

      // Dormer windows on front
      const dormerCount = Math.max(2, Math.floor(width / 4));
      const dormerSpacing = (width - 3.2) / (dormerCount - 1);
      for (let i = 0; i < dormerCount; i++) {
        const dx = -(width - 3.2) / 2 + i * dormerSpacing;
        const dormer = new T.Group();
        dormer.position.set(dx, height * 0.45, depth / 2 - 0.2);

        const dBody = new T.Mesh(new T.BoxGeometry(1.1, 1.2, 0.8), this.materials.mansardSlate || this.materials.sidewalk);
        const dGlass = new T.Mesh(new T.BoxGeometry(0.8, 0.85, 0.05), this.materials.streetLampLantern);
        dGlass.position.set(0, 0, 0.42);
        const dCap = new T.Mesh(new T.ConeGeometry(0.8, 0.6, 4), this.materials.mansardSlate);
        dCap.rotation.y = Math.PI / 4;
        dCap.position.y = 0.85;

        dormer.add(dBody, dGlass, dCap);
        roofGroup.add(dormer);
      }

      return roofGroup;
    }

    _createPitchedRoof(width, depth, height = 2.6) {
      const roofGroup = new T.Group();
      roofGroup.name = 'PitchedGableRoof';

      const prismShape = new T.Shape();
      prismShape.moveTo(-width / 2 - 0.3, 0);
      prismShape.lineTo(0, height);
      prismShape.lineTo(width / 2 + 0.3, 0);
      prismShape.closePath();

      const extrudeSettings = { depth: depth + 0.6, bevelEnabled: false };
      const roofGeo = new T.ExtrudeGeometry(prismShape, extrudeSettings);
      const roofMesh = new T.Mesh(roofGeo, this.materials.terracottaRoof || this.materials.warehouseRoof);
      roofMesh.position.set(0, 0, -depth / 2 - 0.3);
      roofMesh.castShadow = true; this._applyLigneClaire(roofMesh, 24); roofGroup.add(roofMesh);

      // Brick Chimney
      const chimney = new T.Mesh(new T.BoxGeometry(0.9, height + 1.2, 0.9), this.materials.brickWall);
      chimney.position.set(width * 0.28, height * 0.6, -depth * 0.15);
      chimney.castShadow = true; this._applyLigneClaire(chimney, 35); const chCap = new T.Mesh(new T.BoxGeometry(1.1, 0.15, 1.1), this.materials.mansardSlate);
      chCap.position.set(width * 0.28, height * 1.2 + 0.08, -depth * 0.15);
      roofGroup.add(chimney, chCap);

      return roofGroup;
    }

    _createEntranceDoor(name = 'EntranceDoor') {
      const doorGroup = new T.Group();
      doorGroup.name = name;
      doorGroup.userData = { type: 'door', height: 2.1, width: 1.2, name: name };

      const frame = new T.Mesh(new T.BoxGeometry(1.36, 2.18, 0.12), this.materials.brushedTitanium);
      frame.position.y = 1.09;

      const leaf = new T.Mesh(new T.BoxGeometry(1.2, 2.1, 0.08), this.materials.clearGlass);
      leaf.position.y = 1.05;
      leaf.userData = { type: 'door', height: 2.1, width: 1.2 };

      const handle = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 0.35, 8), this.materials.truckChrome);
      handle.position.set(0.48, 1.05, 0.06);

      doorGroup.add(frame, leaf, handle);
      return doorGroup;
    }

    _createPalletWithBoxes(stackLevel = 0, variant = null) {
      const group = new T.Group();
      group.name = 'EuroPalletLoaded';
      const v = (variant !== null) ? variant : (Math.floor(Math.abs(stackLevel * 3)) % 4);

      // ── Real EURO-Pallet Construction (Standard 1.4m x 1.4m Industrial) ──
      // 1. 3 Bottom Skid Boards (running along Z)
      for (let sx of [-0.55, 0, 0.55]) {
        const skid = new T.Mesh(new T.BoxGeometry(0.14, 0.03, 1.36), this.materials.palletWood);
        skid.position.set(sx, stackLevel + 0.015, 0);
        skid.castShadow = true;
        group.add(skid);
      }

      // 2. 9 Solid Wooden Support Blocks
      for (let bx of [-0.55, 0, 0.55]) {
        for (let bz of [-0.55, 0, 0.55]) {
          const block = new T.Mesh(new T.BoxGeometry(0.14, 0.08, 0.14), this.materials.palletWood);
          block.position.set(bx, stackLevel + 0.07, bz);
          block.castShadow = true;
          group.add(block);
        }
      }

      // 3. 3 Stringer Cross Boards (running along X)
      for (let sz of [-0.55, 0, 0.55]) {
        const str = new T.Mesh(new T.BoxGeometry(1.36, 0.03, 0.14), this.materials.palletWood);
        str.position.set(0, stackLevel + 0.125, sz);
        str.castShadow = true;
        group.add(str);
      }

      // 4. 5 Top Deckboards (running along Z with realistic expansion gaps)
      const deckX = [-0.55, -0.28, 0, 0.28, 0.55];
      deckX.forEach(dx => {
        const deck = new T.Mesh(new T.BoxGeometry(0.22, 0.03, 1.36), this.materials.palletWood);
        deck.position.set(dx, stackLevel + 0.155, 0);
        deck.castShadow = true;
        group.add(deck);
      });

      const baseCargoY = stackLevel + 0.17;

      // ── Varied Cargo Configurations per Variant ──
      if (v === 0) {
        // Variant 0: 4 Large Corrugated Shipping Cartons with Black Straps
        const bGeo = new T.BoxGeometry(0.58, 0.72, 0.58);
        [[-0.32, -0.32], [0.32, -0.32], [-0.32, 0.32], [0.32, 0.32]].forEach(([ox, oz]) => {
          const b = new T.Mesh(bGeo, this.materials.cardboardBox);
          b.position.set(ox, baseCargoY + 0.36, oz);
          b.castShadow = true;
          group.add(b);
        });
        // Horizontal tension packing strap
        const strap = new T.Mesh(new T.BoxGeometry(1.26, 0.04, 1.26), this.materials.dockBumper);
        strap.position.set(0, baseCargoY + 0.42, 0);
        group.add(strap);
      } else if (v === 1) {
        // Variant 1: 8 Medium Interlocking Cartons (2 tiers of 4)
        const bGeo = new T.BoxGeometry(0.54, 0.44, 0.54);
        for (let tier = 0; tier < 2; tier++) {
          const tY = baseCargoY + 0.22 + tier * 0.44;
          [[-0.30, -0.30], [0.30, -0.30], [-0.30, 0.30], [0.30, 0.30]].forEach(([ox, oz]) => {
            const b = new T.Mesh(bGeo, this.materials.cardboardBox);
            b.position.set(ox, tY, oz);
            b.castShadow = true;
            group.add(b);
          });
        }
      } else if (v === 2) {
        // Variant 2: Shrink-Wrapped High-Cube Pallet with Plastic Sheen
        const bGeo = new T.BoxGeometry(0.56, 0.88, 0.56);
        [[-0.31, -0.31], [0.31, -0.31], [-0.31, 0.31], [0.31, 0.31]].forEach(([ox, oz]) => {
          const b = new T.Mesh(bGeo, this.materials.cardboardBox);
          b.position.set(ox, baseCargoY + 0.44, oz);
          b.castShadow = true;
          group.add(b);
        });
        // Translucent stretch wrap film envelope
        const wrap = new T.Mesh(new T.BoxGeometry(1.28, 0.94, 1.28), this.materials.shrinkWrap || this.materials.clearGlass);
        wrap.position.set(0, baseCargoY + 0.47, 0);
        group.add(wrap);
      } else {
        // Variant 3: Assorted Mixed Parcel Consignment (E-Commerce WMS)
        const p1 = new T.Mesh(new T.BoxGeometry(0.85, 0.38, 0.55), this.materials.cardboardBox);
        p1.position.set(-0.22, baseCargoY + 0.19, -0.28);
        const p2 = new T.Mesh(new T.BoxGeometry(0.52, 0.65, 0.58), this.materials.cardboardBox);
        p2.position.set(0.35, baseCargoY + 0.325, -0.28);
        const p3 = new T.Mesh(new T.BoxGeometry(0.60, 0.50, 0.65), this.materials.cardboardBox);
        p3.position.set(-0.25, baseCargoY + 0.25, 0.32);
        const p4 = new T.Mesh(new T.BoxGeometry(0.48, 0.45, 0.52), this.materials.cardboardBox);
        p4.position.set(0.35, baseCargoY + 0.225, 0.35);
        const topParcel = new T.Mesh(new T.BoxGeometry(0.45, 0.32, 0.45), this.materials.cardboardBox);
        topParcel.position.set(0, baseCargoY + 0.54, 0);
        [p1, p2, p3, p4, topParcel].forEach(p => { p.castShadow = true; group.add(p); });
      }

      return group;
    }

    _createShippingContainer(mat) {
      const group = new T.Group();
      const body = new T.Mesh(new T.BoxGeometry(2.6, 2.7, 6.4), mat);
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);

      // Corner casting blocks
      const cornerGeo = new T.BoxGeometry(0.26, 0.26, 0.26);
      for (let x of [-1.3, 1.3]) {
        for (let y of [-1.35, 1.35]) {
          for (let z of [-3.2, 3.2]) {
            const corner = new T.Mesh(cornerGeo, this.materials.dockBumper);
            corner.position.set(x, y, z);
            group.add(corner);
          }
        }
      }
      return group;
    }

    _createDetailedTree(type = 'deciduous') {
      const tree = new T.Group();
      if (type === 'hedge') {
        const hedge = new T.Mesh(new T.BoxGeometry(4.2, 1.2, 1.2), this.materials.hedgeBoxwood);
        hedge.position.y = 0.6;
        hedge.castShadow = true; hedge.receiveShadow = true;
        tree.add(hedge);
        tree.userData = { type: 'hedge', height: 1.2 };
        return tree;
      }

      // Natural Wooden Trunk with Root Flare
      const trunk = new T.Mesh(new T.CylinderGeometry(0.28, 0.45, 2.6, 8), this.materials.palletWood);
      trunk.position.y = 1.3;
      trunk.castShadow = true;
      tree.add(trunk);

      let treeH = 5.8;
      if (type === 'pine') {
        treeH = 6.4;
        for (let l = 0; l < 4; l++) {
          const cone = new T.Mesh(new T.ConeGeometry(2.3 - l * 0.42, 2.2, 8), this.materials.leafPine);
          cone.position.y = 2.6 + l * 1.35;
          cone.castShadow = true;
          tree.add(cone);
        }
      } else if (type === 'flowering') {
        treeH = 5.2;
        const f1 = new T.Mesh(new T.DodecahedronGeometry(2.1), this.materials.leafFlowering);
        f1.position.set(0, 3.5, 0);
        f1.castShadow = true;
        const f2 = new T.Mesh(new T.DodecahedronGeometry(1.6), this.materials.leafFlowering);
        f2.position.set(0.6, 4.4, 0.5);
        f2.castShadow = true;
        tree.add(f1, f2);
      } else {
        treeH = 5.8;
        const f1 = new T.Mesh(new T.DodecahedronGeometry(2.2), this.materials.leafDeciduous);
        f1.position.set(0, 3.4, 0);
        f1.castShadow = true;
        const f2 = new T.Mesh(new T.DodecahedronGeometry(1.7), this.materials.leafDeciduous);
        f2.position.set(0.7, 4.3, 0.4);
        f2.castShadow = true;
        const f3 = new T.Mesh(new T.DodecahedronGeometry(1.5), this.materials.leafDeciduous);
        f3.position.set(-0.6, 3.9, -0.4);
        f3.castShadow = true;
        tree.add(f1, f2, f3);
      }
      tree.userData = { type: 'tree', height: treeH };
      return tree;
    }

    _createStreetLight() {
      const pole = new T.Group();
      const mast = new T.Mesh(new T.CylinderGeometry(0.12, 0.18, 7.5, 8), this.materials.sidewalk);
      mast.position.y = 3.75;
      mast.castShadow = true;
      pole.add(mast);

      // Curved Luminaire Arm
      const arm = new T.Mesh(new T.BoxGeometry(1.6, 0.12, 0.12), this.materials.sidewalk);
      arm.position.set(0.8, 7.4, 0);
      pole.add(arm);

      // Glowing LED Fixture
      const lightHead = new T.Mesh(new T.BoxGeometry(0.8, 0.15, 0.4), new T.MeshBasicMaterial({ color: 0xfffbeb }));
      lightHead.position.set(1.4, 7.3, 0);
      pole.add(lightHead);

      return pole;
    }

    _createFloodlightTower() {
      const tower = new T.Group();
      const pole = new T.Mesh(new T.CylinderGeometry(0.24, 0.4, 15, 8), this.materials.sidewalk);
      pole.position.y = 7.5;
      pole.castShadow = true;
      tower.add(pole);

      const crossbar = new T.Mesh(new T.BoxGeometry(3.6, 0.25, 0.4), this.materials.dockBumper);
      crossbar.position.y = 15.1;
      tower.add(crossbar);

      // 4 Spotlights on crossbar
      for (let s = -1.35; s <= 1.35; s += 0.9) {
        const spot = new T.Mesh(new T.BoxGeometry(0.65, 0.5, 0.5), new T.MeshBasicMaterial({ color: 0xfef08a }));
        spot.position.set(s, 15.3, 0.2);
        tower.add(spot);
      }
      return tower;
    }

    /* ══════════════════════════════════════════════════════════════════════════
       EMBODIED 3D AGENTS: CAMILA & DISTRICT WORKFORCE
    ══════════════════════════════════════════════════════════════════════════ */
    _initCamilaAgent() {
      const camila = new T.Group();
      camila.name = 'Agent_Camila';
      camila.position.copy(this.camilaState.pos);
      camila.scale.set(1.0, 1.0, 1.0);
      camila.userData = { type: 'humanoid', height: 1.76, totalHeight: 1.76 };

      // 1. Stylized Anatomy & High-Vis Safety Uniform
      // Torso with High-Vis Orange Vest
      const torso = new T.Mesh(new T.BoxGeometry(0.8, 0.95, 0.48), this.materials.hiVisVest);
      torso.position.y = 1.15;
      torso.castShadow = true;
      camila.add(torso);

      // Dual Silver Retroreflective Stripes (Chest & Waist)
      const stripe1 = new T.Mesh(new T.BoxGeometry(0.84, 0.12, 0.52), this.materials.silverReflective);
      stripe1.position.y = 1.28;
      const stripe2 = new T.Mesh(new T.BoxGeometry(0.84, 0.12, 0.52), this.materials.silverReflective);
      stripe2.position.y = 0.95;
      camila.add(stripe1, stripe2);

      // Head with Realistic Skin Tone & Dark Hair Ponytail
      const head = new T.Mesh(new T.BoxGeometry(0.48, 0.52, 0.48), this.materials.skinTone);
      head.position.y = 1.95;
      head.castShadow = true;
      camila.add(head);

      const hair = new T.Mesh(new T.BoxGeometry(0.52, 0.32, 0.54), this.materials.dockBumper);
      hair.position.set(0, 2.15, -0.06);
      const ponytail = new T.Mesh(new T.CylinderGeometry(0.12, 0.08, 0.6, 6), this.materials.dockBumper);
      ponytail.rotation.x = -Math.PI / 4;
      ponytail.position.set(0, 2.0, -0.38);
      camila.add(hair, ponytail);

      // Yellow Industrial Safety Hard Hat
      const helmet = new T.Mesh(new T.CylinderGeometry(0.38, 0.42, 0.22, 10), this.materials.forkliftYellow);
      helmet.position.set(0, 2.26, 0);
      const brim = new T.Mesh(new T.BoxGeometry(0.58, 0.06, 0.62), this.materials.forkliftYellow);
      brim.position.set(0, 2.18, 0.08);
      camila.add(helmet, brim);

      // Articulated Left and Right Arms holding WMS Tablet
      const armL = new T.Mesh(new T.BoxGeometry(0.22, 0.75, 0.24), this.materials.hiVisVest);
      armL.position.set(-0.52, 1.15, 0.15);
      armL.rotation.x = Math.PI / 5;
      const armR = new T.Mesh(new T.BoxGeometry(0.22, 0.75, 0.24), this.materials.hiVisVest);
      armR.position.set(0.52, 1.15, 0.15);
      armR.rotation.x = Math.PI / 5;
      camila.add(armL, armR);

      // Separate Left & Right Legs in Cargo Utility Trousers & Steel-Toe Boots
      const legL = new T.Mesh(new T.BoxGeometry(0.34, 0.72, 0.38), this.materials.workWear);
      legL.position.set(-0.22, 0.48, 0);
      const legR = new T.Mesh(new T.BoxGeometry(0.34, 0.72, 0.38), this.materials.workWear);
      legR.position.set(0.22, 0.48, 0);
      const bootL = new T.Mesh(new T.BoxGeometry(0.36, 0.22, 0.54), this.materials.dockBumper);
      bootL.position.set(-0.22, 0.11, 0.06);
      const bootR = new T.Mesh(new T.BoxGeometry(0.36, 0.22, 0.54), this.materials.dockBumper);
      bootR.position.set(0.22, 0.11, 0.06);
      camila.add(legL, legR, bootL, bootR);

      // Illuminated Handheld WMS Scanner Tablet
      const tablet = new T.Mesh(new T.BoxGeometry(0.52, 0.34, 0.06), this.materials.fastLaneGlow);
      tablet.position.set(0, 1.18, 0.48);
      tablet.rotation.x = -Math.PI / 6;
      camila.add(tablet);

      // Active Barcode Scanning Cyan Laser Cone
      const scanBeam = new T.Mesh(new T.ConeGeometry(0.42, 1.1, 8), this.materials.fastLaneGlow);
      scanBeam.position.set(0, 0.62, 0.75);
      scanBeam.rotation.x = Math.PI / 3.5;
      scanBeam.visible = false;
      this.camilaScanBeam = scanBeam;
      camila.add(scanBeam);

      // Interactive Click Target
      torso.userData = {
        agentId: 'agent-camila',
        type: 'agent',
        name: 'Supervisora Camila',
        role: 'Supervisora de Qualidade & Embalagem WMS',
        department: 'LOGISTICA'
      };
      this.interactiveMeshes.push(torso);

      this.camilaGroup = camila;
      this.scene.add(camila);
      const camilaBubble = new AgentThoughtBubble(camila, 'Disponível', '#67e8f9', '●');
      this.agents.set('agent-camila', {
        id: 'agent-camila',
        name: 'Supervisora Camila',
        role: 'Supervisora de Qualidade & Embalagem WMS',
        department: 'LOGISTICA',
        status: 'AVAILABLE',
        state: 'AVAILABLE',
        height: 1.76,
        mesh: camila,
        thoughtBubble: camilaBubble,
        isInteriorStationed: true,
        path: null,
        pathIndex: 0
      });
      this._createAgentStatusBadge('Camila · Estado não informado', camila.position);
    }

    _initWorkforceAgents() {
      // 1. Doca Operator (st-recepcao / agent-expedicao)
      const carlos = new T.Group();
      carlos.name = 'Agent_Carlos';
      carlos.position.set(22, 0.8, 1);
      carlos.scale.set(1.0, 1.0, 1.0);
      carlos.userData = { type: 'humanoid', height: 1.76, totalHeight: 1.76 };

      const cTorso = new T.Mesh(new T.BoxGeometry(0.8, 0.95, 0.48), this.materials.hazardStripe);
      cTorso.position.y = 1.15;
      cTorso.castShadow = true;
      carlos.add(cTorso);

      const cHead = new T.Mesh(new T.BoxGeometry(0.48, 0.52, 0.48), this.materials.skinTone);
      cHead.position.y = 1.95;
      carlos.add(cHead);

      const cHelmet = new T.Mesh(new T.BoxGeometry(0.56, 0.28, 0.58), this.materials.forkliftYellow);
      cHelmet.position.y = 2.22;
      carlos.add(cHelmet);

      const cLegL = new T.Mesh(new T.BoxGeometry(0.34, 0.72, 0.38), this.materials.workWear);
      cLegL.position.set(-0.22, 0.48, 0);
      const cLegR = new T.Mesh(new T.BoxGeometry(0.34, 0.72, 0.38), this.materials.workWear);
      cLegR.position.set(0.22, 0.48, 0);
      carlos.add(cLegL, cLegR);

      // Digital Freight Manifest Clipboard
      const clipboard = new T.Mesh(new T.BoxGeometry(0.45, 0.55, 0.05), this.materials.palletWood);
      clipboard.position.set(0, 1.25, 0.42);
      carlos.add(clipboard);

      cTorso.userData = {
        agentId: 'agent-expedicao',
        type: 'agent',
        name: 'Operador de Doca',
        role: 'Encarregado de Doca e Despacho',
        department: 'DEPÓSITO MAIS'
      };
      this.interactiveMeshes.push(cTorso);
      this.scene.add(carlos);

      const carlosBubble = new AgentThoughtBubble(carlos, 'Doca 2: Embarque 40ft', '#facc15', '🚛');
      this.agents.set('agent-expedicao', {
        id: 'agent-expedicao',
        name: 'Operador de Doca',
        role: 'Encarregado de Doca e Despacho',
        department: 'DEPÓSITO MAIS',
        status: 'WORKING',
        state: 'WORKING',
        height: 1.76,
        mesh: carlos,
        thoughtBubble: carlosBubble,
        path: null,
        pathIndex: 0
      });

      // 2. André - WMS Systems Analyst (st-wms-analyst)
      const andre = new T.Group();
      andre.name = 'Agent_Andre';
      andre.position.set(28.5, 0.8, -6.5);
      const aTorso = new T.Mesh(new T.BoxGeometry(0.75, 0.9, 0.45), this.materials.workWear);
      aTorso.position.y = 1.05;
      aTorso.castShadow = true;
      andre.add(aTorso);
      const aHead = new T.Mesh(new T.BoxGeometry(0.45, 0.48, 0.45), this.materials.skinTone);
      aHead.position.y = 1.75;
      andre.add(aHead);
      const aLegs = new T.Mesh(new T.BoxGeometry(0.65, 0.68, 0.38), this.materials.workWear);
      aLegs.position.y = 0.45;
      andre.add(aLegs);
      aTorso.userData = {
        agentId: 'agent-andre',
        type: 'agent',
        name: 'Especialista WMS André',
        role: 'Analista de Sistemas WMS',
        department: 'DEPÓSITO MAIS'
      };
      this.interactiveMeshes.push(aTorso);
      this.scene.add(andre);

      const andreBubble = new AgentThoughtBubble(andre, 'WMS: Validação de NFe', '#38bdf8', '📋');
      this.agents.set('agent-andre', {
        id: 'agent-andre',
        name: 'Especialista WMS André',
        role: 'Analista de Sistemas WMS',
        department: 'DEPÓSITO MAIS',
        status: 'WORKING',
        state: 'WORKING',
        height: 1.76,
        mesh: andre,
        thoughtBubble: andreBubble,
        path: null,
        pathIndex: 0
      });
    }

    _createAgentStatusBadge(label, pos) {
      if (!this.labelLayer) return;
      const el = document.createElement('div');
      el.className = 'fw3-agent-badge';
      el.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;padding:3px 8px;border-radius:6px;background:rgba(10,15,28,0.88);border:1px solid rgba(249,115,22,0.45);color:#f8fafc;font-size:11px;font-weight:600;white-space:nowrap;display:none;z-index:4;';
      el.textContent = label;
      this.labelLayer.appendChild(el);
      this.agentBadgeEl = el;
      this.agentBadgePos = pos;
    }

    /* ══════════════════════════════════════════════════════════════════════════
       HERO AVATAR BUILDER: LEVEL 5 STYLIZED CHARACTERS (HABBO / TIBIA 3D)
       (Chunky Proportions · Expressive Voxel Eyes · Volumetric Hair · Smartwatch
        Tactical Uniforms · Dual-Tone Sneakers · Floating Emote Badge · Living Poses)
    ══════════════════════════════════════════════════════════════════════════ */
    _createAvatarOutfitDetails(visualProfile, torsoY, fallbackMaterial) {
      const T = THREE;
      const outfit = visualProfile?.outfit || 'suit';
      const group = new T.Group();
      group.name = `AvatarOutfit_${outfit}`;
      group.userData.ownedMaterials = [];
      const accent = new T.MeshStandardMaterial({ color: visualProfile?.accentColor || '#22d3ee', roughness: 0.55, metalness: 0.16 });
      const light = new T.MeshStandardMaterial({ color: '#dce7e9', roughness: 0.86 });
      const dark = new T.MeshStandardMaterial({ color: '#263642', roughness: 0.68, metalness: 0.1 });
      group.userData.ownedMaterials.push(accent, light, dark);
      const addBox = (size, x, y, z, material) => {
        const mesh = new T.Mesh(new T.BoxGeometry(...size), material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        group.add(mesh);
        return mesh;
      };

      if (outfit === 'suit') {
        addBox([0.18, 0.28, 0.025], -0.10, torsoY + 0.10, 0.205, light);
        addBox([0.18, 0.28, 0.025], 0.10, torsoY + 0.10, 0.205, light);
      } else if (outfit === 'hoodie') {
        const hood = new T.Mesh(new T.SphereGeometry(0.19, 12, 9), fallbackMaterial);
        hood.scale.set(1, 0.78, 0.55);
        hood.position.set(0, torsoY + 0.38, -0.17);
        group.add(hood);
        addBox([0.30, 0.12, 0.035], 0, torsoY - 0.14, 0.215, dark);
        addBox([0.025, 0.20, 0.025], -0.04, torsoY + 0.08, 0.23, light);
        addBox([0.025, 0.20, 0.025], 0.04, torsoY + 0.08, 0.23, light);
      } else if (outfit === 'labcoat') {
        addBox([0.13, 0.45, 0.025], -0.22, torsoY, 0.202, light);
        addBox([0.13, 0.45, 0.025], 0.22, torsoY, 0.202, light);
        addBox([0.05, 0.22, 0.035], 0.13, torsoY - 0.08, 0.225, accent);
      } else if (outfit === 'armor') {
        addBox([0.64, 0.12, 0.20], 0, torsoY + 0.24, 0, dark);
        addBox([0.48, 0.30, 0.045], 0, torsoY + 0.02, 0.21, dark);
        addBox([0.055, 0.27, 0.025], 0, torsoY + 0.02, 0.24, accent);
      } else if (outfit === 'cyber') {
        addBox([0.10, 0.13, 0.24], -0.34, torsoY + 0.22, 0, dark);
        addBox([0.10, 0.13, 0.24], 0.34, torsoY + 0.22, 0, dark);
        addBox([0.42, 0.035, 0.025], 0, torsoY - 0.13, 0.21, accent);
      } else if (outfit === 'casual') {
        // Distinguish the everyday jacket from the base shirt at City scale.
        addBox([0.055, 0.34, 0.035], -0.27, torsoY + 0.04, 0.205, accent);
        addBox([0.055, 0.34, 0.035], 0.27, torsoY + 0.04, 0.205, accent);
        const pocket = new T.Mesh(new T.BoxGeometry(0.14, 0.12, 0.04), light);
        pocket.position.set(0.14, torsoY - 0.12, 0.22);
        pocket.castShadow = true;
        group.add(pocket);
      }

      const badge = visualProfile?.badge;
      const badgeColors = { bronze: '#b77948', silver: '#c7d2da', gold: '#f4c95d', diamond: '#69d8ef', master: '#ed697c' };
      if (badgeColors[badge]) {
        const badgeMaterial = new T.MeshStandardMaterial({ color: badgeColors[badge], metalness: 0.35, roughness: 0.35 });
        group.userData.ownedMaterials.push(badgeMaterial);
        const badgeMesh = new T.Mesh(new T.OctahedronGeometry(0.075, 0), badgeMaterial);
        badgeMesh.position.set(-0.20, torsoY + 0.13, 0.235);
        group.add(badgeMesh);
      }
      return group;
    }

    _createAvatarAccessoryDetails(accessory, torsoY) {
      const T = THREE;
      const group = new T.Group();
      group.name = `AvatarAccessory_${accessory || 'none'}`;
      const metal = this.materials.truckChrome;
      const dark = this.materials.dockBumper;
      const glow = this.materials.fastLaneGlow;
      if (accessory === 'glasses') {
        const glasses = new T.Mesh(new T.BoxGeometry(0.34, 0.10, 0.06), metal);
        glasses.position.set(0, torsoY + 0.49, 0.19);
        group.add(glasses);
      } else if (accessory === 'headset') {
        const band = new T.Mesh(new T.TorusGeometry(0.22, 0.025, 6, 16, Math.PI), dark);
        band.position.set(0, torsoY + 0.65, 0);
        band.rotation.x = Math.PI;
        const earpiece = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.06, 8), metal);
        earpiece.rotation.z = Math.PI / 2;
        earpiece.position.set(0.21, torsoY + 0.48, 0);
        const mic = new T.Mesh(new T.BoxGeometry(0.03, 0.03, 0.18), dark);
        mic.position.set(0.18, torsoY + 0.42, 0.12);
        group.add(band, earpiece, mic);
      } else if (accessory === 'visor') {
        const visor = new T.Mesh(new T.BoxGeometry(0.40, 0.11, 0.14), glow);
        visor.position.set(0, torsoY + 0.50, 0.18);
        group.add(visor);
      } else if (accessory === 'halo') {
        const halo = new T.Mesh(new T.TorusGeometry(0.25, 0.025, 8, 20), this.materials.neuralPurple);
        halo.position.set(0, torsoY + 0.72, 0);
        halo.rotation.x = Math.PI / 2;
        group.add(halo);
      } else if (accessory === 'badge') {
        const badgePin = new T.Mesh(new T.OctahedronGeometry(0.07, 0), this.materials.fastLaneGlow);
        badgePin.position.set(-0.20, torsoY + 0.13, 0.235);
        group.add(badgePin);
      }
      return group;
    }

    _createCyberHumanoid({ id, name, role, department, pos, shirtMat, hairColor, accessory = 'none', isSeated = false, visualProfile = null }) {
      const agent = new T.Group();
      agent.name = 'Agent_' + id;
      agent.position.copy(pos);
      const displayScale = Number(visualProfile?.displayScale) || 1;
      const bodyType = ['compact', 'standard', 'tall'].includes(visualProfile?.bodyType) ? visualProfile.bodyType : 'standard';
      const bodyShape = { compact: { x: 1.08, z: 1.06 }, standard: { x: 1, z: 1 }, tall: { x: 0.94, z: 0.96 } }[bodyType];
      const calibratedScale = Math.max(1, Math.min(1.9, displayScale));
      agent.scale.set(calibratedScale * bodyShape.x, calibratedScale, calibratedScale * bodyShape.z);
      const skinMaterial = new T.MeshStandardMaterial({
        color: visualProfile?.skinColor || '#d4a17f',
        roughness: 0.82,
      });
      const pantsMaterial = this.materials.workWear?.clone?.() || new T.MeshStandardMaterial({ color: '#344458', roughness: 0.8 });
      pantsMaterial.color?.set?.(visualProfile?.pantsColor || '#344458');
      const shoeMaterial = this.materials.dockBumper?.clone?.() || new T.MeshStandardMaterial({ color: '#090d16', roughness: 0.8 });
      shoeMaterial.color?.set?.(visualProfile?.shoesColor || '#090d16');

      // 0. Interactive Status Ground Halo / Aura Ring
      const haloGeo = new T.RingGeometry(0.44, 0.60, 24);
      const haloMat = new T.MeshBasicMaterial({
        color: visualProfile?.accentColor || (id === 'agent-ai-core' ? 0xc084fc : id === 'agent-security' ? 0xef4444 : id === 'agent-infra' ? 0x22c55e : 0x00f0ff),
        side: T.DoubleSide,
        transparent: true,
        opacity: 0.75
      });
      const halo = new T.Mesh(haloGeo, haloMat);
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = 0.02;
      agent.add(halo);

      // 1. Pelvis / Hips Base (Calibrated for exact 1.76m standing character height)
      const hips = new T.Mesh(new T.BoxGeometry(0.52, 0.20, 0.36), pantsMaterial);
      hips.position.y = isSeated ? 0.50 : 0.73;
      hips.castShadow = true;
      agent.add(hips);

      // Belt with silver buckle
      const belt = new T.Mesh(new T.BoxGeometry(0.54, 0.06, 0.38), this.materials.dockBumper);
      belt.position.y = isSeated ? 0.58 : 0.81;
      const buckle = new T.Mesh(new T.BoxGeometry(0.12, 0.07, 0.40), this.materials.truckChrome);
      buckle.position.set(0, isSeated ? 0.58 : 0.81, 0.01);
      agent.add(belt, buckle);

      // 2. Torso with Layered Garments & Department Insignia
      const torsoY = isSeated ? 0.85 : 1.08;
      const torso = new T.Mesh(new T.BoxGeometry(0.60, 0.50, 0.38), shirtMat);
      torso.position.y = torsoY;
      torso.castShadow = true;
      agent.add(torso);

      // Outfit details follow the saved avatar profile and remain readable at City scale.
      const outfitDetails = this._createAvatarOutfitDetails(visualProfile, torsoY, shirtMat);
      agent.add(outfitDetails);

      // Role-Specific Tactical Armor or Lapel
      if (id === 'agent-security' && (!visualProfile?.outfit || visualProfile.outfit === 'armor')) {
        const armorPlate = new T.Mesh(new T.BoxGeometry(0.56, 0.44, 0.14), this.materials.dockBumper);
        armorPlate.position.set(0, torsoY + 0.02, 0.19);
        const badgeShield = new T.Mesh(new T.BoxGeometry(0.14, 0.16, 0.04), this.materials.truckChrome);
        badgeShield.position.set(-0.16, torsoY + 0.10, 0.27);
        agent.add(armorPlate, badgeShield);
      }

      // Lanyard & Security ID Badge
      const lanyard = new T.Mesh(new T.BoxGeometry(0.05, 0.38, 0.035), this.materials.hazardStripe);
      lanyard.position.set(0, torsoY + 0.06, 0.215);
      const idBadge = new T.Mesh(new T.BoxGeometry(0.18, 0.24, 0.04), this.materials.silverReflective);
      idBadge.position.set(0, torsoY - 0.12, 0.22);
      const idPhoto = new T.Mesh(new T.BoxGeometry(0.14, 0.10, 0.02), this.materials.fastLaneGlow);
      idPhoto.position.set(0, torsoY - 0.10, 0.24);
      agent.add(lanyard, idBadge, idPhoto);

      // 3. Neck & Anatomical Head
      const neck = new T.Mesh(new T.CylinderGeometry(0.11, 0.13, 0.10, 8), skinMaterial);
      neck.position.y = torsoY + 0.30;
      agent.add(neck);

      const head = new T.Mesh(new T.SphereGeometry(1, 16, 12), skinMaterial);
      head.scale.set(0.20, 0.18, 0.18);
      head.position.y = torsoY + 0.48;
      head.castShadow = true;
      agent.add(head);

      // 3b. Habbo Expressive Voxel Face
      const eyeL = new T.Mesh(new T.BoxGeometry(0.07, 0.08, 0.02), this.materials.eyePupil);
      eyeL.position.set(-0.09, torsoY + 0.49, 0.19);
      const eyeR = new T.Mesh(new T.BoxGeometry(0.07, 0.08, 0.02), this.materials.eyePupil);
      eyeR.position.set(0.09, torsoY + 0.49, 0.19);

      const specL = new T.Mesh(new T.BoxGeometry(0.025, 0.025, 0.01), this.materials.eyeSpec);
      specL.position.set(-0.08, torsoY + 0.51, 0.205);
      const specR = new T.Mesh(new T.BoxGeometry(0.025, 0.025, 0.01), this.materials.eyeSpec);
      specR.position.set(0.10, torsoY + 0.51, 0.205);

      const browL = new T.Mesh(new T.BoxGeometry(0.08, 0.025, 0.02), this.materials.eyebrowMat);
      browL.position.set(-0.09, torsoY + 0.55, 0.19);
      const browR = new T.Mesh(new T.BoxGeometry(0.08, 0.025, 0.02), this.materials.eyebrowMat);
      browR.position.set(0.09, torsoY + 0.55, 0.19);

      const mouth = new T.Mesh(new T.BoxGeometry(0.08, 0.025, 0.02), this.materials.mouthMat);
      mouth.position.set(0, torsoY + 0.40, 0.19);

      agent.add(eyeL, eyeR, specL, specR, browL, browR, mouth);

      // 3c. Hair Layering
      const hairMat = new T.MeshStandardMaterial({ color: hairColor, roughness: 0.75 });
      const hairTop = new T.Mesh(new T.SphereGeometry(1, 16, 12), hairMat);
      hairTop.scale.set(0.21, 0.11, 0.19);
      hairTop.position.set(0, torsoY + 0.62, -0.01);
      const hairBack = new T.Mesh(new T.SphereGeometry(1, 12, 10), hairMat);
      hairBack.scale.set(0.19, 0.16, 0.09);
      hairBack.position.set(0, torsoY + 0.47, -0.17);
      const hairSideL = new T.Mesh(new T.BoxGeometry(0.06, 0.24, 0.34), hairMat);
      hairSideL.position.set(-0.20, torsoY + 0.49, 0.01);
      const hairSideR = new T.Mesh(new T.BoxGeometry(0.06, 0.24, 0.34), hairMat);
      hairSideR.position.set(0.20, torsoY + 0.49, 0.01);
      const hairFringe = new T.Mesh(new T.BoxGeometry(0.36, 0.08, 0.08), hairMat);
      hairFringe.position.set(0, torsoY + 0.57, 0.15);
      const hairSpikes = [];

      if (visualProfile?.hairStyle === 'buzz') {
        hairTop.scale.set(0.205, 0.055, 0.185);
        hairBack.scale.set(0.18, 0.11, 0.08);
        hairSideL.scale.y = hairSideR.scale.y = 0.55;
        hairFringe.visible = false;
      } else if (visualProfile?.hairStyle === 'long') {
        hairBack.scale.set(0.20, 0.22, 0.10);
        hairBack.position.y = torsoY + 0.39;
      } else if (visualProfile?.hairStyle === 'bob') {
        hairSideL.scale.y = hairSideR.scale.y = 1.35;
        hairSideL.position.y = hairSideR.position.y = torsoY + 0.43;
      } else if (visualProfile?.hairStyle === 'crest') {
        hairTop.scale.set(0.16, 0.19, 0.15);
      } else if (visualProfile?.hairStyle === 'slick') {
        hairTop.position.z = -0.04;
        hairFringe.visible = false;
      } else if (visualProfile?.hairStyle === 'spiky') {
        [-0.10, 0, 0.10].forEach((x, index) => {
          const spike = new T.Mesh(new T.ConeGeometry(0.075, 0.18, 5), hairMat);
          spike.position.set(x, torsoY + 0.70, -0.015);
          spike.rotation.z = index === 0 ? -0.28 : index === 2 ? 0.28 : 0;
          hairSpikes.push(spike);
        });
      }

      agent.add(hairTop, hairBack, hairSideL, hairSideR, hairFringe, ...hairSpikes);

      // Neural Halo for Sora AI Core
      let neuralHaloMesh = null;
      if (id === 'agent-ai-core') {
        const neuralHalo = new T.Mesh(new T.TorusGeometry(0.30, 0.025, 8, 24), this.materials.neuralPurple);
        neuralHalo.rotation.x = Math.PI / 2;
        neuralHalo.position.set(0, torsoY + 0.95, 0);
        agent.add(neuralHalo);
        neuralHaloMesh = neuralHalo;
      }

      // 4. Role-Specific Eyewear / Headgear / Access Devices
      const accessoryDetails = this._createAvatarAccessoryDetails(accessory, torsoY);
      agent.add(accessoryDetails);

      // 4b. Overhead Habbo Floating Emote / Role Badge
      const emoteBadge = new T.Mesh(new T.BoxGeometry(0.46, 0.22, 0.06), this.materials.emoteBgMat);
      emoteBadge.position.set(0, torsoY + 0.85, 0);
      const emoteIcon = new T.Mesh(new T.BoxGeometry(0.40, 0.16, 0.03), this.materials.codeScreen);
      emoteIcon.position.set(0, torsoY + 0.85, 0.04);
      agent.add(emoteBadge, emoteIcon);

      // 5. Articulated Arms
      const armGeo = new T.BoxGeometry(0.15, 0.36, 0.16);
      const forearmGeo = new T.BoxGeometry(0.13, 0.34, 0.14);
      const handGeo = new T.BoxGeometry(0.11, 0.11, 0.11);

      let armL, forearmL, handL, armR, forearmR, handR, smartwatchLed, extraAccessory = null;

      if (isSeated) {
        armL = new T.Mesh(armGeo, shirtMat);
        armL.position.set(-0.36, torsoY + 0.08, 0.11);
        armL.rotation.x = Math.PI / 3.5;
        forearmL = new T.Mesh(forearmGeo, skinMaterial);
        forearmL.position.set(-0.36, torsoY - 0.06, 0.30);
        forearmL.rotation.x = Math.PI / 2.2;
        handL = new T.Mesh(handGeo, skinMaterial);
        handL.position.set(-0.36, torsoY - 0.06, 0.46);

        const watchBand = new T.Mesh(new T.BoxGeometry(0.15, 0.06, 0.16), this.materials.dockBumper);
        watchBand.position.set(-0.36, torsoY - 0.06, 0.38);
        watchBand.rotation.x = Math.PI / 2.2;
        smartwatchLed = new T.Mesh(new T.BoxGeometry(0.06, 0.05, 0.03), this.materials.smartwatchLedMat);
        smartwatchLed.position.set(-0.36, torsoY - 0.03, 0.38);
        smartwatchLed.rotation.x = Math.PI / 2.2;

        armR = new T.Mesh(armGeo, shirtMat);
        armR.position.set(0.36, torsoY + 0.08, 0.11);
        armR.rotation.x = Math.PI / 3.5;
        forearmR = new T.Mesh(forearmGeo, skinMaterial);
        forearmR.position.set(0.36, torsoY - 0.06, 0.30);
        forearmR.rotation.x = Math.PI / 2.2;
        handR = new T.Mesh(handGeo, skinMaterial);
        handR.position.set(0.36, torsoY - 0.06, 0.46);

        agent.add(armL, forearmL, handL, watchBand, smartwatchLed, armR, forearmR, handR);

        if (accessory === 'coffee') {
          const mug = new T.Mesh(new T.CylinderGeometry(0.08, 0.06, 0.14, 8), this.materials.ceramicWhite);
          mug.position.set(-0.36, torsoY - 0.02, 0.50);
          agent.add(mug);
          extraAccessory = mug;
        }
      } else {
        armL = new T.Mesh(armGeo, shirtMat);
        armL.position.set(-0.36, torsoY + 0.06, 0.03);
        forearmL = new T.Mesh(forearmGeo, skinMaterial);
        forearmL.position.set(-0.36, torsoY - 0.22, 0.09);
        forearmL.rotation.x = Math.PI / 6;

        const watchBand = new T.Mesh(new T.BoxGeometry(0.15, 0.06, 0.16), this.materials.dockBumper);
        watchBand.position.set(-0.36, torsoY - 0.22, 0.09);
        smartwatchLed = new T.Mesh(new T.BoxGeometry(0.06, 0.05, 0.03), this.materials.smartwatchLedMat);
        smartwatchLed.position.set(-0.36, torsoY - 0.20, 0.17);

        armR = new T.Mesh(armGeo, shirtMat);
        armR.position.set(0.36, torsoY + 0.06, 0.03);
        forearmR = new T.Mesh(forearmGeo, skinMaterial);
        forearmR.position.set(0.36, torsoY - 0.22, 0.09);
        forearmR.rotation.x = Math.PI / 6;

        agent.add(armL, forearmL, watchBand, smartwatchLed, armR, forearmR);

        if (accessory === 'tablet') {
          const tablet = new T.Mesh(new T.BoxGeometry(0.34, 0.22, 0.03), this.materials.fastLaneGlow);
          tablet.position.set(0, torsoY - 0.06, 0.28);
          tablet.rotation.x = -Math.PI / 4;
          agent.add(tablet);
          forearmL.rotation.x = Math.PI / 3;
          forearmR.rotation.x = Math.PI / 3;
          extraAccessory = tablet;
        } else if (accessory === 'multimeter') {
          const mm = new T.Mesh(new T.BoxGeometry(0.18, 0.25, 0.06), this.materials.hazardStripe);
          mm.position.set(0.32, torsoY - 0.12, 0.25);
          agent.add(mm);
          extraAccessory = mm;
        }
      }

      // 6. Legs & Footwear
      if (isSeated) {
        const thighGeo = new T.BoxGeometry(0.20, 0.18, 0.46);
        const calfGeo = new T.BoxGeometry(0.18, 0.44, 0.18);
        const shoeSoleGeo = new T.BoxGeometry(0.22, 0.05, 0.34);
        const shoeUpperGeo = new T.BoxGeometry(0.20, 0.11, 0.30);

        const thighL = new T.Mesh(thighGeo, pantsMaterial);
        thighL.position.set(-0.15, 0.46, 0.20);
        const thighR = new T.Mesh(thighGeo, pantsMaterial);
        thighR.position.set(0.15, 0.46, 0.20);

        const calfL = new T.Mesh(calfGeo, pantsMaterial);
        calfL.position.set(-0.15, 0.22, 0.41);
        const calfR = new T.Mesh(calfGeo, pantsMaterial);
        calfR.position.set(0.15, 0.22, 0.41);

        const shoeSoleL = new T.Mesh(shoeSoleGeo, this.materials.sneakerWhite);
        shoeSoleL.position.set(-0.15, 0.025, 0.44);
        const shoeUpperL = new T.Mesh(shoeUpperGeo, shoeMaterial);
        shoeUpperL.position.set(-0.15, 0.09, 0.44);

        const shoeSoleR = new T.Mesh(shoeSoleGeo, this.materials.sneakerWhite);
        shoeSoleR.position.set(0.15, 0.025, 0.44);
        const shoeUpperR = new T.Mesh(shoeUpperGeo, shoeMaterial);
        shoeUpperR.position.set(0.15, 0.09, 0.44);

        agent.add(thighL, thighR, calfL, calfR, shoeSoleL, shoeUpperL, shoeSoleR, shoeUpperR);
      } else {
        const legGeo = new T.BoxGeometry(0.20, 0.60, 0.22);
        const shoeSoleGeo = new T.BoxGeometry(0.24, 0.05, 0.36);
        const shoeUpperGeo = new T.BoxGeometry(0.22, 0.10, 0.32);

        const legL = new T.Mesh(legGeo, pantsMaterial);
        legL.position.set(-0.15, 0.35, 0);
        legL.castShadow = true;
        const legR = new T.Mesh(legGeo, pantsMaterial);
        legR.position.set(0.15, 0.35, 0);
        legR.castShadow = true;

        const shoeSoleL = new T.Mesh(shoeSoleGeo, this.materials.sneakerWhite);
        shoeSoleL.position.set(-0.15, 0.025, 0.05);
        const shoeUpperL = new T.Mesh(shoeUpperGeo, shoeMaterial);
        shoeUpperL.position.set(-0.15, 0.09, 0.05);

        const shoeSoleR = new T.Mesh(shoeSoleGeo, this.materials.sneakerWhite);
        shoeSoleR.position.set(0.15, 0.025, 0.05);
        const shoeUpperR = new T.Mesh(shoeUpperGeo, shoeMaterial);
        shoeUpperR.position.set(0.15, 0.09, 0.05);

        agent.add(legL, legR, shoeSoleL, shoeUpperL, shoeSoleR, shoeUpperR);
      }

      // Torso Interactive UserData & Raycast Target
      torso.userData = {
        agentId: id,
        type: 'agent',
        name: name,
        role: role,
        department: department
      };
      this.interactiveMeshes.push(torso);

      // Detail parts for LOD
      const detailParts = [idBadge, idPhoto, lanyard, smartwatchLed, emoteBadge, emoteIcon];
      if (extraAccessory) detailParts.push(extraAccessory);

      // Store references for dynamic animation & LOD
      agent.userData = {
        id,
        name,
        role,
        department,
        visualProfile,
        avatarMaterials: { skin: skinMaterial, hair: hairMat, shirt: shirtMat, pants: pantsMaterial, shoes: shoeMaterial, outfitDetails, accessoryDetails },
        type: 'humanoid',
        height: 1.76,
        totalHeight: 1.76,
        isSeated,
        armL,
        armR,
        forearmL,
        forearmR,
        head,
        emoteBadge,
        emoteIcon,
        smartwatchLed,
        halo,
        neuralHalo: neuralHaloMesh,
        faceParts: [eyeL, eyeR, specL, specR, browL, browR, mouth],
        identityParts: accessoryDetails.children,
        detailParts: detailParts
      };

      const bubbleText = String(role || 'Agente');
      const bubbleColor = id === 'agent-ai-core' ? '#c084fc' :
        id === 'agent-security' ? '#ef4444' :
        id === 'agent-infra' ? '#22c55e' : '#38bdf8';
      const bubbleEmoji = id === 'agent-ai-core' ? '🧠' :
        id === 'agent-security' ? '🛡️' :
        id === 'agent-infra' ? '🖥️' :
        id === 'agent-monitor' ? '📈' : '⚡';

      const thoughtBubble = new AgentThoughtBubble(agent, bubbleText, bubbleColor, bubbleEmoji);
      agent.userData.thoughtBubble = thoughtBubble;

      this.agents.set(id, {
        id: id,
        name: name,
        role: role,
        department: department,
        status: 'WORKING',
        state: 'WORKING',
        height: 1.76,
        mesh: agent,
        thoughtBubble,
        isInteriorStationed: Boolean(isSeated || department === 'API PLATFORM'),
        path: null,
        pathIndex: 0
      });

      return agent;
    }

    /* ══════════════════════════════════════════════════════════════════════════
       API PLATFORM HQ: HIGH-FIDELITY HERO ENVIRONMENT
       (Fastify Gateway · 7 Autonomous Agents · 42U Server Core · Neural Lab)
    ══════════════════════════════════════════════════════════════════════════ */
    _initApiPlatformComplex() {
      const bldGroup = new T.Group();
      bldGroup.name = 'ApiPlatformHeroComplex';
      placeAtDistrict(bldGroup, 'api-platform');
      bldGroup.userData = { type: 'building', name: 'ApiPlatformHeroComplex', floors: 4, floorHeight: 4.0 };

      const bW = 20, bD = 16, fH = 4.0;
      const podiumH = 0.5;

      // ── 0. Podium Foundation & Corporate Plaza ──
      const podium = new T.Mesh(new T.BoxGeometry(bW + 8, podiumH, bD + 8), this.materials.cyberFloor);
      podium.position.y = podiumH / 2;
      podium.receiveShadow = true;
      bldGroup.add(podium);

      // Granite Entrance Steps (Chamfered Plinth)
      const step1 = new T.Mesh(new T.BoxGeometry(8, 0.22, 2.5), this.materials.sidewalk);
      step1.position.set(0, 0.11, (bD + 8) / 2 - 1.25);
      const step2 = new T.Mesh(new T.BoxGeometry(7, 0.22, 1.8), this.materials.sidewalk);
      step2.position.set(0, 0.33, (bD + 8) / 2 - 2.15);
      bldGroup.add(step1, step2);

      // Recessed Ground In-Ground Uplights (LED Dots)
      for (let px = -bW / 2 - 2; px <= bW / 2 + 2; px += 3.2) {
        const upLight = new T.Mesh(new T.CylinderGeometry(0.18, 0.18, 0.06, 8), this.materials.fastLaneGlow);
        upLight.position.set(px, podiumH + 0.03, (bD + 6) / 2);
        bldGroup.add(upLight);
      }

      // Architectural Planter Boxes with Lush Greenery flanking the Entrance
      [-8, 8].forEach(px => {
        const planter = new T.Mesh(new T.BoxGeometry(3.2, 0.7, 1.4), this.materials.ceramicWhite);
        planter.position.set(px, podiumH + 0.35, (bD + 4) / 2);
        bldGroup.add(planter);
        for (let lx = -1.0; lx <= 1.0; lx += 1.0) {
          const plant = new T.Mesh(new T.DodecahedronGeometry(0.48), this.materials.leafDeciduous);
          plant.position.set(px + lx, podiumH + 0.85, (bD + 4) / 2);
          bldGroup.add(plant);
        }
      });

      // 4 Heavy Cylindrical Structural Columns (Brushed Titanium)
      const colGeo = new T.CylinderGeometry(0.42, 0.42, fH * 4, 16);
      for (let cx of [-bW / 2 + 0.6, bW / 2 - 0.6]) {
        for (let cz of [-bD / 2 + 0.6, bD / 2 - 0.6]) {
          const col = new T.Mesh(colGeo, this.materials.brushedTitanium);
          col.position.set(cx, podiumH + (fH * 4) / 2, cz);
          col.castShadow = true;
          bldGroup.add(col);
        }
      }

      // Solid Rear Wall (-Z) with Acoustic Baffle Texture
      const backWall = new T.Mesh(new T.BoxGeometry(bW, fH * 4, 0.6), this.materials.cyberWall);
      backWall.position.set(0, podiumH + (fH * 4) / 2, -bD / 2);
      backWall.castShadow = true; backWall.receiveShadow = true;
      bldGroup.add(backWall);

      // Left Wall (-X) with Vertical Architectural Louvers
      const leftWall = new T.Mesh(new T.BoxGeometry(0.6, fH * 4, bD), this.materials.cyberWall);
      leftWall.position.set(-bW / 2, podiumH + (fH * 4) / 2, 0);
      leftWall.castShadow = true; leftWall.receiveShadow = true;
      bldGroup.add(leftWall);

      // Right Wall (+X) with Large Floor-to-Ceiling Office Windows
      const rightWall = new T.Mesh(new T.BoxGeometry(0.6, fH * 4, bD), this.materials.officeGlass);
      rightWall.position.set(bW / 2, podiumH + (fH * 4) / 2, 0);
      bldGroup.add(rightWall);

      // Central Glass Elevator Core / Spine
      const liftShaft = new T.Mesh(new T.BoxGeometry(3.6, fH * 4, 3.6), this.materials.clearGlass);
      liftShaft.position.set(0, podiumH + (fH * 4) / 2, -bD / 4);
      const liftCab = new T.Mesh(new T.BoxGeometry(3.0, 3.2, 3.0), this.materials.brushedTitanium);
      liftCab.position.set(0, podiumH + 6.2, -bD / 4);
      bldGroup.add(liftShaft, liftCab);

      // Floor Groups & Rooftop Group for Intelligent Cutaway
      this.apiFloorGroups = [new T.Group(), new T.Group(), new T.Group(), new T.Group()];
      this.apiFloorGroups.forEach((fg, i) => {
        fg.name = `ApiFloor_${i}`;
        bldGroup.add(fg);
      });
      this.apiRoofGroup = new T.Group();
      this.apiRoofGroup.name = 'ApiRoof';
      bldGroup.add(this.apiRoofGroup);
      this.apiFloorSlabs = [];

      // Floor Slabs with Real Materials per Floor
      const floorMaterials = [
        this.materials.terrazzoFloor,   // Floor 0: Terrazzo
        this.materials.carpetFloor,     // Floor 1: Carpet Tiles
        this.materials.dataCenterFloor, // Floor 2: Raised Access Floor
        this.materials.quantumFloor     // Floor 3: Quantum Hex Epoxy
      ];

      for (let f = 0; f < 4; f++) {
        const slabY = podiumH + f * fH;
        const slab = new T.Mesh(new T.BoxGeometry(bW - 0.2, 0.35, bD - 0.2), floorMaterials[f]);
        slab.position.set(0, slabY + 0.175, 0);
        slab.receiveShadow = true;
        this.apiFloorGroups[f].add(slab);
        this.apiFloorSlabs.push(slab);

        const fascia = new T.Mesh(new T.BoxGeometry(bW + 0.4, 0.22, 0.25), this.materials.glowStripCyan);
        fascia.position.set(0, slabY + 0.175, bD / 2);
        this.apiFloorGroups[f].add(fascia);

        const balustrade = new T.Mesh(new T.BoxGeometry(bW, 0.85, 0.08), this.materials.clearGlass);
        balustrade.position.set(0, slabY + 0.775, bD / 2);
        const handrail = new T.Mesh(new T.BoxGeometry(bW, 0.06, 0.14), this.materials.brushedTitanium);
        handrail.position.set(0, slabY + 1.22, bD / 2);
        this.apiFloorGroups[f].add(balustrade, handrail);

        const cLight = new T.PointLight(
          f === 0 ? 0xffedd5 : f === 1 ? 0xf8fafc : f === 2 ? 0x00e5ff : 0xd946ef,
          f === 2 ? 1.8 : 1.5,
          20,
          1.2
        );
        cLight.position.set(0, slabY + fH - 0.4, 1.5);
        this.apiFloorGroups[f].add(cLight);
      }

      // ── FLOOR 0: RECEPTION & EXECUTIVE LOBBY ──
      const f0Y = podiumH;
      const deskGroup = new T.Group();
      deskGroup.position.set(0, f0Y + 0.55, 3.2);

      const deskBase = new T.Mesh(new T.BoxGeometry(5.2, 1.1, 1.4), this.materials.woodSlat);
      const deskTop = new T.Mesh(new T.BoxGeometry(5.6, 0.12, 1.6), this.materials.terrazzoFloor);
      deskTop.position.y = 0.58;
      const deskLed = new T.Mesh(new T.BoxGeometry(5.4, 0.05, 0.1), this.materials.fastLaneGlow);
      deskLed.position.set(0, 0.52, 0.76);
      deskGroup.add(deskBase, deskTop, deskLed);

      const recScreen1 = new T.Mesh(new T.BoxGeometry(0.9, 0.55, 0.04), this.materials.codeScreen);
      recScreen1.position.set(-0.6, 0.95, 0.1);
      const recScreen2 = new T.Mesh(new T.BoxGeometry(0.9, 0.55, 0.04), this.materials.grafanaScreen);
      recScreen2.position.set(0.6, 0.95, 0.1);
      const recKb = new T.Mesh(new T.BoxGeometry(0.8, 0.03, 0.25), this.materials.dockBumper);
      recKb.position.set(0, 0.65, 0.4);
      deskGroup.add(recScreen1, recScreen2, recKb);
      this.apiFloorGroups[0].add(deskGroup);

      const brandWall = new T.Mesh(new T.BoxGeometry(8, 3.6, 0.1), this.materials.woodSlat);
      brandWall.position.set(0, f0Y + 2.0, -bD / 4 + 2.0);
      const brandSign = new T.Mesh(new T.BoxGeometry(6.4, 0.6, 0.05), this.materials.fastLaneGlow);
      brandSign.position.set(0, f0Y + 2.8, -bD / 4 + 2.08);
      this.apiFloorGroups[0].add(brandWall, brandSign);

      const loungeGroup = new T.Group();
      loungeGroup.position.set(-5.5, f0Y, 3.0);

      const sofaMain = new T.Mesh(new T.BoxGeometry(3.6, 0.7, 1.4), this.materials.leatherCognac);
      sofaMain.position.set(0, 0.35, 0);
      const sofaBack = new T.Mesh(new T.BoxGeometry(3.6, 0.8, 0.4), this.materials.leatherCognac);
      sofaBack.position.set(0, 0.75, -0.5);
      const sofaReturn = new T.Mesh(new T.BoxGeometry(1.4, 0.7, 2.2), this.materials.leatherCognac);
      sofaReturn.position.set(-1.1, 0.35, 1.1);
      loungeGroup.add(sofaMain, sofaBack, sofaReturn);

      const loungeTableTop = new T.Mesh(new T.BoxGeometry(2.0, 0.06, 1.2), this.materials.clearGlass);
      loungeTableTop.position.set(0.6, 0.42, 0.8);
      const tableLegs = new T.Mesh(new T.BoxGeometry(1.8, 0.4, 1.0), this.materials.chromeMetal);
      tableLegs.position.set(0.6, 0.20, 0.8);
      loungeGroup.add(loungeTableTop, tableLegs);

      const pot = new T.Mesh(new T.CylinderGeometry(0.4, 0.3, 0.9, 12), this.materials.ceramicWhite);
      pot.position.set(-2.2, 0.45, -0.4);
      const plantLeaf = new T.Mesh(new T.DodecahedronGeometry(0.65), this.materials.monsteraLeaf);
      plantLeaf.position.set(-2.2, 1.15, -0.4);
      loungeGroup.add(pot, plantLeaf);
      this.apiFloorGroups[0].add(loungeGroup);

      const turnstileGroup = new T.Group();
      turnstileGroup.position.set(5.5, f0Y, 1.5);
      for (let tx of [-0.9, 0.9]) {
        const post = new T.Mesh(new T.BoxGeometry(0.35, 1.05, 1.2), this.materials.brushedTitanium);
        post.position.set(tx, 0.52, 0);
        const glassFlap = new T.Mesh(new T.BoxGeometry(0.04, 0.75, 0.5), this.materials.clearGlass);
        glassFlap.position.set(tx * 0.4, 0.65, 0);
        const ledIndicator = new T.Mesh(new T.BoxGeometry(0.12, 0.04, 0.12), this.materials.neonGreen);
        ledIndicator.position.set(tx, 1.06, 0.4);
        turnstileGroup.add(post, glassFlap, ledIndicator);
      }
      this.apiFloorGroups[0].add(turnstileGroup);

      const gabriel = this._createCyberHumanoid({
        id: 'agent-support',
        name: 'Gabriel Tech Support',
        role: 'Developer Relations & API Support Lead',
        department: 'API PLATFORM',
        pos: new T.Vector3(0, f0Y + 0.35, 1.8),
        shirtMat: this.materials.acousticDark,
        hairColor: 0x334155,
        accessory: 'headset',
        isSeated: false
      });
      this.apiFloorGroups[0].add(gabriel);

      // Main Entrance Door (1.2m width, 2.1m height)
      const entranceDoor = this._createEntranceDoor('ApiPlatformEntranceDoor');
      entranceDoor.position.set(0, f0Y, bD / 2);
      this.apiFloorGroups[0].add(entranceDoor);

      // ── FLOOR 1: API OPERATIONS & ENGINEERING LAB ──
      const f1Y = podiumH + fH;
      [-4.5, 4.5].forEach((px, idx) => {
        const deskPod = new T.Group();
        deskPod.position.set(px, f1Y, 1.8);

        const dLegL = new T.Mesh(new T.BoxGeometry(0.12, 0.9, 0.12), this.materials.brushedTitanium);
        dLegL.position.set(-1.6, 0.45, 0);
        const dLegR = new T.Mesh(new T.BoxGeometry(0.12, 0.9, 0.12), this.materials.brushedTitanium);
        dLegR.position.set(1.6, 0.45, 0);
        const dFootL = new T.Mesh(new T.BoxGeometry(0.16, 0.06, 1.2), this.materials.brushedTitanium);
        dFootL.position.set(-1.6, 0.03, 0);
        const dFootR = new T.Mesh(new T.BoxGeometry(0.16, 0.06, 1.2), this.materials.brushedTitanium);
        dFootR.position.set(1.6, 0.03, 0);

        const dTop = new T.Mesh(new T.BoxGeometry(3.8, 0.08, 1.6), this.materials.acousticDark);
        dTop.position.set(0, 0.94, 0);
        dTop.userData = {
          type: 'workstation',
          id: `station-api-0${idx + 1}`,
          name: idx === 0 ? 'Estação Alpha · Gateway & Routing' : 'Estação Beta · Integration & Schemas',
          assignedAgentId: idx === 0 ? 'agent-api-ops' : 'agent-integration',
          assignedAgentName: idx === 0 ? 'Alex Ops Lead' : 'Elena Architect',
          department: 'API PLATFORM',
          floorNum: 1
        };
        this.interactiveMeshes.push(dTop);
        const dCableSnake = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.9, 8), this.materials.dockBumper);
        dCableSnake.position.set(-1.5, 0.45, -0.4);
        deskPod.add(dLegL, dLegR, dFootL, dFootR, dTop, dCableSnake);

        const mStand = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 0.45, 8), this.materials.brushedTitanium);
        mStand.position.set(0, 1.15, -0.4);
        const mCrossbar = new T.Mesh(new T.BoxGeometry(1.8, 0.05, 0.05), this.materials.brushedTitanium);
        mCrossbar.position.set(0, 1.35, -0.38);

        const monL = new T.Mesh(new T.BoxGeometry(1.4, 0.85, 0.08), idx === 0 ? this.materials.codeScreen : this.materials.whiteboardMat);
        monL.position.set(-0.75, 1.45, -0.28);
        monL.rotation.y = Math.PI / 16;
        const monR = new T.Mesh(new T.BoxGeometry(1.4, 0.85, 0.08), this.materials.grafanaScreen);
        monR.position.set(0.75, 1.45, -0.28);
        monR.rotation.y = -Math.PI / 16;
        deskPod.add(mStand, mCrossbar, monL, monR);

        const dMat = new T.Mesh(new T.BoxGeometry(1.8, 0.02, 0.6), this.materials.dockBumper);
        dMat.position.set(0, 0.99, 0.2);
        const dKb = new T.Mesh(new T.BoxGeometry(0.9, 0.03, 0.28), this.materials.brushedTitanium);
        dKb.position.set(-0.15, 1.02, 0.2);
        const dMouse = new T.Mesh(new T.BoxGeometry(0.12, 0.04, 0.18), this.materials.dockBumper);
        dMouse.position.set(0.55, 1.02, 0.2);

        const pcTower = new T.Mesh(new T.BoxGeometry(0.35, 0.65, 0.65), this.materials.serverBlack);
        pcTower.position.set(1.4, 0.35, 0);
        const pcLed = new T.Mesh(new T.BoxGeometry(0.04, 0.04, 0.02), this.materials.fastLaneGlow);
        pcLed.position.set(1.4, 0.60, 0.33);
        deskPod.add(dMat, dKb, dMouse, pcTower, pcLed);

        const chairGroup = new T.Group();
        chairGroup.position.set(0, 0, 1.15);
        const cBase = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 0.08, 5), this.materials.chromeMetal);
        cBase.position.y = 0.08;
        const cGas = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.45, 8), this.materials.chromeMetal);
        cGas.position.y = 0.32;
        const cSeat = new T.Mesh(new T.BoxGeometry(0.75, 0.12, 0.72), this.materials.acousticDark);
        cSeat.position.y = 0.58;
        const cBack = new T.Mesh(new T.BoxGeometry(0.70, 0.85, 0.08), this.materials.acousticDark);
        cBack.position.set(0, 1.02, 0.32);
        const cHead = new T.Mesh(new T.BoxGeometry(0.38, 0.20, 0.08), this.materials.acousticDark);
        cHead.position.set(0, 1.50, 0.32);
        chairGroup.add(cBase, cGas, cSeat, cBack, cHead);
        deskPod.add(chairGroup);

        this.apiFloorGroups[1].add(deskPod);
      });

      const wbDivider = new T.Mesh(new T.BoxGeometry(0.12, 2.4, 3.8), this.materials.whiteboardMat);
      wbDivider.position.set(0, f1Y + 1.4, 1.8);
      this.apiFloorGroups[1].add(wbDivider);

      if (!this.liveKpiMaterial) {
        this._initLiveKpiCanvasTexture();
      }
      const telemetryWall = new T.Mesh(new T.BoxGeometry(12, 2.6, 0.08), this.liveKpiMaterial || this.materials.grafanaScreen);
      telemetryWall.position.set(0, f1Y + 2.2, -bD / 2 + 0.38);
      this.apiFloorGroups[1].add(telemetryWall);

      // ── CIRCULAR MEETING ISLAND (snapinsta-1793020553137 Reference) ──
      const meetingGroup = new T.Group();
      meetingGroup.name = 'ApiFloor1MeetingIsland';
      meetingGroup.position.set(0, f1Y, -2.4);

      // Circular Table Base & Pedestal
      const roundTablePedestal = new T.Mesh(new T.CylinderGeometry(0.35, 0.45, 0.82, 16), this.materials.brushedTitanium);
      roundTablePedestal.position.y = 0.41;
      const meetingTableTop = new T.Mesh(new T.CylinderGeometry(2.2, 2.2, 0.08, 32), this.materials.terrazzoFloor);
      meetingTableTop.position.y = 0.86;
      meetingTableTop.receiveShadow = true;
      const roundTableEdgeGlow = new T.Mesh(new T.TorusGeometry(2.21, 0.02, 8, 32), this.materials.fastLaneGlow);
      roundTableEdgeGlow.rotation.x = Math.PI / 2;
      roundTableEdgeGlow.position.y = 0.86;

      // Central 360 Conference Puck & Mic
      const confPuck = new T.Mesh(new T.CylinderGeometry(0.28, 0.32, 0.12, 16), this.materials.serverBlack);
      confPuck.position.y = 0.96;
      const confPuckRing = new T.Mesh(new T.TorusGeometry(0.29, 0.015, 8, 16), this.materials.serverLedGreen);
      confPuckRing.rotation.x = Math.PI / 2;
      confPuckRing.position.y = 1.0;
      meetingGroup.add(roundTablePedestal, meetingTableTop, roundTableEdgeGlow, confPuck, confPuckRing);

      // 4 Laptops around the table with emissive screens
      for (let li = 0; li < 4; li++) {
        const angle = (li * Math.PI) / 2 + Math.PI / 8;
        const lx = Math.cos(angle) * 1.4;
        const lz = Math.sin(angle) * 1.4;
        const lapGroup = new T.Group();
        lapGroup.position.set(lx, 0.90, lz);
        lapGroup.rotation.y = -angle - Math.PI / 2;

        const lapBase = new T.Mesh(new T.BoxGeometry(0.42, 0.018, 0.30), this.materials.brushedTitanium);
        const lapScreen = new T.Mesh(new T.BoxGeometry(0.42, 0.28, 0.015), this.materials.codeScreen);
        lapScreen.position.set(0, 0.14, -0.14);
        lapScreen.rotation.x = -0.22;
        lapGroup.add(lapBase, lapScreen);
        meetingGroup.add(lapGroup);
      }

      // 5 Swivel Chairs around the meeting table
      for (let ci = 0; ci < 5; ci++) {
        const angle = (ci * 2 * Math.PI) / 5;
        const cx = Math.cos(angle) * 2.6;
        const cz = Math.sin(angle) * 2.6;
        const chairGroup = new T.Group();
        chairGroup.position.set(cx, 0, cz);
        chairGroup.rotation.y = -angle + Math.PI / 2;

        const chBase = new T.Mesh(new T.CylinderGeometry(0.38, 0.38, 0.06, 5), this.materials.chromeMetal);
        chBase.position.y = 0.06;
        const chStem = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 0.42, 8), this.materials.chromeMetal);
        chStem.position.y = 0.27;
        const chSeat = new T.Mesh(new T.BoxGeometry(0.68, 0.08, 0.65), this.materials.acousticDark);
        chSeat.position.y = 0.52;
        const chBack = new T.Mesh(new T.BoxGeometry(0.64, 0.72, 0.06), this.materials.acousticDark);
        chBack.position.set(0, 0.88, 0.30);
        chairGroup.add(chBase, chStem, chSeat, chBack);
        meetingGroup.add(chairGroup);
      }

      // Modern plant pot on the side of the island
      const plantPot = new T.Mesh(new T.CylinderGeometry(0.35, 0.25, 0.8, 12), this.materials.ceramicWhite);
      plantPot.position.set(2.8, 0.4, 0.5);
      const plantFoliage = new T.Mesh(new T.DodecahedronGeometry(0.55), this.materials.monsteraLeaf);
      plantFoliage.position.set(2.8, 1.0, 0.5);
      meetingGroup.add(plantPot, plantFoliage);

      this.apiFloorGroups[1].add(meetingGroup);

      const alex = this._createCyberHumanoid({
        id: 'agent-api-ops',
        name: 'Alex Ops Lead',
        role: 'API Operations & Gateway Specialist',
        department: 'API PLATFORM',
        pos: new T.Vector3(-4.5, f1Y, 2.95),
        shirtMat: this.materials.serverLedBlue,
        hairColor: 0x1e293b,
        accessory: 'glasses',
        isSeated: true
      });
      this.apiFloorGroups[1].add(alex);

      const elena = this._createCyberHumanoid({
        id: 'agent-integration',
        name: 'Elena Architect',
        role: 'Integration Architect & Schema Validator',
        department: 'API PLATFORM',
        pos: new T.Vector3(4.5, f1Y, 2.95),
        shirtMat: this.materials.neuralPurple,
        hairColor: 0x641e16,
        accessory: 'coffee',
        isSeated: true
      });
      this.apiFloorGroups[1].add(elena);

      // ── FLOOR 2: SRE MONITORING ROOM, SECURITY VAULT & 42U SERVER RACKS ──
      const f2Y = podiumH + fH * 2;
      this.serverRacksLeds = [];

      [-6.5, -4.0, -1.5, 1.5, 4.0, 6.5].forEach((rx, idx) => {
        const rackGroup = new T.Group();
        rackGroup.position.set(rx, f2Y + 1.8, -bD / 4);

        const chassis = new T.Mesh(new T.BoxGeometry(1.8, 3.5, 1.6), this.materials.serverBlack);
        chassis.castShadow = true;
        rackGroup.add(chassis);

        const frontFace = new T.Mesh(new T.BoxGeometry(1.68, 3.35, 0.04), this.materials.serverBladeMat);
        frontFace.position.set(0, 0, 0.81);
        rackGroup.add(frontFace);

        for (let row = -1.3; row <= 1.3; row += 0.45) {
          const ledMat = (idx % 3 === 0) ? this.materials.serverLedCyan : (idx % 3 === 1) ? this.materials.serverLedGreen : this.materials.serverLedAmber;
          const led = new T.Mesh(new T.BoxGeometry(1.4, 0.06, 0.05), ledMat);
          led.position.set(0, row, 0.84);
          rackGroup.add(led);
          this.serverRacksLeds.push(led);
        }

        this.apiFloorGroups[2].add(rackGroup);
      });

      const fiberRunner = new T.Mesh(new T.BoxGeometry(16, 0.22, 0.4), this.materials.trussYellow);
      fiberRunner.position.set(0, f2Y + 3.8, -bD / 4);
      this.apiFloorGroups[2].add(fiberRunner);

      const sreConsole = new T.Mesh(new T.BoxGeometry(7.2, 0.95, 2.0), this.materials.cyberWall);
      sreConsole.position.set(0, f2Y + 0.48, 2.6);
      this.apiFloorGroups[2].add(sreConsole);

      for (let sm of [-2.4, 0, 2.4]) {
        const screen = new T.Mesh(new T.BoxGeometry(1.9, 0.95, 0.08), this.materials.grafanaScreen);
        screen.position.set(sm, f2Y + 1.5, 2.5);
        screen.rotation.y = sm < 0 ? Math.PI / 14 : sm > 0 ? -Math.PI / 14 : 0;
        this.apiFloorGroups[2].add(screen);
      }

      const lucas = this._createCyberHumanoid({
        id: 'agent-infra',
        name: 'Lucas SRE',
        role: 'Cloud Infrastructure & SRE Engineer',
        department: 'API PLATFORM',
        pos: new T.Vector3(-2.2, f2Y + 0.35, 4.0),
        shirtMat: this.materials.neonGreen,
        hairColor: 0x475569,
        accessory: 'multimeter',
        isSeated: false
      });
      this.apiFloorGroups[2].add(lucas);

      const maya = this._createCyberHumanoid({
        id: 'agent-monitor',
        name: 'Maya Observability',
        role: 'Telemetry & Observability Specialist',
        department: 'API PLATFORM',
        pos: new T.Vector3(1.8, f2Y, 3.8),
        shirtMat: this.materials.fastLaneGlow,
        hairColor: 0x7c2d12,
        accessory: 'headset',
        isSeated: true
      });
      this.apiFloorGroups[2].add(maya);

      const vaultDoor = new T.Mesh(new T.BoxGeometry(2.4, 3.4, 0.45), this.materials.brushedTitanium);
      vaultDoor.position.set(-bW / 2 + 0.45, f2Y + 1.7, -bD / 4);
      vaultDoor.rotation.y = Math.PI / 2;
      const vaultWheel = new T.Mesh(new T.TorusGeometry(0.4, 0.06, 8, 16), this.materials.chromeMetal);
      vaultWheel.position.set(-bW / 2 + 0.70, f2Y + 1.7, -bD / 4);
      vaultWheel.rotation.y = Math.PI / 2;
      const bioScanner = new T.Mesh(new T.BoxGeometry(0.25, 0.4, 0.08), this.materials.neonRed);
      bioScanner.position.set(-bW / 2 + 0.70, f2Y + 1.7, -bD / 4 + 1.6);
      bioScanner.rotation.y = Math.PI / 2;
      this.apiFloorGroups[2].add(vaultDoor, vaultWheel, bioScanner);

      const victor = this._createCyberHumanoid({
        id: 'agent-security',
        name: 'Victor Security',
        role: 'API Security & Zero-Trust Token Vault Guard',
        department: 'API PLATFORM',
        pos: new T.Vector3(-bW / 2 + 1.8, f2Y + 0.35, -bD / 4 + 1.6),
        shirtMat: this.materials.dockBumper,
        hairColor: 0x0f172a,
        accessory: 'none',
        isSeated: false
      });
      this.apiFloorGroups[2].add(victor);

      // ── FLOOR 3: COGNITIVE AI CORE & RESEARCH LAB ──
      const f3Y = podiumH + fH * 3;
      const neuralGroup = new T.Group();
      neuralGroup.position.set(0, f3Y + 2.2, 0);

      const octahedron = new T.Mesh(new T.OctahedronGeometry(1.6, 0), this.materials.neuralPurple);
      neuralGroup.add(octahedron);
      this.apiNeuralCore = octahedron;

      const ring1 = new T.Mesh(new T.TorusGeometry(2.4, 0.10, 8, 32), this.materials.fastLaneGlow);
      ring1.rotation.x = Math.PI / 3;
      const ring2 = new T.Mesh(new T.TorusGeometry(2.8, 0.08, 8, 32), this.materials.chromeMetal);
      ring2.rotation.y = Math.PI / 4;
      const ring3 = new T.Mesh(new T.TorusGeometry(3.2, 0.06, 8, 32), this.materials.serverLedCyan);
      ring3.rotation.z = Math.PI / 6;

      neuralGroup.add(ring1, ring2, ring3);
      this.apiNeuralRing = ring1;
      this.apiNeuralRing2 = ring2;
      this.apiNeuralRing3 = ring3;

      const tabletOffsets = [[-2.6, 0.8, -1.8], [2.6, 0.8, -1.8], [-2.6, -0.6, 1.8], [2.6, -0.6, 1.8]];
      tabletOffsets.forEach(([cx, cy, cz]) => {
        const mc = new T.Mesh(new T.BoxGeometry(0.65, 0.45, 0.05), this.materials.codeScreen);
        mc.position.set(cx, cy, cz);
        neuralGroup.add(mc);
      });
      this.apiFloorGroups[3].add(neuralGroup);

      const pedestal = new T.Mesh(new T.CylinderGeometry(0.8, 1.1, 0.6, 12), this.materials.brushedTitanium);
      pedestal.position.set(0, f3Y + 0.3, 0);
      const emitterGlow = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 0.08, 12), this.materials.fastLaneGlow);
      emitterGlow.position.set(0, f3Y + 0.62, 0);
      this.apiFloorGroups[3].add(pedestal, emitterGlow);

      const sora = this._createCyberHumanoid({
        id: 'agent-ai-core',
        name: 'Sora AI Core',
        role: 'Neural LLM Router & Semantic Engine',
        department: 'API PLATFORM',
        pos: new T.Vector3(0, f3Y + 0.35, 3.4),
        shirtMat: this.materials.silverReflective,
        hairColor: 0x9333ea,
        accessory: 'visor',
        isSeated: false
      });
      this.apiFloorGroups[3].add(sora);

      // ── ROOFTOP: COMMUNICATIONS ARRAY, SIGNAGE & HVAC ──
      const roofY = podiumH + fH * 4;

      const roofSlab = new T.Mesh(new T.BoxGeometry(bW + 0.6, 0.5, bD + 0.6), this.materials.cyberMullion);
      roofSlab.position.set(0, roofY + 0.25, 0);
      this.apiRoofGroup.add(roofSlab);
      this.apiRoofSlab = roofSlab;

      const parapetF = new T.Mesh(new T.BoxGeometry(bW + 0.6, 0.8, 0.3), this.materials.cyberWall);
      parapetF.position.set(0, roofY + 0.7, (bD + 0.3) / 2);
      const parapetB = new T.Mesh(new T.BoxGeometry(bW + 0.6, 0.8, 0.3), this.materials.cyberWall);
      parapetB.position.set(0, roofY + 0.7, -(bD + 0.3) / 2);
      this.apiRoofGroup.add(parapetF, parapetB);

      const dishGroup = new T.Group();
      dishGroup.position.set(-5.5, roofY + 0.5, -3.5);
      const dishBase = new T.Mesh(new T.CylinderGeometry(0.5, 0.7, 1.2, 8), this.materials.dockBumper);
      dishBase.position.y = 0.6;
      const dishReflector = new T.Mesh(new T.SphereGeometry(2.0, 16, 12, 0, Math.PI * 2, 0, Math.PI / 3), this.materials.truckChrome);
      dishReflector.position.set(0, 2.4, 0);
      dishReflector.rotation.x = -Math.PI / 4;
      const feedHorn = new T.Mesh(new T.ConeGeometry(0.2, 1.1, 8), this.materials.fastLaneGlow);
      feedHorn.position.set(0, 3.0, 1.0);
      feedHorn.rotation.x = Math.PI / 4;
      dishGroup.add(dishBase, dishReflector, feedHorn);
      this.apiRoofGroup.add(dishGroup);

      const towerGroup = new T.Group();
      towerGroup.position.set(5.5, roofY + 0.5, -3.5);
      const mast = new T.Mesh(new T.CylinderGeometry(0.14, 0.42, 8.5, 8), this.materials.truckChrome);
      mast.position.y = 4.25;
      const beacon = new T.Mesh(new T.SphereGeometry(0.35, 8, 8), this.materials.neonRed);
      beacon.position.y = 8.6;
      towerGroup.add(mast, beacon);
      this.apiRoofGroup.add(towerGroup);

      const hvac = new T.Mesh(new T.BoxGeometry(5.2, 1.9, 3.4), this.materials.sidewalk);
      hvac.position.set(0, roofY + 1.45, -2.5);
      hvac.castShadow = true;
      for (let fx of [-1.4, 1.4]) {
        const fan = new T.Mesh(new T.CylinderGeometry(0.7, 0.7, 0.15, 12), this.materials.dockBumper);
        fan.position.set(fx, roofY + 2.45, -2.5);
        this.apiRoofGroup.add(fan);
      }
      this.apiRoofGroup.add(hvac);

      const signBoard = new T.Mesh(new T.BoxGeometry(14.5, 1.5, 0.35), this.materials.serverBlack);
      signBoard.position.set(0, roofY + 1.25, bD / 2 + 0.2);
      const signText = new T.Mesh(new T.BoxGeometry(13.8, 0.85, 0.15), this.materials.glowStripCyan);
      signText.position.set(0, roofY + 1.25, bD / 2 + 0.4);
      this.apiRoofGroup.add(signBoard, signText);

      // ── VERTICAL OPTICAL DATA CONDUITS & INTER-FLOOR TOKEN BUS ──
      const conduitH = fH * 4 - 0.5;
      const conduitPositions = [-2.2, 2.2];
      this.apiDataPackets = [];

      conduitPositions.forEach((cx, cIdx) => {
        // Transparent optical fiber conduit tube
        const tube = new T.Mesh(
          new T.CylinderGeometry(0.22, 0.22, conduitH, 16),
          this.materials.opticalConduitGlass
        );
        tube.position.set(cx, podiumH + conduitH / 2, -bD / 4 + 2.5);
        bldGroup.add(tube);

        // Core optical glow filament inside the tube
        const coreFilament = new T.Mesh(
          new T.CylinderGeometry(0.04, 0.04, conduitH, 8),
          cIdx === 0 ? this.materials.serverLedCyan : this.materials.serverLedAmber
        );
        coreFilament.position.set(cx, podiumH + conduitH / 2, -bD / 4 + 2.5);
        bldGroup.add(coreFilament);

        // Floor collar rings at each floor transition
        for (let fl = 0; fl < 4; fl++) {
          const ringY = podiumH + fl * fH + 0.35;
          const collar = new T.Mesh(
            new T.TorusGeometry(0.28, 0.04, 8, 16),
            this.materials.brushedTitanium
          );
          collar.rotation.x = Math.PI / 2;
          collar.position.set(cx, ringY, -bD / 4 + 2.5);
          bldGroup.add(collar);

          const glowCollar = new T.Mesh(
            new T.TorusGeometry(0.25, 0.02, 6, 16),
            this.materials.glowStripCyan
          );
          glowCollar.rotation.x = Math.PI / 2;
          glowCollar.position.set(cx, ringY, -bD / 4 + 2.5);
          bldGroup.add(glowCollar);
        }

        // Active Animated Data Packets (Emissive token packets running between floors)
        const packetColors = [
          this.materials.tokenPacketCyan,
          this.materials.tokenPacketPurple,
          this.materials.tokenPacketGreen
        ];

        for (let p = 0; p < 4; p++) {
          const pMat = packetColors[(cIdx * 4 + p) % packetColors.length];
          const pktMesh = new T.Mesh(new T.BoxGeometry(0.18, 0.28, 0.18), pMat);
          const startY = podiumH + 0.6;
          const endY = podiumH + fH * 3.8;
          const initialY = startY + ((p + 1) / 5) * (endY - startY);
          pktMesh.position.set(cx, initialY, -bD / 4 + 2.5);
          pktMesh.visible = this.activeRuntimeJobs > 0;
          bldGroup.add(pktMesh);

          this.apiDataPackets.push({
            mesh: pktMesh,
            conduitX: cx,
            conduitZ: -bD / 4 + 2.5,
            startY,
            endY,
            currentY: initialY,
            speed: 1.2 + ((cIdx + p) % 4) * 0.4,
            dir: p % 2 === 0 ? 1 : -1,
            phase: ((cIdx * 4 + p) % 8) * (Math.PI / 4)
          });
        }
      });

      // ── INTERACTIVE RAYCAST BOUNDING BOX (For Company Selection) ──
      const clickTarget = new T.Mesh(
        new T.BoxGeometry(bW + 2, fH * 4 + 4, bD + 2),
        new T.MeshBasicMaterial({ visible: false })
      );
      clickTarget.position.set(0, (fH * 4 + 4) / 2, 0);
      clickTarget.userData = {
        districtId: 'api-platform',
        companyId: 'api-platform',
        type: 'company',
        name: 'API Platform'
      };
      this.interactiveMeshes.push(clickTarget);
      bldGroup.add(clickTarget);

      this.apiPlatformComplex = bldGroup;
      this.scene.add(bldGroup);
    }

    /* ══════════════════════════════════════════════════════════════════════════
       SURROUNDING METROPOLIS: 6 CANONICAL ARCHITECTURAL DISTRICT LANDMARKS
    ══════════════════════════════════════════════════════════════════════════ */
    _initSurroundingMetropolis() {
      // ── 1. CENTRAL FÊNIX HQ GLASS SKYSCRAPER & CIVIC PLAZA (x: 0, z: 0) ──
      const hqGroup = new T.Group();
      hqGroup.name = 'District_HQ';
      placeAtDistrict(hqGroup, 'command-center');

      // Paved Plaza with Reflecting Pool
      const plaza = new T.Mesh(new T.BoxGeometry(32, 0.4, 32), this.materials.sidewalk);
      plaza.position.y = 0.2;
      plaza.receiveShadow = true;
      hqGroup.add(plaza);

      const pool = new T.Mesh(new T.BoxGeometry(26, 0.3, 8), this.materials.water);
      pool.position.set(0, 0.25, 11);
      hqGroup.add(pool);

      // 7-Story Modern Glass Tower with Architectural Floor Slabs
      const hqLevels = 7;
      for (let l = 0; l < hqLevels; l++) {
        const size = 18 - l * 1.3;
        const floor = new T.Mesh(new T.BoxGeometry(size, 3.8, size), this.materials.officeGlass);
        floor.position.y = 2.0 + l * 4.2;
        floor.castShadow = true; floor.receiveShadow = true;
        hqGroup.add(floor);

        const slab = new T.Mesh(new T.BoxGeometry(size + 0.8, 0.4, size + 0.8), this.materials.sidewalk);
        slab.position.y = 4.0 + l * 4.2;
        hqGroup.add(slab);
      }

      // Rooftop Helipad with Yellow 'H'
      const heliBase = new T.Mesh(new T.CylinderGeometry(4.2, 4.2, 0.3, 16), this.materials.dockBumper);
      heliBase.position.y = hqLevels * 4.2 + 0.35;
      hqGroup.add(heliBase);
      const heliH = new T.Mesh(new T.BoxGeometry(2.4, 0.05, 0.6), this.materials.hazardStripe);
      heliH.position.y = hqLevels * 4.2 + 0.55;
      hqGroup.add(heliH);

      // Communications Spire Antenna
      const spire = new T.Mesh(new T.CylinderGeometry(0.12, 0.45, 16, 8), this.materials.truckChrome);
      spire.position.y = hqLevels * 4.2 + 8.2;
      hqGroup.add(spire);

      // Red Aeronautical Flashing Beacon on Spire Tip
      const beacon = new T.Mesh(new T.SphereGeometry(0.35, 8, 8), this.materials.neonRed);
      beacon.position.y = hqLevels * 4.2 + 16.3;
      hqGroup.add(beacon);

      // Main Entrance Door (1.2m width, 2.1m height)
      const hqDoor = this._createEntranceDoor('HQEntranceDoor');
      hqDoor.position.set(0, 0.4, 9.0);
      hqGroup.add(hqDoor);

      this.scene.add(hqGroup);

      // ── 2. AI NEXUS: GEODESIC DOME & QUANTUM NEURAL CORE (x: -22, z: -18) ──
      const aiGroup = new T.Group();
      aiGroup.name = 'District_AINexus';
      placeAtDistrict(aiGroup, 'ai-district');

      const aiDome = new T.Mesh(new T.SphereGeometry(9, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2), this.materials.officeGlass);
      aiDome.position.y = 0.1;
      aiDome.castShadow = true;
      aiGroup.add(aiDome);

      // Floating Quantum Neural Core
      const neuralCore = new T.Mesh(new T.OctahedronGeometry(2.6, 0), this.materials.neuralPurple);
      neuralCore.position.y = 4.8;
      aiGroup.add(neuralCore);

      const orbitalRing = new T.Mesh(new T.TorusGeometry(3.8, 0.15, 8, 24), this.materials.fastLaneGlow);
      orbitalRing.rotation.x = Math.PI / 3;
      orbitalRing.position.y = 4.8;
      aiGroup.add(orbitalRing);

      // 4 Server Cryo-Cooling Pods
      for (let a = 0; a < 4; a++) {
        const angle = (a * Math.PI) / 2 + Math.PI / 4;
        const px = Math.cos(angle) * 11.5;
        const pz = Math.sin(angle) * 11.5;
        const pod = new T.Mesh(new T.CylinderGeometry(1.4, 1.4, 4.5, 12), this.materials.sidewalk);
        pod.position.set(px, 2.25, pz);
        pod.castShadow = true;
        const podCap = new T.Mesh(new T.SphereGeometry(1.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), this.materials.fastLaneGlow);
        podCap.position.set(px, 4.5, pz);
        aiGroup.add(pod, podCap);
      }
      this.scene.add(aiGroup);

      // ── 3. DEV LOFT: INDUSTRIAL RED-BRICK ARCHITECTURE & WATER TOWER (x: -44, z: 14) ──
      const devGroup = new T.Group();
      devGroup.name = 'District_DevLoft';
      placeAtDistrict(devGroup, 'dev-district');

      const loft = new T.Mesh(new T.BoxGeometry(17, 10, 14), this.materials.brickWall);
      loft.position.y = 5;
      loft.castShadow = true; loft.receiveShadow = true;
      devGroup.add(loft);

      // Sawtooth Factory Roof with North-Facing Glazing
      for (let st = -4.5; st <= 4.5; st += 4.5) {
        const tooth = new T.Mesh(new T.BoxGeometry(17.2, 1.8, 3.4), this.materials.warehouseRoof);
        tooth.position.set(0, 10.9, st);
        tooth.rotation.x = Math.PI / 6;
        const stGlass = new T.Mesh(new T.BoxGeometry(17.1, 1.2, 0.2), this.materials.glass);
        stGlass.position.set(0, 10.6, st + 1.4);
        devGroup.add(tooth, stGlass);
      }

      // Exterior Iron Fire Escape Staircase
      const fireEscape = new T.Mesh(new T.BoxGeometry(1.8, 9.2, 0.4), this.materials.dockBumper);
      fireEscape.position.set(8.7, 4.6, 0);
      devGroup.add(fireEscape);

      // Rooftop Wooden Water Tank on Timber Trestle
      const trestle = new T.Mesh(new T.BoxGeometry(3.2, 4.2, 3.2), this.materials.dockBumper);
      trestle.position.set(-4.5, 12.1, -2.5);
      const tankCyl = new T.Mesh(new T.CylinderGeometry(1.9, 1.9, 3.4, 12), this.materials.palletWood);
      tankCyl.position.set(-4.5, 15.8, -2.5);
      const tankCap = new T.Mesh(new T.ConeGeometry(2.1, 1.2, 12), this.materials.warehouseRoof);
      tankCap.position.set(-4.5, 18.0, -2.5);
      devGroup.add(trestle, tankCyl, tankCap);
      this.scene.add(devGroup);

      // ── 4. PROJECT FORGE: HEAVY INDUSTRIAL ASSEMBLY PLANT & GANTRY CRANE (x: 20, z: 20) ──
      const forgeGroup = new T.Group();
      forgeGroup.name = 'District_ProjectForge';
      placeAtDistrict(forgeGroup, 'project-district');

      const hangar = new T.Mesh(new T.BoxGeometry(18, 9, 14), this.materials.warehouseWall);
      hangar.position.y = 4.5;
      hangar.castShadow = true;
      forgeGroup.add(hangar);

      // Overhead Gantry Crane Rail
      const gRailL = new T.Mesh(new T.BoxGeometry(0.4, 7, 16), this.materials.trussYellow);
      gRailL.position.set(-9.5, 3.5, 0);
      const gRailR = new T.Mesh(new T.BoxGeometry(0.4, 7, 16), this.materials.trussYellow);
      gRailR.position.set(9.5, 3.5, 0);
      const gSpan = new T.Mesh(new T.BoxGeometry(19.4, 0.6, 1.2), this.materials.trussYellow);
      gSpan.position.set(0, 6.8, 2);
      forgeGroup.add(gRailL, gRailR, gSpan);
      this.scene.add(forgeGroup);

      // ── 5. MEMORY VAULT: BRUTALIST DATA BUNKER & COOLING TOWERS (x: -8, z: 28) ──
      const vaultGroup = new T.Group();
      vaultGroup.name = 'District_MemoryVault';
      placeAtDistrict(vaultGroup, 'data-center');

      const bunker = new T.Mesh(new T.BoxGeometry(16, 7.5, 16), this.materials.dockBumper);
      bunker.position.y = 3.75;
      bunker.castShadow = true;
      vaultGroup.add(bunker);

      // Glowing Cyan Server Rack Louvers
      for (let ly = 1.5; ly < 6.5; ly += 1.2) {
        const louver = new T.Mesh(new T.BoxGeometry(14, 0.35, 0.1), this.materials.fastLaneGlow);
        louver.position.set(0, ly, 8.05);
        vaultGroup.add(louver);
      }

      // Dual Cylindrical Cooling Towers
      for (let ci of [-4.5, 4.5]) {
        const tower = new T.Mesh(new T.CylinderGeometry(2.4, 2.8, 6.5, 16), this.materials.sidewalk);
        tower.position.set(ci, 3.25, -5.5);
        vaultGroup.add(tower);
      }
      this.scene.add(vaultGroup);

      // ── 6. OBSERVATÓRIO: ASTRONOMICAL DOMES & SATELLITE DISH ARRAY (x: 0, z: -32) ──
      const obsGroup = new T.Group();
      obsGroup.name = 'District_Observatory';
      placeAtDistrict(obsGroup, 'observatory');

      const terrace = new T.Mesh(new T.CylinderGeometry(9, 10, 1.6, 8), this.materials.sidewalk);
      terrace.position.y = 0.8;
      terrace.receiveShadow = true;
      obsGroup.add(terrace);

      // ── CITYRT ELEGANT ARCHITECTURAL LIGHTING (Sky Lasers Completely Removed) ──
      this.neonBeams = [];
      const obsDome = new T.Mesh(new T.SphereGeometry(6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), this.materials.truckChrome);
      obsDome.position.y = 1.6;
      obsDome.castShadow = true;
      obsGroup.add(obsDome);

      const slot = new T.Mesh(new T.BoxGeometry(1.6, 5.5, 3.2), this.materials.dockBumper);
      slot.position.set(0, 4.2, 3.8);
      obsGroup.add(slot);

      const dish = new T.Mesh(new T.CylinderGeometry(2.8, 0.4, 0.8, 12), this.materials.sidewalk);
      dish.rotation.x = Math.PI / 3;
      dish.position.set(5.5, 3.6, -3);
      obsGroup.add(dish);
      this.scene.add(obsGroup);

      this.buildings = this.buildings || new Map();
      const canonicalBuildings = [
        { id: 'bld-fenix-hq', districtId: 'command-center', name: 'FÊNIX HQ Tower', floors: 7, group: hqGroup, position: districtOrigin('command-center'), status: 'ONLINE' },
        { id: 'bld-api-platform', districtId: 'api-platform', name: 'API Platform Complex', floors: 4, group: this.apiPlatformComplex, position: districtOrigin('api-platform'), status: 'ONLINE' },
        { id: 'bld-deposito-mais', districtId: 'logistics', name: 'Depósito Mais WMS Hub', floors: 2, group: this.warehouseGroup || null, position: districtOrigin('logistics'), status: 'ONLINE' },
        { id: 'bld-ai-nexus', districtId: 'ai-district', name: 'AI Nexus Quantum Dome', floors: 3, group: aiGroup, position: districtOrigin('ai-district'), status: 'ONLINE' },
        { id: 'bld-dev-loft', districtId: 'dev-district', name: 'Dev Loft Engineering', floors: 3, group: devGroup, position: districtOrigin('dev-district'), status: 'ONLINE' },
        { id: 'bld-project-forge', districtId: 'project-district', name: 'Project Forge Plant', floors: 2, group: forgeGroup, position: districtOrigin('project-district'), status: 'ONLINE' },
        { id: 'bld-memory-vault', districtId: 'data-center', name: 'Memory Vault Data Bunker', floors: 2, group: vaultGroup, position: districtOrigin('data-center'), status: 'ONLINE' },
        { id: 'bld-observatory', districtId: 'observatory', name: 'Observatório 24/7', floors: 2, group: obsGroup, position: districtOrigin('observatory'), status: 'ONLINE' }
      ];
      for (const bld of canonicalBuildings) {
        this.buildings.set(bld.id, bld);
      }
    }

    _initDistrictInteractionLabels() {
      if (!this.labelLayer) return;
      const districts = Object.values(this.DISTRICTS || {});
      const targets = {
        'command-center': { width: 20, height: 32, depth: 20, labelHeight: 49 },
        'dev-district': { width: 19, height: 14, depth: 16, labelHeight: 16 },
        'ai-district': { width: 22, height: 12, depth: 22, labelHeight: 15 },
        'project-district': { width: 22, height: 9, depth: 20, labelHeight: 11 },
        'data-center': { width: 18, height: 10, depth: 18, labelHeight: 13 },
        observatory: { width: 20, height: 10, depth: 20, labelHeight: 13 },
      };

      for (const district of districts) {
        const dimensions = targets[district.id];
        if (dimensions) {
          const hitBox = new T.Mesh(
            new T.BoxGeometry(dimensions.width, dimensions.height, dimensions.depth),
            new T.MeshBasicMaterial({ visible: false })
          );
          hitBox.position.set(district.x, dimensions.height / 2, district.z);
          hitBox.userData = {
            type: 'district',
            id: district.id,
            districtId: district.id,
            name: district.name,
            buildingId: window.FenixCityMachineScene?.canonicalBuildingId({ type: 'district', id: district.id }) || null,
          };
          this.scene.add(hitBox);
          this.interactiveMeshes.push(hitBox);
        }

        const element = document.createElement('button');
        element.type = 'button';
        element.className = 'fw3-label fw3-district-label';
        element.style.setProperty('--label-color', `#${Number(district.color).toString(16).padStart(6, '0')}`);
        element.setAttribute('aria-label', `Abrir ${district.name}`);
        element.title = `Abrir ${district.name} e consultar os dados reais`;
        const marker = document.createElement('span');
        marker.className = 'fw3-marker';
        marker.setAttribute('aria-hidden', 'true');
        const copy = document.createElement('span');
        copy.className = 'fw3-label-copy';
        const name = document.createElement('strong');
        name.textContent = district.name;
        const subtitle = document.createElement('small');
        subtitle.textContent = district.sub || 'Distrito operacional';
        copy.append(name, subtitle);
        element.append(marker, copy);
        element.addEventListener('click', () => {
          this.selectCityEntity?.('district', district.id);
          if (!this.selectCityEntity) this.focusDistrict(district.id);
        });
        this.labelLayer.appendChild(element);

        const label = {
          kind: 'district',
          id: district.id,
          element,
          position: new T.Vector3(district.x, dimensions?.labelHeight || (district.id === 'logistics' ? 22 : district.id === 'api-platform' ? 27 : 18), district.z),
        };
        this.state.labels.push(label);
        this.districtLabels.set(district.id, label);
      }
    }

    _updateDistrictLabels() {
      if (!this.districtLabels?.size || !this.host || !this.camera) return;
      const width = this.host.clientWidth;
      const height = this.host.clientHeight;
      if (!width || !height) return;
      const hostRect = this.host.getBoundingClientRect();
      const now = window.performance?.now?.() || Date.now();
      const cachedLayout = this._districtLabelLayoutCache;
      if (!cachedLayout || cachedLayout.width !== width || cachedLayout.height !== height || now - cachedLayout.measuredAt > 250) {
        const obstacles = [...document.querySelectorAll('.fw3-control-hint, .fw3-identity, .fw3-nav, .fw3-context, .fw3-pulse, #fenixWorldMinimap, #fenixCityNavPill, #fnxProviderOrbit, #fenixProviderOrbit, #cityRuntimeLoadStatus')]
          .map((node) => {
            const style = getComputedStyle(node), rect = node.getBoundingClientRect();
            if (style.display === 'none' || style.visibility === 'hidden' || rect.width <= 0 || rect.height <= 0) return null;
            return { left: rect.left - hostRect.left, right: rect.right - hostRect.left, top: rect.top - hostRect.top, bottom: rect.bottom - hostRect.top };
          })
          .filter(Boolean);
        this._districtLabelLayoutCache = { width, height, measuredAt: now, obstacles };
      }
      const placed = this._districtLabelLayoutCache.obstacles.map((rect) => ({ ...rect }));
      const offsets = [[0, 0], [0, -38], [0, 38], [-88, 0], [88, 0], [-88, -38], [88, -38], [-88, 38], [88, 38], [0, -76], [0, 76], [-176, 0], [176, 0], [-176, -38], [176, -38], [-176, 38], [176, 38]];
      const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
      for (const label of this.districtLabels.values()) {
        const point = label.position.clone().project(this.camera);
        const x = (point.x * width / 2) + width / 2;
        const y = (-point.y * height / 2) + height / 2;
        const visible = point.z > -1 && point.z < 1 && x >= -24 && x <= width + 24 && y >= -24 && y <= height + 24;
        label.element.hidden = !visible;
        if (!visible) continue;

          const measured = label.element.getBoundingClientRect?.() || { width: 0, height: 0 };
          const defaultWidth = 140;
          const defaultHeight = 34;
          label.layoutSize = {
            width,
            height,
            labelWidth: measured.width > 0 ? measured.width : defaultWidth,
            labelHeight: measured.height > 0 ? measured.height : defaultHeight
          };
        const { labelWidth, labelHeight } = label.layoutSize;
        const minX = labelWidth / 2 + 6;
        const maxX = width - minX;
        const minY = labelHeight * 1.1 + 6;
        const maxY = height + labelHeight * 0.1 - 6;
        let chosen = null;
        for (const [offsetX, offsetY] of offsets) {
          const centerX = clamp(x + offsetX, minX, maxX);
          const anchorY = clamp(y + offsetY, minY, maxY);
          const rect = {
            left: centerX - labelWidth / 2,
            right: centerX + labelWidth / 2,
            top: anchorY - labelHeight * 1.1,
            bottom: anchorY - labelHeight * 0.1,
          };
          const collides = placed.some((other) => rect.left < other.right + 8 && rect.right > other.left - 8 && rect.top < other.bottom + 6 && rect.bottom > other.top - 6);
          if (!collides) {
            chosen = { centerX, anchorY, rect };
            break;
          }
        }
        if (!chosen) {
          label.element.hidden = true;
          continue;
        }
        label.element.style.left = `${chosen.centerX}px`;
        label.element.style.top = `${chosen.anchorY}px`;
        placed.push(chosen.rect);
      }
    }

    _initAmbientCityFabric() {
      const fabric = new T.Group();
      fabric.name = 'AmbientCityFabric';
      fabric.userData = { type: 'city-scenery', interactive: true };
      this.projectBuildings = new Map();

      // Project Registry & CityRT Urban Lots (All 44 projects mapped to street-facing parcels)
      const projectLots = [
        // Core & Tech Hub (Block NW - Dev & Engineering)
        { id: 'zapflow-crm', name: 'ZapFlow CRM', port: '8182', x: -24, z: 15, w: 12, d: 11, floors: 3, roofType: 'mansard', awning: 'awningBlue', cat: 'CRM' },
        { id: 'ius-email-control', name: 'IUS Email Control', port: '1000', x: -14, z: 27, w: 11, d: 12, floors: 4, roofType: 'terracotta', awning: 'awningGreen', cat: 'Tools' },
        { id: 'zai-crm', name: 'ZAI CRM', port: '8080', x: -28, z: 27, w: 11, d: 11, floors: 3, roofType: 'mansard', awning: 'awningAmber', cat: 'CRM' },
        // AI & Cognitive Hub (Block NE)
        { id: 'qwen-studio', name: 'Qwen Studio', port: '7860', x: 22, z: 15, w: 13, d: 12, floors: 4, roofType: 'parapet', awning: 'awningBlue', cat: 'AI' },
        { id: 'meta-autoposter', name: 'Meta AutoPoster', port: 'Auto', x: 14, z: 27, w: 11, d: 11, floors: 3, roofType: 'terracotta', awning: 'awningRed', cat: 'Social' },
        { id: 'meta-instagram-autoposter', name: 'Instagram AutoPoster', port: 'Insta', x: 28, z: 27, w: 11, d: 11, floors: 3, roofType: 'mansard', awning: 'awningRed', cat: 'Social' },
        // Commerce & Services Hub (Block SW)
        { id: 'mf-atacadista', name: 'MF Atacadista', port: '8181', x: -22, z: -15, w: 14, d: 13, floors: 2, roofType: 'parapet', awning: 'awningRed', cat: 'Retail' },
        { id: 'marmita-da-casa', name: 'Marmita da Casa', port: 'Food', x: -14, z: -27, w: 11, d: 11, floors: 2, roofType: 'terracotta', awning: 'awningGreen', cat: 'Service' },
        { id: 'zapai-crm', name: 'ZapAI CRM', port: 'CRM', x: -28, z: -27, w: 11, d: 11, floors: 3, roofType: 'mansard', awning: 'awningBlue', cat: 'CRM' },
        // Operations & Gateway Hub (Block SE)
        { id: 'fortlev-quote', name: 'Fortlev B2B Quote', port: 'B2B', x: 22, z: -15, w: 12, d: 11, floors: 3, roofType: 'terracotta', awning: 'awningAmber', cat: 'Commerce' },
        { id: 'api-platform', name: 'API Gateway Ops', port: '4410', x: 14, z: -27, w: 12, d: 12, floors: 4, roofType: 'parapet', awning: 'awningBlue', cat: 'Gateway' },
        { id: 'fenix-os', name: 'Fênix OS Core', port: '4400', x: 28, z: -27, w: 12, d: 12, floors: 5, roofType: 'mansard', awning: 'awningGreen', cat: 'Core' },
        // West Flank Street Parcels
        { id: 'project-dev-studio', name: 'Dev Studio', port: '3001', x: -61, z: 12, w: 12, d: 12, floors: 3, roofType: 'mansard', awning: 'awningBlue', cat: 'Dev' },
        { id: 'project-code-engine', name: 'Code Engine', port: '8090', x: -61, z: -12, w: 12, d: 12, floors: 3, roofType: 'terracotta', awning: 'awningAmber', cat: 'Dev' },
        { id: 'project-memory-core', name: 'Memory Core', port: '6379', x: -61, z: 42, w: 12, d: 12, floors: 3, roofType: 'parapet', awning: 'awningGreen', cat: 'Data' },
        { id: 'project-vector-store', name: 'Vector Vault', port: '6333', x: -61, z: -42, w: 12, d: 12, floors: 3, roofType: 'mansard', awning: 'awningBlue', cat: 'AI' },
        // East Flank Street Parcels
        { id: 'project-analytics', name: 'Live Analytics', port: '3002', x: 61, z: 12, w: 12, d: 12, floors: 3, roofType: 'terracotta', awning: 'awningAmber', cat: 'Ops' },
        { id: 'project-monitoring', name: 'Observability 360', port: '9090', x: 61, z: 32, w: 12, d: 12, floors: 4, roofType: 'parapet', awning: 'awningBlue', cat: 'Ops' },
        { id: 'project-billing-gateway', name: 'Billing Gateway', port: '5000', x: 61, z: 54, w: 12, d: 12, floors: 3, roofType: 'mansard', awning: 'awningGreen', cat: 'Fin' },
        // North Flank Parcels
        { id: 'project-agent-mesh', name: 'Agent Mesh Swarm', port: '4200', x: -22, z: 62, w: 14, d: 12, floors: 4, roofType: 'mansard', awning: 'awningBlue', cat: 'Swarm' },
        { id: 'project-neural-search', name: 'Neural Search', port: '8000', x: 22, z: 62, w: 14, d: 12, floors: 3, roofType: 'terracotta', awning: 'awningAmber', cat: 'Search' },
        // South Flank Parcels
        { id: 'project-security-vault', name: 'Security Vault', port: 'Auth', x: -22, z: -62, w: 14, d: 12, floors: 3, roofType: 'parapet', awning: 'awningRed', cat: 'Security' },
        { id: 'project-event-bus', name: 'Event Bus Kafka', port: '9092', x: 22, z: -62, w: 14, d: 12, floors: 3, roofType: 'mansard', awning: 'awningGreen', cat: 'Events' }
      ];

      const facades = [
        this.materials.urbanFacadeSand,
        this.materials.urbanFacadeTerracotta,
        this.materials.urbanFacadeGlass,
        this.materials.urbanFacadeIvory
      ];

      const cityrtFacades = [
        this.materials.cityrtFacadeCream || this.materials.urbanFacadeSand,
        this.materials.cityrtFacadeTerracotta || this.materials.urbanFacadeTerracotta,
        this.materials.cityrtFacadeOchre || this.materials.urbanFacadeIvory,
        this.materials.cityrtFacadeSage || this.materials.urbanFacadeGlass
      ];

      projectLots.forEach((lot, lotIdx) => {
        const bGroup = new T.Group();
        bGroup.name = 'ProjectBuilding_' + lot.id;
        bGroup.position.set(lot.x, 0, lot.z);
        bGroup.userData = {
          type: 'project-building',
          projectId: lot.id,
          name: lot.name,
          port: lot.port,
          category: lot.cat,
          floors: lot.floors
        };

        const isOnline = lot.port === '4400' || lot.port === '1000' || lot.port === '8182' || lot.port === '8181' || lot.port === '8080';
        // Dynamic floor calculation: active systems grow taller in floors!
        const totalFloors = Math.min(5, Math.max(2, (lot.floors || 2) + (isOnline ? 1 : 0)));
        const floorH = 2.9;
        const bldH = totalFloors * floorH;
        const facadeMat = cityrtFacades[lotIdx % cityrtFacades.length];

        // 1. Rusticated Stone Base Floor (Pedestrian Entrance Level) with Ligne Claire
        const baseH = 3.2;
        const baseMesh = new T.Mesh(
          new T.BoxGeometry(lot.w + 0.3, baseH, lot.d + 0.3),
          this.materials.stoneRustication || this.materials.sidewalk
        );
        baseMesh.position.y = baseH / 2 + 0.16;
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        this._applyLigneClaire(baseMesh, 30);
        bGroup.add(baseMesh);

        // Ground Floor Entrance Door facing street
        const door = this._createEntranceDoor('Door_' + lot.id);
        door.position.set(0, 0.16, lot.d / 2 + 0.18);
        this._applyLigneClaire(door, 30);
        bGroup.add(door);

        // Fabric Awning over Entrance with Ligne Claire
        const awningMat = this.materials[lot.awning] || this.materials.awningBlue;
        const awning = new T.Mesh(new T.BoxGeometry(Math.min(5.2, lot.w * 0.48), 0.32, 1.6), awningMat);
        awning.position.set(0, 2.75, lot.d / 2 + 0.85);
        awning.rotation.x = Math.PI / 18;
        awning.castShadow = true;
        this._applyLigneClaire(awning, 25);
        bGroup.add(awning);

        // Storefront Signboard with Project Title & Port with Ligne Claire
        const signTex = TextureFactory.createStorefrontSignTexture(lot.name, lot.port, isOnline, lot.awning === 'awningRed' ? '#ef4444' : '#3b82f6');
        const signMat = new T.MeshStandardMaterial({ map: signTex, roughness: 0.3, metalness: 0.2 });
        const signMesh = new T.Mesh(new T.BoxGeometry(Math.min(6.2, lot.w * 0.58), 1.25, 0.12), signMat);
        signMesh.position.set(0, 3.45, lot.d / 2 + 0.22);
        this._applyLigneClaire(signMesh, 35);
        bGroup.add(signMesh);

        // 2. Individual Architectural Upper Floors with Cornices & Ligne Claire Inking
        for (let fl = 1; fl < totalFloors; fl++) {
          const flY = baseH + (fl - 1) * floorH;
          const flMesh = new T.Mesh(new T.BoxGeometry(lot.w, floorH, lot.d), facadeMat);
          flMesh.position.y = flY + floorH / 2 + 0.16;
          flMesh.castShadow = true;
          flMesh.receiveShadow = true;
          this._applyLigneClaire(flMesh, 30);
          bGroup.add(flMesh);

          // Floor Cornice Band (Stone molding dividing floors)
          const cornice = new T.Mesh(
            new T.BoxGeometry(lot.w + 0.5, 0.20, lot.d + 0.5),
            this.materials.sidewalk
          );
          cornice.position.y = flY + 0.16;
          cornice.castShadow = true;
          this._applyLigneClaire(cornice, 35);
          bGroup.add(cornice);
        }

        // 3. CityRT Architectural Roofs with Ligne Claire
        const roofY = bldH + 0.16;
        if (lot.roofType === 'mansard') {
          const mansard = this._createMansardRoof(lot.w, lot.d, 2.8);
          mansard.position.y = roofY;
          bGroup.add(mansard);
        } else if (lot.roofType === 'terracotta') {
          const pitched = this._createPitchedRoof(lot.w, lot.d, 2.6);
          pitched.position.y = roofY;
          bGroup.add(pitched);
        } else {
          // Classic European Flat Roof with Balustrade & Cornice
          const roofSlab = new T.Mesh(
            new T.BoxGeometry(lot.w + 0.5, 0.35, lot.d + 0.5),
            this.materials.sidewalk
          );
          roofSlab.position.y = roofY + 0.17;
          roofSlab.castShadow = true;
          this._applyLigneClaire(roofSlab, 35);
          bGroup.add(roofSlab);

          const parapetTrim = new T.Mesh(
            new T.BoxGeometry(lot.w + 0.7, 0.45, lot.d + 0.7),
            this.materials.dockBumper
          );
          parapetTrim.position.y = roofY + 0.45;
          this._applyLigneClaire(parapetTrim, 35);
          bGroup.add(parapetTrim);
        }

        // 4. Raycast Interactive Hit Box
        const hitBox = new T.Mesh(
          new T.BoxGeometry(lot.w + 1.2, bldH + 3.2, lot.d + 1.2),
          new T.MeshBasicMaterial({ visible: false })
        );
        hitBox.position.y = (bldH + 3.2) / 2;
        hitBox.userData = {
          type: 'project',
          id: lot.id,
          projectId: lot.id,
          name: lot.name,
          port: lot.port,
          category: lot.cat,
          isOnline: isOnline
        };
        bGroup.add(hitBox);
        this.interactiveMeshes.push(hitBox);
        this.projectBuildings.set(lot.id, { group: bGroup, hitBox, lot, isOnline });

        fabric.add(bGroup);
      });

      this.scene.add(fabric);
    }

    _initVehicles() {
      // 1. Freight Truck #1 backed into Doca 1
      const truck1 = this._createHeavyFreightTruck(this.materials.truckCabinBlue, true);
      truck1.position.copy(districtPoint('logistics', -9.2, 0, 20.5));
      this.scene.add(truck1);

      // 2. Forklift at Doca 2
      this.forkliftGroup = this._createForklift();
      this.forkliftGroup.position.copy(districtPoint('logistics', 0, 0.9, 13.5));
      this.scene.add(this.forkliftGroup);

      // 3. Delivery Box Van parked at staging yard
      const boxVan = this._createDeliveryBoxVan(this.materials.depositoRed);
      boxVan.position.copy(districtPoint('logistics', 14, 0, 14));
      boxVan.rotation.y = -Math.PI / 4;
      this.scene.add(boxVan);

      // 4. Moving Highway Traffic
      const highwayTruck = this._createDeliveryBoxVan(this.materials.containerBlue);
      const trafficRoute = window.FenixCityMachineScene?.LOGISTICS_TRAFFIC_ROUTE || { x: 22, startZ: -37, endZ: -4, speed: 3.4 };
      highwayTruck.position.set(trafficRoute.x, 0, trafficRoute.startZ);
      this.scene.add(highwayTruck);
      this.trafficVehicle = { mesh: highwayTruck, x: trafficRoute.x, z: trafficRoute.startZ, direction: 1, speed: trafficRoute.speed };

      // 5. Executive Sedan Car parked near API Platform Complex
      const sedanCar = this._createSedanCar(this.materials.dockBumper);
      sedanCar.position.copy(districtPoint('api-platform', 10, 0, 14));
      sedanCar.rotation.y = Math.PI / 6;
      this.scene.add(sedanCar);
      this.sedanCar = sedanCar;
    }

    /* ══════════════════════════════════════════════════════════════════════════
       DATA FLOW PIPELINES: FAST LANE & JOB LANE (Ground-Level Optical Conduits)
    ══════════════════════════════════════════════════════════════════════════ */
    _initDataFlowPipelines() {
      const pGroup = new T.Group();
      const hq = districtPoint('command-center', 0, 0.28, 0);
      const depot = districtPoint('logistics', 0, 0.28, 0);
      const platform = districtPoint('api-platform', 0, 0.28, 0);

      // Ground-level optical fiber trench between HQ and Depósito Mais
      const depotLength = hq.distanceTo(depot);
      const conduit = new T.Mesh(
        new T.BoxGeometry(depotLength, 0.08, 0.36),
        this.materials.opticalConduitGlass || this.materials.cyberMullion
      );
      conduit.position.set((hq.x + depot.x) / 2, 0.06, (hq.z + depot.z) / 2);
      conduit.rotation.y = Math.atan2(hq.z - depot.z, depot.x - hq.x);
      pGroup.add(conduit);

      // Fast Lane: High-Speed Cyan Optical Pulses along ground conduit
      for (let i = 0; i < 6; i++) {
        const pulse = new T.Mesh(new T.SphereGeometry(0.24, 8, 8), this.materials.fastLaneGlow);
        pGroup.add(pulse);
        this.dataPulses.push({
          mesh: pulse,
          start: hq.clone(),
          end: depot.clone(),
          progress: i / 6,
          speed: 0.009
        });
      }

      // Ground-level optical fiber trench between API Platform and central HQ
      const apiLength = hq.distanceTo(platform);
      const apiConduit = new T.Mesh(
        new T.BoxGeometry(apiLength, 0.08, 0.32),
        this.materials.opticalConduitGlass || this.materials.cyberMullion
      );
      apiConduit.position.set((hq.x + platform.x) / 2, 0.06, (hq.z + platform.z) / 2);
      apiConduit.rotation.y = Math.atan2(hq.z - platform.z, platform.x - hq.x);
      pGroup.add(apiConduit);

      // Cyan Optical Pulses from API Platform to Central HQ
      for (let k = 0; k < 4; k++) {
        const pulse = new T.Mesh(new T.SphereGeometry(0.22, 8, 8), this.materials.fastLaneGlow);
        pGroup.add(pulse);
        this.dataPulses.push({
          mesh: pulse,
          start: platform.clone(),
          end: hq.clone(),
          progress: k / 4,
          speed: 0.012
        });
      }

      // Job Lane: Amber Volumetric Payload Capsules along ground corridor
      for (let j = 0; j < 3; j++) {
        const capsule = new T.Mesh(new T.BoxGeometry(0.8, 0.45, 1.2), this.materials.jobLaneGlow);
        pGroup.add(capsule);
        this.dataPulses.push({
          mesh: capsule,
          start: districtPoint('logistics', 0, 0.35, 14),
          end: districtPoint('command-center', 0, 0.35, 0),
          progress: j / 3,
          speed: 0.003
        });
      }

      this.scene.add(pGroup);
      this.dataPulses.forEach((pulse) => {
        if (pulse.mesh) pulse.mesh.visible = false;
      });
    }

    _bindEvents() {
      const c = this.canvas;
      c.addEventListener('pointerdown', (e) => {
        if (e.isPrimary === false) return;
        const canPan = e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey);
        if (e.button !== 0 && !canPan) return;
        e.preventDefault?.();
        this.cameraState.dragging = true;
        this.cameraState.dragPointerId = e.pointerId ?? 1;
        this.cameraState.dragButton = e.button;
        this.cameraState.dragMode = canPan ? 'pan' : 'orbit';
        this.cameraState.targetAzimuth = null;
        this.cameraState.targetElevation = null;
        this.cameraState.dragStartX = e.clientX;
        this.cameraState.dragStartY = e.clientY;
        this.cameraState.lastX = e.clientX;
        this.cameraState.lastY = e.clientY;
        this.cameraState.moved = false;
        try { c.setPointerCapture?.(this.cameraState.dragPointerId); } catch {}
      });

      c.addEventListener('pointermove', (e) => {
        if (!this.cameraState.dragging || e.pointerId !== this.cameraState.dragPointerId) {
          this._updateRaycast(e);
          return;
        }
        const dx = e.clientX - this.cameraState.lastX;
        const dy = e.clientY - this.cameraState.lastY;
        const totalX = e.clientX - this.cameraState.dragStartX;
        const totalY = e.clientY - this.cameraState.dragStartY;
        this.cameraState.lastX = e.clientX;
        this.cameraState.lastY = e.clientY;
        if (!this.cameraState.moved && Math.hypot(totalX, totalY) <= 4) return;
        this.cameraState.moved = true;
        if (this.cameraState.dragMode === 'pan') {
          this.panCameraByPixels(dx, dy);
        } else {
          this.cameraState.azimuth -= dx * 0.006;
          this.cameraState.elevation = Math.max(0.2, Math.min(1.2, this.cameraState.elevation + dy * 0.005));
        }
        this._updateCameraPosition(true);
      });

      c.addEventListener('pointerup', (e) => {
        if (!this.cameraState.dragging || e.pointerId !== this.cameraState.dragPointerId) return;
        const dragMode = this.cameraState.dragMode;
        const dragButton = this.cameraState.dragButton;
        const moved = this.cameraState.moved;
        this.cameraState.dragging = false;
        this.cameraState.dragPointerId = null;
        const rect = c.getBoundingClientRect();
        const releasedInside = e.clientX >= rect.left && e.clientX <= rect.right
          && e.clientY >= rect.top && e.clientY <= rect.bottom;
        if (!moved && dragMode === 'orbit' && dragButton === 0 && releasedInside) this._handleCanvasClick(e);
        try {
          if (c.hasPointerCapture?.(e.pointerId)) c.releasePointerCapture(e.pointerId);
        } catch {}
        this._saveState();
      });

      const cancelPointer = (e) => {
        if (!this.cameraState.dragging || e.pointerId !== this.cameraState.dragPointerId) return;
        const moved = this.cameraState.moved;
        this.cameraState.dragging = false;
        this.cameraState.dragPointerId = null;
        if (moved) this._saveState();
      };
      c.addEventListener('pointercancel', cancelPointer);
      c.addEventListener('lostpointercapture', cancelPointer);
      c.addEventListener('contextmenu', (e) => e.preventDefault());

      c.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = c.getBoundingClientRect();
        const unit = e.deltaMode === 1 ? 16 : (e.deltaMode === 2 ? rect.height : 1);
        const exponent = Math.max(-0.5, Math.min(0.5, Number(e.deltaY || 0) * unit * 0.0012));
        const currentDistance = Number(this.cameraState.targetDistance) || CITY_DEFAULT_DISTANCE;
        this.cameraState.targetDistance = Math.max(12, Math.min(260, currentDistance * Math.exp(exponent)));
        this._saveState();
      }, { passive: false });

      window.addEventListener('resize', () => {
        this.resize();
      });
    }

    panCameraByPixels(dx, dy) {
      if (!Number.isFinite(dx) || !Number.isFinite(dy) || !this.cameraState.targetLookAt) return false;
      const rect = this.canvas?.getBoundingClientRect?.() || { height: this.host?.clientHeight || window.innerHeight || 1 };
      const height = Math.max(1, rect.height || 1);
      const distance = Number(this.cameraState.targetDistance) || CITY_DEFAULT_DISTANCE;
      const fov = Number(this.camera?.fov) || 38;
      const worldUnitsPerPixel = (2 * distance * Math.tan((fov * Math.PI / 180) / 2)) / height;
      const azimuth = this.cameraState.targetAzimuth ?? this.cameraState.azimuth;
      const elevation = this.cameraState.targetElevation ?? this.cameraState.elevation;
      const horizontalVerticalScale = Math.sin(elevation);
      this.stopFollowing();
      this.cameraMode = 'pan';
      this.cameraState.targetLookAt.x += -Math.sin(azimuth) * dx * worldUnitsPerPixel
        + Math.cos(azimuth) * dy * worldUnitsPerPixel * horizontalVerticalScale;
      this.cameraState.targetLookAt.z += Math.cos(azimuth) * dx * worldUnitsPerPixel
        + Math.sin(azimuth) * dy * worldUnitsPerPixel * horizontalVerticalScale;
      this._saveState();
      return true;
    }

    _updateRaycast(e) {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const hits = this.raycaster.intersectObjects(this.interactiveMeshes, false);
      if (hits.length > 0) {
        this.canvas.style.cursor = 'pointer';
        const priority = (hit) => ({ agent: 0, workstation: 1, station: 1, project: 2, machine: 2, building: 3, company: 3, district: 4 }[hit.object.userData?.type] ?? 5);
        this.hoveredObject = hits.slice().sort((left, right) => priority(left) - priority(right) || left.distance - right.distance)[0].object;
      } else {
        this.canvas.style.cursor = 'default';
        this.hoveredObject = null;
      }
    }

    _handleCanvasClick(e) {
      // FÊNIX 3D RTS MOVE COMMAND: If an agent is selected and user clicks on ground/terrain, command agent to walk there
      if (this.selectedAgentId && (!this.hoveredObject || this.hoveredObject.userData?.type === 'ground')) {
        const groundHits = this.raycaster.intersectObjects(this.terrainGroup ? this.terrainGroup.children : [], true);
        if (groundHits.length > 0) {
          const pt = groundHits[0].point;
          const agentRecord = this.agents.get(this.selectedAgentId);
          if (agentRecord && agentRecord.mesh) {
            agentRecord.telemetryTarget = { x: pt.x, z: pt.z };
            agentRecord.movementState = 'WALKING';
            this._spawnDestinationBeacon(pt.x, pt.z);
            return;
          }
        }
      }

      if (!this.hoveredObject) {
        this.selectedAgentId = null;
        return;
      }
      const data = this.hoveredObject.userData;
      if (!data) return;

      if (data.type === 'company') {
        this.focusDistrict(data.districtId || 'command-center');
        if (typeof window.fenixSelectCompany === 'function') {
          window.fenixSelectCompany(data.companyId || data.districtId);
        }
      } else if (data.type === 'district') {
        this.focusDistrict(data.districtId || 'command-center');
        if (window.GlobalSelectionStore && typeof window.GlobalSelectionStore.select === 'function') {
          window.GlobalSelectionStore.select('world_entity', data.districtId, data);
        }
      } else if (data.type === 'agent') {
        const targetPos = this.hoveredObject.parent ? this.hoveredObject.parent.position : this.hoveredObject.position;
        // Keep the selected avatar readable with its nearby district in view.
        this.focusEntity(targetPos, 44);
        this.selectedAgentId = data.agentId;

        const liveAgent = this.agents.get(data.agentId) || {
          id: data.agentId,
          name: data.name,
          role: data.role,
          department: data.department
        };

        if (typeof window.fenixShowWorldAgentInspector === 'function') {
          window.fenixShowWorldAgentInspector(liveAgent);
        }
      } else if (data.type === 'workstation' || data.type === 'station') {
        const targetPos = this.hoveredObject.parent ? this.hoveredObject.parent.position : this.hoveredObject.position;
        this.focusEntity(targetPos, 7);
        if (typeof window.fenixShowWorkstationInspector === 'function') {
          window.fenixShowWorkstationInspector(data);
        } else if (data.assignedAgentId && typeof window.fenixShowWorldAgentInspector === 'function') {
          const liveAgent = this.agents.get(data.assignedAgentId) || { id: data.assignedAgentId, name: data.assignedAgentName || data.assignedAgentId };
          window.fenixShowWorldAgentInspector(liveAgent);
        }
      } else if (data.type === 'project') {
        const targetPos = this.hoveredObject.parent ? this.hoveredObject.parent.position : this.hoveredObject.position;
        this.focusEntity(targetPos, 34);
        this.selectProjectBuilding(data);
      } else if (data.type === 'building') {
        this.selectBuilding(data.id || data.buildingId);
      }
    }


    _spawnDestinationBeacon(x, z) {
      if (!this.scene) return;
      const beaconGroup = new T.Group();
      const ringGeo = new T.RingGeometry(0.35, 0.55, 32);
      const ringMat = new T.MeshBasicMaterial({ color: 0x00f0ff, side: T.DoubleSide, transparent: true, opacity: 0.9 });
      const ring = new T.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, 0.08, z);
      beaconGroup.add(ring);
      this.scene.add(beaconGroup);

      let age = 0;
      const animInterval = setInterval(() => {
        age += 0.05;
        const scale = 1 + age * 1.8;
        ring.scale.set(scale, scale, 1);
        ringMat.opacity = Math.max(0, 0.9 - age * 0.65);
        if (age >= 1.4) {
          clearInterval(animInterval);
          this.scene.remove(beaconGroup);
          ringGeo.dispose();
          ringMat.dispose();
        }
      }, 50);
    }

    _updateCameraPosition(instant = false, elapsedMs = 1000 / 60) {
      if (this.cameraMode === 'follow' && this.followingAgentId) {
        let targetMesh = null;
        if (this.followingAgentId === 'agent-camila' && this.camilaGroup) {
          targetMesh = this.camilaGroup;
        } else if (this.agents && this.agents.has(this.followingAgentId)) {
          targetMesh = this.agents.get(this.followingAgentId).mesh;
        }
        if (targetMesh) {
          this.cameraState.targetLookAt.copy(targetMesh.position);
        }
      }

      if (instant) {
        this.cameraState.distance = this.cameraState.targetDistance;
        this.cameraState.target.copy(this.cameraState.targetLookAt);
        if (this.cameraState.targetAzimuth !== null) {
          this.cameraState.azimuth = this.cameraState.targetAzimuth;
          this.cameraState.targetAzimuth = null;
        }
        if (this.cameraState.targetElevation !== null) {
          this.cameraState.elevation = this.cameraState.targetElevation;
          this.cameraState.targetElevation = null;
        }
      } else {
        const elapsed = Math.min(250, Math.max(0, Number(elapsedMs) || 0));
        const smoothing = 1 - Math.pow(0.88, elapsed / (1000 / 60));
        this.cameraState.distance += (this.cameraState.targetDistance - this.cameraState.distance) * smoothing;
        this.cameraState.target.lerp(this.cameraState.targetLookAt, smoothing);
        if (this.cameraState.targetAzimuth !== null) {
          this.cameraState.azimuth += (this.cameraState.targetAzimuth - this.cameraState.azimuth) * smoothing;
          if (Math.abs(this.cameraState.targetAzimuth - this.cameraState.azimuth) < 0.002) {
            this.cameraState.azimuth = this.cameraState.targetAzimuth;
            this.cameraState.targetAzimuth = null;
          }
        }
        if (this.cameraState.targetElevation !== null) {
          this.cameraState.elevation += (this.cameraState.targetElevation - this.cameraState.elevation) * smoothing;
          if (Math.abs(this.cameraState.targetElevation - this.cameraState.elevation) < 0.002) {
            this.cameraState.elevation = this.cameraState.targetElevation;
            this.cameraState.targetElevation = null;
          }
        }
      }

      const d = this.cameraState.distance;
      const az = this.cameraState.azimuth;
      const el = this.cameraState.elevation;

      this.camera.position.set(
        this.cameraState.target.x + d * Math.cos(az) * Math.cos(el),
        this.cameraState.target.y + d * Math.sin(el),
        this.cameraState.target.z + d * Math.sin(az) * Math.cos(el)
      );
      this.camera.lookAt(this.cameraState.target);
      this._syncExpansionChunks(this.cameraState.targetLookAt.x, this.cameraState.targetLookAt.z);
    }

    setCameraMode(mode) {
      const validModes = ['orbit', 'pan', 'zoom', 'focus', 'follow', 'interior', 'city'];
      if (!validModes.includes(mode)) return this.cameraMode || 'orbit';
      this.cameraMode = mode;
      if (mode === 'city' || mode === 'orbit') {
        this.followingAgentId = null;
        this.cameraState.preferenceDistance = CITY_DEFAULT_DISTANCE;
        this.cameraState.targetDistance = CITY_DEFAULT_DISTANCE * responsiveCameraScale(this.camera?.aspect);
        this.cameraState.targetLookAt.set(0, 0, 0);
        this.cameraState.targetAzimuth = Math.PI / 4;
        this.cameraState.targetElevation = 0.56;
        if (Boolean(navigator.webdriver) || Boolean(window.__FENIX_HEADLESS__)) {
          this._updateCameraPosition(true);
          this._updateDistrictLabels?.();
          this.renderer?.render?.(this.scene, this.camera);
        }
      } else if (mode === 'interior') {
        this.focusBuilding('api-platform');
      }
      this._saveState();
      return this.cameraMode;
    }

    followAgent(agentId) {
      this.followingAgentId = agentId;
      this.cameraMode = 'follow';
      this.focusAgent(agentId);
      return true;
    }

    stopFollowing() {
      this.followingAgentId = null;
      if (this.cameraMode === 'follow') {
        this.cameraMode = 'orbit';
      }
      return false;
    }

    getQuarteiraoPerfeito() {
      return {
        company: 'API Platform',
        building: 'ApiPlatformHeroComplex',
        floors: 4,
        floorHeight: 4.0,
        rooms: [
          'Floor 0: Lobby & Reception',
          'Floor 1: Operations Center & Workspace',
          'Floor 2: Engineering Lab & Raised Access Floor',
          'Floor 3: Neural AI Core Lab',
          'Underground: Data Center Vault'
        ],
        agents: [
          'agent-support',
          'agent-api-ops',
          'agent-integration',
          'agent-infra',
          'agent-backend',
          'agent-security',
          'agent-ai-core'
        ],
        mission: 'API Gateway Live Pipeline',
        vehicle: 'SedanCar',
        route: 'Optical Conduits & Highway',
        dataFlow: 'Optical Pulses'
      };
    }

    focusEntity(worldPos, targetDist = 28, targetAzimuth = null, targetElevation = null) {
      this.cameraState.targetLookAt.copy(worldPos);
      this.cameraState.targetDistance = targetDist * responsiveCameraScale(this.camera?.aspect);
      if (targetAzimuth !== null) this.cameraState.targetAzimuth = targetAzimuth;
      if (targetElevation !== null) this.cameraState.targetElevation = targetElevation;
      if (Boolean(navigator.webdriver) || Boolean(window.__FENIX_HEADLESS__)) {
        this._updateCameraPosition(true);
        this._updateDistrictLabels?.();
        this.renderer?.render?.(this.scene, this.camera);
      }
      this._saveState();
    }

    focusDistrict(districtId) {
      const d = DISTRICTS.find(item => item.id === districtId);
      if (d) {
        if (this.activeApiFloor !== null && this.activeApiFloor !== undefined) {
          this.focusFloor(null);
        }
        const yOffset = d.id === 'command-center' ? 5 : 3;
        this.focusEntity(new T.Vector3(d.x, yOffset, d.z), d.isHero ? 48 : 54, Math.PI / 4, 0.56);
        return true;
      }
      return false;
    }

    panToDistrict(districtId) {
      const aliases = {
        'fenix-hq': 'command-center',
        'command': 'command-center',
        'industrial-hub': 'logistics',
        'browser-district': 'observatory',
        'memory-vault': 'data-center',
        'project-forge': 'project-district',
        'ai-nexus': 'ai-district',
        'dev-loft': 'dev-district'
      };
      const requested = String(districtId || '').toLowerCase();
      if (requested === 'all' || !requested) {
        this.setCameraMode('city');
        return true;
      }
      const id = aliases[requested] || requested;
      this.state.cityFilter = id;
      return this.focusDistrict(id) || Boolean(this.focusBuilding(id));
    }

    setZoom(zoomFactor) {
      const zoom = Number(zoomFactor);
      if (!Number.isFinite(zoom) || zoom <= 0) return false;
      this.cameraState.targetDistance = Math.max(8, Math.min(260, CITY_DEFAULT_DISTANCE * responsiveCameraScale(this.camera?.aspect) / zoom));
      if (Boolean(navigator.webdriver) || Boolean(window.__FENIX_HEADLESS__)) {
        this._updateCameraPosition(true);
      }
      this._saveState();
      return true;
    }

    zoomStep(direction) {
      const steps = Number(direction);
      if (!Number.isFinite(steps) || steps === 0) return false;
      const factor = steps > 0 ? Math.pow(0.82, steps) : Math.pow(1.22, -steps);
      this.cameraState.targetDistance = Math.max(8, Math.min(260, this.cameraState.targetDistance * factor));
      if (Boolean(navigator.webdriver) || Boolean(window.__FENIX_HEADLESS__)) {
        this._updateCameraPosition(true);
      }
      this._saveState();
      return true;
    }

    zoomIn() {
      return this.zoomStep(1);
    }

    zoomOut() {
      return this.zoomStep(-1);
    }

    rotateCamera() {
      const currentAzimuth = this.cameraState.targetAzimuth ?? this.cameraState.azimuth;
      this.cameraState.targetAzimuth = currentAzimuth + Math.PI / 2;
      return true;
    }

    clearSelection() {
      if (this.state) {
        this.state.selected = null;
        this.state.level = 'world';
        this.state.history = [];
      }
      this.selectedBuilding = null;
      this.selectedAgent = null;
      return true;
    }

    resetCamera() {
      this.stopFollowing();
      this.cameraMode = 'orbit';
      const resetDistance = CITY_DEFAULT_DISTANCE * responsiveCameraScale(this.camera?.aspect);
      this.cameraState.azimuth = Math.PI / 4;
      this.cameraState.elevation = 0.56;
      this.cameraState.distance = resetDistance;
      this.cameraState.preferenceDistance = CITY_DEFAULT_DISTANCE;
      this.cameraState.target.set(0, 0, 0);
      this.cameraState.targetLookAt.set(0, 0, 0);
      this.cameraState.targetDistance = resetDistance;
      this.cameraState.targetAzimuth = null;
      this.cameraState.targetElevation = null;
      if (this.state) {
        this.state.selected = null;
        this.state.level = 'world';
        this.state.history = [];
      }
      this.selectedBuilding = null;
      this.selectedAgent = null;
      this.activeApiFloor = null;
      this.apiFloorGroups?.forEach((floor) => { if (floor) floor.visible = true; });
      if (this.apiRoofGroup) this.apiRoofGroup.visible = true;
      if (this.cutawayState) {
        this.cutawayState.manual = false;
        this.cutawayState.progress = 0;
        this.cutawayState.target = 0;
      }
      if (this.warehouseRoofGroup) {
        this.warehouseRoofGroup.position.y = 11.9;
        this.warehouseRoofGroup.visible = true;
      }
      if (this.warehouseInteriorGroup) this.warehouseInteriorGroup.visible = false;
      this._updateCameraPosition(true);
      this._updateDistrictLabels?.();
      this.renderer?.render?.(this.scene, this.camera);
      this._saveState();
      return true;
    }

    setSemanticLevel(mode) {
      const normMode = String(mode || '').toLowerCase();
      this.stopFollowing();

      if (normMode === 'universe') {
        this.cameraState.targetLookAt.set(0, 0, 0);
        this.cameraState.targetDistance = 210 * responsiveCameraScale(this.camera?.aspect);
        this.cameraState.targetElevation = 0.78;
        if (this.state) this.state.level = 'universe';
      } else if (normMode === 'island') {
        this.cameraState.targetLookAt.set(0, 0, 0);
        this.cameraState.targetDistance = 75 * responsiveCameraScale(this.camera?.aspect);
        this.cameraState.targetElevation = 0.56;
        if (this.state) this.state.level = 'island';
      } else if (normMode === 'agent') {
        let targetPos = null;
        const selectedAgentId = this.selectedAgent?.id || this.followingAgentId;
        const selectedRecord = selectedAgentId && (this.agents?.get(selectedAgentId) || (this.selectedAgent?.id === selectedAgentId ? this.selectedAgent : null));
        const selectedMesh = selectedRecord?.mesh || (selectedAgentId && this.agentMeshes?.get(selectedAgentId));
        const worldPositionOf = (object) => {
          if (!object?.position) return null;
          const position = new T.Vector3();
          return typeof object.getWorldPosition === 'function' ? object.getWorldPosition(position) : position.copy(object.position);
        };
        if (selectedAgentId && selectedAgentId === 'agent-camila' && this.camilaGroup) {
          targetPos = worldPositionOf(this.camilaGroup);
        } else if (selectedMesh?.position) {
          targetPos = worldPositionOf(selectedMesh);
        } else if (selectedAgentId && Number.isFinite(Number(selectedRecord?.coordinates?.x)) && Number.isFinite(Number(selectedRecord?.coordinates?.z))) {
          const coordinates = selectedRecord.coordinates;
          targetPos = new T.Vector3(Number(coordinates.x), Number(coordinates.y) || 0.8, Number(coordinates.z));
        } else if (!selectedAgentId && this.camilaGroup) {
          targetPos = worldPositionOf(this.camilaGroup);
        } else if (!selectedAgentId && this.agents && this.agents.size > 0) {
          const firstAgent = this.agents.values().next().value;
          if (firstAgent?.mesh) targetPos = worldPositionOf(firstAgent.mesh);
        } else if (!selectedAgentId && this.agentMeshes && this.agentMeshes.size > 0) {
          const firstEntry = this.agentMeshes.values().next().value;
          if (firstEntry) targetPos = firstEntry.position;
        }
        if (!targetPos && selectedAgentId) {
          window.FenixToast?.show?.('Não foi possível localizar a posição 3D do agente selecionado. Sincronize a Cidade e tente novamente.', 'warning');
          return false;
        } else if (targetPos) {
          this.cameraState.targetLookAt.set(targetPos.x, (targetPos.y || 0) + 1.2, targetPos.z);
        } else {
          this.cameraState.targetLookAt.set(0, 1.2, 0);
        }
        this.cameraState.targetDistance = 32 * responsiveCameraScale(this.camera?.aspect);
        this.cameraState.targetElevation = 0.38;
        if (this.state) this.state.level = 'agent';
      }

      this._updateCameraPosition(true);
      this._updateDistrictLabels?.();
      this.renderer?.render?.(this.scene, this.camera);
      this._saveState();

      // Synchronize HUD button active states
      const activeName = normMode === 'agent' ? 'Agent' : (normMode === 'island' ? 'Island' : 'Universe');
      ['Universe', 'Island', 'Agent'].forEach(lvl => {
        const btn = document.getElementById(`btnHud${lvl}`);
        if (btn) btn.classList.toggle('active', lvl === activeName);
      });

      return true;
    }

    saveCamera() {
      this._saveState();
    }

    centerAgent(agentId) {
      return this.focusAgent(agentId);
    }

    enterBuilding(buildingId, floorNumber) {
      this.focusBuilding(buildingId);
      if (floorNumber !== undefined && floorNumber !== null) this.focusFloor(floorNumber);
      return true;
    }

    navigateToLevel(level, entityId) {
      if (level === 'agent') return this.focusAgent(entityId);
      if (level === 'building' || level === 'floor') return this.enterBuilding(entityId, level === 'floor' ? entityId : undefined);
      if (level === 'district') return this.panToDistrict(entityId);
      this.setCameraMode('city');
      return true;
    }

    focusBuilding(buildingId) {
      if (!buildingId) return;
      if (this.dynamicBuildings && this.dynamicBuildings.has(buildingId)) {
        const dyn = this.dynamicBuildings.get(buildingId);
        const pos = dyn.group ? dyn.group.position : (dyn.position || null);
        if (pos) {
          this.focusEntity(new T.Vector3(pos.x, 4.0, pos.z), 46, Math.PI / 4, 0.54);
          return;
        }
      }
      if (buildingId === 'bld-deposito-mais' || buildingId === 'deposito-mais' || buildingId === 'logistics' || buildingId === 'bld-logistics') {
        this.focusEntity(districtPoint('logistics', 0, 4.5, 0), 56, Math.PI / 4, 0.54);
      } else if (buildingId === 'bld-api-platform' || buildingId === 'api-platform') {
        this.focusFloor(null);
        this.focusEntity(districtPoint('api-platform', 0, 6.5, 0), 56, Math.PI / 4, 0.52);
      } else if (buildingId === 'bld-fenix-hq' || buildingId === 'command-center') {
        this.focusEntity(new T.Vector3(0, 8, 0), 58, Math.PI / 4, 0.54);
      } else if (buildingId === 'bld-dev-loft' || buildingId === 'dev-district') {
        this.focusEntity(districtPoint('dev-district', 0, 4.0, 0), 52, Math.PI / 4, 0.54);
      } else if (buildingId === 'bld-ai-nexus' || buildingId === 'ai-district') {
        this.focusEntity(districtPoint('ai-district', 0, 4.0, 0), 52, Math.PI / 4, 0.54);
      } else if (buildingId === 'bld-project-forge' || buildingId === 'project-district') {
        this.focusEntity(districtPoint('project-district', 0, 4.0, 0), 52, Math.PI / 4, 0.54);
      } else if (buildingId === 'bld-memory-vault' || buildingId === 'bld-data-center' || buildingId === 'data-center') {
        this.focusEntity(districtPoint('data-center', 0, 4.0, 0), 52, Math.PI / 4, 0.54);
      } else if (buildingId === 'bld-observatory' || buildingId === 'observatory') {
        this.focusEntity(districtPoint('observatory', 0, 4.0, 0), 52, Math.PI / 4, 0.54);
      } else {
        const mesh = this.interactiveMeshes.find(m => m.userData?.id === buildingId || m.userData?.buildingId === buildingId);
        if (mesh) {
          const wPos = new T.Vector3();
          mesh.getWorldPosition(wPos);
          this.focusEntity(new T.Vector3(wPos.x, Math.max(3.5, wPos.y), wPos.z), 46, Math.PI / 4, 0.54);
        }
      }
    }

    /* ── Mode 3: Street View (Pedestrian Eye-Level Camera 🚶) ── */
    setStreetViewMode(camX, camZ, lookX, lookZ) {
      if (!this.cameraState) return;
      this.savedAerialCameraState = {
        distance: this.cameraState.distance,
        elevation: this.cameraState.elevation,
        azimuth: this.cameraState.azimuth,
        target: this.cameraState.target.clone()
      };
      
      this.cameraState.isStreetView = true;
      const lookPos = new T.Vector3(lookX || camX, 1.8, lookZ || (camZ - 8));
      this.focusEntity(lookPos, 14, Math.PI / 4, 0.12);
      
      // Floating return pill in HUD
      let retBtn = document.getElementById('fw3ReturnAerialBtn');
      if (!retBtn) {
        retBtn = document.createElement('button');
        retBtn.id = 'fw3ReturnAerialBtn';
        retBtn.innerHTML = '🏙️ Voltar à Visão Aérea (Cidade)';
        retBtn.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e293b;color:#4ade80;border:1px solid #4ade80;border-radius:99px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer;z-index:99999;box-shadow:0 10px 25px rgba(0,0,0,0.6);backdrop-filter:blur(8px);';
        document.body.appendChild(retBtn);
        retBtn.addEventListener('click', () => {
          retBtn.remove();
          this.returnToAerialView();
        });
      }
    }

    returnToAerialView() {
      if (!this.cameraState) return;
      this.cameraState.isStreetView = false;
      document.getElementById('fw3ReturnAerialBtn')?.remove();
      if (this.savedAerialCameraState) {
        this.focusEntity(
          this.savedAerialCameraState.target,
          this.savedAerialCameraState.distance,
          this.savedAerialCameraState.azimuth,
          this.savedAerialCameraState.elevation
        );
      } else {
        this.focusEntity(new T.Vector3(0, 0, 0), 75, Math.PI / 4, 0.56);
      }
    }

    selectProjectBuilding(projectData) {
      if (!projectData) return;
      const bldInfo = this.projectBuildings?.get(projectData.projectId || projectData.id);
      if (bldInfo && bldInfo.group) {
        const lookPos = new T.Vector3(bldInfo.group.position.x, 5.5, bldInfo.group.position.z);
        this.focusEntity(lookPos, 52, Math.PI / 4, 0.56);
      }
      this._showProjectBuildingModal(projectData);
    }

    _showProjectBuildingModal(project) {
      let modal = document.getElementById('fw3ProjectCard');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'fw3ProjectCard';
        modal.className = 'fcw-panel fw3-project-modal';
        modal.style.cssText = 'position:fixed;top:75px;right:24px;width:340px;background:rgba(15,23,42,0.95);border:1px solid #334155;border-radius:12px;padding:16px;box-shadow:0 20px 40px rgba(0,0,0,0.6);z-index:9999;backdrop-filter:blur(12px);color:#f8fafc;font-family:Inter,system-ui,sans-serif;';
        document.body.appendChild(modal);
      }

      const isOnline = project.isOnline || project.port === '4400' || project.port === '1000' || project.port === '8182' || project.port === '8181' || project.port === '8080';
      const statusBadge = isOnline
        ? '<span style="display:inline-flex;align-items:center;gap:5px;background:#052e16;color:#4ade80;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;"><span style="width:6px;height:6px;border-radius:50%;background:#22c55e;"></span> ONLINE</span>'
        : '<span style="display:inline-flex;align-items:center;gap:5px;background:#1e293b;color:#94a3b8;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;"><span style="width:6px;height:6px;border-radius:50%;background:#64748b;"></span> OFFLINE</span>';

      modal.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
          <div>
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:2px;">Edifício do Projeto • ${project.category || 'Sistema'}</div>
            <h3 style="margin:0;font-size:16px;font-weight:700;color:#f8fafc;">${project.name || project.projectId}</h3>
          </div>
          <button id="fw3CloseProjectCard" style="background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:18px;padding:4px;">✕</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap;">
          ${statusBadge}
          ${project.port ? `<span style="font-family:monospace;font-size:11px;color:#cbd5e1;background:#1e293b;padding:2px 6px;border-radius:4px;">Porta :${project.port}</span>` : ''}
          <span style="font-size:11px;color:#a3e635;background:rgba(163,230,53,0.1);border:1px solid rgba(163,230,53,0.3);padding:2px 6px;border-radius:4px;">🏛️ ${project.floors || 3} Andares</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;gap:8px;">
            <button id="fw3BtnOpenWorkspace" style="flex:1;background:#2563eb;color:#ffffff;border:none;border-radius:6px;padding:8px 10px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
              <span>Abrir Workspace</span> ➔
            </button>
            <button id="fw3BtnStreetView" style="flex:1;background:#334155;color:#f8fafc;border:1px solid #475569;border-radius:6px;padding:8px 10px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
              <span>🚶 Modo Rua</span>
            </button>
          </div>
          <button id="fw3BtnTelemetryDrawer" style="width:100%;background:rgba(30,41,59,0.8);color:#94a3b8;border:1px solid #334155;border-radius:6px;padding:6px;font-size:11px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;">
            <span>📊 Expandir Telemetria / Painel Lateral</span>
          </button>
        </div>
      `;
      modal.style.display = 'block';

      document.getElementById('fw3CloseProjectCard')?.addEventListener('click', () => {
        modal.style.display = 'none';
      });

      document.getElementById('fw3BtnStreetView')?.addEventListener('click', () => {
        modal.style.display = 'none';
        const bldInfo = this.projectBuildings?.get(project.projectId || project.id);
        if (bldInfo && bldInfo.group) {
          const bPos = bldInfo.group.position;
          this.setStreetViewMode(bPos.x, bPos.z + 10, bPos.x, bPos.z);
        }
      });

      document.getElementById('fw3BtnTelemetryDrawer')?.addEventListener('click', () => {
        modal.style.display = 'none';
        if (typeof window.openProjectWorkspace === 'function') {
          window.openProjectWorkspace(project.projectId || project.id);
        } else if (typeof window.showView === 'function') {
          window.showView('projects');
        }
      });

      document.getElementById('fw3BtnOpenWorkspace')?.addEventListener('click', () => {
        modal.style.display = 'none';
        if (typeof window.openProjectWorkspace === 'function') {
          window.openProjectWorkspace(project.projectId || project.id);
        } else if (typeof window.fenixSelectProject === 'function') {
          window.fenixSelectProject(project.projectId || project.id);
        }
        if (typeof window.showView === 'function') {
          window.showView('projects');
        }
      });
    }

    selectBuilding(buildingId) {
      if (!buildingId) return;
      this.focusBuilding(buildingId);
      let bld = this.dynamicBuildings?.get(buildingId);
      if (typeof window.fenixShowBuildingDetails === 'function') {
        window.fenixShowBuildingDetails(bld || { id: buildingId, name: buildingId });
      }
      if (window.GlobalSelectionStore) {
        window.GlobalSelectionStore.select('building', buildingId, bld || { id: buildingId }, 'city');
      }
    }

    selectAgent(agentId) {
      if (!agentId) return;
      const ag = this.agents.get(agentId) || { id: agentId, name: agentId };
      this.selectedAgent = ag;
      this.focusAgent(agentId);
      if (typeof window.fenixShowWorldAgentInspector === 'function') {
        window.fenixShowWorldAgentInspector(ag);
      }
      if (window.GlobalSelectionStore) {
        window.GlobalSelectionStore.select('agent', agentId, ag, 'city');
      }
    }

    focusFloor(floorNumber) {
      if (floorNumber === null || floorNumber === undefined || floorNumber === 'all' || floorNumber === -1) {
        this.activeApiFloor = null;
        if (this.apiFloorGroups) {
          this.apiFloorGroups.forEach(fg => { if (fg) fg.visible = true; });
        }
        if (this.apiRoofGroup) this.apiRoofGroup.visible = true;
        this.focusEntity(districtPoint('api-platform', 0, 6.5, 0), 56, Math.PI / 4, 0.52);
        return;
      }

      const f = Math.max(0, Math.min(3, parseInt(floorNumber, 10)));
      this.activeApiFloor = f;

      if (this.apiFloorGroups) {
        this.apiFloorGroups.forEach((fg, k) => {
          if (!fg) return;
          // Show target floor and floors beneath; cutaway ceilings/floors above
          fg.visible = (k <= f);
        });
      }
      if (this.apiRoofGroup) {
        this.apiRoofGroup.visible = false;
      }

      const podiumH = 0.5;
      const fH = 4.0;
      const fY = podiumH + f * fH;
      // Position camera directly into floor f interior with calibrated clearance
      this.focusEntity(districtPoint('api-platform', 0, fY + 1.8, 0), 28.0, Math.PI / 4, 0.48);
    }

    focusCompany(companyId) {
      this.focusBuilding(companyId);
    }

    focusAgent(agentId) {
      if (!agentId) return;
      const selectedAgent = this.agents?.get(agentId);
      if (selectedAgent) this.selectedAgent = selectedAgent;
      const runtimeAgent = selectedAgent || (this.selectedAgent?.id === agentId ? this.selectedAgent : null);
      const runtimeMesh = runtimeAgent?.mesh || this.agentMeshes?.get(agentId);
      if (runtimeMesh?.position) {
        if (this.activeApiFloor !== null && this.activeApiFloor !== undefined) this.focusFloor(null);
        const wPos = new T.Vector3();
        if (typeof runtimeMesh.getWorldPosition === 'function') {
          runtimeMesh.getWorldPosition(wPos);
        } else {
          wPos.set(runtimeMesh.position.x || 0, runtimeMesh.position.y || 0.8, runtimeMesh.position.z || 0);
        }
        this.focusEntity(new T.Vector3(wPos.x, Math.max(2.4, (wPos.y || 0.8) + 1.4), wPos.z), 44, Math.PI / 4, 0.54);
        return;
      }
      const coordinates = runtimeAgent?.coordinates;
      if (coordinates && Number.isFinite(Number(coordinates.x)) && Number.isFinite(Number(coordinates.z))) {
        if (this.activeApiFloor !== null && this.activeApiFloor !== undefined) this.focusFloor(null);
        const y = Number(coordinates.y) || 0.8;
        this.focusEntity(new T.Vector3(Number(coordinates.x), Math.max(2.4, y + 1.4), Number(coordinates.z)), 44, Math.PI / 4, 0.54);
        return;
      }
      if (agentId === 'agent-camila' || (agentId && agentId.includes('camila'))) {
        if (this.camilaGroup) {
          const p = this.camilaGroup.position;
          this.focusEntity(new T.Vector3(p.x, Math.max(2.4, p.y + 1.4), p.z), 30, Math.PI / 4, 0.54);
          return;
        }
      } else if (agentId === 'agent-api-ops' || (agentId && agentId.includes('alex'))) {
        this.focusFloor(1);
        this.focusEntity(districtPoint('api-platform', -4.5, 5.4, 2.2), 26.0, Math.PI / 4, 0.48);
        return;
      } else if (agentId === 'agent-integration' || (agentId && agentId.includes('elena'))) {
        this.focusFloor(1);
        this.focusEntity(districtPoint('api-platform', 4.5, 5.4, 2.2), 26.0, Math.PI / 4, 0.48);
        return;
      } else if (agentId === 'agent-infra' || (agentId && agentId.includes('lucas'))) {
        this.focusFloor(2);
        this.focusEntity(districtPoint('api-platform', -2.2, 9.8, 3.2), 26.0, Math.PI / 4, 0.48);
        return;
      } else if (agentId === 'agent-monitor' || (agentId && agentId.includes('maya'))) {
        this.focusFloor(2);
        this.focusEntity(districtPoint('api-platform', 2.2, 9.8, 3.2), 26.0, Math.PI / 4, 0.48);
        return;
      } else if (agentId === 'agent-security' || (agentId && agentId.includes('victor'))) {
        this.focusFloor(2);
        this.focusEntity(districtPoint('api-platform', -8.2, 9.8, -1.2), 26.0, Math.PI / 4, 0.48);
        return;
      } else if (agentId === 'agent-ai-core' || (agentId && agentId.includes('sora'))) {
        this.focusFloor(3);
        this.focusEntity(districtPoint('api-platform', 0, 14.8, 2.8), 26.0, Math.PI / 4, 0.48);
        return;
      } else if (agentId === 'agent-support' || (agentId && agentId.includes('gabriel'))) {
        this.focusFloor(0);
        this.focusEntity(districtPoint('api-platform', 0, 2.2, 1.2), 26.0, Math.PI / 4, 0.48);
        return;
      }
      if (agentId === 'agent-andre' || (agentId && agentId.includes('andre'))) {
        this.focusEntity(districtPoint('logistics', 2.5, 2.4, 3.5), 30, Math.PI / 4, 0.54);
      } else if (agentId === 'agent-expedicao' || (agentId && agentId.includes('carlos'))) {
        this.focusEntity(districtPoint('logistics', -4, 2.4, 11), 30, Math.PI / 4, 0.54);
      }
    }

    toggleDayNight() {
      this._setDayNight(!this.cameraState.night);
    }

    _setDayNight(isNight) {
      const night = Boolean(isNight);
      const settings = night
        ? { background: 0x0b151f, sun: 0x8ea6bb, sunIntensity: 0.62, hemiIntensity: 0.62, floodlight: 5.2 }
        : { background: 0x1a2935, sun: 0xffdfb5, sunIntensity: 1.3, hemiIntensity: 0.82, floodlight: 2.2 };
      this.cameraState.night = night;
      this.scene.background.set(settings.background);
      this.scene.fog.color.set(settings.background);
      this.sunLight.color.set(settings.sun);
      this.sunLight.intensity = settings.sunIntensity;
      this.hemiLight.intensity = settings.hemiIntensity;
      this.dockFloodlight.intensity = settings.floodlight;
    }

    triggerTokenExchange(sourceFloor = 1, targetFloor = 2, tokenType = 'TOKEN_EXCHANGE') {
      const sf = Math.max(0, Math.min(3, parseInt(sourceFloor, 10) || 1));
      const tf = Math.max(0, Math.min(3, parseInt(targetFloor, 10) || 2));
      const fH = 4.4, podiumH = 0.5;
      const sY = podiumH + sf * fH + 1.0;
      const tY = podiumH + tf * fH + 1.0;
      const dir = tY >= sY ? 1 : -1;

      if (this.apiDataPackets && this.apiDataPackets.length > 0) {
        this.apiDataPackets.forEach(pkt => {
          pkt.speed = 5.2; // High-speed transit burst
          pkt.dir = dir;
          pkt.currentY = sY;
        });
        setTimeout(() => {
          if (this.apiDataPackets) {
            this.apiDataPackets.forEach((pkt, idx) => {
              pkt.speed = 1.2 + (idx % 4) * 0.4;
            });
          }
        }, 2500);
      }

      // Flash Floor 2 Server LEDs
      if (this.serverRacksLeds && this.serverRacksLeds.length > 0) {
        this.serverRacksLeds.forEach((led) => {
          led.visible = true;
          if (led.material && led.material.emissiveIntensity !== undefined) {
            led.material.emissiveIntensity = 2.0;
            setTimeout(() => { if (led.material) led.material.emissiveIntensity = 1.0; }, 2000);
          }
        });
      }

      // Sora Neural Core Surge on Floor 3
      if (this.apiNeuralCore && (sf === 3 || tf === 3)) {
        if (this.materials.neuralPurple) {
          this.materials.neuralPurple.emissiveIntensity = 2.5;
          setTimeout(() => { if (this.materials.neuralPurple) this.materials.neuralPurple.emissiveIntensity = 0.9; }, 2000);
        }
      }

      console.log(`[FÊNIX TOKEN BUS] Physical Token Transit: Floor ${sf} ➔ Floor ${tf} (${tokenType})`);
    }

    focusRoom(roomId) {
      if (!roomId) return;
      const r = String(roomId).toLowerCase();
      if (r.includes('dock') || r.includes('doca')) {
        this.focusEntity(districtPoint('logistics', 0, 0.9, 11), 18, 1.5, 0.25);
      } else if (r.includes('rack') || r.includes('aisle') || r.includes('rua') || r.includes('armazen')) {
        this.focusEntity(districtPoint('logistics', 0, 0.9, 0), 22, 1.5, 0.25);
      } else if (r.includes('pack') || r.includes('embalag')) {
        this.focusEntity(districtPoint('logistics', 8, 0.9, 6), 14, 1.5, 0.25);
      } else if (r.includes('dep_office') || r.includes('escritorio')) {
        this.focusEntity(districtPoint('logistics', 16, 0.9, 3), 14, 1.5, 0.25);
      } else if (r.includes('staging')) {
        this.focusEntity(districtPoint('logistics', 0, 0.9, 8), 16, 1.5, 0.25);
      } else if (r.includes('lobby') || r.includes('plaza') || r.includes('floor_0') || r.includes('andar_0')) {
        this.focusFloor(0);
        this.focusEntity(districtPoint('api-platform', 0, 1.4, 1.2), 14, 1.62, 0.22);
      } else if (r.includes('support') || r.includes('gateway') || r.includes('floor_1') || r.includes('andar_1')) {
        this.focusFloor(1);
        this.focusEntity(districtPoint('api-platform', 0, 5.4, 1.2), 14, 1.62, 0.22);
      } else if (r.includes('server') || r.includes('infra') || r.includes('sec') || r.includes('floor_2') || r.includes('andar_2')) {
        this.focusFloor(2);
        this.focusEntity(districtPoint('api-platform', 0, 9.8, 1.2), 14, 1.62, 0.22);
      } else if (r.includes('neural') || r.includes('core') || r.includes('floor_3') || r.includes('andar_3')) {
        this.focusFloor(3);
        this.focusEntity(districtPoint('api-platform', 0, 14.8, 2.8), 14, 1.62, 0.22);
      } else {
        this.focusBuilding('api-platform');
      }
    }

    focusStation(stationId) {
      if (!stationId) return;
      const s = String(stationId).toLowerCase();
      if (s.includes('camila')) {
        this.focusAgent('agent-camila');
      } else if (s.includes('carlos') || s.includes('expedicao')) {
        this.focusAgent('agent-expedicao');
      } else if (s.includes('andre')) {
        this.focusAgent('agent-andre');
      } else if (s.includes('alex')) {
        this.focusAgent('agent-api-ops');
      } else if (s.includes('elena')) {
        this.focusAgent('agent-integration');
      } else if (s.includes('lucas')) {
        this.focusAgent('agent-infra');
      } else if (s.includes('maya')) {
        this.focusAgent('agent-monitor');
      } else if (s.includes('victor')) {
        this.focusAgent('agent-security');
      } else if (s.includes('sora')) {
        this.focusAgent('agent-ai-core');
      } else if (s.includes('gabriel')) {
        this.focusAgent('agent-support');
      } else {
        const wp = this.pathGraph ? this.pathGraph.nodes.get(stationId) : null;
        if (wp) {
          this.focusEntity(wp.pos, 10);
        }
      }
    }

    navigateAgent(agentId, targetPos) {
      const agent = this.agents.get(agentId);
      if (!agent || !agent.mesh) return null;
      const targetVec = targetPos instanceof T.Vector3 ? targetPos : new T.Vector3(targetPos.x, targetPos.y !== undefined ? targetPos.y : agent.mesh.position.y, targetPos.z);
      const points = this.pathGraph ? this.pathGraph.findPath(agent.mesh.position, targetVec) : [targetVec];
      agent.path = points;
      agent.pathIndex = 0;
      agent.localNavigationActive = true;
      if (agent.thoughtBubble) {
        agent.thoughtBubble.setText('Movimento local · não sincronizado', '🚶', '#38bdf8');
      }
      return points;
    }

    sendPhysicalDataPacket(fromAgentId, toAgentId, packetType = 'TASK_PACKET') {
      const fromAgent = this.agents.get(fromAgentId);
      const toAgent = this.agents.get(toAgentId);
      if (!fromAgent || !fromAgent.mesh || !toAgent || !toAgent.mesh) {
        console.warn(`[FenixWorld3D] Packet source/target not found: ${fromAgentId} -> ${toAgentId}`);
        return null;
      }

      const startPos = fromAgent.mesh.position.clone().add(new T.Vector3(0, 1.5, 0));
      const endPos = toAgent.mesh.position.clone().add(new T.Vector3(0, 1.5, 0));

      const isPurple = packetType.includes('NEURAL') || packetType.includes('AI');
      const colorHex = isPurple ? 0xa855f7 : 0x06b6d4;

      const geom = new T.SphereGeometry(0.22, 12, 12);
      const mat = new T.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 1.8,
        roughness: 0.1,
        metalness: 0.8
      });
      const packetMesh = new T.Mesh(geom, mat);
      packetMesh.position.copy(startPos);
      this.scene.add(packetMesh);

      const packet = {
        mesh: packetMesh,
        startPos,
        endPos,
        arcHeight: 2.5 + Math.min(6, startPos.distanceTo(endPos) * 0.15),
        progress: 0,
        speed: 1.1,
        fromAgentId,
        toAgentId,
        packetType,
        onComplete: () => {
          if (toAgent.thoughtBubble) {
            toAgent.thoughtBubble.setText(`Dado recebido: ${packetType}`, '⚡', '#10b981');
            setTimeout(() => {
              const defaultEmoji = toAgent.id === 'agent-ai-core' ? '🧠' : (toAgent.id === 'agent-camila' ? '📦' : '⚡');
              toAgent.thoughtBubble.setText(toAgent.assignedTask || toAgent.currentTask || 'Operando', defaultEmoji);
            }, 2500);
          }
        }
      };

      if (!this.livePackets) this.livePackets = [];
      this.livePackets.push(packet);

      if (fromAgent.thoughtBubble) {
        fromAgent.thoughtBubble.setText(`Enviando ${packetType}...`, '📡', '#38bdf8');
      }

      return packet;
    }

    getLivingWorldMetrics() {
      const activeAgents = [];
      if (this.agents) {
        this.agents.forEach(a => {
          activeAgents.push({
            id: a.id,
            name: a.name,
            role: a.role,
            department: a.department,
            state: a.state || a.status || 'WORKING',
            position: a.mesh ? { x: Number(a.mesh.position.x.toFixed(2)), y: Number(a.mesh.position.y.toFixed(2)), z: Number(a.mesh.position.z.toFixed(2)) } : null,
            hasBubble: Boolean(a.thoughtBubble)
          });
        });
      }
      return {
        isLivingWorld: true,
        agentCount: this.agents ? this.agents.size : 0,
        activeAgents,
        vehicleCount: this.vehicles ? this.vehicles.length : 1,
        livePacketsCount: this.livePackets ? this.livePackets.length : 0,
        waypointCount: this.pathGraph && this.pathGraph.nodes ? this.pathGraph.nodes.size : 0,
        cutawayProgress: this.cutawayState ? Number(this.cutawayState.progress.toFixed(2)) : 0,
        activeFloor: this.activeApiFloor,
        followingAgent: this.followingAgentId || null,
        camera: {
          distance: Number(this.cameraState.distance.toFixed(1)),
          mode: this.cameraMode
        }
      };
    }

    /* ══════════════════════════════════════════════════════════════════════════
       HOT WORLD MUTATION & RUNTIME SPECIFICATION ENGINE
       (Declarative live updates: Buildings, Rooms, Agents, Movements, Missions)
    ══════════════════════════════════════════════════════════════════════════ */
    applyWorldCommand(command) {
      if (!command) return { ok: false, error: 'Empty command' };
      const type = String(command.type || '').toUpperCase();
      const payload = command.payload || {};

      switch (type) {
        case 'CREATE_BUILDING':
          return this.spawnDynamicBuilding(payload);
        case 'CREATE_AGENT':
          return this.spawnDynamicAgent(payload);
        case 'MOVE_AGENT':
          return this.moveDynamicAgent(payload.agentId || payload.id, payload.destination || payload.coordinates);
        case 'ASSIGN_MISSION':
          return this.assignDynamicMission(payload);
        case 'COMPLETE_TASK':
          return this.completeDynamicTask(payload);
        case 'FAIL_TASK':
          return this.failDynamicTask(payload);
        case 'RECOVER_TASK':
          return this.recoverDynamicAgent(payload);
        case 'CHANGE_ENVIRONMENT':
          return this.setEnvironment(payload);
        case 'REMOVE_ENTITY':
          return this.removeDynamicEntity(payload);
        default:
          console.warn('[FenixWorld3D] Unknown command type:', type);
          return { ok: false, error: 'Unknown command type: ' + type };
      }
    }

    spawnDynamicBuilding(payload) {
      const id = payload.id || `bld-${Date.now()}`;
      const name = payload.name || 'Edifício Operacional';
      const archetype = payload.archetype || window.FenixCityMachineScene?.resolveProjectArchetype(payload) || 'dev_studio';
      const defaultDims = window.FenixCityMachineScene?.ARCHETYPE_DIMENSIONS?.[archetype] || { width: 6.4, depth: 5.2, height: 5.2 };
      const width = parseFloat(payload.width) || defaultDims.width;
      const depth = parseFloat(payload.depth) || defaultDims.depth;
      const floors = Math.max(1, Math.min(8, parseInt(payload.floors, 10) || (archetype === 'warehouse' ? 2 : (archetype === 'tech_cloud' || archetype === 'fintech' ? 4 : 3))));
      const floorH = Number((defaultDims.height / floors).toFixed(2));
      const height = defaultDims.height;
      const coords = payload.coordinates || { x: -28.0, y: 0, z: 18.0 };
      const color = payload.color || (archetype === 'warehouse' ? '#f59e0b' : archetype === 'tech_cloud' ? '#0284c7' : archetype === 'commerce_crm' ? '#10b981' : archetype === 'fintech' ? '#8b5cf6' : '#4e8f88');
      const icon = payload.icon || (archetype === 'warehouse' ? '📦' : archetype === 'tech_cloud' ? '⚡' : archetype === 'commerce_crm' ? '💬' : archetype === 'fintech' ? '💳' : '💻');

      if (this.dynamicBuildings && this.dynamicBuildings.has(id)) {
        const building = this.dynamicBuildings.get(id);
        building.name = name;
        building.status = payload.status || payload.lifecycleState || building.status || 'UNKNOWN';
        building.projectId = payload.projectId || building.projectId || null;
        building.workspace = payload.workspace || building.workspace || null;
        building.color = payload.color || building.color || null;
        building.icon = payload.icon || building.icon || null;
        building.department = payload.department || payload.function || building.department || null;
        building.capabilities = Array.isArray(payload.capabilities) ? payload.capabilities : (building.capabilities || []);
        if (payload.coordinates && building.group) {
          building.group.position.set(coords.x, Number.isFinite(coords.y) ? coords.y : 0, coords.z);
          building.position = { x: coords.x, y: Number.isFinite(coords.y) ? coords.y : 0, z: coords.z };
        }
        if (building.hitBox?.userData) {
          Object.assign(building.hitBox.userData, {
            name,
            projectId: building.projectId,
            status: building.status,
            workspace: building.workspace,
          });
        }
        if (building.beacon?.material?.color?.setHex) {
          const state = String(building.status).toUpperCase();
          const statusColor = ['FAILED', 'DEAD_LETTER', 'ERROR', 'OFFLINE'].includes(state) ? 0xf16a72
            : ['RUNNING', 'ACTIVE', 'BUILDING'].includes(state) ? 0x27d7c4
              : ['QUEUED', 'DEGRADED'].includes(state) ? 0xe8b45d : 0x8d9aaa;
          building.beacon.material.color.setHex(statusColor);
        }
        return { ok: true, id, updated: true, building };
      }

      this.dynamicBuildings = this.dynamicBuildings || new Map();
      const bldGroup = new T.Group();
      bldGroup.name = 'Building_' + id;
      bldGroup.position.set(coords.x, coords.y || 0, coords.z);

      // Foundation Slab
      const foundationGeo = new T.BoxGeometry(width + 2, 0.6, depth + 2);
      const foundationMesh = new T.Mesh(foundationGeo, this.materials.dockApron || new T.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }));
      foundationMesh.position.y = 0.3;
      foundationMesh.receiveShadow = true;
      bldGroup.add(foundationMesh);

      // Floor levels
      const wallMat = this.materials.cyberWall || new T.MeshStandardMaterial({ color: 0x273542, roughness: 0.72, metalness: 0.22 });
      const coreMat = this.materials.urbanFacadeGlass || new T.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.35 });
      const accentMat = new T.MeshStandardMaterial({
        color: new T.Color(color), emissive: new T.Color(color), emissiveIntensity: 0.16,
        roughness: 0.46, metalness: 0.38
      });
      const glassMat = this.materials.officeGlass || this.materials.glass || new T.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.18,
        metalness: 0.55
      });

      for (let f = 0; f < floors; f++) {
        const floorY = 0.6 + (f * floorH);

        // Floor slab
        const slab = new T.Mesh(new T.BoxGeometry(width + 0.4, 0.3, depth + 0.4), this.materials.dockBumper || wallMat);
        slab.position.y = floorY + 0.15;
        bldGroup.add(slab);

        // Solid architectural core so the building has visual volume
        const coreVolume = new T.Mesh(new T.BoxGeometry(Math.max(2, width - 1.4), floorH - 0.32, Math.max(2, depth - 1.4)), coreMat);
        coreVolume.position.y = floorY + (floorH / 2);
        coreVolume.castShadow = true;
        coreVolume.receiveShadow = true;
        bldGroup.add(coreVolume);

        // Glass curtain envelope
        const glassCurtain = new T.Mesh(new T.BoxGeometry(width - 0.2, floorH - 0.3, depth - 0.2), glassMat);
        glassCurtain.position.y = floorY + (floorH / 2);
        glassCurtain.castShadow = true;
        glassCurtain.receiveShadow = true;
        bldGroup.add(glassCurtain);

        // Thin facade band keeps project identity visible without tinting the whole structure.
        const facadeBand = new T.Mesh(new T.BoxGeometry(width * 0.62, 0.14, 0.16), accentMat);
        facadeBand.position.set(0, floorY + 0.48, depth / 2);
        bldGroup.add(facadeBand);

        // Structural corner columns
        const colW = 0.6;
        for (const cx of [-width / 2 + 0.3, width / 2 - 0.3]) {
          for (const cz of [-depth / 2 + 0.3, depth / 2 - 0.3]) {
            const col = new T.Mesh(new T.BoxGeometry(colW, floorH, colW), wallMat);
            col.position.set(cx, floorY + (floorH / 2), cz);
            col.castShadow = true;
            bldGroup.add(col);
          }
        }
      }

      // Roof terrace & parapet
      const roofY = 0.6 + (floors * floorH);
      const roofSlab = new T.Mesh(new T.BoxGeometry(width + 0.6, 0.4, depth + 0.6), wallMat);
      roofSlab.position.y = roofY + 0.2;
      bldGroup.add(roofSlab);

      // HVAC Cooling Unit
      const hvac = new T.Mesh(new T.BoxGeometry(3.5, 1.6, 2.5), this.materials.serverRackDark || wallMat);
      hvac.position.set(-width / 4, roofY + 1.2, -depth / 4);
      bldGroup.add(hvac);

      // Communications Mast & Antenna with Blinking Red Beacon
      const mast = new T.Mesh(new T.CylinderGeometry(0.08, 0.14, 5.0, 8), this.materials.truckChrome || wallMat);
      mast.position.set(width / 4, roofY + 2.7, depth / 4);
      const buildingStatus = String(payload.status || payload.lifecycleState || 'UNKNOWN').toUpperCase();
      const beaconColor = ['FAILED', 'DEAD_LETTER', 'ERROR', 'OFFLINE'].includes(buildingStatus) ? 0xf16a72
        : ['RUNNING', 'ACTIVE', 'BUILDING'].includes(buildingStatus) ? 0x27d7c4
          : ['QUEUED', 'DEGRADED'].includes(buildingStatus) ? 0xe8b45d : 0x8d9aaa;
      const beacon = new T.Mesh(new T.SphereGeometry(0.16, 10, 8), new T.MeshBasicMaterial({ color: beaconColor }));
      beacon.position.set(width / 4, roofY + 5.2, depth / 4);
      bldGroup.add(mast, beacon);

      // Structural mounting truss for billboard anchored on roof
      const poleGeo = new T.CylinderGeometry(0.08, 0.08, 2.4, 8);
      const poleMat = this.materials.truckChrome || wallMat;
      const poleL = new T.Mesh(poleGeo, poleMat);
      poleL.position.set(-2.5, roofY + 1.2, 0);
      const poleR = new T.Mesh(poleGeo, poleMat);
      poleR.position.set(2.5, roofY + 1.2, 0);
      bldGroup.add(poleL, poleR);

      // High-resolution Canvas with Auto-scaling Typography
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(8, 8, 1008, 240, 32);
      } else {
        ctx.rect(8, 8, 1008, 240);
      }
      ctx.fill();
      ctx.lineWidth = 8;
      ctx.strokeStyle = color;
      ctx.stroke();

      const textToRender = `${icon} ${name.toUpperCase()}`;
      let fontSize = 56;
      ctx.font = `bold ${fontSize}px sans-serif`;
      while (ctx.measureText(textToRender).width > 920 && fontSize > 26) {
        fontSize -= 3;
        ctx.font = `bold ${fontSize}px sans-serif`;
      }
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(textToRender, 512, 128);

      const signTex = new T.CanvasTexture(canvas);
      const signMat = new T.SpriteMaterial({ map: signTex, transparent: true });
      const signSprite = new T.Sprite(signMat);
      signSprite.scale.set(8.5, 2.125, 1);
      signSprite.position.set(0, roofY + 2.4, 0);
      bldGroup.add(signSprite);

      // Interactive hit mesh for clicks
      const hitBox = new T.Mesh(new T.BoxGeometry(width + 1, height + 4, depth + 1), new T.MeshBasicMaterial({ visible: false }));
      hitBox.position.y = (height / 2) + 0.3;
      hitBox.userData = {
        type: 'building',
        id,
        buildingId: id,
        name,
        floors,
        department: payload.function || 'Operações e Inovação',
        projectId: payload.projectId || null,
        status: buildingStatus,
        workspace: payload.workspace || null
      };
      bldGroup.add(hitBox);
      this.interactiveMeshes.push(hitBox);

      this.scene.add(bldGroup);
      const bldRecord = {
        id,
        name,
        projectId: payload.projectId || null,
        status: buildingStatus,
        workspace: payload.workspace || null,
        color,
        icon,
        department: payload.department || payload.function || null,
        capabilities: Array.isArray(payload.capabilities) ? payload.capabilities : [],
        group: bldGroup,
        position: coords,
        floors,
        beacon,
        hitBox
      };
      this.dynamicBuildings.set(id, bldRecord);
      this.buildings?.set?.(id, bldRecord);

      this.registerObstacle(id, {
        minX: coords.x - width / 2,
        maxX: coords.x + width / 2,
        minZ: coords.z - depth / 2,
        maxZ: coords.z + depth / 2,
        entryPos: { x: coords.x, y: 0.2, z: coords.z + depth / 2 + 0.8 },
        name
      });

      console.log(`[FenixWorld3D] ✅ Dynamic Building instantiated: ${name} (${id}) at (${coords.x}, ${coords.z})`);
      return { ok: true, id, name, position: coords, floors };
    }

    createAvatarPreview(canvas, options = {}) {
      if (!canvas || !this.renderer || typeof T.WebGLRenderer !== 'function') return null;
      let renderer;
      try {
        renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
      } catch (error) {
        console.warn('[FenixWorld3D] Avatar preview unavailable; editor fallback remains active.', error);
        return null;
      }

      const scene = new T.Scene();
      scene.background = new T.Color('#0b1219');
      scene.add(new T.HemisphereLight(0xddeeff, 0x24313a, 2.1));
      const keyLight = new T.DirectionalLight(0xffffff, 2.6);
      keyLight.position.set(3, 5, 4);
      scene.add(keyLight);
      const fillLight = new T.DirectionalLight(0x55d6c2, 0.8);
      fillLight.position.set(-3, 2, -2);
      scene.add(fillLight);
      const ground = new T.Mesh(new T.CircleGeometry(0.78, 40), new T.MeshStandardMaterial({ color: '#13232b', roughness: 0.92 }));
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.015;
      scene.add(ground);
      const camera = new T.PerspectiveCamera(31, 1, 0.1, 30);
      camera.position.set(2.7, 1.8, 3.9);
      const focusCenter = new T.Vector3(0, 0.96, 0);
      const previewFrameSize = new T.Vector3(2, 3.6, 2);
      camera.lookAt(focusCenter);

      const sharedMaterials = new Set(Object.values(this.materials || {}).flatMap((material) => Array.isArray(material) ? material : [material]));
      const previewBuilder = Object.create(this);
      previewBuilder.agents = new Map();
      previewBuilder.interactiveMeshes = [];
      let avatar = null;
      let state = 'idle';
      let yaw = 0;
      let frame = 0;
      let animationId = 0;
      let resizeObserver = null;
      let disposed = false;
      let pointerX = null;
      const onPointerDown = (event) => { pointerX = event.clientX; canvas.setPointerCapture?.(event.pointerId); };
      const onPointerMove = (event) => {
        if (pointerX === null) return;
        yaw += (event.clientX - pointerX) * 0.012;
        pointerX = event.clientX;
      };
      const onPointerUp = () => { pointerX = null; };
      canvas.style.touchAction = 'pan-y';
      canvas.addEventListener('pointerdown', onPointerDown);

        // Mode 1: Double-click cinematic fly-to project building
        canvas.addEventListener('dblclick', (e) => {
          if (!this.raycaster || !this.camera || !this.interactiveMeshes) return;
          const rect = canvas.getBoundingClientRect();
          const mouse = new T.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
          );
          this.raycaster.setFromCamera(mouse, this.camera);
          const hits = this.raycaster.intersectObjects(this.interactiveMeshes, false);
          if (hits.length > 0) {
            const hitData = hits[0].object.userData;
            if (hitData && hitData.projectId) {
              this.selectProjectBuilding(hitData);
            }
          }
        }); // fw3DoubleClickFly

      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerup', onPointerUp);
      canvas.addEventListener('pointercancel', onPointerUp);

      const removeAvatar = () => {
        if (!avatar) return;
        scene.remove(avatar);
        avatar.traverse((node) => {
          node.geometry?.dispose?.();
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          materials.forEach((material) => {
            if (material && !sharedMaterials.has(material)) {
              material.map?.dispose?.();
              material.dispose?.();
            }
          });
        });
        avatar.userData?.thoughtBubble?.texture?.dispose?.();
        avatar = null;
      };

      const fitCamera = () => {
        const verticalFov = camera.fov * Math.PI / 180;
        const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * Math.max(0.25, camera.aspect));
        const verticalDistance = (previewFrameSize.y / 2) / Math.tan(verticalFov / 2);
        const horizontalDistance = Math.max(previewFrameSize.x, previewFrameSize.z) / (2 * Math.tan(horizontalFov / 2));
        const distance = Math.max(verticalDistance, horizontalDistance, 2) * 1.2;
        camera.position.set(focusCenter.x + distance * 0.28, focusCenter.y + distance * 0.18, focusCenter.z + distance);
        camera.lookAt(focusCenter);
      };

      const update = (next = {}) => {
        if (disposed) return;
        options = { ...options, ...next };
        removeAvatar();
        const id = String(options.id || 'avatar-preview');
        const avatarConfig = options.avatar || {};
        const visualProfile = window.fenixCityAgentVisualProfile?.({
          id, name: options.name, role: options.role, department: options.department, avatar: avatarConfig
        }) || { displayScale: 1.3, skinColor: '#d4a17f', hairColor: 0x282521, shirtColor: '#087f8c', accessory: 'none' };
        const shirtMat = this.materials.workWear?.clone?.() || new T.MeshStandardMaterial({ color: visualProfile.shirtColor || '#087f8c', roughness: 0.76 });
        shirtMat.color?.set?.(visualProfile.shirtColor || '#087f8c');
        avatar = this._createCyberHumanoid.call(previewBuilder, {
          id, name: options.name || 'Agente', role: options.role || 'Especialista',
          department: options.department || '', pos: new T.Vector3(0, 0, 0), shirtMat,
          hairColor: visualProfile.hairColor, accessory: visualProfile.accessory || 'none',
          visualProfile, isSeated: false
        });
        const thoughtBubble = avatar.userData?.thoughtBubble;
        if (thoughtBubble?.sprite) {
          thoughtBubble.sprite.parent?.remove(thoughtBubble.sprite);
          thoughtBubble.sprite.material?.map?.dispose?.();
          thoughtBubble.sprite.material?.dispose?.();
          thoughtBubble.sprite = null;
        }
        [avatar.userData?.emoteBadge, avatar.userData?.emoteIcon].forEach((badge) => {
          if (!badge) return;
          badge.parent?.remove?.(badge);
          badge.geometry?.dispose?.();
        });
        const bounds = new T.Box3().setFromObject(avatar);
        bounds.getCenter(focusCenter);
        fitCamera();
        avatar.rotation.y = yaw;
        scene.add(avatar);
        state = next.state || state;
      };

      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(1, Math.floor(rect.width || 320));
        const height = Math.max(1, Math.floor(rect.height || 360));
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        fitCamera();
      };
      const render = () => {
        if (disposed) return;
        animationId = requestAnimationFrame(render);
        frame += 0.035;
        if (avatar) {
          avatar.rotation.y = yaw + (state === 'working' ? Math.sin(frame) * 0.035 : 0);
          avatar.position.y = state === 'idle' ? Math.sin(frame * 1.3) * 0.018 : state === 'error' ? Math.sin(frame * 3) * 0.012 : 0;
          const { armL, armR } = avatar.userData || {};
          if (armL && armR) {
            const swing = state === 'walk' ? Math.sin(frame * 4) * 0.42 : state === 'working' ? Math.sin(frame * 3) * 0.16 : 0;
            armL.rotation.x = swing;
            armR.rotation.x = -swing;
          }
          if (state === 'error') avatar.rotation.z = Math.sin(frame * 3) * 0.025;
          else avatar.rotation.z = 0;
        }
        renderer.render(scene, camera);
      };

      try {
        update(options);
      } catch (error) {
        console.warn('[FenixWorld3D] Avatar model preview failed; editor fallback remains active.', error);
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointercancel', onPointerUp);
        ground.geometry.dispose();
        ground.material.dispose();
        renderer.dispose();
        return null;
      }
      resize();
      if (typeof ResizeObserver === 'function') {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(canvas);
      }
      animationId = requestAnimationFrame(render);

      return {
        update,
        rotate(direction = 1) { yaw += (direction < 0 ? -1 : 1) * Math.PI / 2; },
        setState(nextState) { state = String(nextState || 'idle'); },
        dispose() {
          if (disposed) return;
          disposed = true;
          cancelAnimationFrame(animationId);
          resizeObserver?.disconnect?.();
          canvas.removeEventListener('pointerdown', onPointerDown);
          canvas.removeEventListener('pointermove', onPointerMove);
          canvas.removeEventListener('pointerup', onPointerUp);
          canvas.removeEventListener('pointercancel', onPointerUp);
          removeAvatar();
          scene.traverse((node) => {
            if (node !== avatar) node.geometry?.dispose?.();
          });
          ground.material.dispose();
          renderer.dispose();
        }
      };
    }

    spawnDynamicAgent(payload) {
      const id = payload.id || `agent-${Date.now()}`;
      const name = payload.name || 'Agente Operacional';
      const role = payload.role || 'Especialista Fênix';
      const department = payload.department || 'OPERATIONS';
      const coords = payload.coordinates || { x: -28.0, y: 0.8, z: 18.0 };
      const coordinateSource = ['MEASURED', 'ESTIMATED'].includes(payload.coordinateSource)
        ? payload.coordinateSource
        : this._getAgentCoordinateSource(payload.coordinates, payload);
      const visualProfile = window.fenixCityAgentVisualProfile?.({ id, role, department, avatar: payload.avatar }) || null;

      if (this.agents && this.agents.has(id)) {
        const existing = this.agents.get(id);
        if (existing && existing.mesh) {
          existing.mesh.position.set(coords.x, coords.y || 0.8, coords.z);
          existing.coordinateSource = coordinateSource;
          if (visualProfile) {
            const materials = existing.mesh.userData.avatarMaterials || {};
            existing.mesh.userData.visualProfile = visualProfile;
            existing.mesh.userData.avatarMaterials?.shirt?.color?.set?.(visualProfile.shirtColor);
            existing.mesh.userData.avatarMaterials?.skin?.color?.set?.(visualProfile.skinColor);
            existing.mesh.userData.avatarMaterials?.hair?.color?.set?.(visualProfile.hairColor);
            existing.mesh.userData.avatarMaterials?.pants?.color?.set?.(visualProfile.pantsColor || '#344458');
            existing.mesh.userData.avatarMaterials?.shoes?.color?.set?.(visualProfile.shoesColor || '#090d16');
            existing.mesh.userData.halo?.material?.color?.set?.(visualProfile.accentColor || '#22d3ee');
            const replaceDetails = (key, next) => {
              const previous = materials[key];
              if (previous) {
                existing.mesh.remove(previous);
                const usedMaterials = new Set([...Object.values(this.materials), ...Object.values(materials)]);
                const disposeMaterials = new Set();
                previous.traverse?.((part) => {
                  part.geometry?.dispose?.();
                  for (const material of Array.isArray(part.material) ? part.material : [part.material]) {
                    if (material && !usedMaterials.has(material)) disposeMaterials.add(material);
                  }
                });
                for (const material of previous.userData?.ownedMaterials || []) {
                  if (material && !usedMaterials.has(material)) disposeMaterials.add(material);
                }
                disposeMaterials.forEach((material) => material.dispose?.());
              }
              existing.mesh.add(next);
              materials[key] = next;
            };
            const torsoY = existing.mesh.userData.isSeated ? 0.85 : 1.08;
            replaceDetails('outfitDetails', this._createAvatarOutfitDetails(visualProfile, torsoY, materials?.shirt));
            replaceDetails('accessoryDetails', this._createAvatarAccessoryDetails(visualProfile.accessory, torsoY));
            existing.visualProfile = visualProfile;
          }
          if (existing.thoughtBubble) {
            const activityText = payload.taskName || 'Ativo · Reposicionado';
            existing.thoughtBubble.setText(coordinateSource === 'ESTIMATED' ? `Posição estimada · ${activityText}` : activityText, visualProfile?.icon || '📍');
          }
          return { ok: true, id, updated: true, agent: existing };
        }
      }

      this.agents = this.agents || new Map();
      const pos = new T.Vector3(coords.x, coords.y !== undefined ? coords.y : 0.8, coords.z);
      const resolvedVisualProfile = visualProfile || {
        key: 'specialist', source: 'role-derived', displayScale: 1.75, shirtColor: '#344458', hairColor: 0x282521, accessory: 'tablet', icon: '👤'
      };
      const shirtMat = this.materials.workWear?.clone?.() || new T.MeshStandardMaterial({ color: resolvedVisualProfile.shirtColor, roughness: 0.76, metalness: 0.03 });
      shirtMat.color?.set?.(resolvedVisualProfile.shirtColor);
      shirtMat.name = `CityAgentShirt_${id}`;

      const agentMesh = this._createCyberHumanoid({
        id,
        name,
        role,
        department,
        pos,
        shirtMat,
        hairColor: resolvedVisualProfile.hairColor,
        accessory: resolvedVisualProfile.accessory,
        visualProfile: resolvedVisualProfile,
        isSeated: false,
      });

      const activity = this._resolveAgentActivity(payload);
      const bubble = agentMesh.userData?.thoughtBubble;
      bubble?.setText(coordinateSource === 'ESTIMATED' ? `Posição estimada · ${activity.text}` : activity.text, activity.icon, activity.color);
      agentMesh.userData.coordinateSource = coordinateSource;

      this.scene.add(agentMesh);
      const agentRecord = {
        id,
        agentId: id,
        name,
        role,
        department,
        mesh: agentMesh,
        thoughtBubble: bubble,
        status: payload.status || 'AVAILABLE',
        activity,
        coordinateSource,
        visualProfile: resolvedVisualProfile,
        state: payload.state || 'IDLE',
        coordinates: { ...coords, y: coords.y !== undefined ? coords.y : 0.8 },
        telemetryCoordinates: { ...coords, y: coords.y !== undefined ? coords.y : 0.8 },
        movementState: String(payload.movementState || '').toUpperCase() === 'WALKING' ? 'WALKING' : null,
        targetCoordinates: payload.targetCoordinates || null,
        serverMovementTarget: String(payload.movementState || '').toUpperCase() === 'WALKING' && payload.targetCoordinates ? { ...payload.targetCoordinates } : null,
        telemetryTarget: String(payload.movementState || '').toUpperCase() === 'WALKING' && payload.targetCoordinates ? { ...payload.targetCoordinates } : null,
        routineWaypoints: Array.isArray(payload.routineWaypoints) && payload.routineWaypoints.length > 1 ? payload.routineWaypoints : null,
        waypointIndex: Number.isFinite(payload.waypointIndex) ? payload.waypointIndex : 0,
        speed: Number.isFinite(payload.speed) && payload.speed >= 0.8 ? payload.speed : 2.4,
        path: [],
        pathIndex: 0
      };

      this.agents.set(id, agentRecord);

      agentMesh.traverse(child => {
        if (child.isMesh) {
          child.userData = {
            type: 'agent',
            agentId: id,
            id,
            name,
            role,
            department
          };
          this.interactiveMeshes.push(child);
        }
      });

      console.log(`[FenixWorld3D] ✅ Dynamic Agent spawned: ${name} (${id}) at (${coords.x}, ${coords.z})`);
      return { ok: true, id, name, role, position: coords };
    }

    moveDynamicAgent(agentId, destination) {
      if (!agentId) return { ok: false, error: 'agentId required' };
      const ag = this.agents ? this.agents.get(agentId) : null;
      if (!ag || !ag.mesh) {
        console.warn(`[FenixWorld3D] Agent '${agentId}' not found for movement`);
        return { ok: false, error: `Agent ${agentId} not found` };
      }

      let targetX = 0, targetY = 0.8, targetZ = 0;
      if (typeof destination.x === 'number') {
        targetX = destination.x;
        targetY = destination.y !== undefined ? destination.y : 0.8;
        targetZ = destination.z !== undefined ? destination.z : 0;
      } else if (destination.coordinates) {
        targetX = destination.coordinates.x;
        targetY = destination.coordinates.y !== undefined ? destination.coordinates.y : 0.8;
        targetZ = destination.coordinates.z !== undefined ? destination.coordinates.z : 0;
      } else if (destination.buildingId && this.dynamicBuildings && this.dynamicBuildings.has(destination.buildingId)) {
        const b = this.dynamicBuildings.get(destination.buildingId);
        targetX = b.position.x;
        targetY = (destination.floorNum || 0) * 4.2 + 0.8;
        targetZ = b.position.z;
      }

      const targetVec = new T.Vector3(targetX, targetY, targetZ);
      this.navigateAgent(agentId, targetVec);

      if (ag.thoughtBubble) {
        ag.thoughtBubble.setText('Movimento local · não sincronizado', '🚶', '#38bdf8');
      }

      console.log(`[FenixWorld3D] 🚶 Agent ${agentId} moving to (${targetX.toFixed(1)}, ${targetZ.toFixed(1)})`);
      return { ok: true, agentId, target: { x: targetX, y: targetY, z: targetZ } };
    }

    _advanceAgentToTelemetry(agentRecord, delta) {
      const target = agentRecord?.telemetryTarget;
      const position = agentRecord?.mesh?.position;
      if (!target || !position) return false;

      // Recompute collision-free A* path if target changed or no path exists
      if (!agentRecord._computedPath || !agentRecord._lastComputedTarget ||
          Math.hypot(agentRecord._lastComputedTarget.x - target.x, agentRecord._lastComputedTarget.z - target.z) > 0.4) {
        agentRecord._computedPath = this.pathGraph
          ? this.pathGraph.findPath(position, target)
          : [target];
        agentRecord._lastComputedTarget = { x: target.x, y: target.y, z: target.z };
        agentRecord._pathSubIndex = 0;
      }

      const path = agentRecord._computedPath;
      let subTarget = path && path[agentRecord._pathSubIndex] ? path[agentRecord._pathSubIndex] : target;
      let dx = subTarget.x - position.x;
      let dz = (subTarget.z !== undefined ? subTarget.z : subTarget.y) - position.z;
      let distance = Math.hypot(dx, dz);
      const step = Math.max(0, (agentRecord.speed || 2.4) * delta);

      // Advance to next node if reached subTarget
      while (distance <= Math.max(step, 0.25) && agentRecord._pathSubIndex < path.length - 1) {
        agentRecord._pathSubIndex++;
        subTarget = path[agentRecord._pathSubIndex];
        dx = subTarget.x - position.x;
        dz = (subTarget.z !== undefined ? subTarget.z : subTarget.y) - position.z;
        distance = Math.hypot(dx, dz);
      }

      // Check if reached ultimate destination
      const totalDx = target.x - position.x;
      const totalDz = target.z - position.z;
      if (Math.hypot(totalDx, totalDz) <= Math.max(step, 0.25)) {
        position.set(target.x, target.y ?? position.y, target.z);
        agentRecord._computedPath = null;
        agentRecord._lastComputedTarget = null;
        agentRecord._pathSubIndex = 0;

        if (Array.isArray(agentRecord.routineWaypoints) && agentRecord.routineWaypoints.length > 1) {
          agentRecord.waypointIndex = ((agentRecord.waypointIndex || 0) + 1) % agentRecord.routineWaypoints.length;
          const nextWp = agentRecord.routineWaypoints[agentRecord.waypointIndex];
          if (nextWp && Number.isFinite(Number(nextWp.x)) && Number.isFinite(Number(nextWp.y ?? nextWp.z))) {
            agentRecord.telemetryTarget = {
              x: Number(nextWp.x),
              y: position.y || 0.8,
              z: Number(nextWp.z !== undefined ? nextWp.z : nextWp.y)
            };
            if (nextWp.task && agentRecord.thoughtBubble) {
              const cleanTask = this._cleanAgentTask(nextWp.task);
              agentRecord.currentTask = cleanTask;
              agentRecord.thoughtBubble.setText(`A caminho · ${cleanTask}`, '➜', '#38bdf8');
            }
            return true;
          }
        }
        agentRecord.telemetryTarget = null;
        return false;
      }

      const progress = Math.min(1.0, step / (distance || 1e-5));
      const nextX = position.x + dx * progress;
      const nextZ = position.z + dz * progress;

      // Obstacle collision check with sliding along free axis
      if (this.isPointInObstacle(nextX, nextZ, 0.35)) {
        if (!this.isPointInObstacle(nextX, position.z, 0.35)) {
          position.x = nextX;
        } else if (!this.isPointInObstacle(position.x, nextZ, 0.35)) {
          position.z = nextZ;
        }
      } else {
        position.x = nextX;
        position.z = nextZ;
      }

      if (Number.isFinite(subTarget.y)) position.y += (subTarget.y - position.y) * progress;
      if (agentRecord.mesh.rotation) agentRecord.mesh.rotation.y = Math.atan2(dx, dz);
      return true;
    }

    _renderWorldMinimap(time) {
      const canvas = document.getElementById('fenixMinimap');
      if (!canvas || !this.cameraState) return;
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (this._lastMinimapFrame && now - this._lastMinimapFrame < 250) return;
      this._lastMinimapFrame = now;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const target = this.cameraState.targetLookAt;
      const centerX = target.x;
      const centerZ = target.z;
      const halfSpan = Math.max(90, Math.min(260, this.cameraState.targetDistance * 1.15));
      const scale = Math.min(width, height) / (halfSpan * 2);
      const toX = (x) => width / 2 + (x - centerX) * scale;
      const toY = (z) => height / 2 + (z - centerZ) * scale;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#08131c';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(94, 135, 151, 0.14)';
      ctx.lineWidth = 1;
      const gridStep = 20;
      const left = centerX - halfSpan;
      const top = centerZ - halfSpan;
      for (let x = Math.floor(left / gridStep) * gridStep; x <= centerX + halfSpan; x += gridStep) {
        const px = toX(x);
        ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, height); ctx.stroke();
      }
      for (let z = Math.floor(top / gridStep) * gridStep; z <= centerZ + halfSpan; z += gridStep) {
        const py = toY(z);
        ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(width, py); ctx.stroke();
      }

      for (const district of DISTRICTS) {
        const x = toX(district.x);
        const y = toY(district.z);
        const districtWidth = Math.max(6, (district.footprint?.width || 24) * scale);
        const districtDepth = Math.max(6, (district.footprint?.depth || 24) * scale);
        if (x + districtWidth / 2 < 0 || x - districtWidth / 2 > width || y + districtDepth / 2 < 0 || y - districtDepth / 2 > height) continue;
        const color = `#${Number(district.color).toString(16).padStart(6, '0')}`;
        ctx.fillStyle = `${color}20`;
        ctx.strokeStyle = `${color}95`;
        ctx.lineWidth = 1;
        ctx.fillRect(x - districtWidth / 2, y - districtDepth / 2, districtWidth, districtDepth);
        ctx.strokeRect(x - districtWidth / 2, y - districtDepth / 2, districtWidth, districtDepth);
      }

      const buildings = this.dynamicBuildings instanceof Map ? Array.from(this.dynamicBuildings.values()) : [];
      for (const building of buildings) {
        const position = building.group?.position || building.position;
        if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.z)) continue;
        const x = toX(position.x); const y = toY(position.z);
        if (x < 0 || x > width || y < 0 || y > height) continue;
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
      }

      let visibleAgents = 0;
      let activeAgents = 0;
      const totalAgents = this.agents instanceof Map ? this.agents.size : 0;
      if (this.agents instanceof Map) for (const agent of this.agents.values()) {
        const status = String(agent.status || agent.state || '').toUpperCase();
        if (/WORK|BUSY|RUNNING|WALKING|EXECUTING|ACTIVE/.test(status) || Boolean(agent.currentTask || agent.telemetryTarget)) {
          activeAgents++;
        }
        const position = agent.mesh?.position;
        if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.z)) continue;
        const x = toX(position.x); const y = toY(position.z);
        if (x < 0 || x > width || y < 0 || y > height) continue;
        visibleAgents++;
        ctx.fillStyle = /FAIL|ERROR|OFFLINE/.test(status) ? '#fb7185' : /QUEUE|WAIT|BLOCK/.test(status) ? '#fbbf24' : /WORK|BUSY|RUNNING|WALKING/.test(status) ? '#27d7c4' : '#67e8f9';
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      }

      const markerX = toX(centerX); const markerY = toY(centerZ);
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(markerX, markerY, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(markerX - 9, markerY); ctx.lineTo(markerX + 9, markerY); ctx.moveTo(markerX, markerY - 9); ctx.lineTo(markerX, markerY + 9); ctx.stroke();

      const status = document.getElementById('fenixMinimapStatus');
      const measuredBuildingsCount = (this.buildings instanceof Map ? this.buildings.size : 0) || buildings.length;
      if (status) status.textContent = this.telemetryStatus === 'MEASURED'
        ? `${visibleAgents} no mapa · ${measuredBuildingsCount} prédios medidos`
        : this.telemetryStatus === 'PARTIAL' ? 'Leitura parcial da API'
          : this.telemetryStatus === 'CONNECTING' ? 'Sincronizando telemetria…' : 'Telemetria indisponível';

      if (!canvas.dataset.fenixPanBound) {
        canvas.dataset.fenixPanBound = '1';
        canvas.addEventListener('click', (event) => {
          const rect = canvas.getBoundingClientRect();
          const localX = (event.clientX - rect.left) * (canvas.width / rect.width);
          const localY = (event.clientY - rect.top) * (canvas.height / rect.height);
          const currentTarget = this.cameraState.targetLookAt;
          const currentSpan = Math.max(90, Math.min(260, this.cameraState.targetDistance * 1.15));
          const currentScale = Math.min(canvas.width, canvas.height) / (currentSpan * 2);
          const worldX = currentTarget.x + (localX - canvas.width / 2) / currentScale;
          const worldZ = currentTarget.z + (localY - canvas.height / 2) / currentScale;
          this.stopFollowing?.();
          this.focusEntity(new T.Vector3(worldX, currentTarget.y, worldZ), this.cameraState.targetDistance);
        });
      }
    }

    assignDynamicMission(payload) {
      const agentId = payload.agentId || payload.id;
      const taskName = payload.taskName || payload.objective || 'Missão Operacional';
      const ag = this.agents ? this.agents.get(agentId) : null;
      if (ag) {
        ag.status = 'WORKING';
        ag.currentTask = taskName;
        if (ag.thoughtBubble) {
          ag.thoughtBubble.setText(taskName.slice(0, 24), '⚡', '#f59e0b');
        }
      }
      return { ok: true, agentId, taskName, status: 'WORKING' };
    }

    completeDynamicTask(payload) {
      const agentId = payload.agentId || payload.id;
      const ag = this.agents ? this.agents.get(agentId) : null;
      if (ag) {
        ag.status = 'AVAILABLE';
        ag.currentTask = 'Standby operacional';
        if (ag.thoughtBubble) {
          ag.thoughtBubble.setText('Tarefa concluída ✓', '✅', '#10b981');
        }
      }
      return { ok: true, agentId, status: 'AVAILABLE' };
    }

    failDynamicTask(payload) {
      const agentId = payload.agentId || payload.id;
      const errorMsg = payload.error || payload.reason || 'Falha na tarefa';
      const ag = this.agents ? this.agents.get(agentId) : null;
      if (ag) {
        ag.status = 'ERROR';
        ag.currentTask = `Erro: ${errorMsg}`;
        if (ag.thoughtBubble) {
          ag.thoughtBubble.setText(errorMsg.slice(0, 24), '❌', '#ef4444');
        }
      }
      return { ok: true, agentId, status: 'ERROR' };
    }

    recoverDynamicAgent(payload) {
      const agentId = payload.agentId || payload.id;
      const ag = this.agents ? this.agents.get(agentId) : null;
      if (ag) {
        ag.status = 'AVAILABLE';
        ag.currentTask = 'Recuperado · Pronto para novas diretivas';
        if (ag.thoughtBubble) {
          ag.thoughtBubble.setText('Recuperado', '🔄', '#00d9ff');
        }
      }
      return { ok: true, agentId, status: 'AVAILABLE' };
    }

    handleCityEvent(event) {
      if (!event) return;
      const type = String(event.type || '').toLowerCase();
      const payload = event.payload || {};
      const agentId = payload.agentId || payload.agentName || event.subject;
      const taskText = payload.task || payload.taskName || payload.name || payload.objective || payload.job?.name || payload.title || '';

      if (['agent.assigned', 'mission.started', 'mission.step.started', 'job.started', 'runtime.job.started'].includes(type)) {
        if (agentId) {
          this.assignDynamicMission({ agentId, taskName: taskText || 'Executando tarefa...' });
        }
      } else if (['agent.completed', 'mission.completed', 'mission.step.completed', 'job.completed', 'runtime.job.succeeded', 'world.agent.task_completed'].includes(type)) {
        if (agentId) {
          this.completeDynamicTask({ agentId });
        }
      } else if (['agent.failed', 'mission.failed', 'job.failed', 'runtime.job.failed', 'world.agent.task_failed'].includes(type)) {
        if (agentId) {
          this.failDynamicTask({ agentId, error: payload.error || payload.reason || 'Falha na tarefa' });
        }
      } else if (['agent.recovered', 'mission.repaired', 'mission.recovered', 'world.agent.task_recovered'].includes(type)) {
        if (agentId) {
          this.recoverDynamicAgent({ agentId, note: payload.note || payload.reason || 'Recuperado' });
        }
      } else if (['agent.navigating', 'agent.walking'].includes(type)) {
        if (agentId && (payload.destination || payload.location)) {
          this.moveDynamicAgent(agentId, payload.destination || payload.location);
        }
      }
    }

    setEnvironment(payload) {
      const hasTimeOfDay = payload.timeOfDay === 'NIGHT' || payload.timeOfDay === 'DAY';
      const hasNightFlag = typeof payload.isNight === 'boolean';
      const hasExplicitTime = hasTimeOfDay || hasNightFlag;
      const isNight = hasNightFlag ? payload.isNight : payload.timeOfDay === 'NIGHT';
      const isRain = payload.weather === 'RAIN';

      if (hasExplicitTime && (typeof this.cameraState.night !== 'boolean' || isNight !== this.cameraState.night)) {
        this._setDayNight(isNight);
      }

      if (isRain && this.scene && this.scene.fog) {
        this.scene.fog.density = 0.015;
      } else if (this.scene && this.scene.fog) {
        this.scene.fog.density = 0.007;
      }

      return {
        ok: true,
        isNight: hasExplicitTime ? Boolean(isNight) : (typeof this.cameraState.night === 'boolean' ? this.cameraState.night : null),
        weather: isRain ? 'RAIN' : 'CLEAR'
      };
    }

    removeDynamicEntity(payload) {
      const type = String(payload.entityType || payload.type || '').toLowerCase();
      const id = payload.id;

      if (type === 'building' && this.dynamicBuildings && this.dynamicBuildings.has(id)) {
        const bld = this.dynamicBuildings.get(id);
        if (bld.group) {
          this.scene.remove(bld.group);
          bld.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
              else child.material.dispose();
            }
          });
        }
        this.dynamicBuildings.delete(id);
        return { ok: true, removed: true, id, type: 'building' };
      }

      if (type === 'agent' && this.agents && this.agents.has(id)) {
        const ag = this.agents.get(id);
        if (ag.mesh) {
          this.scene.remove(ag.mesh);
          ag.mesh.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
              else child.material.dispose();
            }
          });
        }
        this.agents.delete(id);
        return { ok: true, removed: true, id, type: 'agent' };
      }

      return { ok: false, error: 'Entity not found' };
    }

    /* ══════════════════════════════════════════════════════════════════════════
       ANIMATION LOOP & CUTAWAY INTERPOLATION
    ══════════════════════════════════════════════════════════════════════════ */
    _animate() {
      this._animationFrameId = null;
      if (!this._isMounted || this._isDisposed) {
        return;
      }
      const cityView = document.getElementById('view-city');
      const isCityActive = cityView && cityView.classList.contains('active') && cityView.style.display !== 'none';
      if (document.hidden || !isCityActive) {
        return;
      }
      this._scheduleNextAnimationFrame();

      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (!this._shouldRenderFrame(now)) return;

      const elapsedDelta = this.clock.getDelta();
      const delta = Number.isFinite(elapsedDelta) ? Math.min(Math.max(elapsedDelta, 0), 0.05) : 0;
      const time = this.clock.getElapsedTime();
      const hasMeasuredRuntimeWork = this.activeRuntimeJobs > 0;

      // Update Live KPI canvas texture at ~4Hz
      if (this.liveKpiCtx && now - (this.liveKpiLastUpdate || 0) > 250) {
        this.liveKpiLastUpdate = now;
        if (this.liveKpiHistory && this.liveKpiHistory.length > 0) {
          const lastVal = this.liveKpiHistory[this.liveKpiHistory.length - 1];
          const nextVal = Math.max(20, Math.min(98, lastVal + (Math.sin(time * 3) * 6)));
          this.liveKpiHistory.shift();
          this.liveKpiHistory.push(Math.round(nextVal));
          this._drawLiveKpi(time);
        }
      }

      // CityRT: Active vehicular traffic along urban avenues
      if (this.trafficVehicle && this.trafficVehicle.mesh) {
        const tv = this.trafficVehicle;
        tv.z = (tv.z || -30) + (tv.speed || 3.8) * (tv.direction || 1) * delta;
        if (tv.z > 65) {
          tv.z = 65;
          tv.direction = -1;
          tv.mesh.rotation.y = Math.PI;
        } else if (tv.z < -65) {
          tv.z = -65;
          tv.direction = 1;
          tv.mesh.rotation.y = 0;
        }
        tv.mesh.position.z = tv.z;
      }

      // 1. Dynamic Automatic Warehouse Roof Cutaway System
      if (this.warehouseRoofGroup) {
        const distToDep = this.cameraState.targetLookAt.distanceTo(districtPoint('logistics'));
        const shouldCutaway = (this.cameraState.distance < 60 && distToDep < 32) || this.cutawayState.manual;
        this.cutawayState.target = shouldCutaway ? 1.0 : 0.0;
        this.cutawayState.progress += (this.cutawayState.target - this.cutawayState.progress) * 0.12;
        if (this.warehouseInteriorGroup) {
          this.warehouseInteriorGroup.visible = shouldCutaway || this.cutawayState.progress > 0.05;
        }

        // Smoothly elevate the roof and skylights upward
        this.warehouseRoofGroup.position.y = 11.9 + this.cutawayState.progress * 32;
        this.warehouseRoofGroup.visible = this.cutawayState.progress < 0.95;
      }

      // 2. Active Multi-Step Logistics Forklift Operational Cycle (Doca 2 <-> Rua B Staging/Racking)
      if (this.forkliftGroup && this.forkliftState?.jobId) {
        const fs = this.forkliftState;
        const logistics = districtOrigin('logistics');
        fs.timer = (fs.timer || 0) + delta;
        fs.strobeTimer = (fs.strobeTimer || 0) + delta;

        // Amber flashing strobe beacon on roll cage
        const ud = this.forkliftGroup.userData;
        if (ud && ud.strobe) {
          ud.strobe.visible = (Math.sin(time * 12) > 0);
        }

        switch (fs.step || 0) {
          case 0: // Waiting at Doca 2 apron
            this.forkliftGroup.position.set(logistics.x, 0.9, logistics.z + 8.5);
            this.forkliftGroup.rotation.y = 0;
            if (fs.timer > 2.0) {
              fs.step = 1;
              fs.timer = 0;
              fs.z = 8.5;
            }
            break;
          case 1: // Driving into container / semi-trailer at Doca 2
            fs.z = (fs.z || 8.5) + delta * 2.2;
            this.forkliftGroup.position.z = logistics.z + fs.z;
            this.forkliftGroup.position.x = logistics.x;
            this.forkliftGroup.rotation.y = 0;
            if (fs.z >= 12.0) {
              fs.step = 2;
              fs.timer = 0;
            }
            break;
          case 2: // Picking up pallet from container
            if (ud && ud.forks && ud.pallet) {
              const liftProgress = Math.min(1.0, fs.timer / 1.0);
              ud.forks.position.y = 0.35 + liftProgress * 0.45;
              ud.pallet.position.y = 0.42 + liftProgress * 0.45;
            }
            if (fs.timer > 1.4) {
              fs.step = 3;
              fs.timer = 0;
            }
            break;
          case 3: // Reversing out of semi-trailer onto dock apron
            fs.z = (fs.z || 12.0) - delta * 2.2;
            this.forkliftGroup.position.z = logistics.z + fs.z;
            this.forkliftGroup.rotation.y = 0;
            if (fs.z <= 4.0) {
              fs.step = 4;
              fs.timer = 0;
            }
            break;
          case 4: // Turning 180° towards Rua B racking
            this.forkliftGroup.rotation.y += delta * 2.4;
            if (this.forkliftGroup.rotation.y >= Math.PI) {
              this.forkliftGroup.rotation.y = Math.PI;
              fs.step = 5;
              fs.timer = 0;
            }
            break;
          case 5: // Driving forward into warehouse aisle B
            fs.z = (fs.z || 4.0) - delta * 2.8;
            this.forkliftGroup.position.z = logistics.z + fs.z;
            if (fs.z <= -6.0) {
              fs.step = 6;
              fs.timer = 0;
            }
            break;
          case 6: // Depositing cargo onto racking staging
            if (ud && ud.forks && ud.pallet) {
              const lowerProgress = Math.max(0.0, 1.0 - (fs.timer / 1.2));
              ud.forks.position.y = 0.35 + lowerProgress * 0.45;
              ud.pallet.position.y = 0.42 + lowerProgress * 0.45;
            }
            if (fs.timer > 1.8) {
              fs.step = 7;
              fs.timer = 0;
            }
            break;
          case 7: // Turning 180° back towards Doca 2
            this.forkliftGroup.rotation.y -= delta * 2.4;
            if (this.forkliftGroup.rotation.y <= 0) {
              this.forkliftGroup.rotation.y = 0;
              fs.step = 8;
              fs.timer = 0;
            }
            break;
          case 8: // Returning to Doca 2
            fs.z = (fs.z || -6.0) + delta * 2.8;
            this.forkliftGroup.position.z = logistics.z + fs.z;
            if (fs.z >= 8.5) {
              fs.z = 8.5;
              fs.step = 0;
              fs.timer = 0;
            }
            break;
          default:
            fs.step = 0;
            fs.timer = 0;
        }
      }

      // 2b. 3D Physical Data Packets Arc Flight (Parabolic Trajectory)
      if (this.livePackets && this.livePackets.length > 0) {
        for (let i = this.livePackets.length - 1; i >= 0; i--) {
          const pkt = this.livePackets[i];
          pkt.progress += delta * pkt.speed;
          if (pkt.progress >= 1.0) {
            pkt.progress = 1.0;
            if (typeof pkt.onComplete === 'function') pkt.onComplete();
            if (pkt.mesh) {
              this.scene.remove(pkt.mesh);
              if (pkt.mesh.geometry) pkt.mesh.geometry.dispose();
              if (pkt.mesh.material) pkt.mesh.material.dispose();
            }
            this.livePackets.splice(i, 1);
          } else {
            pkt.mesh.position.lerpVectors(pkt.startPos, pkt.endPos, pkt.progress);
            pkt.mesh.position.y += Math.sin(pkt.progress * Math.PI) * pkt.arcHeight;
            pkt.mesh.rotation.x += delta * 6;
            pkt.mesh.rotation.y += delta * 4;
          }
        }
      }

      // 3. Camila Breathing & Work Cycle follows her measured runtime state.
      if (this.camilaGroup && String(this.camilaState?.action || '').toUpperCase() === 'WORKING') {
        this.camilaState.timer += delta;
        this.camilaGroup.position.y = this.camilaState.pos.y + Math.sin(time * 3) * 0.03;
      } else if (this.camilaGroup) {
        this.camilaGroup.position.y = this.camilaState.pos.y;
      }

      // 3b. API activity effects are active only while the runtime reports work.
      if (hasMeasuredRuntimeWork) {
        if (this.apiNeuralCore) {
          this.apiNeuralCore.rotation.y = time * 0.8;
          this.apiNeuralCore.rotation.x = Math.sin(time * 0.5) * 0.2;
        }
        if (this.apiNeuralRing) this.apiNeuralRing.rotation.z = time * 1.2;
        if (this.apiNeuralRing2) this.apiNeuralRing2.rotation.x = -time * 0.9;
        if (this.apiNeuralRing3) this.apiNeuralRing3.rotation.y = time * 1.5;
        if (this.serverRacksLeds && this.serverRacksLeds.length > 0) {
          const step = Math.floor(time * 6) % 3;
          this.serverRacksLeds.forEach((led, i) => {
            led.visible = (i % 3 === step) ? (Math.sin(time * 12 + i) > -0.4) : true;
          });
        }
      }

      // 3c. Inter-Floor Optical Data Conduits & Animated Token Packets
      if (hasMeasuredRuntimeWork && this.apiDataPackets && this.apiDataPackets.length > 0) {
        this.apiDataPackets.forEach(pkt => {
          pkt.currentY += pkt.speed * pkt.dir * delta * 2.4;
          if (pkt.currentY > pkt.endY) {
            pkt.currentY = pkt.endY;
            pkt.dir = -1;
          } else if (pkt.currentY < pkt.startY) {
            pkt.currentY = pkt.startY;
            pkt.dir = 1;
          }
          pkt.mesh.position.y = pkt.currentY;
          pkt.mesh.rotation.x += delta * 2.8;
          pkt.mesh.rotation.y += delta * 1.9;
        });
      }

      // 3d. Habbo/Tibia 3D Autonomous Agent Life Animations (Performance Optimized: Frustum Culling + LOD + Vector Reuse)
      if (this.agents && this.agents.size > 0) {
        if (!this._frustum) {
          this._frustum = new T.Frustum();
          this._projScreenMatrix = new T.Matrix4();
          this._tempMoveDir = new T.Vector3();
        }
        this._projScreenMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
        this._frustum.setFromProjectionMatrix(this._projScreenMatrix);
        this._frameCounter = (this._frameCounter || 0) + 1;

        let aIdx = 0;
        this.agents.forEach(agentRecord => {
          aIdx++;
          const ud = agentRecord.mesh ? agentRecord.mesh.userData : null;
          if (!ud || !agentRecord.mesh) return;

          const inFrustum = this._frustum.containsPoint(agentRecord.mesh.position);
          const camDist = this.camera.position.distanceTo(agentRecord.mesh.position);

          // Culling: off-screen agents beyond close range skip animations
          if (!inFrustum && camDist > 25 && !agentRecord.path && !agentRecord.telemetryTarget) {
            return;
          }

          const aTime = time + aIdx * 1.35;
          const agentIsWorking = (agentRecord.activity?.key || this._resolveAgentActivity(agentRecord).key) === 'working';
          // Dynamic Waypoint Navigation along PathGraph
          if (agentRecord.path && agentRecord.path.length > 0) {
            const targetWp = agentRecord.path[agentRecord.pathIndex];
            if (targetWp) {
              this._tempMoveDir.copy(targetWp).sub(agentRecord.mesh.position);
              this._tempMoveDir.y = 0;
              const dist = this._tempMoveDir.length();
              if (dist < 0.25) {
                agentRecord.pathIndex++;
                if (agentRecord.pathIndex >= agentRecord.path.length) {
                  agentRecord.path = null;
                  agentRecord.pathIndex = 0;
                  agentRecord.localNavigationActive = false;
                  if (agentRecord.thoughtBubble) {
                    agentRecord.thoughtBubble.setText('Movimento local concluído · não sincronizado', '✓', '#8d9aaa');
                  }
                  if (ud.legL) ud.legL.rotation.x = 0;
                  if (ud.legR) ud.legR.rotation.x = 0;
                  if (ud.armL) ud.armL.rotation.x = 0;
                  if (ud.armR) ud.armR.rotation.x = 0;
                }
              } else {
                this._tempMoveDir.normalize();
                const walkSpeed = agentRecord.speed || 2.4;
                agentRecord.mesh.position.addScaledVector(this._tempMoveDir, walkSpeed * delta);
                agentRecord.mesh.rotation.y = Math.atan2(this._tempMoveDir.x, this._tempMoveDir.z);

                // Skip limb kinematics if not in frustum or very distant
                if (inFrustum && camDist < 75) {
                  const walkCycle = time * 9;
                  if (ud.legL) ud.legL.rotation.x = Math.sin(walkCycle) * 0.65;
                  if (ud.legR) ud.legR.rotation.x = -Math.sin(walkCycle) * 0.65;
                  if (ud.armL) ud.armL.rotation.x = -Math.sin(walkCycle) * 0.45;
                  if (ud.armR) ud.armR.rotation.x = Math.sin(walkCycle) * 0.45;
                  agentRecord.mesh.position.y = (agentRecord.baseY || 0.9) + Math.abs(Math.sin(walkCycle * 2)) * 0.04;
                }
              }
            }
          } else if (agentRecord.telemetryTarget && this._advanceAgentToTelemetry(agentRecord, delta)) {
            if (inFrustum && camDist < 75) {
              const walkCycle = time * 9;
              if (ud.legL) ud.legL.rotation.x = Math.sin(walkCycle) * 0.65;
              if (ud.legR) ud.legR.rotation.x = -Math.sin(walkCycle) * 0.65;
              if (ud.armL) ud.armL.rotation.x = -Math.sin(walkCycle) * 0.45;
              if (ud.armR) ud.armR.rotation.x = Math.sin(walkCycle) * 0.45;
              agentRecord.mesh.position.y = (agentRecord.baseY || 0.9) + Math.abs(Math.sin(walkCycle * 2)) * 0.04;
            }
          }

          // Rule II & Phase 7: Idle agents remain at their stations without random idle wandering.
          if (!agentIsWorking && !agentRecord.telemetryTarget && !agentRecord.path && agentRecord.movementState === 'WALKING') {
            agentRecord.movementState = 'IDLE';
          }

          const lodScale = this._densityLodScale || 1.0;

          // Kinematics LOD gating: distant agents skip subtle upper body animations
          const allowSubtleAnim = inFrustum && camDist < (60 * lodScale) && (camDist < (30 * lodScale) || ((this._frameCounter + aIdx) % 2 === 0));

          // Work gestures only play for a measured WORKING job; queued/available agents rest.
          this._applyAgentActivityPose(agentRecord, ud, aTime, allowSubtleAnim);

          // A small idle glance gives nearby agents presence without implying work or travel.
          if (!ud.isSeated && ud.head && allowSubtleAnim) {
            const idleHeadTurn = agentIsWorking ? 0.18 : 0.07;
            ud.head.rotation.y = Math.sin(aTime * 0.6) * idleHeadTurn;
          }

          // Overhead Emote / Role Badge floating bob
          if (ud.emoteBadge && inFrustum && camDist < (70 * lodScale)) {
            const baseY = ud.isSeated ? 1.15 + 1.28 : 1.45 + 1.28;
            ud.emoteBadge.position.y = baseY + (agentIsWorking ? Math.sin(aTime * 3.2) * 0.08 : 0);
          }

          // Smartwatch LED pulsing on left wrist (only when close)
          if (agentIsWorking && ud.smartwatchLed && ud.smartwatchLed.material && inFrustum && camDist < (35 * lodScale)) {
            const pulse = 0.55 + Math.sin(aTime * 5.5) * 0.45;
            ud.smartwatchLed.material.opacity = Math.max(0.3, pulse);
          }

          // Neural Halo for Sora AI Core
          if (agentIsWorking && ud.neuralHalo && inFrustum && camDist < (70 * lodScale)) {
            ud.neuralHalo.rotation.z += delta * 1.6;
            ud.neuralHalo.rotation.x = Math.PI / 2 + Math.sin(aTime * 2.2) * 0.14;
          }

          // Distance-based Character LOD (scaled by visualDensity)
          const showFace = camDist < (12 * lodScale) && inFrustum;
          const showDetails = camDist < (42 * lodScale) && inFrustum;
          const showIdentityParts = camDist < (105 * lodScale) && inFrustum;
          if (ud.identityParts && Array.isArray(ud.identityParts)) {
            ud.identityParts.forEach(p => { if (p) p.visible = showIdentityParts; });
          }
          if (ud.faceParts && Array.isArray(ud.faceParts)) {
            ud.faceParts.forEach(p => { if (p) p.visible = showFace; });
          }
          if (ud.detailParts && Array.isArray(ud.detailParts)) {
            ud.detailParts.forEach(p => { if (p) p.visible = showDetails; });
          }
        });
      }

      // 3b. Thought Bubble Anti-Clumping Pass (Multi-tier vertical & horizontal offsets)
      if (this.agents && this.agents.size > 1) {
        const agentList = Array.from(this.agents.values());
        for (let i = 0; i < agentList.length; i++) {
          const a1 = agentList[i];
          const sprite1 = a1?.thoughtBubble?.sprite;
          if (!sprite1 || !a1?.mesh) continue;
          let clusterRank = 0;
          for (let j = 0; j < i; j++) {
            const a2 = agentList[j];
            if (!a2?.thoughtBubble?.sprite || !a2?.mesh) continue;
            const dist = a1.mesh.position.distanceTo(a2.mesh.position);
            if (dist < 4.2) {
              clusterRank++;
            }
          }
          const targetY = 2.45 + (clusterRank % 3) * 0.95;
          const targetX = clusterRank === 1 ? -0.85 : clusterRank === 2 ? 0.85 : 0.0;
          sprite1.position.y += (targetY - sprite1.position.y) * 0.15;
          sprite1.position.x += (targetX - sprite1.position.x) * 0.15;
        }
      }

      // 3c. Project Cutaway & Interior Reveal Transition
      if (this.projectNodes && this.projectNodes.size > 0) {
        const activeProjId = this.state?.level === 'interior' && this.state?.selected?.kind === 'project'
          ? this.state.selected.id
          : null;
        for (const [id, pNode] of this.projectNodes) {
          const isInterior = id === activeProjId;
          if (pNode.roofGroup) {
            const targetY = isInterior ? 12.0 : 0.0;
            pNode.roofGroup.position.y += (targetY - pNode.roofGroup.position.y) * 0.1;
            pNode.roofGroup.visible = pNode.roofGroup.position.y < 11.5;
          }
          if (pNode.body && pNode.body.material) {
            const targetOpacity = isInterior ? 0.22 : 0.92;
            pNode.body.material.opacity += (targetOpacity - pNode.body.material.opacity) * 0.15;
            pNode.body.material.transparent = true;
          }
          if (pNode.interiorGroup) {
            pNode.interiorGroup.visible = isInterior || (pNode.roofGroup && pNode.roofGroup.position.y > 1.0);
          }
        }
      }

      // 4. Update 3D Floating Status Badge Position
      if (this.agentBadgeEl && this.agentBadgePos) {
        const p = this.agentBadgePos.clone().add(new T.Vector3(0, 2.3, 0));
        p.project(this.camera);
        const hw = this.host.clientWidth / 2;
        const hh = this.host.clientHeight / 2;
        const sx = (p.x * hw) + hw;
        const sy = -(p.y * hh) + hh;
        this.agentBadgeEl.style.transform = `translate(-50%, -50%) translate(${sx}px, ${sy}px)`;
        this.agentBadgeEl.style.display = (p.z < 1 && this.cameraState.distance <= 55) ? 'block' : 'none';
      }

      // 5. Pipeline motion represents measured active jobs only; an idle map remains still.
      if (this.activeRuntimeJobs > 0 && this.dataPulses && this.visualDensity !== 'low') {
        this.dataPulses.forEach(dp => {
          dp.progress = (dp.progress + dp.speed) % 1.0;
          dp.mesh.position.lerpVectors(dp.start, dp.end, dp.progress);
        });
      }

      // 7. Camera Smoothing & Render
      this._updateCameraPosition(false, delta * 1000);
      this._updateDistrictLabels();
      if (!Number.isFinite(this._lastWorldMinimapRenderAt) || now - this._lastWorldMinimapRenderAt >= 250) {
        this._renderWorldMinimap(time);
        this._lastWorldMinimapRenderAt = now;
      }
      this.renderer.render(this.scene, this.camera);
    }

    setVisualizationMode(mode) {
      const validModes = ['operation', 'engineering', 'infrastructure', 'agents', 'dependencies', 'incidents'];
      const next = String(mode || 'operation').toLowerCase();
      this.visualizationMode = validModes.includes(next) ? next : 'operation';
      if (this.host) this.host.dataset.cityMode = this.visualizationMode;
      const bar = document.getElementById('fenixCityModeBar');
      if (bar) {
        bar.querySelectorAll('[data-city-mode]').forEach((btn) => {
          const isActive = btn.getAttribute('data-city-mode') === this.visualizationMode;
          btn.style.background = isActive ? 'rgba(0,217,255,0.22)' : 'rgba(255,255,255,0.04)';
          btn.style.color = isActive ? '#00D9FF' : '#94A3B8';
          btn.style.borderColor = isActive ? 'rgba(0,217,255,0.5)' : 'rgba(255,255,255,0.08)';
        });
      }
      const focusTargets = {
        operation: { x: 0, z: 0, distance: 42, desc: 'Visão Global · 4 Distritos & Missões Ativas' },
        engineering: { x: -16, z: -12, distance: 34, desc: 'Engenharia · Workstations & Pipelines' },
        infrastructure: { x: 18, z: -14, distance: 34, desc: 'Infraestrutura · Servidores, Filas & Energia' },
        agents: { x: 0, z: 4, distance: 30, desc: 'Agentes · Rosters, Estações & Ilha de Reunião' },
        dependencies: { x: 0, z: 0, distance: 48, desc: 'Dependências · Conduítes & Acoplamento Entre Projetos' },
        incidents: { x: 16, z: 14, distance: 34, desc: 'Incidentes · Alertas HITL, Segurança & SLA' },
      };
      const target = focusTargets[this.visualizationMode] || focusTargets.operation;
      if (this.cameraState && this.cameraState.target) {
        this.cameraState.target.x = target.x;
        this.cameraState.target.z = target.z;
        this.cameraState.distance = target.distance;
      }
      if (this.dataPulses && Array.isArray(this.dataPulses)) {
        const showPulses = this.activeRuntimeJobs > 0 || this.visualizationMode === 'dependencies' || this.visualizationMode === 'infrastructure';
        this.dataPulses.forEach((dp) => {
          if (dp?.mesh) dp.mesh.visible = showPulses && this.visualDensity !== 'low';
        });
      }
      if (this.serverRacksLeds && Array.isArray(this.serverRacksLeds)) {
        const boostInfra = this.visualizationMode === 'infrastructure' || this.visualizationMode === 'incidents';
        this.serverRacksLeds.forEach((led) => {
          if (led?.material && led.material.emissiveIntensity !== undefined) {
            led.material.emissiveIntensity = boostInfra ? 1.8 : 1.0;
          }
        });
      }
      const statusEl = document.getElementById('fenixCityModeStatus');
      if (statusEl) statusEl.textContent = `[${this.visualizationMode.toUpperCase()}] ${target.desc}`;
      return this.visualizationMode;
    }

    setVisualDensity(density) {
      const valid = ['high', 'balanced', 'low'];
      const next = String(density || 'balanced').toLowerCase();
      this.visualDensity = valid.includes(next) ? next : 'balanced';
      this._densityLodScale = this.visualDensity === 'low' ? 0.65 : (this.visualDensity === 'high' ? 1.35 : 1.0);
      if (this.host) this.host.dataset.cityDensity = this.visualDensity;
      if (this.renderer && typeof this.renderer.setPixelRatio === 'function') {
        const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
        const targetRatio = this.visualDensity === 'low' ? 1 : (this.visualDensity === 'high' ? Math.min(dpr, 2) : Math.min(dpr, 1.5));
        this.renderer.setPixelRatio(targetRatio);
        if (this.renderer.shadowMap) {
          this.renderer.shadowMap.enabled = this.visualDensity !== 'low';
        }
      }
      const bar = document.getElementById('fenixCityModeBar');
      if (bar) {
        bar.querySelectorAll('[data-city-density]').forEach((btn) => {
          const isActive = btn.getAttribute('data-city-density') === this.visualDensity;
          btn.style.background = isActive ? 'rgba(16,185,129,0.22)' : 'rgba(255,255,255,0.04)';
          btn.style.color = isActive ? '#10B981' : '#94A3B8';
        });
      }
      return this.visualDensity;
    }

    _mountOperationalModeBar() {
      const container = this.host || document.getElementById('cityCanvas');
      if (!container || document.getElementById('fenixCityModeBar')) return;
      this.visualizationMode = this.visualizationMode || 'operation';
      this.visualDensity = this.visualDensity || 'balanced';
      this._densityLodScale = 1.0;
      const bar = document.createElement('div');
      bar.id = 'fenixCityModeBar';
      bar.hidden = true;
      bar.setAttribute('aria-hidden', 'true');
      bar.style.cssText = 'position:absolute;top:12px;left:50%;transform:translateX(-50%);z-index:26;display:none !important;pointer-events:none;align-items:center;gap:5px;white-space:nowrap;background:rgba(7,9,14,0.9);backdrop-filter:blur(12px);border:1px solid rgba(0,217,255,0.32);border-radius:10px;padding:5px 10px;box-shadow:0 8px 24px rgba(0,0,0,0.6);';
      const modes = [
        { id: 'operation', label: '⚡ Operação' },
        { id: 'engineering', label: '🛠️ Engenharia' },
        { id: 'infrastructure', label: '🖥️ Infra' },
        { id: 'agents', label: '🤖 Agentes' },
        { id: 'dependencies', label: '🕸️ Dependências' },
        { id: 'incidents', label: '🚨 Incidentes' },
      ];
      const densities = [
        { id: 'high', label: 'Alta' },
        { id: 'balanced', label: 'Média' },
        { id: 'low', label: 'Leve' },
      ];
      bar.innerHTML = `
        <span style="font-size:10px;font-weight:800;color:#00D9FF;margin-right:4px;">MODO:</span>
        ${modes.map((m) => `<button type="button" data-city-mode="${m.id}" style="background:${m.id === 'operation' ? 'rgba(0,217,255,0.22)' : 'rgba(255,255,255,0.04)'};border:1px solid ${m.id === 'operation' ? 'rgba(0,217,255,0.5)' : 'rgba(255,255,255,0.08)'};color:${m.id === 'operation' ? '#00D9FF' : '#94A3B8'};border-radius:6px;padding:3px 8px;font-size:10px;font-weight:700;cursor:pointer;">${m.label}</button>`).join('')}
        <span style="font-size:10px;font-weight:800;color:#10B981;margin-left:6px;">DENSIDADE:</span>
        ${densities.map((d) => `<button type="button" data-city-density="${d.id}" style="background:${d.id === 'balanced' ? 'rgba(16,185,129,0.22)' : 'rgba(255,255,255,0.04)'};border:1px solid rgba(255,255,255,0.08);color:${d.id === 'balanced' ? '#10B981' : '#94A3B8'};border-radius:6px;padding:3px 7px;font-size:10px;font-weight:700;cursor:pointer;">${d.label}</button>`).join('')}
        <span id="fenixCityModeStatus" style="font-size:10px;color:#cbd5e1;margin-left:6px;padding-left:6px;border-left:1px solid rgba(255,255,255,0.12);">[OPERATION] Visão Global · Distritos &amp; Missões Ativas</span>
      `;
      bar.querySelectorAll('[data-city-mode]').forEach((btn) => {
        btn.addEventListener('click', () => this.setVisualizationMode(btn.getAttribute('data-city-mode')));
      });
      bar.querySelectorAll('[data-city-density]').forEach((btn) => {
        btn.addEventListener('click', () => this.setVisualDensity(btn.getAttribute('data-city-density')));
      });
      container.appendChild(bar);
      this._mountAutonomousRoleStrip(container);
      this.syncAutonomousCityState().catch(() => {});
    }

    _mountAutonomousRoleStrip(container) {
      if (!container || document.getElementById('fenixCityAutonomousRoster')) return;
      const strip = document.createElement('div');
      strip.id = 'fenixCityAutonomousRoster';
      strip.hidden = true;
      strip.setAttribute('aria-hidden', 'true');
      strip.style.cssText = 'position:absolute;top:52px;left:50%;transform:translateX(-50%);z-index:26;display:none !important;pointer-events:none;align-items:center;gap:6px;flex-wrap:nowrap;justify-content:center;background:rgba(7,9,14,0.92);backdrop-filter:blur(12px);border:1px solid rgba(16,185,129,0.32);border-radius:10px;padding:4px 10px;box-shadow:0 8px 24px rgba(0,0,0,0.65);max-width:96%;white-space:nowrap;';
      strip.innerHTML = `<span style="font-size:10px;font-weight:800;color:#10B981;letter-spacing:0.06em;">7 PAPÉIS AUTÔNOMOS:</span><span id="fenixCityAutonomousRolesList" style="display:flex;gap:5px;flex-wrap:nowrap;">—</span>`;
      container.appendChild(strip);

      const inspector = document.createElement('div');
      inspector.id = 'fenixCityRoleInspector';
      inspector.style.cssText = 'position:absolute;top:96px;right:68px;z-index:28;width:320px;display:none;background:rgba(7,9,14,0.96);backdrop-filter:blur(16px);border:1px solid rgba(0,217,255,0.4);border-radius:12px;padding:12px;color:#e2e8f0;box-shadow:0 12px 32px rgba(0,0,0,0.75);font-size:11px;';
      container.appendChild(inspector);
    }

    async syncAutonomousCityState(providedState = null) {
      let state = providedState;
      if (!state) {
        try {
          const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          const res = await fetch('/api/v2/autonomous/city-state', { headers });
          if (res.ok) {
            const data = await res.json();
            state = data.cityState || data;
          }
        } catch (_) {}
      }
      if (!state || !Array.isArray(state.agents)) return null;
      this.autonomousCityState = state;

      const stateColors = {
        SCANNING: '#38bdf8',
        PLANNING: '#a855f7',
        CODING: '#00d9ff',
        TESTING: '#f59e0b',
        REVIEWING: '#6366f1',
        BLOCKED: '#f97316',
        COMPLETED: '#10b981',
        FAILED: '#ef4444',
        IDLE: '#64748b'
      };

      const stationCoords = {
        QA_LAB: { x: -18, z: 12 },
        ARCHITECTURE_DESK: { x: 0, z: -4 },
        DEV_WORKSTATION: { x: -16, z: -12 },
        TEST_ARENA: { x: -8, z: 14 },
        VISUAL_STUDIO: { x: 14, z: 12 },
        INTEGRATION_HUB: { x: 18, z: -12 },
        RELEASE_GATE: { x: 6, z: -16 }
      };

      // Atualiza avatares 3D existentes com os 9 estados reais da engenharia autônoma
      for (const roleAgent of state.agents) {
        const engState = String(roleAgent.engineeringState || 'IDLE').toUpperCase();
        const colorHex = stateColors[engState] || '#64748b';
        if (Array.isArray(this.agents)) {
          const matchAvatar = this.agents.find((av) =>
            av.id === roleAgent.agentId ||
            av.roleId === roleAgent.roleId ||
            String(av.name || '').toLowerCase().includes(String(roleAgent.role || '').toLowerCase())
          );
          if (matchAvatar) {
            matchAvatar.engineeringState = engState;
            matchAvatar.autonomousRole = roleAgent.role;
            matchAvatar.missionId = roleAgent.missionId;
            matchAvatar.projectId = roleAgent.projectId;
            matchAvatar.targetFile = roleAgent.targetFile;
            matchAvatar.toolOrModel = roleAgent.toolOrModel;
            matchAvatar.thought = `[${engState}] ${roleAgent.thought || roleAgent.role}`;
            const coords = stationCoords[roleAgent.station];
            if (coords && engState !== 'IDLE' && matchAvatar.targetPos) {
              matchAvatar.targetPos.x = coords.x;
              matchAvatar.targetPos.z = coords.z;
            }
          }
        }
      }

      const escapeCityHtml = (val) => String(val ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

      const listEl = document.getElementById('fenixCityAutonomousRolesList');
      if (listEl) {
        listEl.innerHTML = state.agents.map((ag) => {
          const st = escapeCityHtml(String(ag.engineeringState || 'IDLE').toUpperCase());
          const col = stateColors[st] || '#64748b';
          const roleLabel = escapeCityHtml(ag.role);
          const roleIdAttr = escapeCityHtml(ag.roleId);
          return `<button type="button" data-city-role-id="${roleIdAttr}" style="background:rgba(15,23,42,0.85);border:1px solid ${col};color:#f8fafc;border-radius:6px;padding:3px 8px;font-size:10px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;">
            <span style="width:7px;height:7px;border-radius:50%;background:${col};display:inline-block;"></span>
            <span>${roleLabel}</span>
            <span style="color:${col};font-family:'JetBrains Mono',monospace;font-size:9px;">[${st}]</span>
          </button>`;
        }).join('');

        listEl.querySelectorAll('[data-city-role-id]').forEach((btn) => {
          btn.addEventListener('click', () => {
            this.inspectEngineeringRole(btn.getAttribute('data-city-role-id'));
          });
        });
      }

      if (this._inspectedRoleId) {
        this.inspectEngineeringRole(this._inspectedRoleId, true);
      }

      return state;
    }

    inspectEngineeringRole(roleId, keepOpen = false) {
      const inspector = document.getElementById('fenixCityRoleInspector');
      if (!inspector || !this.autonomousCityState?.agents) return null;
      const agent = this.autonomousCityState.agents.find(
        (a) => a.roleId === roleId || a.agentId === roleId || a.role === roleId
      );
      if (!agent) return null;

      if (!keepOpen && this._inspectedRoleId === agent.roleId && inspector.style.display === 'block') {
        inspector.style.display = 'none';
        this._inspectedRoleId = null;
        return null;
      }

      const esc = (val) => String(val ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

      this._inspectedRoleId = agent.roleId;
      inspector.style.display = 'block';
      const recentHtml = (agent.recentEvents || []).slice(0, 4).map((ev) =>
        `<div style="padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:10px;color:#94a3b8;">
          <strong style="color:#38bdf8;">[${esc(ev.state)}]</strong> ${esc(ev.thought || '—')}
        </div>`
      ).join('') || '<div style="color:#64748b;font-size:10px;">Sem eventos recentes</div>';

      const blockersText = Array.isArray(agent.blockers) && agent.blockers.length > 0
        ? agent.blockers.join(', ')
        : (agent.engineeringState === 'BLOCKED' ? (agent.thought || 'Bloqueio ativo') : 'Nenhum');
      const progressVal = typeof agent.progress === 'number' ? `${agent.progress}%` : '—';
      const costTokensVal = `${agent.tokensUsed ?? 0} tok · $${Number(agent.costUsd || 0).toFixed(4)}`;

      inspector.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.1);">
          <div>
            <div style="font-size:12px;font-weight:800;color:#00D9FF;">${esc(agent.role)}</div>
            <div style="font-size:10px;color:#94a3b8;">${esc(agent.agentName)} · Estação: ${esc(agent.station)}</div>
          </div>
          <button type="button" id="fenixCloseCityRoleInspector" style="background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:14px;">✕</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;font-size:10px;">
          <div style="background:rgba(255,255,255,0.03);padding:5px;border-radius:6px;">
            <div style="color:#64748b;">ESTADO CANÔNICO</div>
            <div style="font-weight:800;color:#10b981;font-family:'JetBrains Mono',monospace;">${esc(agent.engineeringState)}</div>
          </div>
          <div style="background:rgba(255,255,255,0.03);padding:5px;border-radius:6px;">
            <div style="color:#64748b;">PROJETO ATUAL</div>
            <div style="font-weight:700;color:#f8fafc;">${esc(agent.projectId || '—')}</div>
          </div>
          <div style="background:rgba(255,255,255,0.03);padding:5px;border-radius:6px;">
            <div style="color:#64748b;">MISSÃO / BUG</div>
            <div style="font-weight:700;color:#f8fafc;font-family:'JetBrains Mono',monospace;">${esc(agent.missionId || agent.bugId || '—')}</div>
          </div>
          <div style="background:rgba(255,255,255,0.03);padding:5px;border-radius:6px;">
            <div style="color:#64748b;">MODELO / TOOL</div>
            <div style="font-weight:700;color:#38bdf8;">${esc(agent.toolOrModel || '—')}</div>
          </div>
          <div style="background:rgba(255,255,255,0.03);padding:5px;border-radius:6px;">
            <div style="color:#64748b;">PROGRESSO REAL</div>
            <div style="font-weight:700;color:#f8fafc;font-family:'JetBrains Mono',monospace;">${esc(progressVal)}</div>
          </div>
          <div style="background:rgba(255,255,255,0.03);padding:5px;border-radius:6px;">
            <div style="color:#64748b;">TOKENS / CUSTO</div>
            <div style="font-weight:700;color:#f8fafc;font-family:'JetBrains Mono',monospace;">${esc(costTokensVal)}</div>
          </div>
        </div>
        <div style="font-size:10px;margin-bottom:6px;">
          <span style="color:#64748b;">Arquivo Alvo:</span>
          <span style="color:#e2e8f0;font-family:'JetBrains Mono',monospace;">${esc(agent.targetFile || '—')}</span>
        </div>
        <div style="font-size:10px;margin-bottom:6px;">
          <span style="color:#64748b;">Bloqueios:</span>
          <span style="color:#f87171;">${esc(blockersText)}</span>
        </div>
        <div style="font-size:10px;margin-bottom:8px;">
          <span style="color:#64748b;">Atividade:</span>
          <span style="color:#cbd5e1;">${esc(agent.thought || '—')}</span>
        </div>
        <div style="font-size:10px;font-weight:700;color:#94a3b8;margin-bottom:4px;">HISTÓRICO RECENTE:</div>
        <div>${recentHtml}</div>
      `;

      const closeBtn = document.getElementById('fenixCloseCityRoleInspector');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          inspector.style.display = 'none';
          this._inspectedRoleId = null;
        });
      }
      return agent;
    }

    dispose() {
      this._isDisposed = true;
      this._isMounted = false;
      if (this._animationFrameId) {
        cancelAnimationFrame(this._animationFrameId);
        this._animationFrameId = null;
      }
      if (this._animationTimerId) {
        clearTimeout(this._animationTimerId);
        this._animationTimerId = null;
      }
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
        this.syncInterval = null;
      }
      if (this._worldRefreshTimer) {
        clearInterval(this._worldRefreshTimer);
        this._worldRefreshTimer = null;
      }
      if (this._onVisibilityChange) document.removeEventListener('visibilitychange', this._onVisibilityChange);
      if (this._onViewChanged) window.removeEventListener('fenix-view-changed', this._onViewChanged);
      window.removeEventListener('fenix:city-world', this.syncRealData);
      if (this.scene) {
        this.scene.traverse((obj) => {
          if (obj.geometry) {
            try { obj.geometry.dispose(); } catch (_) {}
          }
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((mat) => {
                if (mat && mat.map) try { mat.map.dispose(); } catch (_) {}
                if (mat) try { mat.dispose(); } catch (_) {}
              });
            } else {
              if (obj.material.map) try { obj.material.map.dispose(); } catch (_) {}
              try { obj.material.dispose(); } catch (_) {}
            }
          }
        });
      }
      if (this.renderer) {
        try { this.renderer.dispose(); } catch (_) {}
      }
      if (window.fenixWorld3D === this) window.fenixWorld3D = null;
      if (window.fenixWorldEngine3D === this) window.fenixWorldEngine3D = null;
      if (window.fenixCity === this) window.fenixCity = null;
      if (!window.fenixWorld3D && !window.fenixWorldEngine3D) window.FENIX_WORLD_3D = false;
      window.__FENIX_SINGLETONS__?.remove('worldEngine', this);
      window.__FENIX_SINGLETONS__?.remove('threeRenderLoop', this);
    }
  }

  FenixWorld3DEngine.DISTRICTS = Object.freeze(DISTRICTS.map((district) => Object.freeze(district)));
  window.FenixWorld3DEngine = FenixWorld3DEngine;
  const _prevFenixSetCityMode = window.fenixSetCityMode;
  window.fenixSetCityMode = function(mode) {
    const normalized = String(mode || '').toLowerCase();
    const vizModes = ['operation', 'engineering', 'infrastructure', 'agents', 'dependencies', 'incidents'];
    if (vizModes.includes(normalized)) {
      const eng = window.fenixWorld3D || window.fenixWorldEngine3D;
      return eng?.setVisualizationMode ? eng.setVisualizationMode(normalized) : null;
    }
    if (typeof _prevFenixSetCityMode === 'function') return _prevFenixSetCityMode(mode);
    const eng = window.fenixWorld3D || window.fenixWorldEngine3D;
    return eng?.setVisualizationMode ? eng.setVisualizationMode(normalized) : null;
  };
  window.fenixSetCityDensity = function(density) {
    const eng = window.fenixWorld3D || window.fenixWorldEngine3D;
    return eng?.setVisualDensity ? eng.setVisualDensity(density) : null;
  };
  window.fenixSyncCityAutonomousState = function(statePayload) {
    const eng = window.fenixWorld3D || window.fenixWorldEngine3D;
    return eng?.syncAutonomousCityState ? eng.syncAutonomousCityState(statePayload) : null;
  };
  window.fenixInspectCityRole = function(roleId) {
    const eng = window.fenixWorld3D || window.fenixWorldEngine3D;
    return eng?.inspectEngineeringRole ? eng.inspectEngineeringRole(roleId) : null;
  };
  window.initFenixWorld3D = function(container) {
    if (!window.fenixWorld3D && !window.fenixWorldEngine3D) {
      try {
        const eng = new FenixWorld3DEngine(container);
        eng._mountOperationalModeBar?.();
        window.fenixWorldEngine3D = eng;
        window.fenixWorld3D = eng;
        window.fenixCity = eng;
        window.FENIX_WORLD_3D = true;
        window.FENIX_CITY_RENDERER = 'webgl';
        const fallbackNotice = document.getElementById('cityRendererFallbackStatus');
        if (fallbackNotice) {
          fallbackNotice.hidden = true;
          fallbackNotice.style.removeProperty('display');
        }
        window.__FENIX_SINGLETONS__?.register('worldEngine', eng);
        window.__FENIX_SINGLETONS__?.register('threeRenderLoop', eng);
      } catch (error) {
        console.warn('[FenixWorld3D] WebGL renderer unavailable; using measured 2D City.', error);
        return window.fenixActivateCity2DFallback?.(error) || null;
      }
    }
    return window.fenixWorld3D || window.fenixWorldEngine3D;
  };

  window.addEventListener('fenix:viewchanged', (event) => {
    if (event.detail?.viewId !== 'city') return;
    const world = window.initFenixWorld3D?.();
    world?.resize?.();
    world?._resumeAnimationLoop?.();
  });

  // Hot World Command Event Listener (SSE / Operator Commands)
  window.addEventListener('fenix:world-command', (e) => {
    if (e && e.detail) {
      const eng = window.fenixWorld3D || window.fenixWorldEngine3D;
      if (eng && typeof eng.applyWorldCommand === 'function') {
        eng.applyWorldCommand(e.detail);
      }
    }
  });

  // Hot City Event Listener (SSE / Mission Events -> 3D Living Avatars)
  document.addEventListener('fenix-city-event', (e) => {
    if (e && e.detail) {
      const eng = window.fenixWorld3D || window.fenixWorldEngine3D;
      if (eng && typeof eng.handleCityEvent === 'function') {
        eng.handleCityEvent(e.detail);
      }
    }
  });

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.initFenixWorld3D();
    });
  } else {
    window.initFenixWorld3D();
  }
})();
