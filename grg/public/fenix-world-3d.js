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

  if (typeof THREE === 'undefined') {
    console.warn('[FenixWorld3D] Three.js not found, fallback to 2.5D canvas.');
    return;
  }

  const T = THREE;
  const STORAGE_KEY = 'fenix_world_camera_v4';
  const LEGACY_STORAGE_KEY = 'fenix_world_camera_v3';
  const CITY_DEFAULT_DISTANCE = 190;
  const normalizeCameraDistance = (value) => {
    const distance = Number(value);
    if (!Number.isFinite(distance) || distance <= 0) return CITY_DEFAULT_DISTANCE;
    return Math.max(8, Math.min(260, distance));
  };

  // Canonical District Layout
  const DISTRICTS = [
    { id: 'command-center', name: 'FÊNIX HQ', sub: 'Núcleo Central', color: 0x00d9ff, x: 0, z: 0 },
    { id: 'logistics', name: 'INDUSTRIAL HUB', sub: 'Logística & WMS', color: 0xef4444, x: 26, z: -10, isHero: true },
    { id: 'api-platform', name: 'API PLATFORM', sub: 'Fastify Gateway & Ops', color: 0x00f0ff, x: -18, z: 2, isHero: true },
    { id: 'dev-district', name: 'DEV LOFT', sub: 'Engenharia & Código', color: 0x10b981, x: -44, z: 14 },
    { id: 'ai-district', name: 'AI NEXUS', sub: 'Modelos & Cognição', color: 0xa855f7, x: -22, z: -18 },
    { id: 'project-district', name: 'PROJECT FORGE', sub: 'Projetos & Deploy', color: 0xf59e0b, x: 20, z: 20 },
    { id: 'data-center', name: 'MEMORY VAULT', sub: 'Dados & Segurança', color: 0x06b6d4, x: -8, z: 28 },
    { id: 'observatory', name: 'OBSERVATÓRIO', sub: 'Telemetria 24/7', color: 0xeab308, x: 0, z: -32 },
  ];

  /* ══════════════════════════════════════════════════════════════════════════
     PROCEDURAL TEXTURE ENGINE (Instant, In-Memory, Tactile Canvas Textures)
  ══════════════════════════════════════════════════════════════════════════ */
  class TextureFactory {
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
        ctx.fillStyle = '#181e29';
        ctx.fillRect(0, 0, w, h);

        // Fine grain noise
        for (let i = 0; i < 18000; i++) {
          const x = Math.random() * w;
          const y = Math.random() * h;
          const shade = Math.floor(25 + Math.random() * 30);
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
            ctx.fillStyle = Math.random() > 0.3 ? '#991b1b' : '#7f1d1d';
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
          const x = Math.random() * w;
          const y = Math.random() * h;
          const r = Math.random() * 2.2 + 0.6;
          ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
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
              ctx.fillRect(x + Math.random() * tileSize, y + Math.random() * tileSize, 2, 1);
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
          const startX = Math.random() * w;
          const startY = Math.random() * h;
          ctx.moveTo(startX, startY);
          ctx.lineTo(startX + (Math.random() - 0.5) * 70, startY + 35);
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
          ctx.fillRect(w - 32, 28 + m * 14, Math.random() * 24 + 4, 3);
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
     SPATIAL NAVIGATION GRAPH (Pathfinding, Corridors, Docks & Arteries)
  ══════════════════════════════════════════════════════════════════════════ */
  class PathGraph {
    constructor() {
      this.nodes = new Map();
      this.edges = new Map();
      this._initCanonicalWaypoints();
    }

    addNode(id, pos, type = 'waypoint', floor = 0) {
      this.nodes.set(id, { id, pos: new T.Vector3(pos.x, pos.y, pos.z), type, floor });
      if (!this.edges.has(id)) this.edges.set(id, new Set());
    }

    addEdge(id1, id2, bidirectional = true) {
      if (this.nodes.has(id1) && this.nodes.has(id2)) {
        this.edges.get(id1).add(id2);
        if (bidirectional) this.edges.get(id2).add(id1);
      }
    }

    _initCanonicalWaypoints() {
      // Depósito Mais (Logistics Hub: x ~ 26, z ~ -10)
      this.addNode('dep_dock1', { x: 16.8, y: 0.9, z: 1.0 }, 'dock', 0);
      this.addNode('dep_dock2', { x: 26.0, y: 0.9, z: 1.0 }, 'dock', 0);
      this.addNode('dep_dock3', { x: 35.2, y: 0.9, z: 1.0 }, 'dock', 0);
      this.addNode('dep_staging', { x: 26.0, y: 0.9, z: -2.0 }, 'staging', 0);
      this.addNode('dep_aisle_a', { x: 16.0, y: 0.9, z: -10.0 }, 'racks', 0);
      this.addNode('dep_aisle_b', { x: 26.0, y: 0.9, z: -10.0 }, 'racks', 0);
      this.addNode('dep_aisle_c', { x: 36.0, y: 0.9, z: -10.0 }, 'racks', 0);
      this.addNode('dep_packing', { x: 34.0, y: 0.9, z: -4.0 }, 'station', 0);
      this.addNode('dep_office', { x: 42.0, y: 0.9, z: -7.0 }, 'office', 0);
      this.addNode('dep_apron', { x: 26.0, y: 0.9, z: 8.0 }, 'yard', 0);
      this.addNode('dep_gate', { x: 20.0, y: 0.2, z: 14.0 }, 'gate', 0);

      // Edges within Depósito Mais
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

      // City Arteries
      this.addNode('road_dep_junction', { x: 20.0, y: 0.2, z: 0.0 }, 'road', 0);
      this.addNode('road_center', { x: 0.0, y: 0.2, z: 0.0 }, 'road', 0);
      this.addNode('road_api_junction', { x: -18.0, y: 0.2, z: 14.0 }, 'road', 0);

      this.addEdge('dep_gate', 'road_dep_junction');
      this.addEdge('road_dep_junction', 'road_center');
      this.addEdge('road_center', 'road_api_junction');

      // API Platform Complex (x ~ -18, z ~ 2)
      this.addNode('api_plaza', { x: -18.0, y: 0.5, z: 10.0 }, 'plaza', 0);
      this.addNode('api_lobby', { x: -18.0, y: 0.5, z: 3.2 }, 'lobby', 0);
      this.addNode('api_lift_f0', { x: -18.0, y: 0.5, z: -2.0 }, 'elevator', 0);
      this.addNode('api_lift_f1', { x: -18.0, y: 4.5, z: -2.0 }, 'elevator', 1);
      this.addNode('api_f1_center', { x: -18.0, y: 4.5, z: 2.0 }, 'corridor', 1);
      this.addNode('api_f1_alex', { x: -22.5, y: 4.5, z: 4.2 }, 'station', 1);
      this.addNode('api_f1_elena', { x: -13.5, y: 4.5, z: 4.2 }, 'station', 1);
      this.addNode('api_lift_f2', { x: -18.0, y: 8.5, z: -2.0 }, 'elevator', 2);
      this.addNode('api_f2_center', { x: -18.0, y: 8.5, z: 2.0 }, 'corridor', 2);
      this.addNode('api_f2_lucas', { x: -20.2, y: 8.5, z: 5.2 }, 'station', 2);
      this.addNode('api_f2_maya', { x: -15.8, y: 8.5, z: 5.2 }, 'station', 2);
      this.addNode('api_f2_victor', { x: -26.2, y: 8.5, z: 0.8 }, 'station', 2);
      this.addNode('api_lift_f3', { x: -18.0, y: 12.5, z: -2.0 }, 'elevator', 3);
      this.addNode('api_f3_sora', { x: -18.0, y: 12.5, z: 4.8 }, 'station', 3);

      // Edges within API Platform
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
    }

    findPath(startPos, endPos) {
      let startNode = null, minDistStart = Infinity;
      let endNode = null, minDistEnd = Infinity;
      for (const [id, node] of this.nodes.entries()) {
        const dS = node.pos.distanceTo(startPos);
        if (dS < minDistStart) { minDistStart = dS; startNode = id; }
        const dE = node.pos.distanceTo(endPos);
        if (dE < minDistEnd) { minDistEnd = dE; endNode = id; }
      }
      const targetVec = endPos.clone ? endPos.clone() : new T.Vector3(endPos.x, endPos.y, endPos.z);
      if (!startNode || !endNode || startNode === endNode) {
        return [targetVec];
      }

      const queue = [[startNode]];
      const visited = new Set([startNode]);
      let foundPath = null;

      while (queue.length > 0) {
        const path = queue.shift();
        const current = path[path.length - 1];
        if (current === endNode) {
          foundPath = path;
          break;
        }
        const neighbors = this.edges.get(current) || [];
        for (const n of neighbors) {
          if (!visited.has(n)) {
            visited.add(n);
            queue.push([...path, n]);
          }
        }
      }

      if (!foundPath) return [targetVec];
      const points = foundPath.map(nid => this.nodes.get(nid).pos.clone());
      points.push(targetVec);
      return points;
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
      const displayText = `${this.emoji} ${this.text}`;
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
      this.scene.background = new T.Color(0x111a27);
      this.scene.fog = new T.FogExp2(0x111a27, 0.0015);

      // Camera State
      const saved = this._loadState();
      const savedTarget = saved.target && ['x', 'y', 'z'].every((axis) => Number.isFinite(Number(saved.target[axis])))
        ? new T.Vector3(Number(saved.target.x), Number(saved.target.y), Number(saved.target.z))
        : new T.Vector3(0, 0, 0);
      const savedDistance = normalizeCameraDistance(saved.distance);
      this.cameraState = {
        azimuth: saved.azimuth !== undefined ? saved.azimuth : Math.PI / 4,
        elevation: Number.isFinite(Number(saved.elevation)) ? Number(saved.elevation) : 0.615,
        distance: savedDistance,
        target: savedTarget.clone(),
        targetDistance: savedDistance,
        targetLookAt: savedTarget.clone(),
        targetAzimuth: null,
        targetElevation: null,
        dragging: false,
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
      this.livePackets = [];
      this.agents = new Map();
      this.world = { agents: this.agents };
      this.DISTRICTS = Object.fromEntries(DISTRICTS.map(district => [district.id, district]));
      this.state = { cityFilter: 'ALL', selectedCompanyId: null };
      this.vehicles = [];
      this.dataPulses = [];
      this.forkliftState = { step: 0, timer: 0, strobeTimer: 0, x: 26, z: 8.5, carrying: true };
      this.camilaState = { phase: 0, action: 'WORK', timer: 0, pos: new T.Vector3(24.5, 0.8, -2.5) };

      this._initDOM();
      this._initRenderer();
      this._initLighting();
      this._initMaterials();
      this._initTerrain();
      this._initUrbanInfrastructure();
      this._initDepositoMaisComplex();
      this._initApiPlatformComplex();
      this._initSurroundingMetropolis();
      this._initVehicles();
      this._initDataFlowPipelines();
      this._bindEvents();

      // Start Render Loop with Visibility & View Throttling (Requirement 7)
      this._isMounted = true;
      this._isDisposed = false;
      this._animationFrameId = null;
      this._animate = this._animate.bind(this);
      this._resumeAnimationLoop = this._resumeAnimationLoop.bind(this);
      this._resumeAnimationLoop();

      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) this._resumeAnimationLoop();
      });
      window.addEventListener('fenix-view-changed', () => {
        this._resumeAnimationLoop();
      });
      // Expose globally as singleton (Requirement 2)
      window.FENIX_WORLD_3D = true;
      window.fenixWorld3D = this;
      window.fenixWorldEngine3D = this;
      window.fenixCity = this;
      window.__FENIX_SINGLETONS__?.register('worldEngine', this);
      window.__FENIX_SINGLETONS__?.register('threeRenderLoop', this);
      console.log('[FenixWorld3D] ✅ Fênix World Engine 3.0 (High-Fidelity Digital Twin) initialized.');

      // Real Data Sync with WorldStateEngine (interval 15s instead of 4s, respect visibility)
      this.syncRealData = this.syncRealData.bind(this);
      this.syncRealData();
      this.syncInterval = setInterval(() => {
        const cityView = document.getElementById('view-city');
        const isCityActive = cityView && (cityView.classList.contains('active') || cityView.style.display !== 'none');
        if (!document.hidden && isCityActive) {
          this.syncRealData();
        }
      }, 15000);
      window.addEventListener('fenix:data', this.syncRealData);
      window.addEventListener('fenix-live', this.syncRealData);
    }

    _resumeAnimationLoop() {
      if (this._isDisposed || !this._isMounted) return;
      const cityView = document.getElementById('view-city');
      const isCityActive = cityView && cityView.classList.contains('active') && cityView.style.display !== 'none';
      if (!document.hidden && isCityActive && !this._animationFrameId) {
        this.resize();
        this._animationFrameId = requestAnimationFrame(this._animate);
      }
    }

    async syncRealData() {
      try {
        const token = window.fenixGetAuthToken?.() || localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || window.sessionStorage?.getItem('fenix_token') || window.sessionStorage?.getItem('grg_token') || '';
        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
        const fetchFn = window.fenixAuthedFetch || window.fenixFetch || fetch;
        const requestState = async (endpoint) => {
          const response = await fetchFn(endpoint, { credentials: 'same-origin', headers, signal: AbortSignal.timeout(10000) });
          return response.ok ? response.json() : null;
        };
        let data = null;
        try {
          data = await requestState('/api/v2/living-city/state');
        } catch (_) {
          // The full state includes missions/projects/workers; keep City agents available if that projection is slow.
        }
        if (!Array.isArray(data?.agents) || data.agents.length === 0) {
          try {
            const agentState = await requestState('/api/v2/living-city/agents');
            if (Array.isArray(agentState?.agents)) {
              data = { ...(data || {}), ...agentState, agents: agentState.agents };
            }
          } catch (_) {
            // Preserve the last rendered frame when both live projections are unavailable.
          }
        }
        if (!data) return;
        if (!Array.isArray(data.agents)) return;

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
        }

        if (agentList.length > 0) {
          // Dynamically instantiate 3D agent models ONLY if they exist in real backend telemetry
          if (agentList.some(a => String(a.id || a.agentId) === 'agent-camila') && !this.camilaGroup) {
            this._initCamilaAgent();
          }
          for (const a of agentList) {
            const id = String(a.id || a.agentId);
            const existing = this.agents.get(id);
            const coordinates = this._normalizeAgentCoordinates(a.coordinates || a.homeCoordinates, this.agents.size, a);
            if (existing && existing.mesh) {
              existing.mesh.position.set(coordinates.x, coordinates.y, coordinates.z);
              existing.coordinates = coordinates;
              existing.status = a.status;
              existing.state = a.state;
              existing.currentTask = a.currentTask;
              existing.assignedTask = a.assignedTask;
              existing.memory = a.memory;
              existing.workstationId = a.workstationId;
              existing.role = a.role || existing.role;
              existing.department = a.department || existing.department;
              existing.name = a.name || existing.name;

              // Dynamically update 3D billboard thought bubble with real telemetry task
              if (existing.thoughtBubble && (a.currentTask || a.assignedTask || a.status)) {
                const bubbleText = a.currentTask || a.assignedTask || a.status;
                const emoji = id === 'agent-ai-core' ? '🧠' :
                  id === 'agent-security' ? '🛡️' :
                  id === 'agent-infra' ? '🖥️' :
                  id === 'agent-monitor' ? '📈' :
                  id === 'agent-camila' ? '📦' :
                  id === 'agent-expedicao' ? '🚛' :
                  id === 'agent-andre' ? '📋' : '⚡';
                existing.thoughtBubble.setText(bubbleText, emoji);
              }
            } else {
              // Universal 3D Avatar Spawning for ALL active agents in the system
              this.spawnDynamicAgent({
                ...a,
                id,
                coordinates
              });
            }
          }
          const camila = this.agents.get('agent-camila');
          if (camila && this.camilaGroup) {
            this.camilaState.action = camila.status || 'WORKING';
            this.camilaState.task = camila.currentTask;
            if (this.agentBadgeEl) {
              const label = camila.displayName || camila.name || 'Camila';
              const status = camila.status === 'WORKING' ? 'WMS Inspeção 📦' : (camila.status || 'Ativa');
              this.agentBadgeEl.textContent = `${label} · ${status}`;
            }
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
          const staticBldIds = new Set([
            'bld-deposito-mais', 'bld-deposito-wms', 'deposito-mais', 'logistics', 'bld-logistics',
            'bld-api-platform', 'api-platform', 'bld-fenix-hq', 'command-center',
            'bld-dev-loft', 'dev-district', 'bld-ai-nexus', 'ai-district'
          ]);
          for (const b of bldList) {
            if (!b || !b.id) continue;
            const isStatic = staticBldIds.has(b.id);
            const isAlreadyDynamic = this.dynamicBuildings && this.dynamicBuildings.has(b.id);
            if (!isStatic && !isAlreadyDynamic) {
              this.spawnDynamicBuilding(b);
            }
          }
        }
      } catch (err) {
        // Degraded mode silently preserves previous frame state
      }
    }

    _normalizeAgentCoordinates(coords, index = 0, agent = {}) {
      const x = Number(coords?.x);
      const z = Number(coords?.z);
      const y = Number(coords?.y);
      const atOrigin = Math.abs(x) < 0.001 && Math.abs(z) < 0.001;
      const buildingId = String(agent.buildingId || '').toLowerCase();
      const districtId = String(agent.district || '').toLowerCase();
      const workstationId = String(agent.workstationId || agent.stationId || '').toLowerCase();
      const explicitlyAtHeadquarters = /fenix-hq|command-center/.test(buildingId)
        || districtId === 'command-center'
        || workstationId.includes('hq');
      const hasAssignedStation = Boolean(workstationId && workstationId !== 'st-general-1' && !workstationId.includes('general'));
      if (Number.isFinite(x) && Number.isFinite(z) && (!atOrigin || explicitlyAtHeadquarters || hasAssignedStation)) {
        return { x, y: Number.isFinite(y) ? y : 0.8, z };
      }
      if (Number.isFinite(x) && coords?.y !== undefined && coords?.y !== null && Number.isFinite(y) && !atOrigin) {
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
      try {
        const current = sessionStorage.getItem(STORAGE_KEY);
        if (current) return JSON.parse(current);
        const legacy = JSON.parse(sessionStorage.getItem(LEGACY_STORAGE_KEY) || '{}');
        if (Number(legacy.distance) === 85) legacy.distance = CITY_DEFAULT_DISTANCE;
        return legacy;
      } catch {
        return {};
      }
    }

    _saveState() {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
          azimuth: this.cameraState.targetAzimuth ?? this.cameraState.azimuth,
          elevation: this.cameraState.targetElevation ?? this.cameraState.elevation,
          distance: this.cameraState.targetDistance,
          target: {
            x: this.cameraState.targetLookAt.x,
            y: this.cameraState.targetLookAt.y,
            z: this.cameraState.targetLookAt.z
          }
        }));
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

      this.emptyOverlay = document.createElement('div');
      this.emptyOverlay.className = 'fw3-empty-overlay';
      this.emptyOverlay.style.cssText = 'position:absolute; bottom:20px; left:50%; transform:translateX(-50%); background:rgba(15,23,42,0.85); backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.1); border-radius:20px; padding:6px 16px; color:#94a3b8; font-size:12px; display:flex; pointer-events:none; z-index:10; align-items:center; gap:8px;';
      this.emptyOverlay.innerHTML = '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#f59e0b;"></span> Nenhum agente ativo na cidade';
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
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(w, h, false);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.outputColorSpace = T.SRGBColorSpace;
      this.renderer.toneMapping = T.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 0.9;
      this.renderer.shadowMap.enabled = true;
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
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h, false);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      }
    }

    /* ══════════════════════════════════════════════════════════════════════════
       4-POINT BALANCED LIGHTING + ARCHITECTURAL INTERIOR ILLUMINATION
    ══════════════════════════════════════════════════════════════════════════ */
    _initLighting() {
      // 1. Dual Hemisphere Ambient (Sky Blue from above + Warm Slate Earth from below)
      this.hemiLight = new T.HemisphereLight(0xb9c8d5, 0x1e293b, 0.82);
      this.hemiLight.position.set(0, 80, 0);
      this.scene.add(this.hemiLight);

      // 2. Primary Solar Directional Light with PCF Soft Shadows
      this.sunLight = new T.DirectionalLight(0xffe9cc, 1.4);
      this.sunLight.position.set(70, 95, 55);
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
      this.fillLight = new T.DirectionalLight(0x6da8b4, 0.38);
      this.fillLight.position.set(-65, 45, -55);
      this.scene.add(this.fillLight);

      // 4. Warm Ground Bounce Fill Light -> Illuminates undersides and truck suspensions
      this.bounceLight = new T.DirectionalLight(0xf2bd76, 0.24);
      this.bounceLight.position.set(30, -20, 20);
      this.scene.add(this.bounceLight);

      // 5. Dedicated Architectural Interior Light for API Platform (Eliminating Pitch Black Interiors)
      this.apiInteriorLight = new T.DirectionalLight(0xd6e6e2, 0.65);
      this.apiInteriorLight.position.set(-18, 14, 30);
      this.apiInteriorLight.target.position.set(-18, 9, 2);
      this.scene.add(this.apiInteriorLight);
      this.scene.add(this.apiInteriorLight.target);

      // High-Mast Floodlight at Depósito Mais Loading Dock
      this.dockFloodlight = new T.PointLight(0xffc66d, 2.8, 65, 1.1);
      this.dockFloodlight.position.set(26, 14, -2);
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

      this.materials = {
        asphalt: new T.MeshStandardMaterial({ map: roadTex, roughness: 0.88, metalness: 0.08 }),
        crosswalk: new T.MeshStandardMaterial({ map: crosswalkTex, roughness: 0.82 }),
        sidewalk: new T.MeshStandardMaterial({ map: sidewalkTex, roughness: 0.78, metalness: 0.12 }),
        grass: new T.MeshStandardMaterial({ color: 0x365944, roughness: 0.92, metalness: 0.02 }),
        water: new T.MeshStandardMaterial({ color: 0x124357, roughness: 0.3, metalness: 0.55, transparent: true, opacity: 0.9 }),
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
        serverBlack: new T.MeshStandardMaterial({ color: 0x090d16, roughness: 0.35, metalness: 0.75 }),
        serverLedCyan: new T.MeshBasicMaterial({ color: 0x00d9ff }),
        serverLedGreen: new T.MeshBasicMaterial({ color: 0x10b981 }),
        serverLedBlue: new T.MeshBasicMaterial({ color: 0x3b82f6 }),
        serverLedAmber: new T.MeshBasicMaterial({ color: 0xf59e0b }),
        cyberWall: new T.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.25, metalness: 0.65 }),
        cyberFloor: new T.MeshStandardMaterial({ color: 0x0b1329, roughness: 0.18, metalness: 0.82 }),
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
        leafDeciduous: new T.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.85 }),
        leafPine: new T.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 }),
        leafFlowering: new T.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.8 }),
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
    _initTerrain() {
      const terrainGroup = new T.Group();
      terrainGroup.name = 'TerrainGroup';

      // 1. Base Island Foundation with Concrete Paver Grid
      const baseGeo = new T.BoxGeometry(175, 2.5, 155);
      const baseMesh = new T.Mesh(baseGeo, this.materials.sidewalk);
      baseMesh.position.set(0, -1.25, 0);
      baseMesh.receiveShadow = true;
      terrainGroup.add(baseMesh);

      // Surrounding Water Plane
      const waterGeo = new T.PlaneGeometry(420, 420);
      const waterMesh = new T.Mesh(waterGeo, this.materials.water);
      waterMesh.rotation.x = -Math.PI / 2;
      waterMesh.position.y = -2.1;
      terrainGroup.add(waterMesh);

      // 2. Green Landscaped Parks & Lawns
      const greenPads = [
        { x: -38, z: -38, w: 42, d: 38 },
        { x: -38, z: 38, w: 42, d: 38 },
        { x: 38, z: 38, w: 42, d: 38 },
        { x: 44, z: -38, w: 32, d: 38 }
      ];
      greenPads.forEach(p => {
        const gMesh = new T.Mesh(new T.BoxGeometry(p.w, 0.16, p.d), this.materials.grass);
        gMesh.position.set(p.x, 0.08, p.z);
        gMesh.receiveShadow = true;
        terrainGroup.add(gMesh);
      });

      // 3. Arterial Roadways (Textured Asphalt + Double Yellow Stripes)
      const roadEW = new T.Mesh(new T.BoxGeometry(150, 0.12, 14), this.materials.asphalt);
      roadEW.position.set(0, 0.06, 0);
      roadEW.receiveShadow = true;
      terrainGroup.add(roadEW);

      const roadNS = new T.Mesh(new T.BoxGeometry(14, 0.12, 130), this.materials.asphalt);
      roadNS.position.set(0, 0.06, 0);
      roadNS.receiveShadow = true;
      terrainGroup.add(roadNS);

      // Logistics Industrial Avenue into Depósito Mais (x: 26)
      const roadLogistics = new T.Mesh(new T.BoxGeometry(14, 0.12, 60), this.materials.asphalt);
      roadLogistics.position.set(26, 0.06, -18);
      roadLogistics.receiveShadow = true;
      terrainGroup.add(roadLogistics);

      // 4. White Zebra Crosswalks at Major Intersections
      const crosswalks = [
        { x: 12, z: 0, rot: Math.PI / 2, w: 14, d: 3.5 },
        { x: -12, z: 0, rot: Math.PI / 2, w: 14, d: 3.5 },
        { x: 0, z: 12, rot: 0, w: 14, d: 3.5 },
        { x: 0, z: -12, rot: 0, w: 14, d: 3.5 },
        { x: 26, z: 5, rot: 0, w: 14, d: 3.5 }
      ];
      crosswalks.forEach(cw => {
        const cwMesh = new T.Mesh(new T.PlaneGeometry(cw.w, cw.d), this.materials.crosswalk);
        cwMesh.rotation.x = -Math.PI / 2;
        cwMesh.rotation.z = cw.rot;
        cwMesh.position.set(cw.x, 0.14, cw.z);
        terrainGroup.add(cwMesh);
      });

      this.scene.add(terrainGroup);
    }

    /* ══════════════════════════════════════════════════════════════════════════
       URBAN INFRASTRUCTURE: VEGETATION, LIGHT POLES, SECURITY FENCES
    ══════════════════════════════════════════════════════════════════════════ */
    _initUrbanInfrastructure() {
      const infraGroup = new T.Group();
      infraGroup.name = 'UrbanInfraGroup';

      // 1. High-Detail Multi-Tier Urban & District Landscaping (45+ Trees & Hedges)
      const treeCoords = [
        // AI Nexus & Northern Parks
        [-20, -32, 'deciduous'], [-28, -36, 'pine'], [-35, -28, 'flowering'],
        [-14, -28, 'flowering'], [-32, -20, 'pine'], [-16, -38, 'deciduous'],
        // Dev Loft & Western Boulevards
        [-36, 12, 'deciduous'], [-34, 22, 'pine'], [-38, 4, 'flowering'],
        [-22, 28, 'deciduous'], [-32, 34, 'pine'], [-28, 42, 'deciduous'],
        [-16, 36, 'flowering'], [-12, 42, 'deciduous'], [-38, 28, 'pine'],
        // Memory Vault & Southern Grounds
        [-16, 22, 'pine'], [-2, 36, 'deciduous'], [4, 40, 'flowering'],
        [10, 34, 'deciduous'], [16, 40, 'pine'], [-8, 42, 'deciduous'],
        // Project Forge & Eastern Industrial Green Belts
        [32, 26, 'pine'], [36, 16, 'deciduous'], [40, 24, 'pine'],
        [28, 36, 'deciduous'], [38, 34, 'pine'], [44, 12, 'deciduous'],
        // Depósito Mais Perimeter & Landscaping
        [42, -4, 'flowering'], [45, -16, 'pine'], [44, -26, 'deciduous'],
        [45, -34, 'pine'], [36, -34, 'deciduous'], [26, -36, 'pine'],
        [14, -36, 'flowering'], [12, -26, 'deciduous'], [8, -34, 'pine'],
        // Central Civic Plaza Greenery
        [-14, -14, 'flowering'], [14, -14, 'flowering'], [-14, 14, 'flowering'], [14, 14, 'flowering']
      ];
      treeCoords.forEach(([x, z, type]) => {
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
      const fenceZ = 12;
      for (let fx = 10; fx <= 44; fx += 4) {
        if (fx >= 20 && fx <= 29) continue; // Entrance gate opening
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
      booth.position.set(19.5, 1.4, fenceZ);
      booth.castShadow = true;
      const boothRoof = new T.Mesh(new T.BoxGeometry(3.8, 0.3, 3.6), this.materials.depositoRed);
      boothRoof.position.set(19.5, 2.95, fenceZ);
      const boothGlass = new T.Mesh(new T.BoxGeometry(2.4, 1.2, 0.15), this.materials.glass);
      boothGlass.position.set(19.5, 1.6, fenceZ + 1.45);
      infraGroup.add(booth, boothRoof, boothGlass);

      // Automated Boom Barrier (Cancela de Acesso Amarela e Preta)
      const boomStand = new T.Mesh(new T.BoxGeometry(0.5, 1.2, 0.5), this.materials.depositoRed);
      boomStand.position.set(21.5, 0.6, fenceZ);
      const boomPole = new T.Mesh(new T.BoxGeometry(6.2, 0.14, 0.14), this.materials.hazardStripe);
      boomPole.position.set(24.6, 1.1, fenceZ);
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
      const bollardPositions = [
        [20.5, 0, 11.2], [21.5, 0, 11.2], [28.5, 0, 11.2], [29.5, 0, 11.2]
      ];
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
      hub.position.set(26, 0, -10);

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

        // Place Pallets on each tier bay
        for (let px = -length / 2 + uprightSpacing / 2; px < length / 2; px += uprightSpacing / 2) {
          if (Math.random() > 0.15) {
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
      const v = (variant !== null) ? variant : Math.floor(Math.random() * 4);

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
      const camilaBubble = new AgentThoughtBubble(camila, 'WMS: Inspeção Lote #4410', '#f97316', '📦');
      this.agents.set('agent-camila', {
        id: 'agent-camila',
        name: 'Supervisora Camila',
        role: 'Supervisora de Qualidade & Embalagem WMS',
        department: 'LOGISTICA',
        status: 'WORKING',
        state: 'WORKING',
        height: 1.76,
        mesh: camila,
        thoughtBubble: camilaBubble,
        path: null,
        pathIndex: 0
      });
      this._createAgentStatusBadge('Camila · WMS Inspeção', camila.position);
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
    _createCyberHumanoid({ id, name, role, department, pos, shirtMat, hairColor, accessory = 'none', isSeated = false }) {
      const agent = new T.Group();
      agent.name = 'Agent_' + id;
      agent.position.copy(pos);
      agent.scale.set(1.0, 1.0, 1.0);

      // 0. Interactive Status Ground Halo / Aura Ring
      const haloGeo = new T.RingGeometry(0.44, 0.60, 24);
      const haloMat = new T.MeshBasicMaterial({
        color: id === 'agent-ai-core' ? 0xc084fc : id === 'agent-security' ? 0xef4444 : id === 'agent-infra' ? 0x22c55e : 0x00f0ff,
        side: T.DoubleSide,
        transparent: true,
        opacity: 0.75
      });
      const halo = new T.Mesh(haloGeo, haloMat);
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = 0.02;
      agent.add(halo);

      // 1. Pelvis / Hips Base (Calibrated for exact 1.76m standing character height)
      const hips = new T.Mesh(new T.BoxGeometry(0.52, 0.20, 0.36), this.materials.workWear);
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

      // Role-Specific Tactical Armor or Lapel
      if (id === 'agent-security') {
        const armorPlate = new T.Mesh(new T.BoxGeometry(0.56, 0.44, 0.14), this.materials.dockBumper);
        armorPlate.position.set(0, torsoY + 0.02, 0.19);
        const badgeShield = new T.Mesh(new T.BoxGeometry(0.14, 0.16, 0.04), this.materials.truckChrome);
        badgeShield.position.set(-0.16, torsoY + 0.10, 0.27);
        agent.add(armorPlate, badgeShield);
      } else {
        const lapel = new T.Mesh(new T.BoxGeometry(0.20, 0.28, 0.40), this.materials.ceramicWhite);
        lapel.position.set(0, torsoY + 0.12, 0.01);
        agent.add(lapel);
      }

      // Lanyard & Security ID Badge
      const lanyard = new T.Mesh(new T.BoxGeometry(0.28, 0.38, 0.40), this.materials.hazardStripe);
      lanyard.position.set(0, torsoY + 0.06, 0.02);
      const idBadge = new T.Mesh(new T.BoxGeometry(0.18, 0.24, 0.04), this.materials.silverReflective);
      idBadge.position.set(0, torsoY - 0.12, 0.22);
      const idPhoto = new T.Mesh(new T.BoxGeometry(0.14, 0.10, 0.02), this.materials.fastLaneGlow);
      idPhoto.position.set(0, torsoY - 0.10, 0.24);
      agent.add(lanyard, idBadge, idPhoto);

      // 3. Neck & Anatomical Head
      const neck = new T.Mesh(new T.CylinderGeometry(0.11, 0.13, 0.10, 8), this.materials.skinTone);
      neck.position.y = torsoY + 0.30;
      agent.add(neck);

      const head = new T.Mesh(new T.BoxGeometry(0.38, 0.34, 0.36), this.materials.skinTone);
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
      const hairTop = new T.Mesh(new T.BoxGeometry(0.40, 0.06, 0.38), hairMat);
      hairTop.position.set(0, 1.73, -0.01);
      const hairBack = new T.Mesh(new T.BoxGeometry(0.40, 0.30, 0.12), hairMat);
      hairBack.position.set(0, torsoY + 0.47, -0.19);
      const hairSideL = new T.Mesh(new T.BoxGeometry(0.06, 0.24, 0.34), hairMat);
      hairSideL.position.set(-0.20, torsoY + 0.49, 0.01);
      const hairSideR = new T.Mesh(new T.BoxGeometry(0.06, 0.24, 0.34), hairMat);
      hairSideR.position.set(0.20, torsoY + 0.49, 0.01);
      const hairFringe = new T.Mesh(new T.BoxGeometry(0.36, 0.08, 0.08), hairMat);
      hairFringe.position.set(0, torsoY + 0.57, 0.15);

      agent.add(hairTop, hairBack, hairSideL, hairSideR, hairFringe);

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
      let extraAccessory = null;
      if (accessory === 'glasses') {
        const glasses = new T.Mesh(new T.BoxGeometry(0.34, 0.10, 0.06), this.materials.truckChrome);
        glasses.position.set(0, torsoY + 0.49, 0.19);
        agent.add(glasses);
        extraAccessory = glasses;
      } else if (accessory === 'headset') {
        const band = new T.Mesh(new T.TorusGeometry(0.22, 0.025, 6, 16, Math.PI), this.materials.dockBumper);
        band.position.set(0, torsoY + 0.65, 0);
        band.rotation.x = Math.PI;
        const earpiece = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.06, 8), this.materials.truckChrome);
        earpiece.rotation.z = Math.PI / 2;
        earpiece.position.set(0.21, torsoY + 0.48, 0);
        const mic = new T.Mesh(new T.BoxGeometry(0.03, 0.03, 0.18), this.materials.dockBumper);
        mic.position.set(0.18, torsoY + 0.42, 0.12);
        agent.add(band, earpiece, mic);
        extraAccessory = earpiece;
      } else if (accessory === 'visor') {
        const visor = new T.Mesh(new T.BoxGeometry(0.40, 0.11, 0.14), this.materials.fastLaneGlow);
        visor.position.set(0, torsoY + 0.50, 0.18);
        agent.add(visor);
        extraAccessory = visor;
      }

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

      let armL, forearmL, handL, armR, forearmR, handR, smartwatchLed;

      if (isSeated) {
        armL = new T.Mesh(armGeo, shirtMat);
        armL.position.set(-0.36, torsoY + 0.08, 0.11);
        armL.rotation.x = Math.PI / 3.5;
        forearmL = new T.Mesh(forearmGeo, this.materials.skinTone);
        forearmL.position.set(-0.36, torsoY - 0.06, 0.30);
        forearmL.rotation.x = Math.PI / 2.2;
        handL = new T.Mesh(handGeo, this.materials.skinTone);
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
        forearmR = new T.Mesh(forearmGeo, this.materials.skinTone);
        forearmR.position.set(0.36, torsoY - 0.06, 0.30);
        forearmR.rotation.x = Math.PI / 2.2;
        handR = new T.Mesh(handGeo, this.materials.skinTone);
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
        forearmL = new T.Mesh(forearmGeo, this.materials.skinTone);
        forearmL.position.set(-0.36, torsoY - 0.22, 0.09);
        forearmL.rotation.x = Math.PI / 6;

        const watchBand = new T.Mesh(new T.BoxGeometry(0.15, 0.06, 0.16), this.materials.dockBumper);
        watchBand.position.set(-0.36, torsoY - 0.22, 0.09);
        smartwatchLed = new T.Mesh(new T.BoxGeometry(0.06, 0.05, 0.03), this.materials.smartwatchLedMat);
        smartwatchLed.position.set(-0.36, torsoY - 0.20, 0.17);

        armR = new T.Mesh(armGeo, shirtMat);
        armR.position.set(0.36, torsoY + 0.06, 0.03);
        forearmR = new T.Mesh(forearmGeo, this.materials.skinTone);
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

        const thighL = new T.Mesh(thighGeo, this.materials.workWear);
        thighL.position.set(-0.15, 0.46, 0.20);
        const thighR = new T.Mesh(thighGeo, this.materials.workWear);
        thighR.position.set(0.15, 0.46, 0.20);

        const calfL = new T.Mesh(calfGeo, this.materials.workWear);
        calfL.position.set(-0.15, 0.22, 0.41);
        const calfR = new T.Mesh(calfGeo, this.materials.workWear);
        calfR.position.set(0.15, 0.22, 0.41);

        const shoeSoleL = new T.Mesh(shoeSoleGeo, this.materials.sneakerWhite);
        shoeSoleL.position.set(-0.15, 0.025, 0.44);
        const shoeUpperL = new T.Mesh(shoeUpperGeo, this.materials.dockBumper);
        shoeUpperL.position.set(-0.15, 0.09, 0.44);

        const shoeSoleR = new T.Mesh(shoeSoleGeo, this.materials.sneakerWhite);
        shoeSoleR.position.set(0.15, 0.025, 0.44);
        const shoeUpperR = new T.Mesh(shoeUpperGeo, this.materials.dockBumper);
        shoeUpperR.position.set(0.15, 0.09, 0.44);

        agent.add(thighL, thighR, calfL, calfR, shoeSoleL, shoeUpperL, shoeSoleR, shoeUpperR);
      } else {
        const legGeo = new T.BoxGeometry(0.20, 0.60, 0.22);
        const shoeSoleGeo = new T.BoxGeometry(0.24, 0.05, 0.36);
        const shoeUpperGeo = new T.BoxGeometry(0.22, 0.10, 0.32);

        const legL = new T.Mesh(legGeo, this.materials.workWear);
        legL.position.set(-0.15, 0.35, 0);
        legL.castShadow = true;
        const legR = new T.Mesh(legGeo, this.materials.workWear);
        legR.position.set(0.15, 0.35, 0);
        legR.castShadow = true;

        const shoeSoleL = new T.Mesh(shoeSoleGeo, this.materials.sneakerWhite);
        shoeSoleL.position.set(-0.15, 0.025, 0.05);
        const shoeUpperL = new T.Mesh(shoeUpperGeo, this.materials.dockBumper);
        shoeUpperL.position.set(-0.15, 0.09, 0.05);

        const shoeSoleR = new T.Mesh(shoeSoleGeo, this.materials.sneakerWhite);
        shoeSoleR.position.set(0.15, 0.025, 0.05);
        const shoeUpperR = new T.Mesh(shoeUpperGeo, this.materials.dockBumper);
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
        smartwatchLed,
        halo,
        neuralHalo: neuralHaloMesh,
        faceParts: [eyeL, eyeR, specL, specR, browL, browR, mouth],
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
      bldGroup.position.set(-18, 0, 2);
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

      const tableTop = new T.Mesh(new T.BoxGeometry(2.0, 0.06, 1.2), this.materials.clearGlass);
      tableTop.position.set(0.6, 0.42, 0.8);
      const tableLegs = new T.Mesh(new T.BoxGeometry(1.8, 0.4, 1.0), this.materials.chromeMetal);
      tableLegs.position.set(0.6, 0.20, 0.8);
      loungeGroup.add(tableTop, tableLegs);

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

      const telemetryWall = new T.Mesh(new T.BoxGeometry(12, 2.6, 0.08), this.materials.grafanaScreen);
      telemetryWall.position.set(0, f1Y + 2.2, -bD / 2 + 0.38);
      this.apiFloorGroups[1].add(telemetryWall);

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
          const initialY = startY + Math.random() * (endY - startY);
          pktMesh.position.set(cx, initialY, -bD / 4 + 2.5);
          bldGroup.add(pktMesh);

          this.apiDataPackets.push({
            mesh: pktMesh,
            conduitX: cx,
            conduitZ: -bD / 4 + 2.5,
            startY,
            endY,
            currentY: initialY,
            speed: 1.2 + Math.random() * 1.6,
            dir: p % 2 === 0 ? 1 : -1,
            phase: Math.random() * Math.PI * 2
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
      hqGroup.position.set(0, 0, 0);

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
      aiGroup.position.set(-22, 0, -18);

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
      devGroup.position.set(-44, 0, 14);

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
      forgeGroup.position.set(20, 0, 20);

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
      vaultGroup.position.set(-8, 0, 28);

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
      obsGroup.position.set(0, 0, -32);

      const terrace = new T.Mesh(new T.CylinderGeometry(9, 10, 1.6, 8), this.materials.sidewalk);
      terrace.position.y = 0.8;
      terrace.receiveShadow = true;
      obsGroup.add(terrace);

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
    }

    _initVehicles() {
      // 1. Freight Truck #1 backed into Doca 1
      const truck1 = this._createHeavyFreightTruck(this.materials.truckCabinBlue, true);
      truck1.position.set(26 - 9.2, 0, 10.5);
      this.scene.add(truck1);

      // 2. Forklift at Doca 2
      this.forkliftGroup = this._createForklift();
      this.forkliftGroup.position.set(26, 0.9, 3.5);
      this.scene.add(this.forkliftGroup);

      // 3. Delivery Box Van parked at staging yard
      const boxVan = this._createDeliveryBoxVan(this.materials.depositoRed);
      boxVan.position.set(40, 0, 4);
      boxVan.rotation.y = -Math.PI / 4;
      this.scene.add(boxVan);

      // 4. Moving Highway Traffic
      const highwayTruck = this._createDeliveryBoxVan(this.materials.containerBlue);
      highwayTruck.position.set(-45, 0, 0);
      this.scene.add(highwayTruck);
      this.trafficVehicle = { mesh: highwayTruck, x: -45, speed: 0.28, dir: 1 };

      // 5. Executive Sedan Car parked near API Platform Complex
      const sedanCar = this._createSedanCar(this.materials.dockBumper);
      sedanCar.position.set(-8, 0, 16);
      sedanCar.rotation.y = Math.PI / 6;
      this.scene.add(sedanCar);
      this.sedanCar = sedanCar;
    }

    /* ══════════════════════════════════════════════════════════════════════════
       DATA FLOW PIPELINES: FAST LANE & JOB LANE
    ══════════════════════════════════════════════════════════════════════════ */
    _initDataFlowPipelines() {
      const pGroup = new T.Group();

      // Elevated Overhead Cable Gantry Truss between HQ and Depósito Mais
      const conduit = new T.Mesh(new T.BoxGeometry(26, 0.3, 0.3), this.materials.dockBumper);
      conduit.position.set(13, 10, -5);
      conduit.rotation.y = Math.atan2(-10, 26);
      pGroup.add(conduit);

      // Fast Lane: High-Speed Cyan Optical Pulses
      for (let i = 0; i < 6; i++) {
        const pulse = new T.Mesh(new T.SphereGeometry(0.24, 8, 8), this.materials.fastLaneGlow);
        pGroup.add(pulse);
        this.dataPulses.push({
          mesh: pulse,
          start: new T.Vector3(0, 10, 0),
          end: new T.Vector3(26, 10, -10),
          progress: i / 6,
          speed: 0.009
        });
      }

      // Optical Conduit between API Platform (-18, 10, 2) and Central HQ (0, 10, 0)
      const apiConduit = new T.Mesh(new T.BoxGeometry(18.2, 0.28, 0.28), this.materials.cyberMullion);
      apiConduit.position.set(-9, 10, 1);
      apiConduit.rotation.y = Math.atan2(-2, 18);
      pGroup.add(apiConduit);

      // Cyan Optical Pulses from API Platform to Central HQ
      for (let k = 0; k < 4; k++) {
        const pulse = new T.Mesh(new T.SphereGeometry(0.22, 8, 8), this.materials.fastLaneGlow);
        pGroup.add(pulse);
        this.dataPulses.push({
          mesh: pulse,
          start: new T.Vector3(-18, 10, 2),
          end: new T.Vector3(0, 10, 0),
          progress: k / 4,
          speed: 0.012
        });
      }

      // Job Lane: Amber Volumetric Payload Capsules
      for (let j = 0; j < 3; j++) {
        const capsule = new T.Mesh(new T.BoxGeometry(0.8, 0.6, 1.2), this.materials.jobLaneGlow);
        pGroup.add(capsule);
        this.dataPulses.push({
          mesh: capsule,
          start: new T.Vector3(26, 0.5, 0),
          end: new T.Vector3(0, 0.5, 0),
          progress: j / 3,
          speed: 0.003
        });
      }

      this.scene.add(pGroup);
    }

    _bindEvents() {
      const c = this.canvas;
      c.addEventListener('mousedown', (e) => {
        this.cameraState.dragging = true;
        this.cameraState.targetAzimuth = null;
        this.cameraState.targetElevation = null;
        this.cameraState.lastX = e.clientX;
        this.cameraState.lastY = e.clientY;
        this.cameraState.moved = false;
      });

      window.addEventListener('mousemove', (e) => {
        if (!this.cameraState.dragging) {
          this._updateRaycast(e);
          return;
        }
        const dx = e.clientX - this.cameraState.lastX;
        const dy = e.clientY - this.cameraState.lastY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.cameraState.moved = true;
        this.cameraState.azimuth -= dx * 0.006;
        this.cameraState.elevation = Math.max(0.2, Math.min(1.2, this.cameraState.elevation + dy * 0.005));
        this.cameraState.lastX = e.clientX;
        this.cameraState.lastY = e.clientY;
        this._updateCameraPosition(true);
      });

      window.addEventListener('mouseup', (e) => {
        const startedOnCanvas = this.cameraState.dragging;
        this.cameraState.dragging = false;
        if (startedOnCanvas && !this.cameraState.moved) this._handleCanvasClick(e);
        this._saveState();
      });

      c.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = Math.sign(e.deltaY) * 6;
      this.cameraState.targetDistance = Math.max(12, Math.min(260, this.cameraState.targetDistance + delta));
        this._saveState();
      }, { passive: false });

      window.addEventListener('resize', () => {
        this.resize();
      });
    }

    _updateRaycast(e) {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const hits = this.raycaster.intersectObjects(this.interactiveMeshes, false);
      if (hits.length > 0) {
        this.canvas.style.cursor = 'pointer';
        this.hoveredObject = hits[0].object;
      } else {
        this.canvas.style.cursor = 'default';
        this.hoveredObject = null;
      }
    }

    _handleCanvasClick(e) {
      if (!this.hoveredObject) return;
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
        this.focusEntity(targetPos, 8);

        const liveAgent = this.agents.get(data.agentId) || {
          id: data.agentId,
          name: data.name,
          role: data.role,
          department: data.department
        };

        if (typeof window.fenixShowWorldAgentInspector === 'function') {
          window.fenixShowWorldAgentInspector(liveAgent);
        }
      } else if (data.type === 'building') {
        this.selectBuilding(data.id || data.buildingId);
      }
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
        }
        if (this.cameraState.targetElevation !== null) {
          this.cameraState.elevation = this.cameraState.targetElevation;
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
    }

    setCameraMode(mode) {
      const validModes = ['orbit', 'pan', 'zoom', 'focus', 'follow', 'interior', 'city'];
      if (!validModes.includes(mode)) return this.cameraMode || 'orbit';
      this.cameraMode = mode;
      if (mode === 'city' || mode === 'orbit') {
        this.followingAgentId = null;
        this.cameraState.targetDistance = CITY_DEFAULT_DISTANCE;
        this.cameraState.targetLookAt.set(0, 0, 0);
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
      this.cameraState.targetDistance = targetDist;
      if (targetAzimuth !== null) this.cameraState.targetAzimuth = targetAzimuth;
      if (targetElevation !== null) this.cameraState.targetElevation = targetElevation;
      this._saveState();
    }

    focusDistrict(districtId) {
      const d = DISTRICTS.find(item => item.id === districtId);
      if (d) {
        this.focusEntity(new T.Vector3(d.x, 0, d.z), d.isHero ? 42 : 55);
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
      this.cameraState.targetDistance = Math.max(8, Math.min(260, CITY_DEFAULT_DISTANCE / zoom));
      this._saveState();
      return true;
    }

    zoomStep(direction) {
      const steps = Number(direction);
      if (!Number.isFinite(steps) || steps === 0) return false;
      const factor = steps > 0 ? Math.pow(0.82, steps) : Math.pow(1.22, -steps);
      this.cameraState.targetDistance = Math.max(8, Math.min(260, this.cameraState.targetDistance * factor));
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

    resetCamera() {
      this.cameraState.targetLookAt.set(0, 0, 0);
      this.cameraState.targetDistance = CITY_DEFAULT_DISTANCE;
      this.cameraState.targetAzimuth = Math.PI / 4;
      this.cameraState.targetElevation = 0.615;
      this.stopFollowing();
      this._saveState();
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
          this.focusEntity(new T.Vector3(pos.x, 2.0, pos.z), 26);
          return;
        }
      }
      if (buildingId === 'bld-deposito-mais' || buildingId === 'deposito-mais' || buildingId === 'logistics' || buildingId === 'bld-logistics') {
        this.focusEntity(new T.Vector3(26, 0, -10), 38);
      } else if (buildingId === 'bld-api-platform' || buildingId === 'api-platform') {
        this.focusFloor(null);
        this.focusEntity(new T.Vector3(-18, 9.0, 2), 34, 1.62, 0.28);
      } else if (buildingId === 'bld-fenix-hq' || buildingId === 'command-center') {
        this.focusEntity(new T.Vector3(0, 0, 0), 55);
      } else if (buildingId === 'bld-dev-loft' || buildingId === 'dev-district') {
        this.focusEntity(new T.Vector3(-44, 0, 14), 42);
      } else if (buildingId === 'bld-ai-nexus' || buildingId === 'ai-district') {
        this.focusEntity(new T.Vector3(-22, 0, -18), 42);
      } else {
        const mesh = this.interactiveMeshes.find(m => m.userData?.id === buildingId || m.userData?.buildingId === buildingId);
        if (mesh) {
          const wPos = new T.Vector3();
          mesh.getWorldPosition(wPos);
          this.focusEntity(wPos, 28);
        }
      }
    }

    selectBuilding(buildingId) {
      if (!buildingId) return;
      this.focusBuilding(buildingId);
      if (typeof window.fenixShowBuildingDetails === 'function') {
        let bld = this.dynamicBuildings?.get(buildingId);
        window.fenixShowBuildingDetails(bld || { id: buildingId, name: buildingId });
      }
    }

    selectAgent(agentId) {
      if (!agentId) return;
      this.focusAgent(agentId);
      const ag = this.agents.get(agentId) || { id: agentId, name: agentId };
      if (typeof window.fenixShowWorldAgentInspector === 'function') {
        window.fenixShowWorldAgentInspector(ag);
      }
    }

    focusFloor(floorNumber) {
      if (floorNumber === null || floorNumber === undefined || floorNumber === 'all' || floorNumber === -1) {
        this.activeApiFloor = null;
        if (this.apiFloorGroups) {
          this.apiFloorGroups.forEach(fg => { if (fg) fg.visible = true; });
        }
        if (this.apiRoofGroup) this.apiRoofGroup.visible = true;
        this.focusEntity(new T.Vector3(-18, 9.0, 2), 34, 1.62, 0.28);
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
      this.focusEntity(new T.Vector3(-18, fY + 1.8, 2.0), 13.5, 1.62, 0.22);
    }

    focusCompany(companyId) {
      this.focusBuilding(companyId);
    }

    focusAgent(agentId) {
      if (!agentId) return;
      const ag = this.agents.get(agentId);
      if (ag && ag.mesh) {
        this.focusEntity(ag.mesh.position, 10);
        return;
      }
      if (agentId === 'agent-camila' || (agentId && agentId.includes('camila'))) {
        if (this.camilaGroup) this.focusEntity(this.camilaGroup.position, 8);
      } else if (agentId === 'agent-andre' || (agentId && agentId.includes('andre'))) {
        this.focusEntity(new T.Vector3(28.5, 0.8, -6.5), 8);
      } else if (agentId === 'agent-expedicao' || (agentId && agentId.includes('carlos'))) {
        this.focusEntity(new T.Vector3(22, 0.8, 1), 10);
      } else if (agentId === 'agent-api-ops' || (agentId && agentId.includes('alex'))) {
        this.focusFloor(1);
        this.focusEntity(new T.Vector3(-22.5, 5.4, 4.2), 8.5, 1.62, 0.22);
      } else if (agentId === 'agent-integration' || (agentId && agentId.includes('elena'))) {
        this.focusFloor(1);
        this.focusEntity(new T.Vector3(-13.5, 5.4, 4.2), 8.5, 1.62, 0.22);
      } else if (agentId === 'agent-infra' || (agentId && agentId.includes('lucas'))) {
        this.focusFloor(2);
        this.focusEntity(new T.Vector3(-20.2, 9.8, 5.2), 8.5, 1.62, 0.22);
      } else if (agentId === 'agent-monitor' || (agentId && agentId.includes('maya'))) {
        this.focusFloor(2);
        this.focusEntity(new T.Vector3(-15.8, 9.8, 5.2), 8.5, 1.62, 0.22);
      } else if (agentId === 'agent-security' || (agentId && agentId.includes('victor'))) {
        this.focusFloor(2);
        this.focusEntity(new T.Vector3(-26.2, 9.8, 0.8), 8.5, 1.62, 0.22);
      } else if (agentId === 'agent-ai-core' || (agentId && agentId.includes('sora'))) {
        this.focusFloor(3);
        this.focusEntity(new T.Vector3(-18, 14.8, 4.8), 9.5, 1.62, 0.22);
      } else if (agentId === 'agent-support' || (agentId && agentId.includes('gabriel'))) {
        this.focusFloor(0);
        this.focusEntity(new T.Vector3(-18, 1.4, 3.2), 9.0, 1.62, 0.22);
      }
    }

    toggleDayNight() {
      this.cameraState.night = !this.cameraState.night;
      if (this.cameraState.night) {
        this.scene.background.set(0x060913);
        this.scene.fog.color.set(0x060913);
        this.sunLight.color.set(0x1e3a8a);
        this.sunLight.intensity = 0.55;
        this.hemiLight.intensity = 0.65;
        this.dockFloodlight.intensity = 10.5;
      } else {
        this.scene.background.set(0x111a27);
        this.scene.fog.color.set(0x131d2e);
        this.sunLight.color.set(0xfffaf0);
        this.sunLight.intensity = 2.5;
        this.hemiLight.intensity = 1.85;
        this.dockFloodlight.intensity = 4.8;
      }
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
            this.apiDataPackets.forEach(pkt => {
              pkt.speed = 1.2 + Math.random() * 1.6;
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
        this.focusEntity(new T.Vector3(26, 0.9, 1.0), 18, 1.5, 0.25);
      } else if (r.includes('rack') || r.includes('aisle') || r.includes('rua') || r.includes('armazen')) {
        this.focusEntity(new T.Vector3(26, 0.9, -10.0), 22, 1.5, 0.25);
      } else if (r.includes('pack') || r.includes('embalag')) {
        this.focusEntity(new T.Vector3(34, 0.9, -4.0), 14, 1.5, 0.25);
      } else if (r.includes('dep_office') || r.includes('escritorio')) {
        this.focusEntity(new T.Vector3(42, 0.9, -7.0), 14, 1.5, 0.25);
      } else if (r.includes('staging')) {
        this.focusEntity(new T.Vector3(26, 0.9, -2.0), 16, 1.5, 0.25);
      } else if (r.includes('lobby') || r.includes('plaza') || r.includes('floor_0') || r.includes('andar_0')) {
        this.focusFloor(0);
        this.focusEntity(new T.Vector3(-18, 1.4, 3.2), 14, 1.62, 0.22);
      } else if (r.includes('support') || r.includes('gateway') || r.includes('floor_1') || r.includes('andar_1')) {
        this.focusFloor(1);
        this.focusEntity(new T.Vector3(-18, 5.4, 3.2), 14, 1.62, 0.22);
      } else if (r.includes('server') || r.includes('infra') || r.includes('sec') || r.includes('floor_2') || r.includes('andar_2')) {
        this.focusFloor(2);
        this.focusEntity(new T.Vector3(-18, 9.8, 3.2), 14, 1.62, 0.22);
      } else if (r.includes('neural') || r.includes('core') || r.includes('floor_3') || r.includes('andar_3')) {
        this.focusFloor(3);
        this.focusEntity(new T.Vector3(-18, 14.8, 4.8), 14, 1.62, 0.22);
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
      agent.state = 'WALKING';
      if (agent.thoughtBubble) {
        agent.thoughtBubble.setText('Em deslocamento...', '🚶', '#38bdf8');
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
        speed: 0.95 + Math.random() * 0.3,
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
      const floors = Math.max(1, Math.min(8, parseInt(payload.floors, 10) || 2));
      const width = parseFloat(payload.width) || 16.0;
      const depth = parseFloat(payload.depth) || 14.0;
      const floorH = 4.2;
      const height = floors * floorH;
      const coords = payload.coordinates || { x: -28.0, y: 0, z: 18.0 };
      const color = payload.color || '#4e8f88';
      const icon = payload.icon || '🏢';

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
      const wallMat = new T.MeshStandardMaterial({ color: 0x273542, roughness: 0.72, metalness: 0.22 });
      const accentMat = new T.MeshStandardMaterial({
        color: new T.Color(color), emissive: new T.Color(color), emissiveIntensity: 0.16,
        roughness: 0.46, metalness: 0.38
      });
      const glassMat = this.materials.glassModern || new T.MeshPhysicalMaterial({
        color: 0x93c5fd,
        transparent: true,
        opacity: 0.55,
        roughness: 0.1,
        metalness: 0.1
      });

      for (let f = 0; f < floors; f++) {
        const floorY = 0.6 + (f * floorH);

        // Floor slab
        const slab = new T.Mesh(new T.BoxGeometry(width + 0.4, 0.3, depth + 0.4), this.materials.dockBumper || wallMat);
        slab.position.y = floorY + 0.15;
        bldGroup.add(slab);

        // Glass curtain envelope
        const glassCurtain = new T.Mesh(new T.BoxGeometry(width - 0.2, floorH - 0.3, depth - 0.2), glassMat);
        glassCurtain.position.y = floorY + (floorH / 2);
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
      this.dynamicBuildings.set(id, {
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
      });

      console.log(`[FenixWorld3D] ✅ Dynamic Building instantiated: ${name} (${id}) at (${coords.x}, ${coords.z})`);
      return { ok: true, id, name, position: coords, floors };
    }

    spawnDynamicAgent(payload) {
      const id = payload.id || `agent-${Date.now()}`;
      const name = payload.name || 'Agente Operacional';
      const role = payload.role || 'Especialista Fênix';
      const department = payload.department || 'OPERATIONS';
      const coords = payload.coordinates || { x: -28.0, y: 0.8, z: 18.0 };

      if (this.agents && this.agents.has(id)) {
        const existing = this.agents.get(id);
        if (existing && existing.mesh) {
          existing.mesh.position.set(coords.x, coords.y || 0.8, coords.z);
          if (existing.thoughtBubble) {
            existing.thoughtBubble.setText(payload.taskName || 'Ativo · Reposicionado', '📍');
          }
          return { ok: true, id, updated: true, agent: existing };
        }
      }

      this.agents = this.agents || new Map();
      const pos = new T.Vector3(coords.x, coords.y !== undefined ? coords.y : 0.8, coords.z);

      const agentMesh = this._createCyberHumanoid({
        id,
        name,
        role,
        department,
        pos,
        shirtMat: this.materials.devNavy || this.materials.hazardStripe,
        hairColor: 0x3b82f6,
        accessory: 'tablet',
        isSeated: false
      });

      const bubble = new AgentThoughtBubble(agentMesh, payload.currentTask || 'Pronto para operações', '#38bdf8', '🤖');

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
        state: payload.state || 'IDLE',
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
        ag.thoughtBubble.setText('Deslocamento em curso...', '🚶', '#38bdf8');
      }

      console.log(`[FenixWorld3D] 🚶 Agent ${agentId} moving to (${targetX.toFixed(1)}, ${targetZ.toFixed(1)})`);
      return { ok: true, agentId, target: { x: targetX, y: targetY, z: targetZ } };
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

    setEnvironment(payload) {
      const isNight = payload.timeOfDay === 'NIGHT' || payload.isNight;
      const isRain = payload.weather === 'RAIN';

      if (isNight !== this.cameraState.night) {
        this.toggleDayNight();
      }

      if (isRain && this.scene && this.scene.fog) {
        this.scene.fog.density = 0.015;
      } else if (this.scene && this.scene.fog) {
        this.scene.fog.density = 0.007;
      }

      return { ok: true, isNight, weather: isRain ? 'RAIN' : 'CLEAR' };
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
      if (!this._isMounted || this._isDisposed) {
        this._animationFrameId = null;
        return;
      }
      const cityView = document.getElementById('view-city');
      const isCityActive = cityView && cityView.classList.contains('active') && cityView.style.display !== 'none';
      if (document.hidden || !isCityActive) {
        this._animationFrameId = null;
        return;
      }
      this._animationFrameId = requestAnimationFrame(this._animate);

      // In headless / test environments without GPU, throttle rendering to max 10 FPS to preserve CPU
      const isHeadless = Boolean(navigator.webdriver) || (typeof navigator !== 'undefined' && /headless/i.test(navigator.userAgent)) || Boolean(window.__FENIX_HEADLESS__);
      if (isHeadless) {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (this._lastFrameTime && (now - this._lastFrameTime < 100)) {
          return;
        }
        this._lastFrameTime = now;
      }

      const delta = this.clock.getDelta();
      const time = this.clock.getElapsedTime();

      // 1. Dynamic Automatic Warehouse Roof Cutaway System
      if (this.warehouseRoofGroup) {
        const distToDep = this.cameraState.targetLookAt.distanceTo(new T.Vector3(26, 0, -10));
        const shouldCutaway = (this.cameraState.distance < 48 && distToDep < 32) || this.cutawayState.manual;
        this.cutawayState.target = shouldCutaway ? 1.0 : 0.0;
        this.cutawayState.progress += (this.cutawayState.target - this.cutawayState.progress) * 0.12;

        // Smoothly elevate the roof and skylights upward
        this.warehouseRoofGroup.position.y = 11.9 + this.cutawayState.progress * 32;
        this.warehouseRoofGroup.visible = this.cutawayState.progress < 0.95;
      }

      // 2. Active Multi-Step Logistics Forklift Operational Cycle (Doca 2 <-> Rua B Staging/Racking)
      if (this.forkliftGroup) {
        const fs = this.forkliftState;
        fs.timer = (fs.timer || 0) + delta;
        fs.strobeTimer = (fs.strobeTimer || 0) + delta;

        // Amber flashing strobe beacon on roll cage
        const ud = this.forkliftGroup.userData;
        if (ud && ud.strobe) {
          ud.strobe.visible = (Math.sin(time * 12) > 0);
        }

        switch (fs.step || 0) {
          case 0: // Waiting at Doca 2 apron
            this.forkliftGroup.position.set(26.0, 0.9, 8.5);
            this.forkliftGroup.rotation.y = 0;
            if (fs.timer > 2.0) {
              fs.step = 1;
              fs.timer = 0;
              fs.z = 8.5;
            }
            break;
          case 1: // Driving into container / semi-trailer at Doca 2
            fs.z = (fs.z || 8.5) + delta * 2.2;
            this.forkliftGroup.position.z = fs.z;
            this.forkliftGroup.position.x = 26.0;
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
            this.forkliftGroup.position.z = fs.z;
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
            this.forkliftGroup.position.z = fs.z;
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
            this.forkliftGroup.position.z = fs.z;
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

      // 3. Camila Breathing & Work Cycle
      if (this.camilaGroup) {
        this.camilaState.timer += delta;
        this.camilaGroup.position.y = this.camilaState.pos.y + Math.sin(time * 3) * 0.03;
      }

      // 3b. API Platform Floor 3 Neural Core & Server LED animations
      if (this.apiNeuralCore) {
        this.apiNeuralCore.rotation.y = time * 0.8;
        this.apiNeuralCore.rotation.x = Math.sin(time * 0.5) * 0.2;
      }
      if (this.apiNeuralRing) {
        this.apiNeuralRing.rotation.z = time * 1.2;
      }
      if (this.apiNeuralRing2) {
        this.apiNeuralRing2.rotation.x = -time * 0.9;
      }
      if (this.apiNeuralRing3) {
        this.apiNeuralRing3.rotation.y = time * 1.5;
      }
      if (this.serverRacksLeds && this.serverRacksLeds.length > 0) {
        const step = Math.floor(time * 6) % 3;
        this.serverRacksLeds.forEach((led, i) => {
          led.visible = (i % 3 === step) ? (Math.sin(time * 12 + i) > -0.4) : true;
        });
      }

      // 3c. Inter-Floor Optical Data Conduits & Animated Token Packets
      if (this.apiDataPackets && this.apiDataPackets.length > 0) {
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
          if (!inFrustum && camDist > 25 && !agentRecord.path) {
            return;
          }

          const aTime = time + aIdx * 1.35;
          // Dynamic Waypoint Navigation along PathGraph
          if (agentRecord.path && agentRecord.path.length > 0) {
            agentRecord.state = 'WALKING';
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
                  agentRecord.state = 'WORKING';
                  if (agentRecord.thoughtBubble) {
                    agentRecord.thoughtBubble.setText(agentRecord.assignedTask || agentRecord.currentTask || 'Operando no Posto', '✅', '#10b981');
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
          }

          // Kinematics LOD gating: distant agents skip subtle upper body animations
          const allowSubtleAnim = inFrustum && camDist < 60 && (camDist < 30 || ((this._frameCounter + aIdx) % 2 === 0));

          // Seated typing animation for Alex, Elena, Maya (when not walking)
          if (!agentRecord.path && ud.isSeated && ud.armL && ud.armR && allowSubtleAnim) {
            ud.armL.rotation.x = Math.PI / 3.5 + Math.sin(aTime * 8) * 0.12;
            ud.armR.rotation.x = Math.PI / 3.5 + Math.cos(aTime * 8) * 0.12;
            if (ud.forearmL) ud.forearmL.rotation.x = Math.PI / 2.2 + Math.cos(aTime * 8) * 0.08;
            if (ud.forearmR) ud.forearmR.rotation.x = Math.PI / 2.2 + Math.sin(aTime * 8) * 0.08;
          }

          // Standing idle breathing & subtle head turn for Gabriel, Lucas, Victor, Sora
          if (!ud.isSeated && ud.head && allowSubtleAnim) {
            ud.head.rotation.y = Math.sin(aTime * 0.6) * 0.18;
          }

          // Overhead Emote / Role Badge floating bob
          if (ud.emoteBadge && inFrustum && camDist < 70) {
            const baseY = ud.isSeated ? 1.15 + 1.28 : 1.45 + 1.28;
            ud.emoteBadge.position.y = baseY + Math.sin(aTime * 3.2) * 0.08;
          }

          // Smartwatch LED pulsing on left wrist (only when close)
          if (ud.smartwatchLed && ud.smartwatchLed.material && inFrustum && camDist < 35) {
            const pulse = 0.55 + Math.sin(aTime * 5.5) * 0.45;
            ud.smartwatchLed.material.opacity = Math.max(0.3, pulse);
          }

          // Neural Halo for Sora AI Core
          if (ud.neuralHalo && inFrustum && camDist < 70) {
            ud.neuralHalo.rotation.z += delta * 1.6;
            ud.neuralHalo.rotation.x = Math.PI / 2 + Math.sin(aTime * 2.2) * 0.14;
          }

          // Distance-based Character LOD (distant > 60m silhouette, medium 25-60m body, close < 25m details, very close < 10m facial details)
          const showFace = camDist < 12 && inFrustum;
          const showDetails = camDist < 28 && inFrustum;
          if (ud.faceParts && Array.isArray(ud.faceParts)) {
            ud.faceParts.forEach(p => { if (p) p.visible = showFace; });
          }
          if (ud.detailParts && Array.isArray(ud.detailParts)) {
            ud.detailParts.forEach(p => { if (p) p.visible = showDetails; });
          }
        });
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
        this.agentBadgeEl.style.display = (p.z < 1) ? 'block' : 'none';
      }

      // 5. Traffic Movement along Arteries
      if (this.trafficVehicle) {
        const tv = this.trafficVehicle;
        tv.x += tv.speed * tv.dir;
        tv.mesh.position.x = tv.x;
        if (tv.x > 50) tv.dir = -1;
        if (tv.x < -50) tv.dir = 1;
      }

      // 6. Fast Lane & Job Lane Data Pulses
      if (this.dataPulses) {
        this.dataPulses.forEach(dp => {
          dp.progress = (dp.progress + dp.speed) % 1.0;
          dp.mesh.position.lerpVectors(dp.start, dp.end, dp.progress);
        });
      }

      // 7. Camera Smoothing & Render
      this._updateCameraPosition(false, delta * 1000);
      this.renderer.render(this.scene, this.camera);
    }

    dispose() {
      this._isDisposed = true;
      this._isMounted = false;
      if (this._animationFrameId) {
        cancelAnimationFrame(this._animationFrameId);
        this._animationFrameId = null;
      }
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
        this.syncInterval = null;
      }
      window.removeEventListener('fenix:data', this.syncRealData);
      window.removeEventListener('fenix-live', this.syncRealData);
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

  window.FenixWorld3DEngine = FenixWorld3DEngine;
  window.initFenixWorld3D = function(container) {
    if (!window.fenixWorld3D && !window.fenixWorldEngine3D) {
      const eng = new FenixWorld3DEngine(container);
      window.fenixWorldEngine3D = eng;
      window.fenixWorld3D = eng;
      window.__FENIX_SINGLETONS__?.register('worldEngine', eng);
      window.__FENIX_SINGLETONS__?.register('threeRenderLoop', eng);
    }
    return window.fenixWorld3D || window.fenixWorldEngine3D;
  };

  window.addEventListener('fenix:viewchanged', (event) => {
    if (event.detail?.viewId !== 'city') return;
    const world = window.initFenixWorld3D?.();
    world?.resize?.();
    world?._resumeAnimationLoop?.();
    world?.syncRealData?.();
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

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.initFenixWorld3D();
    });
  } else {
    window.initFenixWorld3D();
  }
})();
