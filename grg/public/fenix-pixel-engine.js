/**
 * FÊNIX PIXEL GAME ENGINE — 2.5D Living Pixel World
 * True Isometric Game World inspired by Habbo / Tibia / Munder Difflin.
 * 
 * Features:
 * - 2:1 Isometric Projection (Tile 64x32)
 * - Pure Pixel Art Pipeline (integer snapping, nearest-neighbor, no blur)
 * - Continuous City World:
 *     - Lush retro-game lawn with organic clovers and wildflowers (no wireframe grid!)
 *     - Asphalt avenues with amber lane dashed dividers and crisp white zebra crosswalks
 *     - Stone sidewalks with 3D beveled curbs and patterned stone plazas
 * - 3 Canonical Handcrafted 2.5D Buildings:
 *     1. FÊNIX CENTRAL HQ: 4-story obsidian glass corporate command spire with grand lobby,
 *        illuminated panoramic office windows, HVAC chillers, satellite dish, antenna beacon,
 *        and radiant pixel-art Fênix Phoenix crest.
 *     2. DEV LOFT: Converted industrial red-brick warehouse with multi-pane factory windows,
 *        granite lintels, copper downspouts, arched timber doors, and roof skylights.
 *     3. RESEARCH & SCIENCE LAB: Titanium graphite cleanroom facility with pressurized
 *        observation bay, yellow/black hazard blast doors, cryogenic conduits, and rotating radar scanner.
 * - Workstations & Datacenter:
 *     - Dual-monitor developer desks with glowing syntax code and telemetry waveform
 *     - 42U Server racks with asynchronously pulsing status LEDs
 *     - Streetlamps with warm 128x64 radial ground light pools
 *     - Shaded pixel trees with contact shadows, planters, benches
 * - Modular 2.5D Pixel Characters (~36px tall, Habbo/Tibia game proportions):
 *     - 10+ distinct agents with individual skin tones, hairstyles, outfits, and accessories
 *     - True human scale (character waist matches desk surface, door fits character)
 *     - All 7 Mandatory Animations:
 *         1. IDLE (rhythmic chest breathing, eye blinks)
 *         2. WALK (4-frame stride and arm counter-swing)
 *         3. WORK (role-specific: dev typing, researcher reading, designer drawing, QA testing, devops monitoring, database inspecting, architect planning, comms talking)
 *         4. THINK (hand on chin, thought bubble with animated ellipsis / lightbulb)
 *         5. COMMUNICATE (talking gesture, soundwave speech bubble)
 *         6. SUCCESS (victory arms up celebration, vertical hop, golden sparkles)
 *         7. ERROR (hands on head, dismay shake, red exclamation alert)
 *     - 4-way facing (SE, SW, NE, NW)
 *     - Contact ground shadows
 * - Built-in A* Navigation Grid & Pathfinding Engine
 */

(function(window) {
  'use strict';

  // ── 1. CONSTANTS & PALETTES ──────────────────────────────────
  const TILE_W = 64;
  const TILE_H = 32;
  const HALF_W = TILE_W / 2; // 32
  const HALF_H = TILE_H / 2; // 16

  const PALETTE = {
    // Terrain & Roads
    asphalt: '#171a22',
    asphaltLight: '#222836',
    asphaltDark: '#0f1117',
    roadMarkingYellow: '#f59e0b',
    roadMarkingWhite: '#f1f5f9',
    curbTop: '#4b5563',
    curbFront: '#374151',
    curbShadow: '#1f2937',
    curbHighlight: '#6b7280',
    sidewalk: '#374151',
    sidewalkLight: '#4b5563',
    sidewalkDark: '#28303d',
    plazaTile1: '#2a3447',
    plazaTile2: '#20293a',
    plazaAccent: '#3b82f6',

    // Lush Lawn & Foliage (warm retro-game tones, no wireframe)
    grassDark: '#144627',
    grassMid: '#1b5e34',
    grassLawn: '#237340',
    grassLight: '#2e8c4e',
    grassBright: '#3bb565',
    clover: '#6ee7b7',
    flowerYellow: '#facc15',
    flowerPink: '#f472b6',
    soil: '#231811',

    // Building Materials
    brickDark: '#6b1d1d',
    brickBase: '#882424',
    brickLight: '#a83232',
    brickHighlight: '#c74444',
    brickMortar: '#3c3535',
    graniteSill: '#64748b',

    obsidianBase: '#0d131f',
    obsidianLight: '#1b263b',
    obsidianDark: '#070a10',
    obsidianTrim: '#334155',

    titaniumBase: '#1c2638',
    titaniumLight: '#2a3b54',
    titaniumDark: '#121824',
    titaniumRivet: '#475569',

    glassWindow: '#0284c7',
    glassLit: '#38bdf8',
    glassWarm: '#fbbf24',
    glassInteriorWarm: '#fef08a',

    // Foliage & Nature
    trunkDark: '#361e12',
    trunkBase: '#4d2b1a',
    trunkLight: '#6d3e26',
    leafDeep: '#064426',
    leafDark: '#095a32',
    leafMid: '#0d7a44',
    leafLight: '#16a34a',
    leafSun: '#4ade80',

    // Props & Lighting
    lampIron: '#1e293b',
    lampBrass: '#d97706',
    lampLight: '#fbbf24',
    fenixRed: '#ef4444',
    fenixRedGlow: 'rgba(239, 68, 68, 0.45)',
    cyberCyan: '#06b6d4',

    // Furniture
    deskWoodDark: '#542d05',
    deskWood: '#783f04',
    deskWoodLight: '#9a5308',
    deskSurface: '#b45309',
    monitorBezel: '#090d16',
    chairMesh: '#1e293b',
    chairMetal: '#64748b',
    serverChassis: '#090d14'
  };

  // Helper: create offscreen pixel canvas with imageSmoothingEnabled = false
  function createPixelCanvas(width, height) {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return { canvas: c, ctx };
  }

  // ── SPRITE CACHE ─────────────────────────────────────────────
  const Cache = {
    tiles: {},
    floors: {},
    cutaways: {},
    buildings: {},
    props: {},
    workstations: {},
    ready: false
  };

  // ── 2. ISOMETRIC TILE GENERATORS ─────────────────────────────
  function initTiles() {
    // A. Lush Retro-Game Grass Tile (64x32)
    {
      const { canvas, ctx } = createPixelCanvas(TILE_W, TILE_H);
      // Diamond base polygon
      ctx.fillStyle = PALETTE.grassLawn;
      ctx.beginPath();
      ctx.moveTo(32, 0); ctx.lineTo(64, 16); ctx.lineTo(32, 32); ctx.lineTo(0, 16);
      ctx.closePath(); ctx.fill();

      // Organic turf shading & soft dither
      ctx.fillStyle = PALETTE.grassMid;
      const midPatches = [
        [18, 12, 5, 3], [36, 8, 6, 3], [24, 20, 7, 3], [42, 18, 5, 2],
        [12, 16, 4, 2], [30, 26, 6, 2], [48, 14, 4, 2], [28, 6, 5, 2]
      ];
      for (const [px, py, pw, ph] of midPatches) {
        ctx.fillRect(px, py, pw, ph);
      }

      ctx.fillStyle = PALETTE.grassLight;
      const lightPatches = [
        [28, 14, 8, 4], [34, 12, 6, 3], [20, 8, 4, 2], [40, 22, 5, 2]
      ];
      for (const [px, py, pw, ph] of lightPatches) {
        ctx.fillRect(px, py, pw, ph);
      }

      // Individual crisp pixel grass blades
      ctx.fillStyle = PALETTE.grassBright;
      const blades = [
        [22, 10], [23, 9], [35, 7], [36, 6], [44, 15], [45, 14],
        [16, 17], [29, 21], [30, 20], [26, 14], [38, 17], [39, 16]
      ];
      for (const [bx, by] of blades) {
        ctx.fillRect(bx, by, 1, 2);
      }

      // Clover & wildflower accents
      ctx.fillStyle = PALETTE.clover;
      ctx.fillRect(25, 16, 2, 2);
      ctx.fillRect(41, 11, 2, 2);

      // Yellow dandelions
      ctx.fillStyle = PALETTE.flowerYellow;
      ctx.fillRect(19, 14, 2, 2);
      ctx.fillRect(37, 23, 2, 2);

      // Tiny pink clover blossom
      ctx.fillStyle = PALETTE.flowerPink;
      ctx.fillRect(46, 19, 2, 2);

      Cache.tiles.grass = canvas;
    }

    // B. Asphalt Road Tile (Plain)
    {
      const { canvas, ctx } = createPixelCanvas(TILE_W, TILE_H);
      ctx.fillStyle = PALETTE.asphalt;
      ctx.beginPath();
      ctx.moveTo(32, 0); ctx.lineTo(64, 16); ctx.lineTo(32, 32); ctx.lineTo(0, 16);
      ctx.closePath(); ctx.fill();

      // Subtle aggregate texture
      ctx.fillStyle = PALETTE.asphaltLight;
      for (let y = 3; y < 29; y += 4) {
        for (let x = 6; x < 58; x += 7) {
          const dy = Math.abs(16 - y);
          if (Math.abs(32 - x) < 28 * (1 - dy / 16)) {
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
      Cache.tiles.asphalt = canvas;
    }

    // C. Asphalt with Yellow Dashed Centerline (East-West Avenue)
    {
      const { canvas, ctx } = createPixelCanvas(TILE_W, TILE_H);
      ctx.drawImage(Cache.tiles.asphalt, 0, 0);
      // Yellow dashed lane marker along SE-NW diagonal
      ctx.strokeStyle = PALETTE.roadMarkingYellow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(18, 9); ctx.lineTo(30, 15);
      ctx.moveTo(34, 17); ctx.lineTo(46, 23);
      ctx.stroke();
      Cache.tiles.asphaltDashed1 = canvas;
    }

    // D. Asphalt with Yellow Dashed Centerline (North-South Boulevard)
    {
      const { canvas, ctx } = createPixelCanvas(TILE_W, TILE_H);
      ctx.drawImage(Cache.tiles.asphalt, 0, 0);
      ctx.strokeStyle = PALETTE.roadMarkingYellow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(46, 9); ctx.lineTo(34, 15);
      ctx.moveTo(30, 17); ctx.lineTo(18, 23);
      ctx.stroke();
      Cache.tiles.asphaltDashed2 = canvas;
    }

    // E. Pedestrian Crosswalk Zebra Stripes
    {
      const { canvas, ctx } = createPixelCanvas(TILE_W, TILE_H);
      ctx.drawImage(Cache.tiles.asphalt, 0, 0);
      ctx.fillStyle = PALETTE.roadMarkingWhite;
      // 5 bold white crossing stripes
      for (let i = -2; i <= 2; i++) {
        const cx = 32 + i * 8;
        const cy = 16 + i * 4;
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy - 3); ctx.lineTo(cx + 3, cy);
        ctx.lineTo(cx + 3, cy + 2); ctx.lineTo(cx - 3, cy - 1);
        ctx.closePath(); ctx.fill();
      }
      Cache.tiles.crosswalk = canvas;
    }

    // F. Sidewalk Tile with 3D Curb Bevel
    {
      const { canvas, ctx } = createPixelCanvas(TILE_W, TILE_H);
      // Base sidewalk stone
      ctx.fillStyle = PALETTE.sidewalk;
      ctx.beginPath();
      ctx.moveTo(32, 0); ctx.lineTo(64, 16); ctx.lineTo(32, 32); ctx.lineTo(0, 16);
      ctx.closePath(); ctx.fill();

      // Stone paving slabs grid
      ctx.strokeStyle = PALETTE.sidewalkDark;
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Dividing slab lines
      ctx.moveTo(24, 4); ctx.lineTo(48, 16);
      ctx.moveTo(16, 8); ctx.lineTo(40, 20);
      ctx.moveTo(32, 16); ctx.lineTo(56, 28);
      ctx.stroke();

      // Curb edge highlight
      ctx.strokeStyle = PALETTE.curbHighlight;
      ctx.beginPath();
      ctx.moveTo(0, 16); ctx.lineTo(32, 32); ctx.lineTo(64, 16);
      ctx.stroke();

      Cache.tiles.sidewalk = canvas;
    }

    // G. Plaza Stone Paving Tile
    {
      const { canvas, ctx } = createPixelCanvas(TILE_W, TILE_H);
      ctx.fillStyle = PALETTE.plazaTile1;
      ctx.beginPath();
      ctx.moveTo(32, 0); ctx.lineTo(64, 16); ctx.lineTo(32, 32); ctx.lineTo(0, 16);
      ctx.closePath(); ctx.fill();

      // Inlaid checker pattern
      ctx.fillStyle = PALETTE.plazaTile2;
      ctx.beginPath();
      ctx.moveTo(32, 4); ctx.lineTo(56, 16); ctx.lineTo(32, 28); ctx.lineTo(8, 16);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = PALETTE.plazaTile1;
      ctx.beginPath();
      ctx.moveTo(32, 8); ctx.lineTo(48, 16); ctx.lineTo(32, 24); ctx.lineTo(16, 16);
      ctx.closePath(); ctx.fill();

      Cache.tiles.plaza = canvas;
    }

    // G. AI District Plaza Tile (Hexagonal Violet/Cyan Cyber Tiles)
    {
      const { canvas, ctx } = createPixelCanvas(TILE_W, TILE_H);
      ctx.fillStyle = '#1e1035';
      ctx.beginPath();
      ctx.moveTo(32, 0); ctx.lineTo(64, 16); ctx.lineTo(32, 32); ctx.lineTo(0, 16);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#2e1065';
      ctx.beginPath();
      ctx.moveTo(32, 3); ctx.lineTo(58, 16); ctx.lineTo(32, 29); ctx.lineTo(6, 16);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#4c1d95';
      ctx.fillRect(28, 13, 8, 6);
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(31, 15, 2, 2); // micro glow node

      Cache.tiles.plazaAI = canvas;
    }

    // H. Creative District Plaza Tile (Modern Terrazzo & Magenta Seams)
    {
      const { canvas, ctx } = createPixelCanvas(TILE_W, TILE_H);
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.moveTo(32, 0); ctx.lineTo(64, 16); ctx.lineTo(32, 32); ctx.lineTo(0, 16);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#27272a';
      ctx.beginPath();
      ctx.moveTo(32, 2); ctx.lineTo(60, 16); ctx.lineTo(32, 30); ctx.lineTo(4, 16);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#db2777';
      ctx.fillRect(30, 14, 4, 4); // magenta dot

      Cache.tiles.plazaCreative = canvas;
    }

    // I. Data Center Plaza Tile (Heavy Steel Grating & Blue LED Seam)
    {
      const { canvas, ctx } = createPixelCanvas(TILE_W, TILE_H);
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.moveTo(32, 0); ctx.lineTo(64, 16); ctx.lineTo(32, 32); ctx.lineTo(0, 16);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(32, 3); ctx.lineTo(58, 16); ctx.lineTo(32, 29); ctx.lineTo(6, 16);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#0284c7';
      ctx.fillRect(20, 14, 24, 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(28, 14, 8, 2); // status glow

      Cache.tiles.plazaData = canvas;
    }

    // J. Observatory Plaza Tile (Celestial Granite & Star Inlay)
    {
      const { canvas, ctx } = createPixelCanvas(TILE_W, TILE_H);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(32, 0); ctx.lineTo(64, 16); ctx.lineTo(32, 32); ctx.lineTo(0, 16);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.moveTo(32, 2); ctx.lineTo(60, 16); ctx.lineTo(32, 30); ctx.lineTo(4, 16);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(31, 14, 2, 4);
      ctx.fillRect(30, 15, 4, 2); // star cross

      Cache.tiles.plazaObs = canvas;
    }

    // K. Project District Plaza Tile (Deployment Bay & Cargo Apron)
    {
      const { canvas, ctx } = createPixelCanvas(TILE_W, TILE_H);
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.moveTo(32, 0); ctx.lineTo(64, 16); ctx.lineTo(32, 32); ctx.lineTo(0, 16);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.moveTo(32, 2); ctx.lineTo(60, 16); ctx.lineTo(32, 30); ctx.lineTo(4, 16);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#0891b2';
      ctx.fillRect(24, 14, 16, 2);

      Cache.tiles.plazaProject = canvas;
    }

    // L. Deep Ocean Water Tile (64x32)
    {
      const { canvas, ctx } = createPixelCanvas(TILE_W, TILE_H);
      ctx.fillStyle = '#0a2540';
      ctx.beginPath();
      ctx.moveTo(32, 0); ctx.lineTo(64, 16); ctx.lineTo(32, 32); ctx.lineTo(0, 16);
      ctx.closePath(); ctx.fill();

      // Shimmering wave crests
      ctx.fillStyle = '#143c68';
      ctx.fillRect(18, 12, 10, 2);
      ctx.fillRect(36, 18, 12, 2);
      ctx.fillRect(26, 24, 8, 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(20, 12, 4, 1);
      ctx.fillRect(40, 18, 4, 1);
      Cache.tiles.water = canvas;
    }

    // M. Golden Beach Sand Tile (64x32)
    {
      const { canvas, ctx } = createPixelCanvas(TILE_W, TILE_H);
      ctx.fillStyle = '#d4b476';
      ctx.beginPath();
      ctx.moveTo(32, 0); ctx.lineTo(64, 16); ctx.lineTo(32, 32); ctx.lineTo(0, 16);
      ctx.closePath(); ctx.fill();

      // Sand grains and wet shoreline dither
      ctx.fillStyle = '#c5a363';
      ctx.fillRect(16, 14, 6, 2);
      ctx.fillRect(38, 20, 6, 2);
      ctx.fillRect(24, 8, 4, 1);
      ctx.fillStyle = '#b38f4d';
      ctx.fillRect(30, 24, 8, 2);
      Cache.tiles.sand = canvas;
    }

    // N. Harbor Dock Timber Pier Tile (64x32)
    {
      const { canvas, ctx } = createPixelCanvas(TILE_W, TILE_H);
      ctx.fillStyle = '#3e2723';
      ctx.beginPath();
      ctx.moveTo(32, 0); ctx.lineTo(64, 16); ctx.lineTo(32, 32); ctx.lineTo(0, 16);
      ctx.closePath(); ctx.fill();

      // Timber planks
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(10, 12, 44, 2);
      ctx.fillRect(14, 16, 36, 2);
      ctx.fillRect(18, 20, 28, 2);
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(20, 13, 8, 1);
      Cache.tiles.dock = canvas;
    }

    // O. Rocky Mountain Cliff Tile (64x32)
    {
      const { canvas, ctx } = createPixelCanvas(TILE_W, TILE_H);
      ctx.fillStyle = '#263238';
      ctx.beginPath();
      ctx.moveTo(32, 0); ctx.lineTo(64, 16); ctx.lineTo(32, 32); ctx.lineTo(0, 16);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#37474f';
      ctx.fillRect(14, 10, 14, 4);
      ctx.fillRect(32, 16, 16, 4);
      ctx.fillStyle = '#546e7a';
      ctx.fillRect(16, 11, 6, 2);
      Cache.tiles.cliff = canvas;
    }

    // P. Industrial Concrete Slab Tile (64x32)
    {
      const { canvas, ctx } = createPixelCanvas(TILE_W, TILE_H);
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(32, 0); ctx.lineTo(64, 16); ctx.lineTo(32, 32); ctx.lineTo(0, 16);
      ctx.closePath(); ctx.fill();

      // Expansion joints
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(32, 0); ctx.lineTo(32, 32);
      ctx.moveTo(0, 16); ctx.lineTo(64, 16);
      ctx.stroke();

      // Concrete texture flecks
      ctx.fillStyle = '#475569';
      ctx.fillRect(18, 8, 2, 1);
      ctx.fillRect(42, 12, 2, 1);
      ctx.fillRect(26, 22, 2, 1);
      ctx.fillRect(48, 20, 2, 1);
      Cache.tiles.industrialConcrete = canvas;
    }

    // Q. Interlocking Stone Paver Plaza Tile (64x32)
    {
      const { canvas, ctx } = createPixelCanvas(TILE_W, TILE_H);
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(32, 0); ctx.lineTo(64, 16); ctx.lineTo(32, 32); ctx.lineTo(0, 16);
      ctx.closePath(); ctx.fill();

      // Patterned cobble pavers
      ctx.fillStyle = '#334155';
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          const px = 16 + (c - r) * 7;
          const py = 6 + (c + r) * 3.5;
          if (px > 4 && px < 56 && py > 2 && py < 28) {
            ctx.fillRect(px, py, 5, 2);
          }
        }
      }
      Cache.tiles.paverStone = canvas;
    }

    // R. Asphalt Parking Stall Tile (64x32)
    {
      const { canvas, ctx } = createPixelCanvas(TILE_W, TILE_H);
      ctx.drawImage(Cache.tiles.asphalt, 0, 0);

      // White parking stall lines
      ctx.strokeStyle = 'rgba(241, 245, 249, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(20, 10); ctx.lineTo(40, 20);
      ctx.moveTo(28, 6);  ctx.lineTo(48, 16);
      ctx.stroke();
      Cache.tiles.parking = canvas;
    }

    // S. Flower Garden Tile (64x32)
    {
      const { canvas, ctx } = createPixelCanvas(TILE_W, TILE_H);
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.moveTo(32, 0); ctx.lineTo(64, 16); ctx.lineTo(32, 32); ctx.lineTo(0, 16);
      ctx.closePath(); ctx.fill();

      // Flower blossoms
      const flowers = [
        [20, 10, '#facc15'], [32, 8, '#f43f5e'], [44, 12, '#a855f7'],
        [16, 18, '#38bdf8'], [28, 16, '#f97316'], [40, 20, '#ec4899'],
        [24, 24, '#facc15'], [36, 24, '#ffffff'], [48, 16, '#f43f5e']
      ];
      for (const [fx, fy, col] of flowers) {
        ctx.fillStyle = col;
        ctx.fillRect(fx, fy, 2, 2);
        ctx.fillStyle = '#166534';
        ctx.fillRect(fx - 1, fy + 1, 1, 1);
      }
      Cache.tiles.flowerGarden = canvas;
    }

    // T. Coastal Wooden Boardwalk Deck Tile (64x32)
    {
      const { canvas, ctx } = createPixelCanvas(TILE_W, TILE_H);
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(32, 0); ctx.lineTo(64, 16); ctx.lineTo(32, 32); ctx.lineTo(0, 16);
      ctx.closePath(); ctx.fill();

      // Horizontal cedar wood deck planks
      const plankColors = ['#92400e', '#b45309', '#78350f', '#a16207', '#b45309'];
      for (let i = 0; i < 5; i++) {
        const py = 4 + i * 5;
        ctx.fillStyle = plankColors[i % plankColors.length];
        ctx.fillRect(8 + i * 4, py, 48 - Math.abs(i - 2) * 8, 4);
      }

      // Plank seam lines
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1;
      for (let y = 4; y < 28; y += 5) {
        ctx.beginPath();
        ctx.moveTo(10, y); ctx.lineTo(54, y);
        ctx.stroke();
      }

      // Brass nail studs
      ctx.fillStyle = '#fef08a';
      for (let y = 6; y < 26; y += 5) {
        ctx.fillRect(18, y, 1, 1);
        ctx.fillRect(46, y, 1, 1);
      }

      Cache.tiles.boardwalk = canvas;
    }
  }

  // ── 3. ENVIRONMENTAL PROPS ───────────────────────────────────
  function initProps() {
    // A. Warm Streetlamp with Hanging Iron Lantern (32x64)
    {
      const { canvas, ctx } = createPixelCanvas(32, 64);
      const bx = 16, by = 54;

      // Contact shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 4, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cast iron fluted base plinth
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx - 4, by, 8, 4);
      ctx.fillStyle = PALETTE.lampIron;
      ctx.fillRect(bx - 3, by - 2, 6, 3);

      // Vertical tapered pole
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx - 1, by - 40, 3, 38);
      ctx.fillStyle = '#334155';
      ctx.fillRect(bx, by - 40, 1, 38);

      // Decorative collar rings
      ctx.fillStyle = PALETTE.lampBrass;
      ctx.fillRect(bx - 2, by - 16, 5, 2);
      ctx.fillRect(bx - 2, by - 32, 5, 2);

      // Curved lantern arm
      ctx.fillStyle = PALETTE.lampIron;
      ctx.fillRect(bx, by - 44, 8, 3);
      ctx.fillRect(bx + 6, by - 42, 3, 5);

      // Lantern housing
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx + 4, by - 38, 7, 2); // cap
      ctx.fillRect(bx + 5, by - 29, 5, 2); // base

      // Glowing incandescent filament glass
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(bx + 5, by - 36, 5, 7);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx + 6, by - 34, 3, 3); // hot center

      Cache.props.streetlamp = canvas;
    }

    // B. Warm Ambient Ground Light Pool (128x64)
    {
      const { canvas, ctx } = createPixelCanvas(128, 64);
      const grad = ctx.createRadialGradient(64, 32, 4, 64, 32, 62);
      grad.addColorStop(0, 'rgba(251, 191, 36, 0.28)');
      grad.addColorStop(0.4, 'rgba(245, 158, 11, 0.16)');
      grad.addColorStop(0.8, 'rgba(217, 119, 6, 0.05)');
      grad.addColorStop(1, 'rgba(217, 119, 6, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(64, 32, 62, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      Cache.props.lampLightPool = canvas;
    }

    // C. Shaded Foliage Pixel Tree (64x80)
    {
      const { canvas, ctx } = createPixelCanvas(64, 80);
      const bx = 32, by = 68;

      // Contact shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 4, 20, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Textured wooden trunk
      ctx.fillStyle = PALETTE.trunkDark;
      ctx.beginPath();
      ctx.moveTo(bx - 5, by + 4); ctx.lineTo(bx - 3, by - 26);
      ctx.lineTo(bx + 3, by - 26); ctx.lineTo(bx + 5, by + 4);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = PALETTE.trunkBase;
      ctx.fillRect(bx - 3, by - 24, 5, 26);
      ctx.fillStyle = PALETTE.trunkLight;
      ctx.fillRect(bx - 1, by - 24, 2, 26); // trunk highlight

      // Exposed roots
      ctx.fillStyle = PALETTE.trunkDark;
      ctx.fillRect(bx - 7, by + 2, 4, 2);
      ctx.fillRect(bx + 3, by + 2, 5, 2);

      // Foliage Clump 1 (Base deep shadow)
      ctx.fillStyle = PALETTE.leafDeep;
      ctx.beginPath();
      ctx.arc(bx - 12, by - 32, 14, 0, Math.PI * 2);
      ctx.arc(bx + 12, by - 32, 14, 0, Math.PI * 2);
      ctx.arc(bx, by - 40, 16, 0, Math.PI * 2);
      ctx.fill();

      // Foliage Clump 2 (Dark green midtone)
      ctx.fillStyle = PALETTE.leafDark;
      ctx.beginPath();
      ctx.arc(bx - 10, by - 38, 13, 0, Math.PI * 2);
      ctx.arc(bx + 10, by - 38, 13, 0, Math.PI * 2);
      ctx.arc(bx, by - 46, 15, 0, Math.PI * 2);
      ctx.fill();

      // Foliage Clump 3 (Vibrant green canopy)
      ctx.fillStyle = PALETTE.leafLight;
      ctx.beginPath();
      ctx.arc(bx - 8, by - 44, 11, 0, Math.PI * 2);
      ctx.arc(bx + 8, by - 44, 11, 0, Math.PI * 2);
      ctx.arc(bx, by - 52, 13, 0, Math.PI * 2);
      ctx.fill();

      // Foliage Sunlit Highlights
      ctx.fillStyle = PALETTE.leafSun;
      ctx.beginPath();
      ctx.arc(bx - 4, by - 56, 7, 0, Math.PI * 2);
      ctx.arc(bx + 4, by - 54, 6, 0, Math.PI * 2);
      ctx.fill();

      Cache.props.tree = canvas;
    }

    // D. Potted Ceramic Planter (28x38)
    {
      const { canvas, ctx } = createPixelCanvas(28, 38);
      const bx = 14, by = 30;

      // Ground shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 3, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Concrete ceramic pot
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx - 7, by - 12, 14, 14);
      ctx.fillStyle = '#334155';
      ctx.fillRect(bx - 6, by - 11, 12, 12);
      ctx.fillStyle = '#475569';
      ctx.fillRect(bx - 5, by - 10, 4, 10); // pot highlight

      // Soil top
      ctx.fillStyle = PALETTE.soil;
      ctx.fillRect(bx - 6, by - 12, 12, 2);

      // Lush Monstera / Ficus Leaves
      ctx.fillStyle = PALETTE.leafDark;
      ctx.fillRect(bx - 9, by - 22, 6, 8);
      ctx.fillRect(bx + 3, by - 22, 6, 8);

      ctx.fillStyle = PALETTE.leafLight;
      ctx.fillRect(bx - 5, by - 28, 10, 14);
      ctx.fillStyle = PALETTE.leafSun;
      ctx.fillRect(bx - 2, by - 27, 4, 6);

      Cache.props.planter = canvas;
    }

    // E. Wooden Park Bench (36x24)
    {
      const { canvas, ctx } = createPixelCanvas(36, 24);
      const bx = 18, by = 18;

      // Contact shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 15, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cast iron legs
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(6, by - 8, 3, 9);
      ctx.fillRect(27, by - 8, 3, 9);

      // Rich teak wood slats (seat)
      ctx.fillStyle = '#78350f';
      ctx.fillRect(5, by - 8, 26, 3);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(5, by - 6, 26, 2);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(5, by - 5, 26, 1);

      // Backrest
      ctx.fillStyle = '#78350f';
      ctx.fillRect(5, by - 14, 26, 4);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(5, by - 13, 26, 2);

      Cache.props.bench = canvas;
    }

    // F. Tiered Circular Marble Fountain (96x64)
    {
      const { canvas, ctx } = createPixelCanvas(96, 64);
      const bx = 48, by = 42;

      // Contact shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 4, 42, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Outer Marble Basin Rim
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.ellipse(bx, by, 40, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(bx, by - 2, 38, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      // Deep Water Pool
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.ellipse(bx, by - 2, 34, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      // Water Ripples
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(bx, by - 2, 24, 9, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Inner Tiered Pedestal
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(bx, by - 10, 18, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.ellipse(bx, by - 11, 15, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Center Spout & Water Jet Spray
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(bx - 1, by - 24, 3, 14);

      ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';
      ctx.beginPath();
      ctx.arc(bx, by - 24, 4, 0, Math.PI * 2);
      ctx.fill();

      Cache.props.centralFountain = canvas;
    }

    // G. Futuristic Commuter Bullet Train (120x36)
    {
      const { canvas, ctx } = createPixelCanvas(120, 36);
      const bx = 60, by = 26;

      // Contact Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 4, 55, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Train Body (Aerodynamic Streamlined Nose)
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(bx - 55, by - 8); ctx.lineTo(bx + 45, by - 8);
      ctx.lineTo(bx + 55, by); ctx.lineTo(bx - 55, by);
      ctx.closePath(); ctx.fill();

      // Red Racing Stripe
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(bx - 55, by - 4, 105, 3);

      // Panoramic Tinted Windows
      ctx.fillStyle = '#0f172a';
      for (let i = 0; i < 7; i++) {
        ctx.fillRect(bx - 48 + i * 14, by - 14, 10, 6);
      }

      // Glowing Interior Lights
      ctx.fillStyle = '#fef08a';
      for (let i = 0; i < 7; i++) {
        ctx.fillRect(bx - 46 + i * 14, by - 12, 6, 3);
      }

      // Nose Headlight (Cyan Glow)
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.fillRect(bx + 52, by - 2, 4, 3);
      ctx.shadowBlur = 0;

      Cache.props.commuterTrain = canvas;
    }

    // H. Cargo Container Ship (160x70)
    {
      const { canvas, ctx } = createPixelCanvas(160, 70);
      const bx = 80, by = 55;

      // Water Wake
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(bx, by + 4, 75, 10, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Ship Hull (Dark Navy Iron)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(bx - 70, by); ctx.lineTo(bx + 60, by);
      ctx.lineTo(bx + 75, by - 14); ctx.lineTo(bx - 60, by - 14);
      ctx.closePath(); ctx.fill();

      // Red Waterline Stripe
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(bx - 68, by - 2, 130, 3);

      // Stacked Colored Containers
      const cColors = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#a855f7'];
      for (let stack = 0; stack < 5; stack++) {
        for (let tier = 0; tier < 2; tier++) {
          ctx.fillStyle = cColors[(stack + tier) % cColors.length];
          ctx.fillRect(bx - 50 + stack * 20, by - 22 - tier * 9, 18, 8);
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1;
          ctx.strokeRect(bx - 50 + stack * 20, by - 22 - tier * 9, 18, 8);
        }
      }

      // Bridge / Wheelhouse at Stern
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(bx + 52, by - 32, 14, 18);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(bx + 54, by - 28, 10, 4); // Navigation bridge window

      Cache.props.cargoShip = canvas;
    }

    // I. Logistics Delivery Truck (64x36)
    {
      const { canvas, ctx } = createPixelCanvas(64, 36);
      const bx = 32, by = 26;

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 3, 26, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cargo Box (Yellow)
      ctx.fillStyle = '#eab308';
      ctx.fillRect(bx - 26, by - 18, 34, 16);
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(bx - 26, by - 18, 34, 2);

      // Cab (Red)
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(bx + 8, by - 12, 16, 12);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(bx + 16, by - 10, 6, 6);

      // Wheels
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(bx - 18, by + 1, 4, 0, Math.PI * 2);
      ctx.arc(bx - 4, by + 1, 4, 0, Math.PI * 2);
      ctx.arc(bx + 16, by + 1, 4, 0, Math.PI * 2);
      ctx.fill();

      Cache.props.deliveryTruck = canvas;
    }

    // J. Compact City Cars (44x24)
    {
      const { canvas, ctx } = createPixelCanvas(44, 24);
      const bx = 22, by = 18;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 18, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Car Body (Cyan Blue)
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(bx - 16, by - 8, 32, 8);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(bx - 8, by - 14, 16, 6);

      // Windows
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx - 6, by - 13, 12, 5);

      // Headlights
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(bx + 14, by - 6, 3, 3);

      // Wheels
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(bx - 10, by + 1, 3, 0, Math.PI * 2);
      ctx.arc(bx + 10, by + 1, 3, 0, Math.PI * 2);
      ctx.fill();

      Cache.props.car = canvas;
    }

    // K. Blooming Sakura Tree (64x80)
    {
      const { canvas, ctx } = createPixelCanvas(64, 80);
      const bx = 32, by = 68;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 4, 20, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Fallen petals on ground
      ctx.fillStyle = '#f472b6';
      for (let i = 0; i < 8; i++) {
        ctx.fillRect(bx - 14 + (i * 4), by + 2 + ((i % 3) * 2), 2, 2);
      }

      // Trunk
      ctx.fillStyle = '#361e12';
      ctx.beginPath();
      ctx.moveTo(bx - 4, by + 4); ctx.lineTo(bx - 2, by - 24);
      ctx.lineTo(bx + 2, by - 24); ctx.lineTo(bx + 4, by + 4);
      ctx.closePath(); ctx.fill();

      // Blooming Pink Foliage Clumps
      ctx.fillStyle = '#db2777';
      ctx.beginPath();
      ctx.arc(bx - 12, by - 34, 14, 0, Math.PI * 2);
      ctx.arc(bx + 12, by - 34, 14, 0, Math.PI * 2);
      ctx.arc(bx, by - 42, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.arc(bx - 8, by - 40, 12, 0, Math.PI * 2);
      ctx.arc(bx + 8, by - 40, 12, 0, Math.PI * 2);
      ctx.arc(bx, by - 48, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.arc(bx - 4, by - 52, 7, 0, Math.PI * 2);
      ctx.arc(bx + 4, by - 50, 6, 0, Math.PI * 2);
      ctx.fill();

      Cache.props.treeSakura = canvas;
    }

    // L. Tropical Palm Tree (64x90) for Praia Beach Coastline
    {
      const { canvas, ctx } = createPixelCanvas(64, 90);
      const bx = 32, by = 78;

      // Contact shadow on golden sand
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 4, 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Slender curved segmented trunk
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(bx, by + 2);
      ctx.quadraticCurveTo(bx - 12, by - 30, bx - 6, by - 62);
      ctx.stroke();

      ctx.strokeStyle = '#a16207';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx + 1, by + 2);
      ctx.quadraticCurveTo(bx - 10, by - 30, bx - 5, by - 62);
      ctx.stroke();

      // Trunk rings
      ctx.fillStyle = '#451a03';
      for (let i = 0; i < 7; i++) {
        const ty = by - 8 - i * 8;
        const tx = bx - 2 - Math.sin((i / 7) * Math.PI) * 6;
        ctx.fillRect(tx, ty, 6, 2);
      }

      // Cluster of 3 Coconuts at crown
      ctx.fillStyle = '#542d05';
      ctx.beginPath();
      ctx.arc(bx - 9, by - 61, 3.5, 0, Math.PI * 2);
      ctx.arc(bx - 4, by - 60, 4, 0, Math.PI * 2);
      ctx.arc(bx - 6, by - 57, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // 6 Lush Arching Palm Fronds
      const crownX = bx - 6, crownY = by - 64;
      const fronds = [
        { dx: -24, dy: -12, cdx: -16, cdy: -24 },
        { dx: -18, dy: 14,  cdx: -24, cdy: 2 },
        { dx: 22,  dy: -14, cdx: 14,  cdy: -22 },
        { dx: 24,  dy: 12,  cdx: 22,  cdy: 2 },
        { dx: 2,   dy: -24, cdx: -2,  cdy: -30 },
        { dx: 8,   dy: 16,  cdx: 10,  cdy: 20 }
      ];

      for (const f of fronds) {
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(crownX, crownY);
        ctx.quadraticCurveTo(crownX + f.cdx, crownY + f.cdy, crownX + f.dx, crownY + f.dy);
        ctx.stroke();

        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(crownX, crownY);
        ctx.quadraticCurveTo(crownX + f.cdx, crownY + f.cdy, crownX + f.dx, crownY + f.dy);
        ctx.stroke();
      }

      Cache.props.palmTree = canvas;
    }

    // M. Beach Umbrella & Sun Lounger (48x54)
    {
      const { canvas, ctx } = createPixelCanvas(48, 54);
      const bx = 24, by = 44;

      // Contact shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(bx + 6, by + 4, 18, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sun lounger with cyan beach towel
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(bx - 12, by + 2); ctx.lineTo(bx + 10, by - 6);
      ctx.lineTo(bx + 18, by - 16); ctx.lineTo(bx + 14, by - 16);
      ctx.lineTo(bx + 7, by - 7); ctx.lineTo(bx - 12, by);
      ctx.closePath(); ctx.fill();

      // Cyan Towel
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(bx - 8, by - 1, 14, 3);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(bx - 6, by - 1, 10, 2);

      // Angled umbrella pole
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx + 6, by + 4);
      ctx.lineTo(bx + 2, by - 36);
      ctx.stroke();

      // Striped Beach Parasol Canopy (Red & White)
      const ux = bx + 2, uy = by - 36;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(ux, uy, 18, Math.PI, 0, false);
      ctx.closePath();
      ctx.fill();

      // White alternating wedges
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(ux, uy); ctx.lineTo(ux - 12, uy); ctx.lineTo(ux - 8, uy - 14); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(ux, uy); ctx.lineTo(ux + 2, uy); ctx.lineTo(ux + 4, uy - 18); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(ux, uy); ctx.lineTo(ux + 14, uy); ctx.lineTo(ux + 11, uy - 12); ctx.closePath(); ctx.fill();

      // Top finial
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(ux - 1, uy - 20, 3, 3);

      Cache.props.beachUmbrella = canvas;
    }

    // N. Maritime Container Gantry Crane (120x150)
    {
      const { canvas, ctx } = createPixelCanvas(120, 150);
      const bx = 60, by = 138;

      // Contact shadow on pier
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 4, 46, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // A-frame Legs (Industrial Orange)
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(bx - 32, by); ctx.lineTo(bx - 18, by - 80);
      ctx.moveTo(bx + 18, by); ctx.lineTo(bx + 18, by - 80);
      ctx.moveTo(bx - 32, by); ctx.lineTo(bx + 18, by - 40); // Cross-brace
      ctx.moveTo(bx - 18, by - 80); ctx.lineTo(bx + 18, by);
      ctx.stroke();

      // Horizontal Gantry Boom extending left over the water
      ctx.fillStyle = '#c2410c';
      ctx.fillRect(bx - 55, by - 92, 105, 12);
      ctx.fillStyle = '#f97316';
      ctx.fillRect(bx - 55, by - 90, 105, 8);

      // Lattice top truss
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx - 18, by - 92); ctx.lineTo(bx, by - 125); ctx.lineTo(bx + 18, by - 92);
      ctx.lineTo(bx - 50, by - 92); ctx.lineTo(bx, by - 125);
      ctx.stroke();

      // Operator Cabin
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx - 12, by - 82, 16, 14);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(bx - 10, by - 78, 12, 6); // glass window

      // Hoisting Cables & Spreader
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx - 36, by - 80); ctx.lineTo(bx - 36, by - 55);
      ctx.moveTo(bx - 26, by - 80); ctx.lineTo(bx - 26, by - 55);
      ctx.stroke();

      // Suspended 20ft Green Container
      ctx.fillStyle = '#10b981';
      ctx.fillRect(bx - 42, by - 55, 22, 11);
      ctx.strokeStyle = '#065f46';
      ctx.strokeRect(bx - 42, by - 55, 22, 11);

      Cache.props.harborCrane = canvas;
    }

    // O. Cascading Mountain Cliff Waterfall (48x80)
    {
      const { canvas, ctx } = createPixelCanvas(48, 80);
      const bx = 24, by = 70;

      // Dark rocky backdrop
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx - 16, by - 65, 32, 65);

      // Water stream (cyan rushing water)
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(bx - 10, by - 65, 20, 60);

      // White water rapids & frothing crests
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(bx - 7, by - 60, 14, 52);

      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 8; i++) {
        const y = by - 58 + i * 7;
        ctx.fillRect(bx - 5 + ((i % 2) * 4), y, 6, 2);
      }

      // Bottom Splash pool with expanding foam rings
      ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.beginPath();
      ctx.ellipse(bx, by, 18, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(bx, by, 14, 5, 0, 0, Math.PI * 2);
      ctx.stroke();

      Cache.props.waterfall = canvas;
    }

    // P. Iconic 3D Red Map Marker Pin (32x44)
    {
      const { canvas, ctx } = createPixelCanvas(32, 44);
      const bx = 16, by = 40;

      // Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Red Teardrop Body
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(bx, by - 24, 12, Math.PI * 0.8, Math.PI * 0.2, true);
      ctx.lineTo(bx, by);
      ctx.closePath();
      ctx.fill();

      // Highlight contour
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(bx - 2, by - 26, 9, 0, Math.PI * 2);
      ctx.fill();

      // White inner badge circle
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bx, by - 24, 5, 0, Math.PI * 2);
      ctx.fill();

      // Red center dot
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(bx, by - 24, 2.5, 0, Math.PI * 2);
      ctx.fill();

      Cache.props.mapPinRed = canvas;
    }

    // Q. Alpine Pine Tree (48x80)
    {
      const { canvas, ctx } = createPixelCanvas(48, 80);
      const bx = 24, by = 68;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 4, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Trunk
      ctx.fillStyle = '#29180d';
      ctx.fillRect(bx - 3, by - 16, 6, 18);

      // Conical needle tiers
      const tiers = [
        { y: by - 14, w: 36, h: 18, c: '#064e3b', c2: '#047857' },
        { y: by - 26, w: 30, h: 16, c: '#065f46', c2: '#059669' },
        { y: by - 38, w: 24, h: 16, c: '#047857', c2: '#10b981' },
        { y: by - 50, w: 16, h: 16, c: '#059669', c2: '#34d399' },
        { y: by - 60, w: 8,  h: 12, c: '#10b981', c2: '#6ee7b7' }
      ];
      for (const t of tiers) {
        ctx.fillStyle = t.c;
        ctx.beginPath();
        ctx.moveTo(bx - t.w / 2, t.y);
        ctx.lineTo(bx + t.w / 2, t.y);
        ctx.lineTo(bx, t.y - t.h);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = t.c2;
        ctx.beginPath();
        ctx.moveTo(bx, t.y);
        ctx.lineTo(bx + t.w / 2, t.y);
        ctx.lineTo(bx, t.y - t.h);
        ctx.closePath();
        ctx.fill();
      }
      Cache.props.treePine = canvas;
    }

    // R. Vibrant Linden Street Tree (56x70)
    {
      const { canvas, ctx } = createPixelCanvas(56, 70);
      const bx = 28, by = 58;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 3, 18, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Slender trunk
      ctx.fillStyle = '#451a03';
      ctx.fillRect(bx - 3, by - 22, 6, 24);

      // Lime-green rounded foliage
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(bx, by - 36, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(bx - 3, by - 38, 15, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#86efac';
      ctx.beginPath();
      ctx.arc(bx - 6, by - 42, 8, 0, Math.PI * 2);
      ctx.fill();
      Cache.props.treeLinden = canvas;
    }

    // S. Trimmed Box Hedge (40x26)
    {
      const { canvas, ctx } = createPixelCanvas(40, 26);
      const bx = 20, by = 18;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 18, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Isometric box hedge
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.moveTo(bx - 16, by - 4); ctx.lineTo(bx, by + 4); ctx.lineTo(bx + 16, by - 4);
      ctx.lineTo(bx + 16, by - 12); ctx.lineTo(bx, by - 4); ctx.lineTo(bx - 16, by - 12);
      ctx.closePath(); ctx.fill();

      // Top face
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.moveTo(bx, by - 4); ctx.lineTo(bx + 16, by - 12);
      ctx.lineTo(bx, by - 20); ctx.lineTo(bx - 16, by - 12);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#4ade80';
      ctx.fillRect(bx - 4, by - 15, 8, 3);
      Cache.props.bushHedge = canvas;
    }

    // T. Flowering Shrub (36x30)
    {
      const { canvas, ctx } = createPixelCanvas(36, 30);
      const bx = 18, by = 22;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.arc(bx, by - 8, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(bx - 2, by - 10, 9, 0, Math.PI * 2);
      ctx.fill();

      // Lilac / Magenta flowers
      const flowerDots = [[bx-6, by-10], [bx+4, by-12], [bx-2, by-14], [bx+5, by-6], [bx-5, by-5], [bx+1, by-9]];
      ctx.fillStyle = '#d946ef';
      for (const [fx, fy] of flowerDots) {
        ctx.fillRect(fx, fy, 2, 2);
      }
      Cache.props.bushFlower = canvas;
    }

    // U. Stone-Bordered Flower Bed (48x28)
    {
      const { canvas, ctx } = createPixelCanvas(48, 28);
      const bx = 24, by = 16;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 20, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Stone border
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(bx - 20, by); ctx.lineTo(bx, by + 8); ctx.lineTo(bx + 20, by);
      ctx.lineTo(bx, by - 8); ctx.closePath(); ctx.fill();

      // Soil bed
      ctx.fillStyle = '#27170e';
      ctx.beginPath();
      ctx.moveTo(bx - 17, by); ctx.lineTo(bx, by + 6); ctx.lineTo(bx + 17, by);
      ctx.lineTo(bx, by - 6); ctx.closePath(); ctx.fill();

      // Flowers
      const blooms = [
        [bx-10, by, '#facc15'], [bx-4, by+2, '#f43f5e'], [bx+4, by+1, '#38bdf8'],
        [bx+10, by-1, '#a855f7'], [bx-2, by-2, '#f97316'], [bx+6, by-3, '#ffffff']
      ];
      for (const [fx, fy, c] of blooms) {
        ctx.fillStyle = c;
        ctx.fillRect(fx, fy - 2, 2, 3);
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(fx, fy + 1, 1, 1);
      }
      Cache.props.flowerBed = canvas;
    }

    // V. Municipal Traffic Light (24x60)
    {
      const { canvas, ctx } = createPixelCanvas(24, 60);
      const bx = 12, by = 52;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Black post
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx - 1, by - 36, 3, 38);

      // Signal housing
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx - 4, by - 48, 9, 22);
      ctx.strokeStyle = '#0f172a';
      ctx.strokeRect(bx - 4, by - 48, 9, 22);

      // Red, Amber, Green lenses
      ctx.fillStyle = '#ef4444'; // Red lit
      ctx.fillRect(bx - 2, by - 46, 5, 4);
      ctx.fillStyle = '#78350f'; // Amber off
      ctx.fillRect(bx - 2, by - 40, 5, 4);
      ctx.fillStyle = '#064e3b'; // Green off
      ctx.fillRect(bx - 2, by - 34, 5, 4);
      Cache.props.trafficLight = canvas;
    }

    // W. Red Fire Hydrant (20x28)
    {
      const { canvas, ctx } = createPixelCanvas(20, 28);
      const bx = 10, by = 22;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 5, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#dc2626';
      ctx.fillRect(bx - 3, by - 12, 6, 12); // body
      ctx.fillRect(bx - 4, by - 8, 8, 3);   // side nozzles
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(bx - 2, by - 14, 4, 3);  // bonnet
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(bx - 1, by - 15, 2, 2);  // nut
      Cache.props.fireHydrant = canvas;
    }

    // X. Municipal Recycling Trash Bin (20x30)
    {
      const { canvas, ctx } = createPixelCanvas(20, 30);
      const bx = 10, by = 24;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0284c7';
      ctx.fillRect(bx - 4, by - 14, 8, 14);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(bx - 5, by - 16, 10, 3); // lid
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(bx - 2, by - 9, 4, 4);   // emblem
      Cache.props.trashBin = canvas;
    }

    // Y. Metro Station Entrance (64x44)
    {
      const { canvas, ctx } = createPixelCanvas(64, 44);
      const bx = 32, by = 30;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 4, 26, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Granite stairwell balustrade
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(bx - 24, by - 4); ctx.lineTo(bx, by + 8); ctx.lineTo(bx + 24, by - 4);
      ctx.lineTo(bx + 24, by); ctx.lineTo(bx, by + 12); ctx.lineTo(bx - 24, by);
      ctx.closePath(); ctx.fill();

      // Stairwell descent opening (dark void)
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.moveTo(bx - 20, by - 3); ctx.lineTo(bx, by + 7); ctx.lineTo(bx + 20, by - 3);
      ctx.lineTo(bx, by - 11); ctx.closePath(); ctx.fill();

      // Steps descending
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx - 12, by - 2, 24, 2);
      ctx.fillRect(bx - 8, by + 1, 16, 2);
      ctx.fillRect(bx - 4, by + 4, 8, 2);

      // Steel handrails
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx - 22, by - 2); ctx.lineTo(bx - 2, by + 8);
      ctx.moveTo(bx + 2, by + 8);  ctx.lineTo(bx + 22, by - 2);
      ctx.stroke();

      // Metro Totem Sign (Cyan Fênix Metro Logo)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx + 22, by - 26, 3, 26);
      ctx.fillStyle = '#00D9FF';
      ctx.beginPath();
      ctx.arc(bx + 23, by - 28, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#090d16';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('M', bx + 23, by - 25);
      Cache.props.metroEntrance = canvas;
    }

    // Z. Sidewalk Newsstand & Kiosk (54x50)
    {
      const { canvas, ctx } = createPixelCanvas(54, 50);
      const bx = 27, by = 40;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 3, 20, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Steel kiosk body
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx - 16, by - 22, 32, 22);

      // Serving counter
      ctx.fillStyle = '#475569';
      ctx.fillRect(bx - 18, by - 14, 36, 4);

      // Colorful magazine racks
      ctx.fillStyle = '#ef4444'; ctx.fillRect(bx - 14, by - 10, 6, 6);
      ctx.fillStyle = '#3b82f6'; ctx.fillRect(bx - 6, by - 10, 6, 6);
      ctx.fillStyle = '#f59e0b'; ctx.fillRect(bx + 2, by - 10, 6, 6);
      ctx.fillStyle = '#10b981'; ctx.fillRect(bx + 10, by - 10, 4, 6);

      // Striped awning (Blue & White)
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(bx - 20, by - 26, 40, 5);
      ctx.fillStyle = '#f8fafc';
      for (let s = 0; s < 5; s++) {
        ctx.fillRect(bx - 18 + s * 8, by - 26, 4, 5);
      }
      Cache.props.kioskNews = canvas;
    }

    // AA. Outdoor Cafe Table & Umbrella (48x48)
    {
      const { canvas, ctx } = createPixelCanvas(48, 48);
      const bx = 24, by = 38;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2 bistro chairs
      ctx.fillStyle = '#334155';
      ctx.fillRect(bx - 14, by - 12, 6, 12);
      ctx.fillRect(bx + 8, by - 12, 6, 12);

      // Round metal table
      ctx.fillStyle = '#64748b';
      ctx.fillRect(bx - 1, by - 14, 3, 14); // stem
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.ellipse(bx, by - 14, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Coffee cups
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(bx - 3, by - 16, 3, 3);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(bx + 2, by - 16, 3, 3);

      // Parasol umbrella
      ctx.fillStyle = '#64748b';
      ctx.fillRect(bx, by - 36, 2, 22);
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(bx + 1, by - 36, 16, Math.PI, 0);
      ctx.fill();
      Cache.props.cafeTable = canvas;
    }

    // AB. Bicycle Rack (44x28)
    {
      const { canvas, ctx } = createPixelCanvas(44, 28);
      const bx = 22, by = 20;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Chrome hoops
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const hx = bx - 12 + i * 12;
        ctx.strokeRect(hx, by - 10, 4, 10);
      }

      // Red parked bicycle
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(bx - 8, by - 4, 4, 0, Math.PI * 2);
      ctx.arc(bx + 2, by - 4, 4, 0, Math.PI * 2);
      ctx.moveTo(bx - 8, by - 4); ctx.lineTo(bx - 3, by - 10); ctx.lineTo(bx + 2, by - 4);
      ctx.stroke();
      Cache.props.bikeRack = canvas;
    }

    // AB2. Cast Iron & Teak Park Bench (36x24, 2.5D Isometric)
    {
      const { canvas, ctx } = createPixelCanvas(36, 24);
      const bx = 18, by = 18;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 1, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cast iron legs and armrests
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx - 12, by); ctx.lineTo(bx - 12, by - 8); ctx.lineTo(bx - 8, by - 12);
      ctx.moveTo(bx + 12, by); ctx.lineTo(bx + 12, by - 8); ctx.lineTo(bx + 8, by - 12);
      ctx.stroke();

      // Warm wooden seat slats
      ctx.fillStyle = '#b45309';
      ctx.fillRect(bx - 14, by - 7, 28, 3);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(bx - 14, by - 5, 28, 2);

      // Backrest slats
      ctx.fillStyle = '#92400e';
      ctx.fillRect(bx - 13, by - 12, 26, 3);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(bx - 13, by - 15, 26, 3);

      Cache.props.parkBench = canvas;
    }

    // AC. Blue Solar Panel Array (64x36)
    {
      const { canvas, ctx } = createPixelCanvas(64, 36);
      const bx = 32, by = 26;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 3, 26, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Slanted mounting frame
      ctx.fillStyle = '#475569';
      ctx.fillRect(bx - 24, by - 4, 4, 6);
      ctx.fillRect(bx + 20, by - 4, 4, 6);
      ctx.fillRect(bx - 4, by - 12, 4, 14);

      // Blue silicon panels
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(bx - 28, by - 2); ctx.lineTo(bx + 24, by - 16);
      ctx.lineTo(bx + 28, by - 24); ctx.lineTo(bx - 24, by - 10);
      ctx.closePath(); ctx.fill();

      // Grid lines
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.stroke();
      Cache.props.solarPanelArray = canvas;
    }

    // AD. Utility Transformer Substation Box (32x32)
    {
      const { canvas, ctx } = createPixelCanvas(32, 32);
      const bx = 16, by = 24;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#15803d'; // Green electrical box
      ctx.fillRect(bx - 8, by - 16, 16, 16);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(bx - 9, by - 18, 18, 3); // top cap

      // Warning lightning bolt
      ctx.fillStyle = '#facc15';
      ctx.fillRect(bx - 2, by - 10, 4, 4);
      Cache.props.transformerBox = canvas;
    }

    // AE. Chainlink Security Fence Section (64x40)
    {
      const { canvas, ctx } = createPixelCanvas(64, 40);
      const bx = 32, by = 32;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(4, by + 2, 56, 2);

      // Steel posts
      ctx.fillStyle = '#475569';
      ctx.fillRect(6, by - 26, 3, 28);
      ctx.fillRect(30, by - 26, 3, 28);
      ctx.fillRect(54, by - 26, 3, 28);

      // Wire mesh
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.lineWidth = 1;
      for (let x = 8; x < 54; x += 4) {
        ctx.beginPath();
        ctx.moveTo(x, by); ctx.lineTo(x + 4, by - 22);
        ctx.stroke();
      }

      // Barbed wire top
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(6, by - 26); ctx.lineTo(56, by - 26);
      ctx.stroke();
      Cache.props.securityFence = canvas;
    }

    // AF. Security Gate Barrier (50x40)
    {
      const { canvas, ctx } = createPixelCanvas(50, 40);
      const bx = 25, by = 30;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(bx - 12, by + 2, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Guard control bollard
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx - 16, by - 18, 8, 20);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(bx - 14, by - 16, 4, 4);

      // Striped barrier arm
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(bx - 12, by - 12); ctx.lineTo(bx + 20, by - 4);
      ctx.stroke();

      // Red hazard stripes
      ctx.strokeStyle = '#ef4444';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(bx - 8 + i * 7, by - 11 + i * 2);
        ctx.lineTo(bx - 5 + i * 7, by - 10 + i * 2);
        ctx.stroke();
      }
      Cache.props.securityGate = canvas;
    }

    // AG. Industrial HVAC Chiller Unit (44x34)
    {
      const { canvas, ctx } = createPixelCanvas(44, 34);
      const bx = 22, by = 26;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#334155';
      ctx.fillRect(bx - 14, by - 16, 28, 16);
      ctx.fillStyle = '#475569';
      ctx.fillRect(bx - 12, by - 14, 24, 12);

      // Fan grilles
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(bx - 6, by - 8, 4, 0, Math.PI * 2);
      ctx.arc(bx + 6, by - 8, 4, 0, Math.PI * 2);
      ctx.fill();
      Cache.props.hvacUnit = canvas;
    }

    // AH. Blue ISO Shipping Containers Stack (68x52)
    {
      const { canvas, ctx } = createPixelCanvas(68, 52);
      const bx = 34, by = 44;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 28, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Lower container (Deep Blue)
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(bx - 26, by - 18, 52, 18);
      ctx.strokeStyle = '#082f49';
      ctx.lineWidth = 1;
      for (let x = bx - 22; x < bx + 24; x += 5) {
        ctx.strokeRect(x, by - 18, 4, 18);
      }

      // Upper container (Cyan Blue)
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(bx - 24, by - 36, 52, 18);
      for (let x = bx - 20; x < bx + 26; x += 5) {
        ctx.strokeRect(x, by - 36, 4, 18);
      }
      Cache.props.containerStackBlue = canvas;
    }

    // AI. Orange/Red Shipping Containers Stack (68x52)
    {
      const { canvas, ctx } = createPixelCanvas(68, 52);
      const bx = 34, by = 44;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 28, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Lower container (Orange)
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(bx - 26, by - 18, 52, 18);
      ctx.strokeStyle = '#7c2d12';
      ctx.lineWidth = 1;
      for (let x = bx - 22; x < bx + 24; x += 5) {
        ctx.strokeRect(x, by - 18, 4, 18);
      }

      // Upper container (Crimson Red)
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(bx - 22, by - 36, 52, 18);
      for (let x = bx - 18; x < bx + 28; x += 5) {
        ctx.strokeRect(x, by - 36, 4, 18);
      }
      Cache.props.containerStackRed = canvas;
    }

    // AK. Logistics Wooden Cargo Pallet (40x28)
    {
      const { canvas, ctx } = createPixelCanvas(40, 28);
      const bx = 20, by = 20;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 16, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wooden slats pallet base
      ctx.fillStyle = '#78350f';
      ctx.fillRect(bx - 14, by - 4, 28, 4);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(bx - 14, by - 2, 28, 2);

      // Stacked brown cardboard boxes
      ctx.fillStyle = '#b45309';
      ctx.fillRect(bx - 12, by - 14, 12, 10);
      ctx.fillRect(bx + 1, by - 14, 12, 10);
      ctx.fillRect(bx - 8, by - 22, 16, 8);

      // Orange security strapping tape
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(bx - 7, by - 14, 2, 10);
      ctx.fillRect(bx + 6, by - 14, 2, 10);
      ctx.fillRect(bx - 1, by - 22, 2, 8);

      Cache.props.cargoPallet = canvas;
    }

    // AL. Hospital Helipad (80x48)
    {
      const { canvas, ctx } = createPixelCanvas(80, 48);
      const bx = 40, by = 24;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 36, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dark asphalt pad
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(bx, by, 34, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      // Yellow outer perimeter ring
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(bx, by, 28, 12, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Bold white "H"
      ctx.fillStyle = '#f8fafc';
      ctx.font = '900 16px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('H', bx, by);

      // 4 perimeter yellow landing lights
      const lightPos = [[bx-28, by], [bx+28, by], [bx, by-12], [bx, by+12]];
      ctx.fillStyle = '#fef08a';
      for (const [lx, ly] of lightPos) {
        ctx.beginPath();
        ctx.arc(lx, ly, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      Cache.props.helipad = canvas;
    }

    // AK. Depósito Mais Branded Delivery Van (60x38, True 2.5D Isometric SE)
    {
      const { canvas, ctx } = createPixelCanvas(60, 38);
      const bx = 30, by = 26;

      // Contact shadow (isometric 2:1 ellipse)
      ctx.fillStyle = 'rgba(2, 6, 16, 0.45)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 1, 22, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rear/Side cargo box (Depósito Mais Industrial Orange)
      // Left side wall (facing SW)
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(bx - 18, by - 5);
      ctx.lineTo(bx + 4, by + 6);
      ctx.lineTo(bx + 4, by - 12);
      ctx.lineTo(bx - 18, by - 23);
      ctx.closePath();
      ctx.fill();

      // Rear wall (facing NW)
      ctx.fillStyle = '#c2410c';
      ctx.beginPath();
      ctx.moveTo(bx - 18, by - 5);
      ctx.lineTo(bx - 26, by - 1);
      ctx.lineTo(bx - 26, by - 18);
      ctx.lineTo(bx - 18, by - 23);
      ctx.closePath();
      ctx.fill();

      // Cargo roof (top face)
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.moveTo(bx - 18, by - 23);
      ctx.lineTo(bx + 4, by - 12);
      ctx.lineTo(bx + 14, by - 17);
      ctx.lineTo(bx - 8, by - 28);
      ctx.closePath();
      ctx.fill();

      // Depósito Mais White Corporate Stripe & Chevron
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(bx - 14, by - 9);
      ctx.lineTo(bx + 2, by - 1);
      ctx.lineTo(bx + 2, by - 5);
      ctx.lineTo(bx - 14, by - 13);
      ctx.closePath();
      ctx.fill();

      // Front Driver Cab (facing SE)
      ctx.fillStyle = '#9a3412';
      ctx.beginPath();
      ctx.moveTo(bx + 4, by + 6);
      ctx.lineTo(bx + 18, by - 1);
      ctx.lineTo(bx + 18, by - 8);
      ctx.lineTo(bx + 4, by - 1);
      ctx.closePath();
      ctx.fill();

      // Slanted Windshield (Cyan tinted glass with specular shine)
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(bx + 4, by - 12);
      ctx.lineTo(bx + 14, by - 17);
      ctx.lineTo(bx + 18, by - 8);
      ctx.lineTo(bx + 4, by - 3);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillRect(bx + 8, by - 11, 4, 2);

      // Headlights with projected light beam
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(bx + 16, by - 4, 3, 2);
      ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
      ctx.beginPath();
      ctx.moveTo(bx + 18, by - 3);
      ctx.lineTo(bx + 28, by + 2);
      ctx.lineTo(bx + 24, by + 6);
      ctx.closePath();
      ctx.fill();

      // Red taillight at rear
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(bx - 26, by - 4, 2, 2);

      // Isometric wheels nestled into wells
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(bx - 10, by + 1, 3.5, 5, -0.4, 0, Math.PI * 2);
      ctx.ellipse(bx + 2, by + 7, 3.5, 5, -0.4, 0, Math.PI * 2);
      ctx.fill();

      // Hubcaps
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(bx - 11, by, 2, 2);
      ctx.fillRect(bx + 1, by + 6, 2, 2);

      Cache.props.vanDeliveryOrange = canvas;
    }

    // AL. Heavy Freight Semi-Truck with Trailer (80x44, True 2.5D Isometric SE)
    {
      const { canvas, ctx } = createPixelCanvas(80, 44);
      const bx = 40, by = 30;

      // Ground shadow
      ctx.fillStyle = 'rgba(2, 6, 16, 0.5)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 34, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Long Corrugated Cargo Trailer
      // Trailer left wall (SW)
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(bx - 28, by - 8);
      ctx.lineTo(bx + 8, by + 10);
      ctx.lineTo(bx + 8, by - 12);
      ctx.lineTo(bx - 28, by - 30);
      ctx.closePath();
      ctx.fill();

      // Trailer corrugations
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      for (let i = -24; i < 6; i += 4) {
        ctx.beginPath();
        const fy = by - 8 + (i + 28) * 0.5;
        ctx.moveTo(bx + i, fy);
        ctx.lineTo(bx + i, fy - 21);
        ctx.stroke();
      }

      // Trailer roof
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(bx - 28, by - 30);
      ctx.lineTo(bx + 8, by - 12);
      ctx.lineTo(bx + 18, by - 17);
      ctx.lineTo(bx - 18, by - 35);
      ctx.closePath();
      ctx.fill();

      // Trailer rear face (NW)
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(bx - 28, by - 8);
      ctx.lineTo(bx - 36, by - 4);
      ctx.lineTo(bx - 36, by - 26);
      ctx.lineTo(bx - 28, by - 30);
      ctx.closePath();
      ctx.fill();

      // Heavy Blue Tractor Cab (facing SE)
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(bx + 8, by + 10);
      ctx.lineTo(bx + 26, by + 1);
      ctx.lineTo(bx + 26, by - 10);
      ctx.lineTo(bx + 8, by - 1);
      ctx.closePath();
      ctx.fill();

      // Cab Windshield (Cyan angled glass)
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(bx + 8, by - 8);
      ctx.lineTo(bx + 18, by - 13);
      ctx.lineTo(bx + 26, by - 6);
      ctx.lineTo(bx + 8, by - 1);
      ctx.closePath();
      ctx.fill();

      // Chrome vertical exhaust stack
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(bx + 7, by - 18, 2, 16);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(bx + 7, by - 20, 2, 2);

      // Headlights & projected beam
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(bx + 24, by - 2, 3, 2);
      ctx.fillStyle = 'rgba(254, 240, 138, 0.22)';
      ctx.beginPath();
      ctx.moveTo(bx + 26, by - 1);
      ctx.lineTo(bx + 38, by + 5);
      ctx.lineTo(bx + 34, by + 9);
      ctx.closePath();
      ctx.fill();

      // Tandem rear wheels & front cab wheels
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(bx - 20, by - 3, 3.5, 5, -0.4, 0, Math.PI * 2);
      ctx.ellipse(bx - 12, by + 1, 3.5, 5, -0.4, 0, Math.PI * 2);
      ctx.ellipse(bx + 18, by + 6, 3.5, 5, -0.4, 0, Math.PI * 2);
      ctx.fill();

      Cache.props.freightTruck = canvas;
    }

    // AM. Modern Sedan White (50x32, True 2.5D Isometric SE)
    {
      const { canvas, ctx } = createPixelCanvas(50, 32);
      const bx = 25, by = 22;

      ctx.fillStyle = 'rgba(2, 6, 16, 0.4)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 1, 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // White Body (Left/SW face)
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(bx - 15, by - 4);
      ctx.lineTo(bx + 5, by + 6);
      ctx.lineTo(bx + 5, by - 2);
      ctx.lineTo(bx - 15, by - 12);
      ctx.closePath();
      ctx.fill();

      // Front Face (SE)
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(bx + 5, by + 6);
      ctx.lineTo(bx + 16, by + 0.5);
      ctx.lineTo(bx + 16, by - 4);
      ctx.lineTo(bx + 5, by + 1);
      ctx.closePath();
      ctx.fill();

      // Hood & Roof (Top surface)
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(bx - 15, by - 12);
      ctx.lineTo(bx + 5, by - 2);
      ctx.lineTo(bx + 16, by - 7.5);
      ctx.lineTo(bx - 4, by - 17.5);
      ctx.closePath();
      ctx.fill();

      // Greenhouse / Roof Cabin
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(bx - 8, by - 9);
      ctx.lineTo(bx + 3, by - 3.5);
      ctx.lineTo(bx + 8, by - 6);
      ctx.lineTo(bx - 3, by - 11.5);
      ctx.closePath();
      ctx.fill();

      // Slanted Windshield
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(bx + 3, by - 3.5);
      ctx.lineTo(bx + 8, by - 6);
      ctx.lineTo(bx + 12, by - 4);
      ctx.lineTo(bx + 7, by - 1.5);
      ctx.closePath();
      ctx.fill();

      // Headlights & beam
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(bx + 14, by - 2, 2, 2);
      ctx.fillStyle = 'rgba(254, 240, 138, 0.22)';
      ctx.beginPath();
      ctx.moveTo(bx + 16, by - 1);
      ctx.lineTo(bx + 24, by + 3);
      ctx.lineTo(bx + 22, by + 6);
      ctx.closePath();
      ctx.fill();

      // Wheels
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(bx - 8, by - 1, 3, 4.5, -0.4, 0, Math.PI * 2);
      ctx.ellipse(bx + 2, by + 4, 3, 4.5, -0.4, 0, Math.PI * 2);
      ctx.fill();

      Cache.props.carSedanWhite = canvas;
    }

    // AN. Yellow City Taxi (50x34, True 2.5D Isometric SW for Avenida Fênix)
    {
      const { canvas, ctx } = createPixelCanvas(50, 34);
      const bx = 25, by = 22;

      ctx.fillStyle = 'rgba(2, 6, 16, 0.4)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 1, 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Front Face (SW, facing down-left)
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.moveTo(bx - 16, by + 0.5);
      ctx.lineTo(bx - 5, by + 6);
      ctx.lineTo(bx - 5, by + 1);
      ctx.lineTo(bx - 16, by - 4.5);
      ctx.closePath();
      ctx.fill();

      // Side Wall (SE, facing down-right)
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(bx - 5, by + 6);
      ctx.lineTo(bx + 15, by - 4);
      ctx.lineTo(bx + 15, by - 12);
      ctx.lineTo(bx - 5, by - 2);
      ctx.closePath();
      ctx.fill();

      // Hood & Roof (Top surface)
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(bx - 16, by - 4.5);
      ctx.lineTo(bx - 5, by + 1);
      ctx.lineTo(bx + 15, by - 9);
      ctx.lineTo(bx + 4, by - 14.5);
      ctx.closePath();
      ctx.fill();

      // Checkered Taxi Side Stripe
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx - 2, by + 2, 3, 2);
      ctx.fillRect(bx + 4, by - 1, 3, 2);
      ctx.fillRect(bx + 10, by - 4, 3, 2);

      // Cabin Glass (Cyan tinted)
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(bx - 7, by - 2);
      ctx.lineTo(bx - 12, by - 4.5);
      ctx.lineTo(bx - 8, by - 7);
      ctx.lineTo(bx - 3, by - 4.5);
      ctx.closePath();
      ctx.fill();

      // TAXI Rooftop Illuminated Pod
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 6;
      ctx.fillRect(bx + 2, by - 12, 6, 3);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx + 4, by - 11, 2, 1);
      ctx.shadowBlur = 0;

      // Front Headlights & beam pointing SW (down-left)
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(bx - 15, by - 2, 2, 2);
      ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
      ctx.beginPath();
      ctx.moveTo(bx - 16, by - 1);
      ctx.lineTo(bx - 26, by + 4);
      ctx.lineTo(bx - 22, by + 7);
      ctx.closePath();
      ctx.fill();

      // Wheels on SE side
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(bx - 2, by + 4, 3, 4.5, 0.4, 0, Math.PI * 2);
      ctx.ellipse(bx + 8, by - 1, 3, 4.5, 0.4, 0, Math.PI * 2);
      ctx.fill();

      Cache.props.carTaxiYellow = canvas;
    }

    // AO. Emergency Ambulance (56x36, True 2.5D Isometric SE)
    {
      const { canvas, ctx } = createPixelCanvas(56, 36);
      const bx = 28, by = 24;

      ctx.fillStyle = 'rgba(2, 6, 16, 0.45)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 1, 20, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // White Body (SW face)
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.moveTo(bx - 16, by - 5);
      ctx.lineTo(bx + 4, by + 5);
      ctx.lineTo(bx + 4, by - 11);
      ctx.lineTo(bx - 16, by - 21);
      ctx.closePath();
      ctx.fill();

      // White Body (NW rear)
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(bx - 16, by - 5);
      ctx.lineTo(bx - 24, by - 1);
      ctx.lineTo(bx - 24, by - 17);
      ctx.lineTo(bx - 16, by - 21);
      ctx.closePath();
      ctx.fill();

      // White Roof
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(bx - 16, by - 21);
      ctx.lineTo(bx + 4, by - 11);
      ctx.lineTo(bx + 14, by - 16);
      ctx.lineTo(bx - 6, by - 26);
      ctx.closePath();
      ctx.fill();

      // Red Medical Chevrons & Green Cross
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(bx - 14, by - 9);
      ctx.lineTo(bx + 2, by - 0.5);
      ctx.lineTo(bx + 2, by - 3.5);
      ctx.lineTo(bx - 14, by - 12);
      ctx.closePath();
      ctx.fill();

      // Emerald Green Cross on side
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(bx - 7, by - 8, 4, 1.5);
      ctx.fillRect(bx - 5.5, by - 10, 1.5, 5);

      // Cab front (SE)
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(bx + 4, by + 5);
      ctx.lineTo(bx + 16, by - 1);
      ctx.lineTo(bx + 16, by - 7);
      ctx.lineTo(bx + 4, by - 1);
      ctx.closePath();
      ctx.fill();

      // Windshield
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(bx + 4, by - 11);
      ctx.lineTo(bx + 12, by - 15);
      ctx.lineTo(bx + 16, by - 7);
      ctx.lineTo(bx + 4, by - 3);
      ctx.closePath();
      ctx.fill();

      // Emergency Rooftop Flashing Lightbars (Blue & Red)
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      ctx.fillRect(bx - 4, by - 23, 3, 2);
      ctx.fillStyle = '#3b82f6';
      ctx.shadowColor = '#3b82f6';
      ctx.fillRect(bx, by - 21, 3, 2);
      ctx.shadowBlur = 0;

      // Headlights & beam
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(bx + 14, by - 3, 2, 2);
      ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
      ctx.beginPath();
      ctx.moveTo(bx + 16, by - 2);
      ctx.lineTo(bx + 26, by + 3);
      ctx.lineTo(bx + 23, by + 7);
      ctx.closePath();
      ctx.fill();

      // Wheels
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(bx - 8, by + 1, 3.5, 4.5, -0.4, 0, Math.PI * 2);
      ctx.ellipse(bx + 2, by + 6, 3.5, 4.5, -0.4, 0, Math.PI * 2);
      ctx.fill();

      Cache.props.ambulance = canvas;
    }

    // AP. Security Police Cruiser (50x34, True 2.5D Isometric SW for West Blvd)
    {
      const { canvas, ctx } = createPixelCanvas(50, 34);
      const bx = 25, by = 22;

      ctx.fillStyle = 'rgba(2, 6, 16, 0.4)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 1, 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Front Face (SW, facing down-left)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(bx - 16, by + 0.5);
      ctx.lineTo(bx - 5, by + 6);
      ctx.lineTo(bx - 5, by + 1);
      ctx.lineTo(bx - 16, by - 4.5);
      ctx.closePath();
      ctx.fill();

      // Side Wall (SE, facing down-right) — Black & White Doors
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(bx - 5, by + 6);
      ctx.lineTo(bx + 15, by - 4);
      ctx.lineTo(bx + 15, by - 12);
      ctx.lineTo(bx - 5, by - 2);
      ctx.closePath();
      ctx.fill();

      // White Door Infill
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(bx - 1, by + 1, 8, 4);

      // Hood & Roof
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(bx - 16, by - 4.5);
      ctx.lineTo(bx - 5, by + 1);
      ctx.lineTo(bx + 15, by - 9);
      ctx.lineTo(bx + 4, by - 14.5);
      ctx.closePath();
      ctx.fill();

      // Windshield
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(bx - 7, by - 2);
      ctx.lineTo(bx - 12, by - 4.5);
      ctx.lineTo(bx - 8, by - 7);
      ctx.lineTo(bx - 3, by - 4.5);
      ctx.closePath();
      ctx.fill();

      // Flashing Rooftop Police Lightbar (Red & Blue)
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      ctx.fillRect(bx + 1, by - 13, 3, 2);
      ctx.fillStyle = '#3b82f6';
      ctx.shadowColor = '#3b82f6';
      ctx.fillRect(bx + 5, by - 11, 3, 2);
      ctx.shadowBlur = 0;

      // Headlights & beam pointing SW
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(bx - 15, by - 2, 2, 2);
      ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
      ctx.beginPath();
      ctx.moveTo(bx - 16, by - 1);
      ctx.lineTo(bx - 26, by + 4);
      ctx.lineTo(bx - 22, by + 7);
      ctx.closePath();
      ctx.fill();

      // Wheels on SE side
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(bx - 2, by + 4, 3, 4.5, 0.4, 0, Math.PI * 2);
      ctx.ellipse(bx + 8, by - 1, 3, 4.5, 0.4, 0, Math.PI * 2);
      ctx.fill();

      Cache.props.policeCruiser = canvas;
    }

    // AQ. Industrial Forklift (38x32, True 2.5D Isometric SE)
    {
      const { canvas, ctx } = createPixelCanvas(38, 32);
      const bx = 19, by = 24;

      ctx.fillStyle = 'rgba(2, 6, 16, 0.45)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 1, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Orange Counterweight Chassis (SW face)
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(bx - 12, by - 3);
      ctx.lineTo(bx + 2, by + 4);
      ctx.lineTo(bx + 2, by - 4);
      ctx.lineTo(bx - 12, by - 11);
      ctx.closePath();
      ctx.fill();

      // Overhead Roll Cage
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx - 7, by - 18, 10, 12);

      // Hydraulic Mast & Fork Prongs
      ctx.fillStyle = '#334155';
      ctx.fillRect(bx + 4, by - 18, 3, 18);
      // Prongs extending forward (SE)
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(bx + 5, by + 3);
      ctx.lineTo(bx + 14, by - 1.5);
      ctx.lineTo(bx + 14, by - 3.5);
      ctx.lineTo(bx + 5, by + 1);
      ctx.closePath();
      ctx.fill();

      // Heavy duty wheels
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(bx - 7, by - 1, 3, 4, -0.4, 0, Math.PI * 2);
      ctx.ellipse(bx + 1, by + 3, 3, 4, -0.4, 0, Math.PI * 2);
      ctx.fill();

      Cache.props.forklift = canvas;
    }

    // F. Mailbox
    {
      const { canvas, ctx } = createPixelCanvas(20, 30);
      const bx = 10, by = 24;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(bx, by+2, 6, 3, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#1e3a8a'; ctx.fillRect(bx-4, by-10, 8, 12);
      ctx.fillStyle = '#dc2626'; ctx.fillRect(bx-4, by-14, 8, 4);
      ctx.beginPath(); ctx.arc(bx, by-14, 4, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#9ca3af'; ctx.fillRect(bx-1, by, 2, 4);
      Cache.props.mailbox = canvas;
    }
    // G. Newsstand
    {
      const { canvas, ctx } = createPixelCanvas(36, 40);
      const bx = 18, by = 34;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(bx, by+2, 12, 5, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#374151'; ctx.fillRect(bx-10, by-20, 20, 22);
      ctx.fillStyle = '#fcd34d'; ctx.fillRect(bx-12, by-24, 24, 6);
      ctx.fillStyle = '#ef4444'; ctx.fillRect(bx-6, by-24, 4, 6); ctx.fillRect(bx+2, by-24, 4, 6);
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(bx-8, by-14, 4, 6); ctx.fillRect(bx-3, by-14, 4, 6); ctx.fillRect(bx+2, by-14, 4, 6);
      Cache.props.newsstand = canvas;
    }
    // H. Vending Machine
    {
      const { canvas, ctx } = createPixelCanvas(24, 40);
      const bx = 12, by = 34;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(bx, by+2, 8, 4, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#ef4444'; ctx.fillRect(bx-7, by-26, 14, 28);
      ctx.fillStyle = '#0284c7'; ctx.fillRect(bx-5, by-24, 10, 16);
      ctx.fillStyle = '#0f172a'; ctx.fillRect(bx-2, by-6, 4, 4);
      Cache.props.vendingMachine = canvas;
    }
    // I. Dumpster
    {
      const { canvas, ctx } = createPixelCanvas(30, 24);
      const bx = 15, by = 18;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(bx, by+2, 12, 5, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#166534'; ctx.fillRect(bx-10, by-10, 20, 12);
      ctx.fillStyle = '#14532d'; ctx.fillRect(bx-10, by-12, 20, 2);
      Cache.props.dumpster = canvas;
    }
    // J. Phone Booth
    {
      const { canvas, ctx } = createPixelCanvas(20, 40);
      const bx = 10, by = 34;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(bx, by+2, 6, 3, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#dc2626'; ctx.fillRect(bx-5, by-30, 10, 32);
      ctx.fillStyle = '#9ca3af'; ctx.fillRect(bx-4, by-26, 8, 16);
      Cache.props.phoneBooth = canvas;
    }
    // K. Bus Stop
    {
      const { canvas, ctx } = createPixelCanvas(40, 40);
      const bx = 20, by = 34;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(bx, by+2, 14, 5, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#9ca3af'; ctx.fillRect(bx-14, by-20, 2, 22); ctx.fillRect(bx+12, by-20, 2, 22);
      ctx.fillStyle = '#475569'; ctx.fillRect(bx-16, by-22, 32, 4);
      ctx.fillStyle = '#78350f'; ctx.fillRect(bx-8, by-6, 16, 2);
      Cache.props.busStop = canvas;
    }

  }

  // ── 4. WORKSTATIONS & TECH FURNITURE ─────────────────────────
  function initWorkstations() {
    // A. Dual-Monitor Developer Workstation (64x46)
    // Sized so character seated at workstation aligns waist with desk surface (~20px high)
    {
      const { canvas, ctx } = createPixelCanvas(64, 46);
      const bx = 32, by = 36;

      // Ground shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 4, 22, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ergonomic mesh chair (placed just behind desk in isometric depth)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx - 7, by - 10, 14, 10); // seat cushion
      ctx.fillStyle = '#334155';
      ctx.fillRect(bx - 6, by - 9, 12, 8);
      // Backrest
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx - 8, by - 22, 16, 11);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx - 7, by - 21, 14, 9);

      // Desk steel legs
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(16, by - 8, 3, 11);
      ctx.fillRect(45, by - 8, 3, 11);
      ctx.fillRect(17, by - 1, 30, 2); // foot bar

      // Walnut desk top (isometric diamond slab)
      ctx.fillStyle = PALETTE.deskWoodDark;
      ctx.beginPath();
      ctx.moveTo(14, by - 10); ctx.lineTo(32, by - 2); ctx.lineTo(50, by - 10);
      ctx.lineTo(50, by - 7); ctx.lineTo(32, by + 1); ctx.lineTo(14, by - 7);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = PALETTE.deskWood;
      ctx.beginPath();
      ctx.moveTo(32, by - 17); ctx.lineTo(50, by - 10); ctx.lineTo(32, by - 2); ctx.lineTo(14, by - 10);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = PALETTE.deskSurface;
      ctx.beginPath();
      ctx.moveTo(32, by - 17); ctx.lineTo(48, by - 11); ctx.lineTo(32, by - 4); ctx.lineTo(16, by - 11);
      ctx.closePath(); ctx.fill();

      // Monitor Stand 1 & 2
      ctx.fillStyle = '#334155';
      ctx.fillRect(23, by - 17, 2, 6);
      ctx.fillRect(39, by - 17, 2, 6);

      // Monitor 1 (Left: Code Screen with multi-colored syntax highlighting)
      ctx.fillStyle = PALETTE.monitorBezel;
      ctx.fillRect(15, by - 30, 16, 13);
      ctx.fillStyle = '#070c18';
      ctx.fillRect(16, by - 29, 14, 11);
      // Syntax lines
      ctx.fillStyle = '#22c55e'; ctx.fillRect(17, by - 27, 6, 1);
      ctx.fillStyle = '#38bdf8'; ctx.fillRect(17, by - 25, 9, 1);
      ctx.fillStyle = '#fbbf24'; ctx.fillRect(19, by - 23, 8, 1);
      ctx.fillStyle = '#f43f5e'; ctx.fillRect(19, by - 21, 5, 1);
      ctx.fillStyle = '#38bdf8'; ctx.fillRect(17, by - 19, 11, 1);

      // Monitor 2 (Right: Telemetry Waveform screen)
      ctx.fillStyle = PALETTE.monitorBezel;
      ctx.fillRect(33, by - 30, 16, 13);
      ctx.fillStyle = '#070c18';
      ctx.fillRect(34, by - 29, 14, 11);
      // Waveform line
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(35, by - 25, 3, 1);
      ctx.fillRect(38, by - 27, 3, 1);
      ctx.fillRect(41, by - 23, 3, 1);
      ctx.fillRect(44, by - 26, 3, 1);

      // Mechanical Keyboard with RGB Underglow
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(26, by - 8, 11, 4);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(27, by - 7, 9, 1); // spacebar glow

      // Mouse & pad
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(39, by - 7, 3, 3);

      // Coffee Mug with Steam
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(17, by - 7, 3, 3);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(18, by - 10, 1, 2);

      Cache.workstations.devDesk = canvas;
    }

    // B. 42U Datacenter Server Rack (40x68)
    {
      const { canvas, ctx } = createPixelCanvas(40, 68);
      const bx = 20, by = 60;

      // Contact shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 17, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Main Steel Chassis
      ctx.fillStyle = '#07090e';
      ctx.fillRect(8, by - 52, 24, 52);
      ctx.fillStyle = '#161d2b';
      ctx.fillRect(9, by - 51, 22, 50);

      // 6 Blade Servers
      for (let i = 0; i < 6; i++) {
        const sy = by - 48 + i * 8;
        ctx.fillStyle = '#090d16';
        ctx.fillRect(10, sy, 20, 6);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(11, sy + 1, 18, 1);

        // Blinking Status LEDs
        ctx.fillStyle = '#22c55e'; // Green OK
        ctx.fillRect(12, sy + 3, 2, 2);
        ctx.fillStyle = '#f59e0b'; // Amber Activity
        ctx.fillRect(16, sy + 3, 2, 2);
        ctx.fillStyle = '#38bdf8'; // Blue Query
        ctx.fillRect(20, sy + 3, 2, 2);
      }

      // Top status beacon strip
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(8, by - 54, 24, 2);

      Cache.workstations.serverRack = canvas;
    }

    // C. War Room Conference Table (96x64)
    {
      const { canvas, ctx } = createPixelCanvas(96, 64);
      const bx = 48, by = 46;

      // Soft ground shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 4, 38, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Chairs behind table (3 swivel chairs)
      for (let i = -1; i <= 1; i++) {
        const cx = bx + i * 24;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(cx - 5, by - 26, 10, 8); // backrest
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(cx - 4, by - 25, 8, 6);
        ctx.fillStyle = '#334155';
        ctx.fillRect(cx - 1, by - 18, 2, 6); // post
      }

      // Conference Table Body (Polished dark walnut isometric diamond)
      ctx.fillStyle = '#1e1611'; // shadow face
      ctx.beginPath();
      ctx.moveTo(bx - 36, by - 10);
      ctx.lineTo(bx, by + 2);
      ctx.lineTo(bx + 36, by - 10);
      ctx.lineTo(bx + 36, by - 6);
      ctx.lineTo(bx, by + 6);
      ctx.lineTo(bx - 36, by - 6);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#3e2723'; // main wood slab
      ctx.beginPath();
      ctx.moveTo(bx, by - 20);
      ctx.lineTo(bx + 36, by - 10);
      ctx.lineTo(bx, by + 2);
      ctx.lineTo(bx - 36, by - 10);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#4e342e'; // glossy top surface
      ctx.beginPath();
      ctx.moveTo(bx, by - 19);
      ctx.lineTo(bx + 34, by - 10);
      ctx.lineTo(bx, by + 1);
      ctx.lineTo(bx - 34, by - 10);
      ctx.closePath();
      ctx.fill();

      // Center conference mic/speaker pod with LED
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.ellipse(bx, by - 9, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(bx - 1, by - 10, 2, 2);

      // Laptop 1 (Left)
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(bx - 22, by - 14, 8, 6);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(bx - 21, by - 13, 6, 4);

      // Laptop 2 (Right)
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(bx + 14, by - 14, 8, 6);
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(bx + 15, by - 13, 6, 4);

      // Architecture Blueprint papers
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(bx - 10, by - 13, 8, 5);
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(bx - 9, by - 12, 6, 1);
      ctx.fillRect(bx - 9, by - 10, 4, 1);

      // Chairs in front of table (3 swivel chairs)
      for (let i = -1; i <= 1; i++) {
        const cx = bx + i * 24;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(cx - 5, by - 3, 10, 7); // seat
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(cx - 4, by - 2, 8, 5);
      }

      Cache.workstations.conferenceTable = canvas;
    }

    // D. Architecture Planning Whiteboard (64x56)
    {
      const { canvas, ctx } = createPixelCanvas(64, 56);
      const bx = 32, by = 48;

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 1, 24, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Aluminum rolling stand legs
      ctx.fillStyle = '#475569';
      ctx.fillRect(bx - 22, by - 12, 3, 14);
      ctx.fillRect(bx + 19, by - 12, 3, 14);
      ctx.fillRect(bx - 25, by + 1, 9, 2); // feet
      ctx.fillRect(bx + 16, by + 1, 9, 2);
      ctx.fillStyle = '#0f172a'; // casters
      ctx.fillRect(bx - 25, by + 2, 2, 2);
      ctx.fillRect(bx - 18, by + 2, 2, 2);
      ctx.fillRect(bx + 16, by + 2, 2, 2);
      ctx.fillRect(bx + 23, by + 2, 2, 2);

      // Main Whiteboard Frame
      ctx.fillStyle = '#334155';
      ctx.fillRect(bx - 24, by - 44, 48, 34);

      // Whiteboard Surface
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(bx - 22, by - 42, 44, 30);

      // Architecture System Diagram Drawn on Whiteboard
      ctx.fillStyle = '#0284c7'; // Box 1 (Core)
      ctx.strokeRect ? ctx.strokeRect(bx - 18, by - 38, 10, 8) : ctx.fillRect(bx - 18, by - 38, 10, 1);
      ctx.fillRect(bx - 18, by - 38, 10, 1);
      ctx.fillRect(bx - 18, by - 31, 10, 1);
      ctx.fillRect(bx - 18, by - 38, 1, 8);
      ctx.fillRect(bx - 9, by - 38, 1, 8);

      // Arrow ->
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(bx - 7, by - 34, 6, 1);
      ctx.fillRect(bx - 3, by - 35, 1, 3);

      // Box 2 (Agents)
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(bx + 1, by - 38, 10, 1);
      ctx.fillRect(bx + 1, by - 31, 10, 1);
      ctx.fillRect(bx + 1, by - 38, 1, 8);
      ctx.fillRect(bx + 10, by - 38, 1, 8);

      // Database Cylinder sketch below
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(bx - 9, by - 26, 8, 8);
      ctx.fillRect(bx - 9, by - 26, 8, 2);

      // Colorful sticky notes
      ctx.fillStyle = '#fef08a'; // yellow
      ctx.fillRect(bx + 13, by - 40, 4, 4);
      ctx.fillStyle = '#fbcfe8'; // pink
      ctx.fillRect(bx + 13, by - 34, 4, 4);
      ctx.fillStyle = '#bbf7d0'; // green
      ctx.fillRect(bx + 13, by - 28, 4, 4);

      // Marker tray with markers
      ctx.fillStyle = '#64748b';
      ctx.fillRect(bx - 20, by - 12, 40, 2);
      ctx.fillStyle = '#ef4444'; ctx.fillRect(bx - 14, by - 14, 4, 1); // red marker
      ctx.fillStyle = '#0284c7'; ctx.fillRect(bx - 8, by - 14, 4, 1);  // blue marker
      ctx.fillStyle = '#22c55e'; ctx.fillRect(bx - 2, by - 14, 4, 1);  // green marker
      ctx.fillStyle = '#0f172a'; ctx.fillRect(bx + 6, by - 14, 5, 2);  // eraser

      Cache.workstations.whiteboard = canvas;
    }

    // E. Breakroom Espresso Bar & Coffee Machine (52x52)
    {
      const { canvas, ctx } = createPixelCanvas(52, 52);
      const bx = 26, by = 44;

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 20, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wooden counter base
      ctx.fillStyle = '#271b12';
      ctx.fillRect(bx - 18, by - 20, 36, 20);
      ctx.fillStyle = '#3e2723';
      ctx.fillRect(bx - 17, by - 19, 34, 18);
      ctx.fillStyle = '#d97706'; // brass footrail
      ctx.fillRect(bx - 17, by - 3, 34, 2);

      // Countertop (White Marble / Quartz slab)
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(bx - 20, by - 23, 40, 4);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(bx - 19, by - 23, 38, 2);

      // Professional 2-Group Espresso Machine (Chrome / Stainless Steel)
      ctx.fillStyle = '#475569';
      ctx.fillRect(bx - 12, by - 38, 24, 15);
      ctx.fillStyle = '#94a3b8'; // chrome highlights
      ctx.fillRect(bx - 11, by - 37, 22, 13);

      // Pressure gauges & buttons
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(bx - 8, by - 35, 2, 2);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(bx - 4, by - 35, 2, 2);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(bx, by - 35, 2, 2);

      // Portafilters & group heads
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx - 7, by - 27, 4, 3);
      ctx.fillRect(bx + 3, by - 27, 4, 3);

      // Coffee Bean Hopper (translucent top)
      ctx.fillStyle = '#b45309';
      ctx.fillRect(bx - 6, by - 42, 12, 5);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(bx - 4, by - 41, 8, 3);

      // Fresh Ceramic Coffee Mug with Steam
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx + 11, by - 26, 4, 4);
      ctx.fillStyle = '#78350f'; // espresso liquid
      ctx.fillRect(bx + 12, by - 25, 2, 1);
      // Steam
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fillRect(bx + 12, by - 29, 1, 2);
      ctx.fillRect(bx + 13, by - 31, 1, 2);

      Cache.workstations.coffeeBar = canvas;
    }

    // F. Office Water Cooler (32x50)
    {
      const { canvas, ctx } = createPixelCanvas(32, 50);
      const bx = 16, by = 44;

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Base Dispenser Stand
      ctx.fillStyle = '#334155';
      ctx.fillRect(bx - 8, by - 26, 16, 26);
      ctx.fillStyle = '#e2e8f0'; // crisp white body
      ctx.fillRect(bx - 7, by - 25, 14, 24);

      // Dispense Niche
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx - 5, by - 18, 10, 8);

      // Hot (Red) & Cold (Cyan) Taps
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(bx - 3, by - 17, 2, 2);
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(bx + 1, by - 17, 2, 2);

      // Inverted 5-Gallon Water Bottle (Semi-transparent cyan)
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(bx - 6, by - 38, 12, 12);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(bx - 5, by - 37, 10, 10);
      // Water level line & reflection highlight
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(bx - 4, by - 35, 3, 7);
      // Internal air bubble
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx + 1, by - 32, 2, 2);

      // Paper cup dispenser on the side
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(bx + 7, by - 24, 3, 14);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx + 7, by - 22, 3, 2); // cup lip

      Cache.workstations.waterCooler = canvas;
    }

    // G. Glass Kanban Sprint Mission Board (64x52)
    {
      const { canvas, ctx } = createPixelCanvas(64, 52);
      const bx = 32, by = 46;

      // Contact shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 24, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Steel stand legs
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx - 20, by - 12, 3, 14);
      ctx.fillRect(bx + 17, by - 12, 3, 14);
      // Wheels
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx - 21, by + 1, 5, 2);
      ctx.fillRect(bx + 16, by + 1, 5, 2);

      // Glass board frosted slab
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fillRect(bx - 26, by - 44, 52, 32);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx - 26, by - 44, 52, 32);

      // Header bar
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(bx - 25, by - 43, 50, 6);
      ctx.fillStyle = '#ffffff';
      ctx.font = '6px monospace';
      ctx.fillText('SPRINT MISSIONS', bx - 22, by - 38);

      // 3 Columns (TODO, DOING, DONE)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.beginPath();
      ctx.moveTo(bx - 9, by - 37); ctx.lineTo(bx - 9, by - 14);
      ctx.moveTo(bx + 8, by - 37); ctx.lineTo(bx + 8, by - 14);
      ctx.stroke();

      // Post-it task notes
      // Col 1 (TODO): Pink & Yellow cards
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(bx - 22, by - 34, 10, 6);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(bx - 22, by - 26, 10, 6);

      // Col 2 (DOING): Cyan cards
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(bx - 6, by - 34, 11, 7);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(bx - 6, by - 24, 11, 6);

      // Col 3 (DONE): Green cards
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(bx + 11, by - 34, 11, 6);
      ctx.fillRect(bx + 11, by - 25, 11, 6);

      Cache.workstations.kanbanBoard = canvas;
    }

    // H. Steel Filing Cabinet (28x40)
    {
      const { canvas, ctx } = createPixelCanvas(28, 40);
      const bx = 14, by = 34;

      // Ground shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cabinet steel body
      ctx.fillStyle = '#334155';
      ctx.fillRect(bx - 9, by - 28, 18, 28);
      ctx.fillStyle = '#475569';
      ctx.fillRect(bx - 8, by - 27, 16, 26);

      // 3 Drawers with handles and label holders
      for (let i = 0; i < 3; i++) {
        const dy = by - 25 + i * 8;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(bx - 7, dy, 14, 7);
        ctx.fillStyle = '#334155';
        ctx.fillRect(bx - 6, dy + 1, 12, 5);

        // Brass handle
        ctx.fillStyle = '#d97706';
        ctx.fillRect(bx - 2, dy + 3, 4, 1);

        // Label card
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(bx - 5, dy + 2, 2, 2);
      }

      Cache.workstations.filingCabinet = canvas;
    }

    // I. Playwright Headless QA Display Monitor (48x44)
    {
      const { canvas, ctx } = createPixelCanvas(48, 44);
      const bx = 24, by = 38;

      // Stand & base
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx - 8, by - 2, 16, 3);
      ctx.fillRect(bx - 2, by - 12, 4, 10);

      // Large 55-inch display frame
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx - 20, by - 36, 40, 24);
      ctx.fillStyle = '#050811';
      ctx.fillRect(bx - 19, by - 35, 38, 22);

      // Browser UI Header
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx - 19, by - 35, 38, 5);
      // Window dots (red, yellow, green)
      ctx.fillStyle = '#ef4444'; ctx.fillRect(bx - 17, by - 33, 2, 2);
      ctx.fillStyle = '#eab308'; ctx.fillRect(bx - 14, by - 33, 2, 2);
      ctx.fillStyle = '#22c55e'; ctx.fillRect(bx - 11, by - 33, 2, 2);

      // Test pass ribbon & waveform
      ctx.fillStyle = '#10b981';
      ctx.fillRect(bx - 16, by - 27, 32, 4);
      ctx.fillStyle = '#ffffff';
      ctx.font = '5px monospace';
      ctx.fillText('PLAYWRIGHT E2E', bx - 14, by - 24);

      // Code execution lines
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(bx - 16, by - 21, 20, 2);
      ctx.fillRect(bx - 16, by - 17, 26, 2);

      Cache.workstations.browserMonitor = canvas;
    }
  }

  // ── 4B. PROCEDURAL ARCHITECTURAL FLOORS ───────────────────────
  function initArchitecturalFloors() {
    // 1. Herringbone Parquet (64x32)
    {
      const { canvas, ctx } = createPixelCanvas(TILE_W, TILE_H);
      ctx.fillStyle = '#542d05';
      ctx.beginPath();
      ctx.moveTo(32, 0); ctx.lineTo(64, 16); ctx.lineTo(32, 32); ctx.lineTo(0, 16);
      ctx.closePath(); ctx.fill();

      // Slats in herringbone pattern
      const colors = ['#78350f', '#92400e', '#b45309', '#a16207'];
      for (let y = 3; y < 29; y += 4) {
        for (let x = 6; x < 58; x += 8) {
          // Point inside diamond check
          const normY = Math.abs(y - 16) / 16;
          const minX = 32 * normY;
          const maxX = 64 - minX;
          if (x >= minX && x + 6 <= maxX) {
            ctx.fillStyle = colors[(x * 3 + y * 7) % colors.length];
            ctx.fillRect(x, y, 7, 3);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.fillRect(x, y + 2, 7, 1); // slat seam
          }
        }
      }
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(32, 0); ctx.lineTo(64, 16); ctx.lineTo(32, 32); ctx.lineTo(0, 16);
      ctx.closePath(); ctx.stroke();
      Cache.floors.parquet = canvas;
    }

    // 2. Industrial Slate Tile (64x32)
    {
      const { canvas, ctx } = createPixelCanvas(TILE_W, TILE_H);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(32, 0); ctx.lineTo(64, 16); ctx.lineTo(32, 32); ctx.lineTo(0, 16);
      ctx.closePath(); ctx.fill();

      // 4 quadrant slate stone slabs with beveled joints
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(16, 8); ctx.lineTo(48, 24);
      ctx.moveTo(48, 8); ctx.lineTo(16, 24);
      ctx.stroke();

      // Subtle stone speckles
      ctx.fillStyle = '#1e293b';
      const speckles = [[24, 10], [36, 12], [28, 20], [40, 22], [18, 16], [46, 16]];
      for (const [sx, sy] of speckles) {
        ctx.fillRect(sx, sy, 3, 2);
      }

      ctx.strokeStyle = '#1e293b';
      ctx.strokeRect(0, 0, 64, 32);
      Cache.floors.slate = canvas;
    }

    // 3. Acoustic Navy Carpet (64x32)
    {
      const { canvas, ctx } = createPixelCanvas(TILE_W, TILE_H);
      ctx.fillStyle = '#172554';
      ctx.beginPath();
      ctx.moveTo(32, 0); ctx.lineTo(64, 16); ctx.lineTo(32, 32); ctx.lineTo(0, 16);
      ctx.closePath(); ctx.fill();

      // Carpet cross-weave microtexture
      ctx.fillStyle = '#1e1b4b';
      for (let y = 4; y < 28; y += 3) {
        for (let x = 8; x < 56; x += 4) {
          const normY = Math.abs(y - 16) / 16;
          if (x >= 32 * normY && x <= 64 - 32 * normY) {
            ctx.fillRect(x, y, 2, 1);
          }
        }
      }
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(32, 0); ctx.lineTo(64, 16); ctx.lineTo(32, 32); ctx.lineTo(0, 16);
      ctx.closePath(); ctx.stroke();
      Cache.floors.carpet = canvas;
    }

    // 4. Obsidian Polished Marble (64x32)
    {
      const { canvas, ctx } = createPixelCanvas(TILE_W, TILE_H);
      ctx.fillStyle = '#030712';
      ctx.beginPath();
      ctx.moveTo(32, 0); ctx.lineTo(64, 16); ctx.lineTo(32, 32); ctx.lineTo(0, 16);
      ctx.closePath(); ctx.fill();

      // Gloss specular diagonal reflection
      ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.beginPath();
      ctx.moveTo(20, 6); ctx.lineTo(44, 18); ctx.lineTo(38, 22); ctx.lineTo(14, 10);
      ctx.closePath(); ctx.fill();

      // Gold/Cyan marble veining
      ctx.strokeStyle = 'rgba(0, 217, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(32, 4); ctx.lineTo(48, 16); ctx.lineTo(36, 26);
      ctx.stroke();

      ctx.strokeStyle = '#1f2937';
      ctx.strokeRect(0, 0, 64, 32);
      Cache.floors.marble = canvas;
    }

    // 5. Titanium Cleanroom Floor (64x32)
    {
      const { canvas, ctx } = createPixelCanvas(TILE_W, TILE_H);
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(32, 0); ctx.lineTo(64, 16); ctx.lineTo(32, 32); ctx.lineTo(0, 16);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(32, 2); ctx.lineTo(60, 16); ctx.lineTo(32, 30); ctx.lineTo(4, 16);
      ctx.closePath(); ctx.fill();

      // Cyan LED seam lines
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(22, 11); ctx.lineTo(42, 21);
      ctx.moveTo(42, 11); ctx.lineTo(22, 21);
      ctx.stroke();

      Cache.floors.cleanroom = canvas;
    }
  }

  // ── 4C. CUTAWAY WALLS WITH SKYLINE WINDOWS ────────────────────
  function initCutawayWalls() {
    // Left Cutaway Wall (80x88)
    {
      const { canvas, ctx } = createPixelCanvas(80, 88);
      // Isometric back-left wall
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(0, 40); ctx.lineTo(40, 20); ctx.lineTo(40, 84); ctx.lineTo(0, 88);
      ctx.closePath(); ctx.fill();

      // Inner wall plaster
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(4, 42); ctx.lineTo(38, 24); ctx.lineTo(38, 80); ctx.lineTo(4, 84);
      ctx.closePath(); ctx.fill();

      // Large multi-pane window with view of city skyline
      ctx.fillStyle = '#020617';
      ctx.fillRect(8, 32, 24, 28);

      // Distant illuminated skyscrapers in window view
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(10, 42, 6, 18);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(18, 38, 7, 22);
      ctx.fillRect(26, 44, 5, 16);

      // Distant lit windows
      ctx.fillStyle = '#facc15';
      ctx.fillRect(12, 46, 2, 2);
      ctx.fillRect(20, 42, 2, 2);
      ctx.fillRect(22, 48, 2, 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(20, 52, 2, 2);
      ctx.fillRect(28, 48, 2, 2);

      // Window mullions & frame
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(8, 32, 24, 28);
      ctx.beginPath();
      ctx.moveTo(20, 32); ctx.lineTo(20, 60);
      ctx.moveTo(8, 46); ctx.lineTo(32, 46);
      ctx.stroke();

      // Warm wall sconce light
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(34, 30, 3, 5);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
      ctx.beginPath();
      ctx.arc(35, 32, 10, 0, Math.PI * 2);
      ctx.fill();

      Cache.cutaways.wallL = canvas;
    }

    // Right Cutaway Wall (80x88)
    {
      const { canvas, ctx } = createPixelCanvas(80, 88);
      // Isometric back-right wall
      ctx.fillStyle = '#0b0f19';
      ctx.beginPath();
      ctx.moveTo(40, 20); ctx.lineTo(80, 40); ctx.lineTo(80, 88); ctx.lineTo(40, 84);
      ctx.closePath(); ctx.fill();

      // Inner wall plaster
      ctx.fillStyle = '#161f30';
      ctx.beginPath();
      ctx.moveTo(42, 24); ctx.lineTo(76, 42); ctx.lineTo(76, 84); ctx.lineTo(42, 80);
      ctx.closePath(); ctx.fill();

      // Framed Architecture Schematic on wall
      ctx.fillStyle = '#0a192f';
      ctx.fillRect(48, 34, 24, 20);
      ctx.strokeStyle = '#00d9ff';
      ctx.lineWidth = 1;
      ctx.strokeRect(48, 34, 24, 20);

      // Schematic DAG nodes & wires
      ctx.fillStyle = '#00d9ff';
      ctx.fillRect(52, 40, 3, 3);
      ctx.fillRect(66, 38, 3, 3);
      ctx.fillRect(60, 48, 3, 3);
      ctx.strokeStyle = 'rgba(0, 217, 255, 0.5)';
      ctx.beginPath();
      ctx.moveTo(55, 41); ctx.lineTo(66, 39);
      ctx.moveTo(55, 41); ctx.lineTo(60, 49);
      ctx.stroke();

      Cache.cutaways.wallR = canvas;
    }
  }

  // ── 5. BUILDINGS (3 CANONICAL PIXEL ART MASTERPIECES) ──────────
  function initBuildings() {
    // ─────────────────────────────────────────────────────────────
    // BUILDING 1: FÊNIX CENTRAL HQ (Obsidian Command Spire) (160x175)
    // ─────────────────────────────────────────────────────────────
    {
      const { canvas, ctx } = createPixelCanvas(160, 175);
      const bx = 80, by = 150;

      // Contact shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 4, 62, 24, 0, 0, Math.PI * 2);
      ctx.fill();

      // Granite foundation base steps
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(bx - 56, by - 12); ctx.lineTo(bx, by + 16); ctx.lineTo(bx + 56, by - 12);
      ctx.lineTo(bx + 56, by - 6); ctx.lineTo(bx, by + 22); ctx.lineTo(bx - 56, by - 6);
      ctx.closePath(); ctx.fill();

      // Main Obsidian Glass Tower Walls
      // Left Wall (Facing SW)
      ctx.fillStyle = PALETTE.obsidianDark;
      ctx.beginPath();
      ctx.moveTo(bx - 48, by - 8); ctx.lineTo(bx, by + 16);
      ctx.lineTo(bx, by - 102); ctx.lineTo(bx - 48, by - 126);
      ctx.closePath(); ctx.fill();

      // Right Wall (Facing SE)
      ctx.fillStyle = PALETTE.obsidianBase;
      ctx.beginPath();
      ctx.moveTo(bx, by + 16); ctx.lineTo(bx + 48, by - 8);
      ctx.lineTo(bx + 48, by - 126); ctx.lineTo(bx, by - 102);
      ctx.closePath(); ctx.fill();

      // Vertical mullion corner line
      ctx.strokeStyle = PALETTE.obsidianTrim;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx, by + 16); ctx.lineTo(bx, by - 102);
      ctx.stroke();

      // Left Wall Windows (Tinted glass bands with warm internal lights)
      for (let floor = 0; floor < 4; floor++) {
        const fy = by - 20 - floor * 24;
        ctx.fillStyle = '#0369a1';
        ctx.beginPath();
        ctx.moveTo(bx - 40, fy - 6); ctx.lineTo(bx - 8, fy + 10);
        ctx.lineTo(bx - 8, fy + 4); ctx.lineTo(bx - 40, fy - 12);
        ctx.closePath(); ctx.fill();

        // Warm office interior glow
        ctx.fillStyle = PALETTE.glassInteriorWarm;
        ctx.beginPath();
        ctx.moveTo(bx - 36, fy - 5); ctx.lineTo(bx - 12, fy + 7);
        ctx.lineTo(bx - 12, fy + 5); ctx.lineTo(bx - 36, fy - 7);
        ctx.closePath(); ctx.fill();
      }

      // Right Wall Windows (Lit panoramic glass panels)
      for (let floor = 0; floor < 4; floor++) {
        const fy = by - 20 - floor * 24;
        ctx.fillStyle = PALETTE.glassLit;
        ctx.beginPath();
        ctx.moveTo(bx + 8, fy + 10); ctx.lineTo(bx + 40, fy - 6);
        ctx.lineTo(bx + 40, fy - 12); ctx.lineTo(bx + 8, fy + 4);
        ctx.closePath(); ctx.fill();

        // Window mullions
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx + 24, fy + 2); ctx.lineTo(bx + 24, fy - 8);
        ctx.stroke();
      }

      // Ground Floor Grand Entrance Lobby (Double glass doors)
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(bx - 14, by + 2); ctx.lineTo(bx + 14, by - 12);
      ctx.lineTo(bx + 14, by + 6); ctx.lineTo(bx - 14, by + 20);
      ctx.closePath(); ctx.fill();

      // Revolving door frame
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Entrance Canopy
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(bx - 20, by - 4); ctx.lineTo(bx + 20, by - 24);
      ctx.lineTo(bx + 24, by - 20); ctx.lineTo(bx - 16, by);
      ctx.closePath(); ctx.fill();

      // Flat Rooftop with Parapet
      ctx.fillStyle = '#161f30';
      ctx.beginPath();
      ctx.moveTo(bx, by - 102); ctx.lineTo(bx + 48, by - 126);
      ctx.lineTo(bx, by - 150); ctx.lineTo(bx - 48, by - 126);
      ctx.closePath(); ctx.fill();

      // Rooftop HVAC Chiller Unit
      ctx.fillStyle = '#334155';
      ctx.fillRect(bx - 24, by - 140, 14, 10);
      ctx.fillStyle = '#475569';
      ctx.fillRect(bx - 22, by - 138, 10, 6);

      // Satellite Dish
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(bx + 22, by - 138, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx + 21, by - 138, 2, 8);

      // Rooftop Antenna with Flashing Red Beacon
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(bx - 1, by - 162, 2, 14);
      ctx.beginPath();
      ctx.arc(bx, by - 163, 3, 0, Math.PI * 2);
      ctx.fill();

      // FÊNIX PHOENIX CREST & NEON LOGO (Architectural pixel crest, not plain text!)
      ctx.save();
      // Glowing Phoenix Wings Crest
      ctx.fillStyle = PALETTE.fenixRed;
      ctx.shadowColor = PALETTE.fenixRed;
      ctx.shadowBlur = 10;
      // Wing Left
      ctx.fillRect(bx - 14, by - 118, 5, 2);
      ctx.fillRect(bx - 12, by - 116, 4, 3);
      // Wing Right
      ctx.fillRect(bx + 9, by - 118, 5, 2);
      ctx.fillRect(bx + 8, by - 116, 4, 3);
      // Phoenix Center Core / Flame
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(bx - 3, by - 120, 6, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx - 1, by - 118, 2, 4);

      // Phoenix Center Radiant Crest & Beacon
      ctx.fillStyle = '#fef08a';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 14;
      ctx.fillRect(bx - 4, by - 108, 8, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx - 2, by - 107, 4, 2);
      ctx.restore();

      Cache.buildings.fenixHQ = canvas;
    }

    // ─────────────────────────────────────────────────────────────
    // BUILDING 2: DEV LOFT / TECH WORKSHOP (150x155)
    // ─────────────────────────────────────────────────────────────
    {
      const { canvas, ctx } = createPixelCanvas(150, 155);
      const bx = 75, by = 138;

      // Contact shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 56, 22, 0, 0, Math.PI * 2);
      ctx.fill();

      // Weathered concrete plinth foundation
      ctx.fillStyle = '#272e3d';
      ctx.beginPath();
      ctx.moveTo(bx - 48, by - 8); ctx.lineTo(bx, by + 16); ctx.lineTo(bx + 48, by - 8);
      ctx.lineTo(bx + 48, by - 4); ctx.lineTo(bx, by + 20); ctx.lineTo(bx - 48, by - 4);
      ctx.closePath(); ctx.fill();

      // Exposed Industrial Red-Brick Facade
      // Left Wall (SW)
      ctx.fillStyle = PALETTE.brickDark;
      ctx.beginPath();
      ctx.moveTo(bx - 44, by - 6); ctx.lineTo(bx, by + 16);
      ctx.lineTo(bx, by - 72); ctx.lineTo(bx - 44, by - 94);
      ctx.closePath(); ctx.fill();

      // Right Wall (SE)
      ctx.fillStyle = PALETTE.brickBase;
      ctx.beginPath();
      ctx.moveTo(bx, by + 16); ctx.lineTo(bx + 44, by - 6);
      ctx.lineTo(bx + 44, by - 94); ctx.lineTo(bx, by - 72);
      ctx.closePath(); ctx.fill();

      // Horizontal Brick Mortar Seams
      ctx.strokeStyle = PALETTE.brickMortar;
      ctx.lineWidth = 1;
      for (let y = by - 62; y < by + 10; y += 6) {
        ctx.beginPath();
        ctx.moveTo(bx - 44, y - 22); ctx.lineTo(bx, y); ctx.lineTo(bx + 44, y - 22);
        ctx.stroke();
      }

      // Multi-Pane Factory Grid Windows (Left Wall)
      for (let floor = 0; floor < 2; floor++) {
        const wy = by - 16 - floor * 30;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(bx - 36, wy - 4); ctx.lineTo(bx - 10, wy + 9);
        ctx.lineTo(bx - 10, wy - 8); ctx.lineTo(bx - 36, wy - 21);
        ctx.closePath(); ctx.fill();

        // Warm tungsten interior light
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(bx - 34, wy - 5); ctx.lineTo(bx - 12, wy + 6);
        ctx.lineTo(bx - 12, wy - 6); ctx.lineTo(bx - 34, wy - 17);
        ctx.closePath(); ctx.fill();
      }

      // Multi-Pane Factory Grid Windows (Right Wall)
      for (let floor = 0; floor < 2; floor++) {
        const wy = by - 16 - floor * 30;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(bx + 10, wy + 9); ctx.lineTo(bx + 36, wy - 4);
        ctx.lineTo(bx + 36, wy - 21); ctx.lineTo(bx + 10, wy - 8);
        ctx.closePath(); ctx.fill();

        // Cyan computer monitor bounce glow
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(bx + 12, wy + 6); ctx.lineTo(bx + 34, wy - 5);
        ctx.lineTo(bx + 34, wy - 17); ctx.lineTo(bx + 12, wy - 6);
        ctx.closePath(); ctx.fill();
      }

      // Studio Wooden Double Entrance Door
      ctx.fillStyle = '#583106';
      ctx.beginPath();
      ctx.moveTo(bx + 4, by + 12); ctx.lineTo(bx + 20, by + 4);
      ctx.lineTo(bx + 20, by - 12); ctx.lineTo(bx + 4, by - 4);
      ctx.closePath(); ctx.fill();
      // Brass handle
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(bx + 11, by + 1, 2, 2);

      // Angled Slate Roof
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(bx, by - 72); ctx.lineTo(bx + 44, by - 94);
      ctx.lineTo(bx, by - 116); ctx.lineTo(bx - 44, by - 94);
      ctx.closePath(); ctx.fill();

      // Roof Skylight
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(bx - 16, by - 90); ctx.lineTo(bx, by - 82);
      ctx.lineTo(bx + 16, by - 90); ctx.lineTo(bx, by - 98);
      ctx.closePath(); ctx.fill();

      // Architectural Industrial Workshop Marquee & Code Brackets
      ctx.save();
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx - 16, by - 68, 32, 10);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx - 16, by - 68, 32, 10);
      // Glowing Cyan Code Brackets: { }
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 8;
      // {
      ctx.fillRect(bx - 8, by - 66, 2, 6);
      ctx.fillRect(bx - 6, by - 66, 2, 1.5);
      ctx.fillRect(bx - 6, by - 61.5, 2, 1.5);
      // }
      ctx.fillRect(bx + 6, by - 66, 2, 6);
      ctx.fillRect(bx + 4, by - 66, 2, 1.5);
      ctx.fillRect(bx + 4, by - 61.5, 2, 1.5);
      ctx.restore();

      Cache.buildings.devLoft = canvas;
    }

    // ─────────────────────────────────────────────────────────────
    // BUILDING 3: RESEARCH & SCIENCE LAB (150x155)
    // ─────────────────────────────────────────────────────────────
    {
      const { canvas, ctx } = createPixelCanvas(150, 155);
      const bx = 75, by = 138;

      // Contact shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 56, 22, 0, 0, Math.PI * 2);
      ctx.fill();

      // Titanium graphite bunker facade
      // Left Wall (SW)
      ctx.fillStyle = PALETTE.titaniumDark;
      ctx.beginPath();
      ctx.moveTo(bx - 46, by - 6); ctx.lineTo(bx, by + 17);
      ctx.lineTo(bx, by - 74); ctx.lineTo(bx - 46, by - 97);
      ctx.closePath(); ctx.fill();

      // Right Wall (SE)
      ctx.fillStyle = PALETTE.titaniumBase;
      ctx.beginPath();
      ctx.moveTo(bx, by + 17); ctx.lineTo(bx + 46, by - 6);
      ctx.lineTo(bx + 46, by - 97); ctx.lineTo(bx, by - 74);
      ctx.closePath(); ctx.fill();

      // Metallic panel lines & rivets
      ctx.strokeStyle = PALETTE.titaniumRivet;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx - 46, by - 30); ctx.lineTo(bx, by - 7); ctx.lineTo(bx + 46, by - 30);
      ctx.moveTo(bx - 46, by - 60); ctx.lineTo(bx, by - 37); ctx.lineTo(bx + 46, by - 60);
      ctx.stroke();

      // Observation Bay Window (Cyan cleanroom equipment glow)
      ctx.fillStyle = '#042f2e';
      ctx.beginPath();
      ctx.moveTo(bx - 38, by - 12); ctx.lineTo(bx - 10, by + 2);
      ctx.lineTo(bx - 10, by - 14); ctx.lineTo(bx - 38, by - 28);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.moveTo(bx - 36, by - 13); ctx.lineTo(bx - 12, by - 1);
      ctx.lineTo(bx - 12, by - 11); ctx.lineTo(bx - 36, by - 23);
      ctx.closePath(); ctx.fill();

      // Pneumatic Blast Door with Black & Yellow Hazard Chevrons
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(bx + 4, by + 14); ctx.lineTo(bx + 24, by + 4);
      ctx.lineTo(bx + 24, by - 16); ctx.lineTo(bx + 4, by - 6);
      ctx.closePath(); ctx.fill();

      // Hazard Stripes
      ctx.fillStyle = '#eab308';
      ctx.fillRect(bx + 8, by + 8, 4, 3);
      ctx.fillRect(bx + 16, by + 4, 4, 3);

      // Rooftop Radar Dome & Scanner Array
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(bx, by - 74); ctx.lineTo(bx + 46, by - 97);
      ctx.lineTo(bx, by - 120); ctx.lineTo(bx - 46, by - 97);
      ctx.closePath(); ctx.fill();

      // Rotating Radar Dome
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(bx, by - 105, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(bx - 10, by - 106, 20, 3); // cyan scanning strip

      // Communications Mast
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx + 20, by - 95); ctx.lineTo(bx + 20, by - 130);
      ctx.stroke();
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(bx + 19, by - 132, 3, 3); // blinking green status

      // Quantum Orbital Atom Emblem & Radiation Warning
      ctx.save();
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(bx, by - 64, 12, 5, Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(bx, by - 64, 12, 5, -Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(bx, by - 64, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      Cache.buildings.researchLab = canvas;
    }

    // ─────────────────────────────────────────────────────────────
    // BUILDING 4: AI NEXUS (Cognitive Core & Neural Spire) (150x170)
    // ─────────────────────────────────────────────────────────────
    {
      const { canvas, ctx } = createPixelCanvas(150, 170);
      const bx = 75, by = 145;

      // Contact shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 4, 58, 22, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hexagonal obsidian & violet foundation
      ctx.fillStyle = '#1e1035';
      ctx.beginPath();
      ctx.moveTo(bx - 50, by - 10); ctx.lineTo(bx, by + 15); ctx.lineTo(bx + 50, by - 10);
      ctx.lineTo(bx + 50, by - 5); ctx.lineTo(bx, by + 20); ctx.lineTo(bx - 50, by - 5);
      ctx.closePath(); ctx.fill();

      // Crystalline Violet Walls
      // Left Wall (SW)
      ctx.fillStyle = '#4c1d95';
      ctx.beginPath();
      ctx.moveTo(bx - 44, by - 7); ctx.lineTo(bx, by + 15);
      ctx.lineTo(bx, by - 85); ctx.lineTo(bx - 44, by - 107);
      ctx.closePath(); ctx.fill();

      // Right Wall (SE)
      ctx.fillStyle = '#6d28d9';
      ctx.beginPath();
      ctx.moveTo(bx, by + 15); ctx.lineTo(bx + 44, by - 7);
      ctx.lineTo(bx + 44, by - 107); ctx.lineTo(bx, by - 85);
      ctx.closePath(); ctx.fill();

      // Glowing Neural Core Windows (Vertical luminous purple slits)
      for (let floor = 0; floor < 3; floor++) {
        const fy = by - 18 - floor * 26;
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(bx - 32, fy - 6, 8, 14);
        ctx.fillStyle = '#e9d5ff';
        ctx.fillRect(bx - 30, fy - 4, 4, 10);

        ctx.fillStyle = '#a855f7';
        ctx.fillRect(bx + 24, fy - 6, 8, 14);
        ctx.fillStyle = '#e9d5ff';
        ctx.fillRect(bx + 26, fy - 4, 4, 10);
      }

      // Central Pulsing Neural Core (Holographic glass bay)
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.moveTo(bx - 16, by + 5); ctx.lineTo(bx + 16, by - 11);
      ctx.lineTo(bx + 16, by - 65); ctx.lineTo(bx - 16, by - 49);
      ctx.closePath(); ctx.fill();

      // Glowing Energy Core
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.arc(bx, by - 30, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bx, by - 30, 4, 0, Math.PI * 2);
      ctx.fill();

      // Roof Crystal Spire & Floating Data Rings
      ctx.fillStyle = '#2e1065';
      ctx.beginPath();
      ctx.moveTo(bx, by - 85); ctx.lineTo(bx + 44, by - 107);
      ctx.lineTo(bx, by - 129); ctx.lineTo(bx - 44, by - 107);
      ctx.closePath(); ctx.fill();

      // Spire tip
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.moveTo(bx - 8, by - 125); ctx.lineTo(bx, by - 155); ctx.lineTo(bx + 8, by - 125);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx - 1, by - 160, 2, 8);

      // Glowing Neural Core Rhombus Emblem
      ctx.save();
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.moveTo(bx, by - 76);
      ctx.lineTo(bx + 8, by - 68);
      ctx.lineTo(bx, by - 60);
      ctx.lineTo(bx - 8, by - 68);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bx, by - 68, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      Cache.buildings.aiNexus = canvas;
    }

    // ─────────────────────────────────────────────────────────────
    // BUILDING 5: CREATIVE STUDIO (Design & UI/UX Pavilion) (150x155)
    // ─────────────────────────────────────────────────────────────
    {
      const { canvas, ctx } = createPixelCanvas(150, 155);
      const bx = 75, by = 138;

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 3, 56, 20, 0, 0, Math.PI * 2);
      ctx.fill();

      // Minimalist white concrete terrace
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(bx - 48, by - 8); ctx.lineTo(bx, by + 16); ctx.lineTo(bx + 48, by - 8);
      ctx.lineTo(bx + 48, by - 4); ctx.lineTo(bx, by + 20); ctx.lineTo(bx - 48, by - 4);
      ctx.closePath(); ctx.fill();

      // Glass Pavilion Walls
      // Left Wall (SW) - Charcoal & Magenta Accent
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.moveTo(bx - 44, by - 6); ctx.lineTo(bx, by + 16);
      ctx.lineTo(bx, by - 75); ctx.lineTo(bx - 44, by - 97);
      ctx.closePath(); ctx.fill();

      // Right Wall (SE) - Panoramic Floor-to-Ceiling Studio Glass
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.moveTo(bx, by + 16); ctx.lineTo(bx + 44, by - 6);
      ctx.lineTo(bx + 44, by - 97); ctx.lineTo(bx, by - 75);
      ctx.closePath(); ctx.fill();

      // Floor-to-ceiling illuminated glass bays
      ctx.fillStyle = 'rgba(236, 72, 153, 0.25)';
      ctx.beginPath();
      ctx.moveTo(bx + 4, by + 13); ctx.lineTo(bx + 40, by - 5);
      ctx.lineTo(bx + 40, by - 85); ctx.lineTo(bx + 4, by - 67);
      ctx.closePath(); ctx.fill();

      // Cantilevering Balcony Terrace
      ctx.fillStyle = '#db2777';
      ctx.fillRect(bx - 42, by - 40, 84, 4);

      // Roof Canvas Pergola
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(bx, by - 75); ctx.lineTo(bx + 44, by - 97);
      ctx.lineTo(bx, by - 119); ctx.lineTo(bx - 44, by - 97);
      ctx.closePath(); ctx.fill();

      // Designer Palette Spectrum Swatch Emblem
      ctx.save();
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath(); ctx.arc(bx - 8, by - 62, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ec4899';
      ctx.beginPath(); ctx.arc(bx, by - 62, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#eab308';
      ctx.beginPath(); ctx.arc(bx + 8, by - 62, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      Cache.buildings.creativeStudio = canvas;
    }

    // ─────────────────────────────────────────────────────────────
    // BUILDING 6: DATA CENTER & VAULT (Cooling Towers & Heavy Silos) (160x165)
    // ─────────────────────────────────────────────────────────────
    {
      const { canvas, ctx } = createPixelCanvas(160, 165);
      const bx = 80, by = 145;

      // Heavy ground shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 4, 64, 24, 0, 0, Math.PI * 2);
      ctx.fill();

      // Heavy steel plinth
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(bx - 54, by - 10); ctx.lineTo(bx, by + 17); ctx.lineTo(bx + 54, by - 10);
      ctx.lineTo(bx + 54, by - 5); ctx.lineTo(bx, by + 22); ctx.lineTo(bx - 54, by - 5);
      ctx.closePath(); ctx.fill();

      // Twin Industrial Silos
      // Silo 1 (Left)
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(bx - 48, by - 6); ctx.lineTo(bx - 6, by + 12);
      ctx.lineTo(bx - 6, by - 85); ctx.lineTo(bx - 48, by - 103);
      ctx.closePath(); ctx.fill();
      for (let y = by - 85; y < by; y += 12) {
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(bx - 32, y - 5, 16, 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(bx - 24, y - 5, 4, 2);
      }

      // Silo 2 (Right)
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(bx + 6, by + 12); ctx.lineTo(bx + 48, by - 6);
      ctx.lineTo(bx + 48, by - 103); ctx.lineTo(bx + 6, by - 85);
      ctx.closePath(); ctx.fill();
      for (let y = by - 85; y < by; y += 12) {
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(bx + 16, y - 5, 16, 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(bx + 22, y - 5, 4, 2);
      }

      // Rooftop Exhaust Fans with Steam
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(bx - 27, by - 103, 16, 8, 0, 0, Math.PI * 2);
      ctx.ellipse(bx + 27, by - 103, 16, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Reinforced Hydraulic Vault Door at Center
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(bx - 8, by - 4, 16, 18);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx - 8, by - 4, 16, 18);

      // Illuminated Cyber Data Bus & Fiber Optic Array
      ctx.save();
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(bx - 16, by - 72, 32, 6);
      ctx.fillStyle = '#38bdf8';
      for (let i = -12; i <= 12; i += 6) {
        ctx.fillRect(bx + i, by - 71, 3, 4);
      }
      ctx.restore();

      Cache.buildings.dataCenter = canvas;
    }

    // ─────────────────────────────────────────────────────────────
    // BUILDING 7: OBSERVATORY (Astronomical Dome & Telemetry Center) (150x165)
    // ─────────────────────────────────────────────────────────────
    {
      const { canvas, ctx } = createPixelCanvas(150, 165);
      const bx = 75, by = 145;

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 4, 56, 22, 0, 0, Math.PI * 2);
      ctx.fill();

      // Octagonal celestial granite foundation
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.moveTo(bx - 48, by - 8); ctx.lineTo(bx, by + 16); ctx.lineTo(bx + 48, by - 8);
      ctx.lineTo(bx + 48, by - 4); ctx.lineTo(bx, by + 20); ctx.lineTo(bx - 48, by - 4);
      ctx.closePath(); ctx.fill();

      // Lower Rotunda Wall
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(bx - 44, by - 6); ctx.lineTo(bx, by + 16); ctx.lineTo(bx + 44, by - 6);
      ctx.lineTo(bx + 44, by - 46); ctx.lineTo(bx, by - 24); ctx.lineTo(bx - 44, by - 46);
      ctx.closePath(); ctx.fill();

      // Geodesic Hemisphere Dome
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(bx, by - 56, 42, Math.PI, 0, false);
      ctx.closePath();
      ctx.fill();

      // Observatory Slit (Aperture)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(bx - 8, by - 98); ctx.lineTo(bx + 8, by - 98);
      ctx.lineTo(bx + 6, by - 40); ctx.lineTo(bx - 6, by - 40);
      ctx.closePath(); ctx.fill();

      // Large Telescope Barrel protruding with brass trim
      ctx.fillStyle = '#b45309';
      ctx.fillRect(bx - 4, by - 110, 8, 22);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(bx, by - 110, 4, 0, Math.PI * 2);
      ctx.fill();

      // Sweeping Telemetry Searchlight / Laser Beacon
      ctx.save();
      const beamGrad = ctx.createLinearGradient(bx, by - 110, bx + 40, by - 160);
      beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0.8)');
      beamGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(bx, by - 110);
      ctx.lineTo(bx + 30, by - 165);
      ctx.lineTo(bx + 50, by - 160);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Celestial Astrolabe & Star Compass Emblem
      ctx.save();
      ctx.shadowColor = '#818cf8';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#c7d2fe';
      ctx.beginPath();
      ctx.arc(bx, by - 26, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx - 6, by - 32, 12, 12);
      ctx.restore();

      Cache.buildings.observatory = canvas;
    }

    // ─────────────────────────────────────────────────────────────
    // BUILDING 8: CODE FORGE (Project Hub & Deployment Depot) (150x155)
    // ─────────────────────────────────────────────────────────────
    {
      const { canvas, ctx } = createPixelCanvas(150, 155);
      const bx = 75, by = 138;

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 3, 56, 22, 0, 0, Math.PI * 2);
      ctx.fill();

      // Concrete Cargo Apron
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(bx - 48, by - 8); ctx.lineTo(bx, by + 16); ctx.lineTo(bx + 48, by - 8);
      ctx.lineTo(bx + 48, by - 4); ctx.lineTo(bx, by + 20); ctx.lineTo(bx - 48, by - 4);
      ctx.closePath(); ctx.fill();

      // Industrial Cargo Hangar
      // Left Wall (SW)
      ctx.fillStyle = '#0e7490';
      ctx.beginPath();
      ctx.moveTo(bx - 44, by - 6); ctx.lineTo(bx, by + 16);
      ctx.lineTo(bx, by - 72); ctx.lineTo(bx - 44, by - 94);
      ctx.closePath(); ctx.fill();

      // Right Wall (SE) - Roll-up Cargo Bay Doors
      ctx.fillStyle = '#155e75';
      ctx.beginPath();
      ctx.moveTo(bx, by + 16); ctx.lineTo(bx + 44, by - 6);
      ctx.lineTo(bx + 44, by - 94); ctx.lineTo(bx, by - 72);
      ctx.closePath(); ctx.fill();

      // Roll-up Steel Shutter Doors
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(bx + 6, by + 12); ctx.lineTo(bx + 38, by - 4);
      ctx.lineTo(bx + 38, by - 36); ctx.lineTo(bx + 6, by - 20);
      ctx.closePath(); ctx.fill();

      // Slatted Shutter Lines
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      for (let y = by - 16; y < by + 8; y += 4) {
        ctx.beginPath();
        ctx.moveTo(bx + 6, y); ctx.lineTo(bx + 38, y - 16);
        ctx.stroke();
      }

      // Overhead Gantry Crane Rail
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(bx - 20, by - 85, 40, 4);

      // Stacked Shipping Containers beside Hangar
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(bx - 40, by - 22, 14, 10);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(bx - 38, by - 32, 14, 10);

      // Illuminated Code Terminal Bracket </> Emblem
      ctx.save();
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#22d3ee';
      // Left bracket <
      ctx.fillRect(bx - 10, by - 64, 2, 6);
      ctx.fillRect(bx - 8, by - 66, 2, 2);
      ctx.fillRect(bx - 8, by - 60, 2, 2);
      // Slash /
      ctx.fillRect(bx - 1, by - 66, 2, 10);
      // Right bracket >
      ctx.fillRect(bx + 8, by - 64, 2, 6);
      ctx.fillRect(bx + 6, by - 66, 2, 2);
      ctx.fillRect(bx + 6, by - 60, 2, 2);
      ctx.restore();

      Cache.buildings.projectForge = canvas;
    }

    // ─────────────────────────────────────────────────────────────
    // BUILDING 9: DEPÓSITO MAIS — Industrial Logistics Warehouse (180x165)
    // ─────────────────────────────────────────────────────────────
    {
      const { canvas, ctx } = createPixelCanvas(180, 165);
      const bx = 90, by = 142;

      // Contact shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 6, 75, 28, 0, 0, Math.PI * 2);
      ctx.fill();

      // Concrete foundation apron
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(bx - 68, by - 14); ctx.lineTo(bx, by + 20); ctx.lineTo(bx + 68, by - 14);
      ctx.lineTo(bx + 68, by - 8); ctx.lineTo(bx, by + 26); ctx.lineTo(bx - 68, by - 8);
      ctx.closePath(); ctx.fill();

      // Main Warehouse Walls (Industrial Terracotta Red Brick)
      // Left Wall (Facing SW - Loading Bays & Trucks)
      ctx.fillStyle = '#6b1d1d';
      ctx.beginPath();
      ctx.moveTo(bx - 60, by - 10); ctx.lineTo(bx, by + 20);
      ctx.lineTo(bx, by - 60); ctx.lineTo(bx - 60, by - 90);
      ctx.closePath(); ctx.fill();

      // Right Wall (Facing SE - Office & Admin Wing)
      ctx.fillStyle = '#882424';
      ctx.beginPath();
      ctx.moveTo(bx, by + 20); ctx.lineTo(bx + 60, by - 10);
      ctx.lineTo(bx + 60, by - 90); ctx.lineTo(bx, by - 60);
      ctx.closePath(); ctx.fill();

      // Brick mortar courses
      ctx.strokeStyle = '#3c3535';
      ctx.lineWidth = 1;
      for (let y = by - 50; y < by + 16; y += 7) {
        ctx.beginPath();
        ctx.moveTo(bx - 60, y - 30); ctx.lineTo(bx, y); ctx.lineTo(bx + 60, y - 30);
        ctx.stroke();
      }

      // Loading Bay Docks (Roll-up corrugated doors)
      for (let dock = 0; dock < 2; dock++) {
        const dx = bx - 46 + dock * 26;
        const dy = by - 18 + dock * 13;
        // Bay opening
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(dx, dy + 6); ctx.lineTo(dx + 20, dy - 4);
        ctx.lineTo(dx + 20, dy - 26); ctx.lineTo(dx, dy - 16);
        ctx.closePath(); ctx.fill();

        // Roll-up steel shutter (horizontal ribs)
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(dx + 1, dy + 4); ctx.lineTo(dx + 19, dy - 5);
        ctx.lineTo(dx + 19, dy - 24); ctx.lineTo(dx + 1, dy - 15);
        ctx.closePath(); ctx.fill();

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        for (let r = dy - 22; r <= dy; r += 4) {
          ctx.beginPath();
          ctx.moveTo(dx + 1, r + 4); ctx.lineTo(dx + 19, r - 5);
          ctx.stroke();
        }

        // Dock bumper cushions (yellow/black warning stripes)
        ctx.fillStyle = '#eab308';
        ctx.fillRect(dx + 1, dy + 5, 4, 3);
        ctx.fillRect(dx + 15, dy - 2, 4, 3);
      }

      // Parked Yellow Delivery Truck at Doca 1
      {
        const tx = bx - 42, ty = by + 2;
        // Truck trailer body
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.moveTo(tx, ty); ctx.lineTo(tx + 18, ty - 9);
        ctx.lineTo(tx + 18, ty - 25); ctx.lineTo(tx, ty - 16);
        ctx.closePath(); ctx.fill();

        ctx.fillStyle = '#ca8a04';
        ctx.beginPath();
        ctx.moveTo(tx, ty); ctx.lineTo(tx - 12, ty + 6);
        ctx.lineTo(tx - 12, ty - 10); ctx.lineTo(tx, ty - 16);
        ctx.closePath(); ctx.fill();

        // Truck cab
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(tx - 12, ty + 6); ctx.lineTo(tx - 20, ty + 10);
        ctx.lineTo(tx - 20, ty); ctx.lineTo(tx - 12, ty - 4);
        ctx.closePath(); ctx.fill();

        // Windshield
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(tx - 18, ty + 2, 5, 4);

        // Tires
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(tx - 18, ty + 9, 4, 3);
        ctx.fillRect(tx - 6, ty + 6, 4, 3);
      }

      // Wooden Pallets & Crates near Doca 2
      {
        const px = bx - 14, py = by + 12;
        ctx.fillStyle = '#78350f';
        ctx.fillRect(px, py - 4, 10, 4);
        ctx.fillStyle = '#92400e';
        ctx.fillRect(px + 1, py - 10, 8, 6);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(px + 10, py - 6, 8, 6);
      }

      // Commercial Wing Windows (Right Wall)
      for (let i = 0; i < 3; i++) {
        const wx = bx + 12 + i * 16;
        const wy = by + 8 - i * 8;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(wx, wy); ctx.lineTo(wx + 12, wy - 6);
        ctx.lineTo(wx + 12, wy - 18); ctx.lineTo(wx, wy - 12);
        ctx.closePath(); ctx.fill();

        // Warm office illumination
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(wx + 1, wy - 1); ctx.lineTo(wx + 11, wy - 6);
        ctx.lineTo(wx + 11, wy - 16); ctx.lineTo(wx + 1, wy - 11);
        ctx.closePath(); ctx.fill();
      }

      // Gabled Industrial Roof (Orange / Terracotta Metal)
      ctx.fillStyle = '#c2410c';
      ctx.beginPath();
      ctx.moveTo(bx, by - 60); ctx.lineTo(bx + 62, by - 91);
      ctx.lineTo(bx, by - 122); ctx.lineTo(bx - 62, by - 91);
      ctx.closePath(); ctx.fill();

      // Ridge highlight
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx, by - 60); ctx.lineTo(bx, by - 122);
      ctx.stroke();

      // Roof Skylights & Industrial Exhaust Fans
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(bx - 20, by - 80); ctx.lineTo(bx - 6, by - 73);
      ctx.lineTo(bx - 6, by - 85); ctx.lineTo(bx - 20, by - 92);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#334155';
      ctx.fillRect(bx + 18, by - 96, 8, 8);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(bx + 20, by - 98, 4, 3); // Vent cap

      // Depósito Mais Orange Industrial Plaque & Chevron Logo
      ctx.save();
      ctx.shadowColor = '#ea580c';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(bx - 20, by - 68, 40, 14);
      // White box logo
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx - 14, by - 65, 8, 8);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(bx - 12, by - 63, 4, 4);
      // Double chevron arrows
      ctx.fillStyle = '#fdba74';
      ctx.beginPath();
      ctx.moveTo(bx + 2, by - 65); ctx.lineTo(bx + 8, by - 61); ctx.lineTo(bx + 2, by - 57);
      ctx.moveTo(bx + 8, by - 65); ctx.lineTo(bx + 14, by - 61); ctx.lineTo(bx + 8, by - 57);
      ctx.fill();
      ctx.restore();

      Cache.buildings.depositoMais = canvas;
    }

    // ─────────────────────────────────────────────────────────────
    // BUILDING 10: SECURITY CITADEL (Fortified Fortress) (160x170)
    // ─────────────────────────────────────────────────────────────
    {
      const { canvas, ctx } = createPixelCanvas(160, 170);
      const bx = 80, by = 146;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 4, 64, 24, 0, 0, Math.PI * 2);
      ctx.fill();

      // Armored Carbon-Black Walls
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(bx - 50, by - 8); ctx.lineTo(bx, by + 18);
      ctx.lineTo(bx, by - 85); ctx.lineTo(bx - 50, by - 110);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(bx, by + 18); ctx.lineTo(bx + 50, by - 8);
      ctx.lineTo(bx + 50, by - 110); ctx.lineTo(bx, by - 85);
      ctx.closePath(); ctx.fill();

      // Red Security Laser Scanners & Glowing Sensor Slits
      for (let floor = 0; floor < 3; floor++) {
        const fy = by - 14 - floor * 26;
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#dc2626';
        ctx.shadowBlur = 8;
        ctx.fillRect(bx - 36, fy + 4, 18, 3);
        ctx.fillRect(bx + 18, fy + 4, 18, 3);
        ctx.shadowBlur = 0;
      }

      // Heavy Vault Blast Gate
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(bx - 12, by + 12); ctx.lineTo(bx + 12, by);
      ctx.lineTo(bx + 12, by - 18); ctx.lineTo(bx - 12, by - 6);
      ctx.closePath(); ctx.fill();

      // Hazard Stripes on Gate
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx - 10, by + 8); ctx.lineTo(bx - 4, by - 12);
      ctx.moveTo(bx - 2, by + 4); ctx.lineTo(bx + 4, by - 16);
      ctx.stroke();

      // Rooftop Radar & Surveillance Dish
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.ellipse(bx, by - 105, 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Crimson Security Fortress Shield Crest & Lock
      ctx.save();
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(bx, by - 74);
      ctx.lineTo(bx + 8, by - 70);
      ctx.lineTo(bx + 8, by - 63);
      ctx.lineTo(bx, by - 58);
      ctx.lineTo(bx - 8, by - 63);
      ctx.lineTo(bx - 8, by - 70);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(bx - 2.5, by - 66, 5, 4);
      ctx.restore();

      Cache.buildings.securityCitadel = canvas;
    }

    // ─────────────────────────────────────────────────────────────
    // BUILDING 11: BUSINESS TOWER — Financial Corporate High-Rise (160x180)
    // ─────────────────────────────────────────────────────────────
    {
      const { canvas, ctx } = createPixelCanvas(160, 180);
      const bx = 80, by = 155;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 4, 62, 22, 0, 0, Math.PI * 2);
      ctx.fill();

      // Golden Amber Glass Tower
      ctx.fillStyle = '#292524';
      ctx.beginPath();
      ctx.moveTo(bx - 45, by - 8); ctx.lineTo(bx, by + 16);
      ctx.lineTo(bx, by - 105); ctx.lineTo(bx - 45, by - 130);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#44403c';
      ctx.beginPath();
      ctx.moveTo(bx, by + 16); ctx.lineTo(bx + 45, by - 8);
      ctx.lineTo(bx + 45, by - 130); ctx.lineTo(bx, by - 105);
      ctx.closePath(); ctx.fill();

      // Amber Glowing Panoramic Windows
      for (let floor = 0; floor < 4; floor++) {
        const fy = by - 16 - floor * 24;
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#d97706';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(bx - 36, fy); ctx.lineTo(bx - 8, fy + 14);
        ctx.lineTo(bx - 8, fy + 6); ctx.lineTo(bx - 36, fy - 8);
        ctx.closePath(); ctx.fill();

        ctx.beginPath();
        ctx.moveTo(bx + 8, fy + 14); ctx.lineTo(bx + 36, fy);
        ctx.lineTo(bx + 36, fy - 8); ctx.lineTo(bx + 8, fy + 6);
        ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Rooftop Penthouse Spire
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(bx, by - 105); ctx.lineTo(bx + 20, by - 115);
      ctx.lineTo(bx, by - 125); ctx.lineTo(bx - 20, by - 115);
      ctx.closePath(); ctx.fill();
      ctx.fillRect(bx - 2, by - 145, 4, 20);

      // Gleaming Gold Corporate Diamond Emblem
      ctx.save();
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(bx, by - 76);
      ctx.lineTo(bx + 8, by - 68);
      ctx.lineTo(bx, by - 60);
      ctx.lineTo(bx - 8, by - 68);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bx, by - 68, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      Cache.buildings.businessTower = canvas;
    }

    // ─────────────────────────────────────────────────────────────
    // BUILDING 12: HOSPITAL — System Recovery & Health Clinic (150x160)
    // ─────────────────────────────────────────────────────────────
    {
      const { canvas, ctx } = createPixelCanvas(150, 160);
      const bx = 75, by = 138;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 4, 58, 22, 0, 0, Math.PI * 2);
      ctx.fill();

      // Clean Clinical White/Teal Walls
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(bx - 44, by - 8); ctx.lineTo(bx, by + 16);
      ctx.lineTo(bx, by - 80); ctx.lineTo(bx - 44, by - 102);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(bx, by + 16); ctx.lineTo(bx + 44, by - 8);
      ctx.lineTo(bx + 44, by - 102); ctx.lineTo(bx, by - 80);
      ctx.closePath(); ctx.fill();

      // Glowing Green Medical Cross (Primary architectural identity)
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#16a34a';
      ctx.shadowBlur = 12;
      ctx.fillRect(bx - 4, by - 65, 8, 22);
      ctx.fillRect(bx - 12, by - 58, 24, 8);
      ctx.shadowBlur = 0;

      Cache.buildings.hospital = canvas;
    }

    // ─────────────────────────────────────────────────────────────
    // BUILDING 13: SHOPPING — Marketplace Galleria (160x155)
    // ─────────────────────────────────────────────────────────────
    {
      const { canvas, ctx } = createPixelCanvas(160, 155);
      const bx = 80, by = 136;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 4, 60, 22, 0, 0, Math.PI * 2);
      ctx.fill();

      // Magenta / Purple Boutique Arcade
      ctx.fillStyle = '#4a044e';
      ctx.beginPath();
      ctx.moveTo(bx - 46, by - 8); ctx.lineTo(bx, by + 16);
      ctx.lineTo(bx, by - 75); ctx.lineTo(bx - 46, by - 98);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#701a75';
      ctx.beginPath();
      ctx.moveTo(bx, by + 16); ctx.lineTo(bx + 46, by - 8);
      ctx.lineTo(bx + 46, by - 98); ctx.lineTo(bx, by - 75);
      ctx.closePath(); ctx.fill();

      // Striped Awnings (Magenta / White)
      ctx.fillStyle = '#d946ef';
      ctx.fillRect(bx - 36, by - 12, 32, 10);
      ctx.fillRect(bx + 4, by - 12, 32, 10);

      // Neon Boutique Arch Emblem
      ctx.save();
      ctx.shadowColor = '#d946ef';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(bx - 12, by - 68, 24, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx - 8, by - 66, 16, 2);
      ctx.restore();

      Cache.buildings.shopping = canvas;
    }

    // ─────────────────────────────────────────────────────────────
    // BUILDING 14: RESIDENCIAL — Agent Living Pods (150x160)
    // ─────────────────────────────────────────────────────────────
    {
      const { canvas, ctx } = createPixelCanvas(150, 160);
      const bx = 75, by = 140;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 4, 58, 22, 0, 0, Math.PI * 2);
      ctx.fill();

      // Teal / Eco-Living Apartments
      ctx.fillStyle = '#134e4a';
      ctx.beginPath();
      ctx.moveTo(bx - 44, by - 8); ctx.lineTo(bx, by + 16);
      ctx.lineTo(bx, by - 85); ctx.lineTo(bx - 44, by - 108);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#115e59';
      ctx.beginPath();
      ctx.moveTo(bx, by + 16); ctx.lineTo(bx + 44, by - 8);
      ctx.lineTo(bx + 44, by - 108); ctx.lineTo(bx, by - 85);
      ctx.closePath(); ctx.fill();

      // Balcony Greenery
      for (let floor = 0; floor < 3; floor++) {
        const fy = by - 12 - floor * 26;
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(bx - 32, fy, 22, 4);
        ctx.fillRect(bx + 10, fy, 22, 4);
      }

      // Rooftop Pergola & Planter Trellis
      ctx.save();
      ctx.fillStyle = '#14b8a6';
      ctx.shadowColor = '#0d9488';
      ctx.shadowBlur = 8;
      ctx.fillRect(bx - 16, by - 74, 32, 4);
      ctx.fillStyle = '#2dd4bf';
      ctx.fillRect(bx - 12, by - 72, 24, 2);
      ctx.restore();

      Cache.buildings.residential = canvas;
    }

    // ─────────────────────────────────────────────────────────────
    // BUILDING 15: PORTO DIGITAL — Maritime Logistics & Crane (180x160)
    // ─────────────────────────────────────────────────────────────
    {
      const { canvas, ctx } = createPixelCanvas(180, 160);
      const bx = 90, by = 138;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 4, 68, 24, 0, 0, Math.PI * 2);
      ctx.fill();

      // Port Warehouse
      ctx.fillStyle = '#0c4a6e';
      ctx.beginPath();
      ctx.moveTo(bx - 50, by - 8); ctx.lineTo(bx, by + 16);
      ctx.lineTo(bx, by - 60); ctx.lineTo(bx - 50, by - 84);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#0369a1';
      ctx.beginPath();
      ctx.moveTo(bx, by + 16); ctx.lineTo(bx + 50, by - 8);
      ctx.lineTo(bx + 50, by - 84); ctx.lineTo(bx, by - 60);
      ctx.closePath(); ctx.fill();

      // Stacked Multicolored Shipping Containers
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(bx - 35, by - 18, 18, 8);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(bx - 35, by - 26, 18, 8);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(bx - 14, by - 14, 18, 8);

      // Red Gantry Container Crane
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx + 20, by + 6); ctx.lineTo(bx + 30, by - 50);
      ctx.lineTo(bx + 60, by - 35); ctx.lineTo(bx + 50, by + 12);
      ctx.stroke();

      // Illuminated Maritime Anchor Emblem
      ctx.save();
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(bx, by - 68, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(bx - 1.5, by - 66, 3, 9);
      ctx.fillRect(bx - 6, by - 63, 12, 2);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx, by - 60, 5, 0, Math.PI);
      ctx.stroke();
      ctx.restore();

      Cache.buildings.portTerminal = canvas;
    }

    // BUILDING 16: DEPÓSITO MAIS SECONDARY LOGISTICS SHED (150x125)
    {
      const { canvas, ctx } = createPixelCanvas(150, 125);
      const bx = 75, by = 110;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 58, 20, 0, 0, Math.PI * 2);
      ctx.fill();

      // Concrete apron base
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(bx - 52, by - 6); ctx.lineTo(bx, by + 14); ctx.lineTo(bx + 52, by - 6);
      ctx.lineTo(bx + 52, by - 2); ctx.lineTo(bx, by + 18); ctx.lineTo(bx - 52, by - 2);
      ctx.closePath(); ctx.fill();

      // Corrugated steel walls (Depósito Mais Industrial Orange & Steel Gray)
      // Left Wall
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(bx - 48, by - 4); ctx.lineTo(bx, by + 14);
      ctx.lineTo(bx, by - 50); ctx.lineTo(bx - 48, by - 68);
      ctx.closePath(); ctx.fill();

      // Right Wall
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(bx, by + 14); ctx.lineTo(bx + 48, by - 4);
      ctx.lineTo(bx + 48, by - 68); ctx.lineTo(bx, by - 50);
      ctx.closePath(); ctx.fill();

      // Orange branding belt
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(bx - 48, by - 24); ctx.lineTo(bx, by - 6); ctx.lineTo(bx + 48, by - 24);
      ctx.lineTo(bx + 48, by - 30); ctx.lineTo(bx, by - 12); ctx.lineTo(bx - 48, by - 30);
      ctx.closePath(); ctx.fill();

      // Roll-up overhead loading dock door
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(bx + 10, by + 8); ctx.lineTo(bx + 38, by - 2);
      ctx.lineTo(bx + 38, by - 26); ctx.lineTo(bx + 10, by - 16);
      ctx.closePath(); ctx.fill();

      // Steel door slats
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      for (let y = by - 14; y < by + 4; y += 4) {
        ctx.beginPath();
        ctx.moveTo(bx + 12, y); ctx.lineTo(bx + 36, y - 8);
        ctx.stroke();
      }

      // Pitched corrugated roof
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(bx - 48, by - 68); ctx.lineTo(bx, by - 50);
      ctx.lineTo(bx + 48, by - 68); ctx.lineTo(bx, by - 86);
      ctx.closePath(); ctx.fill();

      Cache.buildings.depositoWarehouseB = canvas;
    }

    // BUILDING 17: APARTMENT BLOCK (130x150) — Residential District
    {
      const { canvas, ctx } = createPixelCanvas(130, 150);
      const bx = 65, by = 135;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 50, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Brick facade
      ctx.fillStyle = '#5c2317';
      ctx.beginPath();
      ctx.moveTo(bx - 42, by - 6); ctx.lineTo(bx, by + 12);
      ctx.lineTo(bx, by - 86); ctx.lineTo(bx - 42, by - 104);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#7c2d12';
      ctx.beginPath();
      ctx.moveTo(bx, by + 12); ctx.lineTo(bx + 42, by - 6);
      ctx.lineTo(bx + 42, by - 104); ctx.lineTo(bx, by - 86);
      ctx.closePath(); ctx.fill();

      // 4 Floors of Warm Lit Windows
      for (let f = 0; f < 4; f++) {
        const fy = by - 12 - f * 20;
        // Left wall windows
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(bx - 32, fy - 14, 8, 10);
        ctx.fillRect(bx - 18, fy - 9, 8, 10);
        // Right wall windows
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(bx + 10, fy - 9, 8, 10);
        ctx.fillRect(bx + 24, fy - 14, 8, 10);

        // Flower boxes
        ctx.fillStyle = '#15803d';
        ctx.fillRect(bx - 33, fy - 4, 10, 3);
        ctx.fillRect(bx + 9, fy + 1, 10, 3);
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(bx - 30, fy - 5, 2, 2);
        ctx.fillRect(bx + 12, fy, 2, 2);
      }

      // Roof & Mansard
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(bx - 42, by - 104); ctx.lineTo(bx, by - 86);
      ctx.lineTo(bx + 42, by - 104); ctx.lineTo(bx, by - 122);
      ctx.closePath(); ctx.fill();

      // Chimneys
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(bx - 20, by - 126, 6, 12);
      ctx.fillRect(bx + 14, by - 126, 6, 12);

      Cache.buildings.apartmentBlockA = canvas;
    }

    // BUILDING 18: BROWNSTONE TOWNHOUSES (120x105)
    {
      const { canvas, ctx } = createPixelCanvas(120, 105);
      const bx = 60, by = 92;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 46, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      // Warm Brownstone Brick
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.moveTo(bx - 38, by - 4); ctx.lineTo(bx, by + 10);
      ctx.lineTo(bx, by - 56); ctx.lineTo(bx - 38, by - 70);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(bx, by + 10); ctx.lineTo(bx + 38, by - 4);
      ctx.lineTo(bx + 38, by - 70); ctx.lineTo(bx, by - 56);
      ctx.closePath(); ctx.fill();

      // Pitched slate roof
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(bx - 38, by - 70); ctx.lineTo(bx, by - 56);
      ctx.lineTo(bx + 38, by - 70); ctx.lineTo(bx, by - 84);
      ctx.closePath(); ctx.fill();

      // Dormer window
      ctx.fillStyle = '#334155';
      ctx.fillRect(bx - 6, by - 76, 12, 10);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(bx - 4, by - 74, 8, 6);

      // Front Stoop Steps
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(bx - 8, by + 6, 16, 3);
      ctx.fillRect(bx - 6, by + 9, 12, 3);

      Cache.buildings.townhouseRow = canvas;
    }

    // BUILDING 19: QUANTUM RESEARCH DOME (110x95) — Research District
    {
      const { canvas, ctx } = createPixelCanvas(110, 95);
      const bx = 55, by = 82;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 44, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      // Titanium circular plinth
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(bx, by, 38, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Geodesic glass hemisphere dome
      const grad = ctx.createRadialGradient(bx - 10, by - 36, 4, bx, by - 30, 36);
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(0.5, '#0284c7');
      grad.addColorStop(1, '#0c4a6e');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bx, by - 12, 34, Math.PI, 0);
      ctx.fill();

      // Hexagonal geodesic structural lattice
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(bx, by - 12, 34, Math.PI, 0);
      ctx.stroke();

      for (let i = 0; i < 5; i++) {
        const rad = 10 + i * 5;
        ctx.beginPath();
        ctx.ellipse(bx, by - 12 - i * 5, rad, rad * 0.45, 0, Math.PI, 0);
        ctx.stroke();
      }

      // Glowing quantum core beacon at dome apex
      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(bx, by - 46, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      Cache.buildings.quantumDome = canvas;
    }

    // BUILDING 20: DATA CENTER STORAGE VAULT / SERVER BARN (120x110)
    {
      const { canvas, ctx } = createPixelCanvas(120, 110);
      const bx = 60, by = 96;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 48, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Blast-proof graphite concrete walls
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(bx - 42, by - 6); ctx.lineTo(bx, by + 12);
      ctx.lineTo(bx, by - 56); ctx.lineTo(bx - 42, by - 74);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(bx, by + 12); ctx.lineTo(bx + 42, by - 6);
      ctx.lineTo(bx + 42, by - 74); ctx.lineTo(bx, by - 56);
      ctx.closePath(); ctx.fill();

      // Pulsing rack status LED bars
      for (let r = 0; r < 3; r++) {
        const ry = by - 44 + r * 14;
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(bx - 32, ry - 10, 24, 3);
        ctx.fillRect(bx + 8, ry - 4, 24, 3);

        ctx.fillStyle = '#10b981';
        ctx.fillRect(bx - 26, ry - 6, 4, 2);
        ctx.fillRect(bx + 14, ry, 4, 2);
      }

      // Flat roof with air intake conduits
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(bx - 42, by - 74); ctx.lineTo(bx, by - 56);
      ctx.lineTo(bx + 42, by - 74); ctx.lineTo(bx, by - 92);
      ctx.closePath(); ctx.fill();

      // Twin cooling fans
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(bx - 16, by - 74, 6, 0, Math.PI * 2);
      ctx.arc(bx + 16, by - 74, 6, 0, Math.PI * 2);
      ctx.fill();

      Cache.buildings.serverBarn = canvas;
    }

    // BUILDING 21: CORNER STOREFRONT CAFE & BISTRO (100x115)
    {
      const { canvas, ctx } = createPixelCanvas(100, 115);
      const bx = 50, by = 100;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 40, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ochre stucco walls
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(bx - 34, by - 5); ctx.lineTo(bx, by + 10);
      ctx.lineTo(bx, by - 56); ctx.lineTo(bx - 34, by - 71);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(bx, by + 10); ctx.lineTo(bx + 34, by - 5);
      ctx.lineTo(bx + 34, by - 71); ctx.lineTo(bx, by - 56);
      ctx.closePath(); ctx.fill();

      // Large storefront display windows
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(bx - 28, by - 18, 20, 18);
      ctx.fillRect(bx + 8, by - 12, 20, 18);

      // Striped bistro awning (Green & White)
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.moveTo(bx - 34, by - 22); ctx.lineTo(bx, by - 6); ctx.lineTo(bx + 34, by - 22);
      ctx.lineTo(bx + 30, by - 26); ctx.lineTo(bx, by - 10); ctx.lineTo(bx - 30, by - 26);
      ctx.closePath(); ctx.fill();

      // Upper floor windows with shutters
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(bx - 22, by - 48, 10, 12);
      ctx.fillRect(bx + 12, by - 44, 10, 12);

      // Roof
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(bx - 34, by - 71); ctx.lineTo(bx, by - 56);
      ctx.lineTo(bx + 34, by - 71); ctx.lineTo(bx, by - 86);
      ctx.closePath(); ctx.fill();

      Cache.buildings.storefrontCafe = canvas;
    }

    // BUILDING 22: CIVIC & ADMINISTRATIVE ANNEX (120x110)
    {
      const { canvas, ctx } = createPixelCanvas(120, 110);
      const bx = 60, by = 96;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 48, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Granite glass pavilion
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(bx - 40, by - 6); ctx.lineTo(bx, by + 12);
      ctx.lineTo(bx, by - 54); ctx.lineTo(bx - 40, by - 72);
      ctx.closePath(); ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(bx, by + 12); ctx.lineTo(bx + 40, by - 6);
      ctx.lineTo(bx + 40, by - 72); ctx.lineTo(bx, by - 54);
      ctx.closePath(); ctx.fill();

      // Cyan tinted glass bands
      for (let f = 0; f < 3; f++) {
        const fy = by - 16 - f * 16;
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(bx - 32, fy - 8, 24, 7);
        ctx.fillRect(bx + 8, fy - 2, 24, 7);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(bx - 28, fy - 7, 16, 2);
        ctx.fillRect(bx + 12, fy - 1, 16, 2);
      }

      // Roof
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(bx - 40, by - 72); ctx.lineTo(bx, by - 54);
      ctx.lineTo(bx + 40, by - 72); ctx.lineTo(bx, by - 90);
      ctx.closePath(); ctx.fill();

      Cache.buildings.civicAnnex = canvas;
    }

    // BUILDING 23: FORTIFIED SECURITY WATCHTOWER (60x120)
    {
      const { canvas, ctx } = createPixelCanvas(60, 120);
      const bx = 30, by = 110;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 2, 22, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Concrete tower shaft
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx - 8, by - 70, 16, 70);
      ctx.fillStyle = '#334155';
      ctx.fillRect(bx, by - 70, 8, 70);

      // Observation platform cabin
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx - 16, by - 88, 32, 18);

      // Panoramic red observation slits
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(bx - 12, by - 82, 24, 4);

      // Searchlight atop tower
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(bx, by - 94, 5, 0, Math.PI * 2);
      ctx.fill();

      // Antenna
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx, by - 94); ctx.lineTo(bx, by - 112);
      ctx.stroke();

      Cache.buildings.guardTower = canvas;
    }

    // FILLER BUILDINGS
    function createIsoBuilding(id, w, h, lColor, rColor, roofColor, windowL, windowR) {
      const { canvas, ctx } = createPixelCanvas(w*4, h+w*2);
      const bx = w*2, by = h+w*1.5;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath(); ctx.ellipse(bx, by+2, w*1.2, w*0.5, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = lColor;
      ctx.beginPath(); ctx.moveTo(bx-w, by-w/2); ctx.lineTo(bx, by); ctx.lineTo(bx, by-h); ctx.lineTo(bx-w, by-w/2-h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = rColor;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx+w, by-w/2); ctx.lineTo(bx+w, by-w/2-h); ctx.lineTo(bx, by-h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = roofColor;
      ctx.beginPath(); ctx.moveTo(bx-w, by-w/2-h); ctx.lineTo(bx, by-h); ctx.lineTo(bx+w, by-w/2-h); ctx.lineTo(bx, by-w-h); ctx.closePath(); ctx.fill();
      
      // Roof prop
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(bx-5, by-w/2-h-10, 10, 8);
      
      // Windows
      if(windowL) {
        ctx.fillStyle = windowL;
        for(let i=1; i<Math.floor(h/16); i++) ctx.fillRect(bx-w+5, by-w/2-10 - i*16, w-10, 8);
      }
      if(windowR) {
        ctx.fillStyle = windowR;
        for(let i=1; i<Math.floor(h/16); i++) ctx.fillRect(bx+5, by-w/2+5 - i*16, w-10, 8);
      }
      // Door
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx-w/2, by-w/4-10, 10, 15);
      
      Cache.buildings[id] = canvas;
    }
    
    createIsoBuilding('officeBlockA', 30, 80, '#0f172a', '#1e293b', '#334155', '#0284c7', '#38bdf8');
    createIsoBuilding('officeBlockB', 30, 90, '#451a03', '#78350f', '#92400e', '#f59e0b', '#fbbf24');
    createIsoBuilding('retailStripA', 40, 40, '#7f1d1d', '#b91c1c', '#1c1917', '#93c5fd', '#bfdbfe');
    createIsoBuilding('retailStripB', 40, 45, '#1e3a8a', '#1d4ed8', '#1e293b', '#93c5fd', '#bfdbfe');
    createIsoBuilding('apartmentMidA', 25, 100, '#064e3b', '#047857', '#111827', '#fef08a', '#fde047');
    createIsoBuilding('apartmentMidB', 25, 80, '#374151', '#4b5563', '#1f2937', '#93c5fd', '#bfdbfe');
    createIsoBuilding('workshopGarage', 35, 30, '#171717', '#262626', '#404040', null, null);
    createIsoBuilding('parkingStructure', 35, 60, '#334155', '#475569', '#1e293b', '#0f172a', '#0f172a');
    createIsoBuilding('hotelSmall', 30, 85, '#4c1d95', '#6d28d9', '#2e1065', '#fef08a', '#fde047');
    createIsoBuilding('clinicSmall', 35, 50, '#f1f5f9', '#ffffff', '#cbd5e1', '#38bdf8', '#7dd3fc');
    createIsoBuilding('restaurantA', 30, 35, '#991b1b', '#dc2626', '#450a0a', '#fde047', '#fef08a');
    createIsoBuilding('techStartup', 30, 70, '#115e59', '#0f766e', '#134e4a', '#a7f3d0', '#6ee7b7');

  }

  // ── 6. AGENT PROFILES & AVATAR GENERATION ────────────────────
  // 10 distinct, non-cloned agent presets
  const AGENT_PROFILES = [
    {
      id: 'Orchestrator',
      name: 'Master Orchestrator',
      skin: '#fcd5b8',
      hairStyle: 'crest',
      hairColor: '#ef4444',
      outfit: 'suit',
      outfitColor: '#dc2626',
      pantsColor: '#090d16',
      shoesColor: '#f8fafc',
      accessory: 'halo',
      role: 'master'
    },
    {
      id: 'Developer',
      name: 'Senior Developer',
      skin: '#fde2d4',
      hairStyle: 'spiky',
      hairColor: '#18181b',
      outfit: 'hoodie',
      outfitColor: '#8b5cf6',
      pantsColor: '#1e293b',
      shoesColor: '#0284c7',
      accessory: 'headphones',
      role: 'developer'
    },
    {
      id: 'Frontend',
      name: 'UI/UX Architect',
      skin: '#ffe3d0',
      hairStyle: 'bob',
      hairColor: '#fde047',
      outfit: 'casual',
      outfitColor: '#3b82f6',
      pantsColor: '#0f172a',
      shoesColor: '#f8fafc',
      accessory: 'glasses',
      role: 'designer'
    },
    {
      id: 'Backend',
      name: 'Core Systems Eng',
      skin: '#d89b6b',
      hairStyle: 'tousled',
      hairColor: '#5c3a21',
      outfit: 'jacket',
      outfitColor: '#16a34a',
      pantsColor: '#1e293b',
      shoesColor: '#334155',
      accessory: 'badge',
      role: 'developer'
    },
    {
      id: 'Database',
      name: 'Data Architect',
      skin: '#8d5524',
      hairStyle: 'slick',
      hairColor: '#cbd5e1',
      outfit: 'suit',
      outfitColor: '#10b981',
      pantsColor: '#090d16',
      shoesColor: '#090d16',
      accessory: 'glasses',
      role: 'database'
    },
    {
      id: 'Browser',
      name: 'QA Automation',
      skin: '#fcd5b8',
      hairStyle: 'ponytail',
      hairColor: '#f97316',
      outfit: 'hoodie',
      outfitColor: '#f59e0b',
      pantsColor: '#334155',
      shoesColor: '#f8fafc',
      accessory: 'tablet',
      role: 'qa'
    },
    {
      id: 'Security',
      name: 'Zero-Trust Officer',
      skin: '#4a2c11',
      hairStyle: 'buzz',
      hairColor: '#18181b',
      outfit: 'armor',
      outfitColor: '#f43f5e',
      pantsColor: '#090d16',
      shoesColor: '#090d16',
      accessory: 'visor',
      role: 'security'
    },
    {
      id: 'Research',
      name: 'AI Scientist',
      skin: '#ffe3d0',
      hairStyle: 'bob',
      hairColor: '#a855f7',
      outfit: 'labcoat',
      outfitColor: '#f8fafc',
      pantsColor: '#334155',
      shoesColor: '#090d16',
      accessory: 'glasses',
      role: 'researcher'
    },
    {
      id: 'Devops',
      name: 'DevOps / CI-CD',
      skin: '#d89b6b',
      hairStyle: 'punk',
      hairColor: '#ec4899',
      outfit: 'jacket',
      outfitColor: '#9333ea',
      pantsColor: '#090d16',
      shoesColor: '#38bdf8',
      accessory: 'backpack',
      role: 'devops'
    },
    {
      id: 'Commercial',
      name: 'Growth & Strategy',
      skin: '#fde2d4',
      hairStyle: 'slick',
      hairColor: '#78350f',
      outfit: 'suit',
      outfitColor: '#0284c7',
      pantsColor: '#0f172a',
      shoesColor: '#1e293b',
      accessory: 'badge',
      role: 'architect'
    }
  ];

  function getProfileForAgent(agent) {
    if (!agent) return AGENT_PROFILES[1];
    const roleText = String(agent.role || agent.id || agent.name || '').toLowerCase();
    const match = AGENT_PROFILES.find(p => p.id.toLowerCase() === roleText || roleText.includes(p.id.toLowerCase()) || roleText.includes(p.role));
    if (match) return match;
    let hash = 0;
    const s = String(agent.id || agent.name || 'agent');
    for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
    return AGENT_PROFILES[Math.abs(hash) % AGENT_PROFILES.length];
  }

  // ── 7. DRAW PIXEL CHARACTER (HABBO / TIBIA GAME STANDARD) ──────
  // Authentic ~36px game sprite scale
  function drawPixelCharacter(ctx, opts) {
    const {
      x, y,
      facing = 'SE',
      frame = 0,
      state = 'idle',
      profile = AGENT_PROFILES[1],
      time = 0,
      zoom = 1,
      role = (profile.role || 'developer')
    } = opts;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Contact shadow ellipse under character feet
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(x, y, 9 * zoom, 4.5 * zoom, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bobbing / physics
    const isWalking = state === 'walk';
    const isWorking = state === 'working';
    const isThinking = state === 'think';
    const isCommunicating = state === 'communicate';
    const isSuccess = state === 'success';
    const isError = state === 'error';

    const walkBounce = isWalking ? ((frame % 2 === 1) ? -1.5 : 0) * zoom : 0;
    const workBob = isWorking ? Math.sin(time * 12) * 1.0 * zoom : 0;
    const idleBob = (state === 'idle' || isThinking) ? Math.sin(time * 2.8) * 0.8 * zoom : 0;
    const successHop = isSuccess ? Math.abs(Math.sin(time * 10)) * 4.0 * zoom : 0;
    const errorShake = isError ? (Math.sin(time * 30) > 0 ? 1 : -1) * 1.5 * zoom : 0;

    const cx = Math.round(x + errorShake);
    const cy = Math.round(y - successHop + walkBounce + workBob + idleBob);
    const spriteScale = 1.32; // Scaling base ~36px up to ~48px-52px height for high visual presence
    const z = Math.max(1.0, zoom * spriteScale);

    // Pixel drawing helper
    function px(rx, ry, rw, rh, color) {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(cx + rx * z), Math.round(cy + ry * z), Math.max(1, Math.round(rw * z)), Math.max(1, Math.round(rh * z)));
    }

    const pantsCol = profile.pantsColor || '#1e293b';
    const shoeCol = profile.shoesColor || '#f8fafc';
    const skinCol = profile.skin || '#fde2d4';
    const outfitCol = profile.outfitColor || '#3b82f6';
    const hairCol = profile.hairColor || '#18181b';

    // Role silhouette detectors
    const isArchitect = role === 'architect' || role === 'planner' || profile.role === 'architect';
    const isOrchestrator = role === 'orchestrator' || role === 'master' || profile.role === 'master';
    const isDevOps = role === 'devops' || role === 'sre' || role === 'obs';
    const isQA = role === 'qa' || role === 'browser' || role === 'security';

    // Architect flowing cape behind back
    if (isArchitect) {
      px(-8, -23, 16, 16, '#c2410c');
      px(-7, -21, 14, 15, '#ea580c');
    }
    // Orchestrator golden mantle
    if (isOrchestrator) {
      px(-9, -24, 18, 5, '#fbbf24');
      px(-10, -22, 3, 6, '#f59e0b');
      px(7, -22, 3, 6, '#f59e0b');
    }

    // ── A. LEGS & SHOES ──────────────────────────────────────────
    if (isWalking) {
      // 4-Frame Walk Cycle
      if (frame === 0) {
        // Left leg forward, right leg back
        px(-5, -9, 4, 7, pantsCol);
        px(-6, -2, 5, 2, shoeCol); // left shoe
        px(2, -7, 4, 5, pantsCol);
        px(3, -2, 4, 2, shoeCol);  // right shoe
      } else if (frame === 1) {
        // Passing frame
        px(-4, -10, 4, 8, pantsCol);
        px(-5, -2, 5, 2, shoeCol);
        px(1, -10, 4, 8, pantsCol);
        px(1, -2, 5, 2, shoeCol);
      } else if (frame === 2) {
        // Right leg forward, left leg back
        px(2, -9, 4, 7, pantsCol);
        px(2, -2, 5, 2, shoeCol);
        px(-5, -7, 4, 5, pantsCol);
        px(-6, -2, 4, 2, shoeCol);
      } else {
        // Passing frame
        px(-4, -10, 4, 8, pantsCol);
        px(-5, -2, 5, 2, shoeCol);
        px(1, -10, 4, 8, pantsCol);
        px(1, -2, 5, 2, shoeCol);
      }
    } else if (isWorking) {
      // Seated pose: knees bent forward onto chair
      px(-5, -7, 5, 5, pantsCol);
      px(1, -7, 5, 5, pantsCol);
      px(-5, -2, 5, 2, shoeCol);
      px(1, -2, 5, 2, shoeCol);
    } else {
      // Standing idle
      px(-5, -10, 4, 8, pantsCol);
      px(1, -10, 4, 8, pantsCol);
      px(-6, -2, 5, 2, shoeCol);
      px(1, -2, 5, 2, shoeCol);
    }

    // ── B. TORSO & OUTFIT ─────────────────────────────────────────
    // Main Torso (14px wide x 12px tall)
    px(-7, -22, 14, 12, outfitCol);
    // Darker contour / folds
    px(-7, -22, 1, 12, '#0f172a');
    px(6, -22, 1, 12, '#0f172a');
    px(-7, -11, 14, 1, '#0f172a');

    // Specific Outfit Trims
    if (profile.outfit === 'suit') {
      px(-2, -22, 4, 6, '#ffffff'); // white dress shirt collar
      px(-1, -16, 2, 5, '#dc2626'); // red tie
    } else if (profile.outfit === 'hoodie') {
      px(-4, -16, 8, 4, 'rgba(0, 0, 0, 0.25)'); // kangaroo pocket
      px(-2, -22, 1, 4, '#ffffff'); // hood string
      px(1, -22, 1, 4, '#ffffff');
    } else if (profile.outfit === 'labcoat') {
      px(-6, -22, 12, 12, '#f8fafc'); // white coat
      px(-2, -22, 4, 6, '#0284c7');  // blue inner shirt
      px(2, -18, 3, 3, '#0f172a');   // pen pocket
    } else if (profile.outfit === 'armor') {
      px(-6, -20, 12, 8, '#334155'); // kevlar plate
      px(-4, -18, 8, 4, '#f43f5e');  // security crest
    } else if (profile.outfit === 'jacket') {
      px(-3, -22, 6, 11, '#18181b'); // inner t-shirt
    }

    // ── C. ARMS & WORK / GESTURE ANIMATIONS ──────────────────────
    if (isWorking) {
      // Role-specific work animations!
      if (role === 'developer' || role === 'backend' || role === 'terminal') {
        // Fast typing on mechanical keyboard with screen reflection
        const tapL = (Math.floor(time * 18) % 2 === 0) ? -1 : 0;
        const tapR = (Math.floor(time * 18) % 2 === 1) ? -1 : 0;
        px(-9, -20, 4, 6, outfitCol);
        px(-9, -14 + tapL, 4, 3, skinCol);
        px(6, -20, 4, 6, outfitCol);
        px(6, -14 + tapR, 4, 3, skinCol);
      } else if (role === 'researcher' || role === 'analyst') {
        // Holding and reading open data tablet/book
        px(-9, -20, 4, 7, outfitCol);
        px(-8, -13, 4, 3, skinCol);
        px(5, -20, 4, 7, outfitCol);
        px(4, -13, 4, 3, skinCol);
        // Glowing cyan data tablet held in hands
        px(-4, -17, 8, 6, '#0891b2');
        px(-3, -16, 6, 4, '#38bdf8');
      } else if (role === 'designer' || role === 'frontend') {
        // Holding stylus pen, drawing on digital drafting pad
        px(-9, -20, 4, 7, outfitCol);
        px(-8, -13, 4, 3, skinCol);
        px(6, -21, 4, 6, outfitCol);
        const drawTap = Math.sin(time * 14) * 1.5;
        px(6 + drawTap, -14, 3, 3, skinCol);
        px(7 + drawTap, -12, 1, 3, '#ec4899'); // pink stylus
      } else if (role === 'qa' || role === 'browser') {
        // Inspecting tablet with green tick marks
        px(-9, -20, 4, 7, outfitCol);
        px(-8, -13, 4, 3, skinCol);
        px(5, -20, 4, 7, outfitCol);
        px(4, -13, 4, 3, skinCol);
        px(-4, -16, 8, 5, '#1e293b');
        px(-2, -15, 4, 3, '#22c55e'); // green pass tick
      } else {
        // Generic active working hands
        const tap = Math.sin(time * 12) > 0 ? 1 : 0;
        px(-9, -20, 4, 7, outfitCol);
        px(-9, -13 + tap, 4, 3, skinCol);
        px(6, -20, 4, 7, outfitCol);
        px(6, -13 - tap, 4, 3, skinCol);
      }
    } else if (isThinking) {
      // Hand resting on chin, other arm folded
      px(-9, -20, 4, 8, outfitCol);
      px(-7, -13, 6, 3, outfitCol); // folded left arm
      px(6, -21, 4, 6, outfitCol);
      px(4, -25, 4, 4, skinCol);    // right hand touching chin
    } else if (isCommunicating) {
      // Talking gesture: waving right hand
      px(-9, -20, 4, 8, outfitCol);
      px(-9, -12, 4, 3, skinCol);
      px(6, -23, 4, 6, outfitCol);
      const wave = Math.sin(time * 10) * 2;
      px(6 + wave, -27, 4, 4, skinCol); // raised waving hand
    } else if (isSuccess) {
      // Both arms raised high in victory (\o/)
      px(-10, -26, 4, 8, outfitCol);
      px(-10, -29, 4, 3, skinCol); // left hand raised
      px(7, -26, 4, 8, outfitCol);
      px(7, -29, 4, 3, skinCol);  // right hand raised
    } else if (isError) {
      // Both hands clutching head in dismay
      px(-9, -27, 4, 7, outfitCol);
      px(-6, -31, 4, 4, skinCol); // clutching left head
      px(6, -27, 4, 7, outfitCol);
      px(3, -31, 4, 4, skinCol);  // clutching right head
    } else if (isWalking) {
      // Arm counter-swing
      const swing = (frame === 0) ? 3 : (frame === 2 ? -3 : 0);
      px(-10, -21 + swing, 4, 8, outfitCol);
      px(-10, -13 + swing, 4, 3, skinCol);
      px(7, -21 - swing, 4, 8, outfitCol);
      px(7, -13 - swing, 4, 3, skinCol);
    } else {
      // Idle resting arms
      px(-10, -21, 4, 9, outfitCol);
      px(-10, -12, 4, 3, skinCol);
      px(7, -21, 4, 9, outfitCol);
      px(7, -12, 4, 3, skinCol);
    }

    // ── D. HEAD & FACE ───────────────────────────────────────────
    const hy = -33;
    // Head base (12x11 px)
    px(-6, hy, 12, 11, skinCol);
    // Chin contour / neck shadow
    px(-6, hy + 10, 12, 1, '#d89b6b');

    // Expressive 2-pixel eyes
    const eyeOffX = facing === 'SE' ? 1 : (facing === 'SW' ? -1 : 0);
    if (facing === 'SE' || facing === 'SW') {
      if (isQA || profile.accessory === 'visor') {
        px(-6 + eyeOffX, hy + 3, 12, 3, '#10b981'); // high-tech emerald scanner visor
        px(-5 + eyeOffX, hy + 4, 10, 1, '#6ee7b7'); // laser line
      } else {
        // Eyes (pupil + highlight)
        px(-4 + eyeOffX, hy + 4, 2, 2, '#0f172a');
        px(-4 + eyeOffX, hy + 4, 1, 1, '#ffffff'); // glint
        px(1 + eyeOffX, hy + 4, 2, 2, '#0f172a');
        px(1 + eyeOffX, hy + 4, 1, 1, '#ffffff');

        // Glasses frames
        if (profile.accessory === 'glasses') {
          px(-5 + eyeOffX, hy + 3, 4, 4, '#64748b');
          px(0 + eyeOffX, hy + 3, 4, 4, '#64748b');
          px(-1 + eyeOffX, hy + 4, 2, 1, '#64748b');
        }
      }
    }

    // ── E. HAIR & HEAD ACCESSORIES ───────────────────────────────
    if (profile.hairStyle === 'spiky') {
      px(-7, hy - 4, 14, 5, hairCol);
      px(-5, hy - 6, 4, 3, hairCol);
      px(0, hy - 7, 5, 4, hairCol);
      px(4, hy - 5, 4, 3, hairCol);
    } else if (profile.hairStyle === 'bob') {
      px(-7, hy - 3, 14, 5, hairCol);
      px(-7, hy + 2, 3, 6, hairCol);
      px(5, hy + 2, 3, 6, hairCol);
    } else if (profile.hairStyle === 'crest') {
      px(-4, hy - 7, 8, 8, hairCol);
      px(-2, hy - 9, 5, 4, '#fca5a5'); // fiery crest
    } else if (profile.hairStyle === 'ponytail') {
      px(-7, hy - 3, 14, 5, hairCol);
      px(-9, hy - 1, 3, 8, hairCol); // ponytail trailing
    } else if (profile.hairStyle === 'buzz') {
      px(-6, hy - 2, 12, 3, hairCol);
    } else if (profile.hairStyle === 'punk') {
      px(-3, hy - 7, 6, 8, hairCol);
      px(-2, hy - 8, 4, 3, '#ec4899');
    } else {
      // Default slick parted
      px(-7, hy - 3, 14, 4, hairCol);
      px(-7, hy + 1, 2, 4, hairCol);
    }

    // DevOps / SRE Communication Antenna Beacon
    if (isDevOps) {
      px(5, hy - 8, 2, 7, '#475569'); // antenna stalk
      const blink = Math.sin(time * 8) > 0;
      px(4, hy - 11, 4, 3, blink ? '#c084fc' : '#581c87'); // blinking beacon bulb
    }

    // DJ/Gaming Headphones
    if (profile.accessory === 'headphones') {
      px(-7, hy + 2, 2, 5, '#ef4444');
      px(6, hy + 2, 2, 5, '#ef4444');
      px(-6, hy - 4, 12, 2, '#1e293b'); // headband
    }

    // Master Golden Halo
    if (profile.accessory === 'halo' || profile.role === 'master') {
      ctx.save();
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 6;
      px(-7, hy - 11, 14, 2, '#fbbf24');
      px(-7, hy - 11, 2, 4, '#fbbf24');
      px(5, hy - 11, 2, 4, '#fbbf24');
      ctx.restore();
    }

    // ── F. EMOTE FX (THINK, COMMUNICATE, SUCCESS, ERROR) ─────────
    if (isThinking) {
      // Animated Thought Bubble (...)
      px(8, hy - 10, 14, 8, '#ffffff');
      px(10, hy - 7, 2, 2, '#3b82f6');
      px(14, hy - 7, 2, 2, '#3b82f6');
      px(18, hy - 7, 2, 2, '#3b82f6');
    } else if (isCommunicating) {
      // Blue Soundwave Speech Pulse
      px(8, hy - 10, 12, 8, '#0284c7');
      px(10, hy - 7, 8, 2, '#ffffff');
    } else if (isSuccess) {
      // Golden Stars & Sparkles
      ctx.fillStyle = '#fbbf24';
      px(-12, hy - 8, 3, 3, '#fbbf24');
      px(11, hy - 10, 3, 3, '#fbbf24');
      px(-2, hy - 14, 4, 4, '#fde047');
    } else if (isError) {
      // Red Exclamation Alert
      px(-2, hy - 14, 5, 8, '#ef4444');
      px(0, hy - 13, 2, 4, '#ffffff');
      px(0, hy - 8, 2, 2, '#ffffff');
    }

    ctx.restore();
  }

  // ── 8. BUILT-IN A* PATHFINDING ENGINE ─────────────────────────
  // Navigation grid covering campus coordinates [-10..10, -10..10]
  const GRID_SIZE = 21; // -10 to +10 inclusive
  const OFFSET = 10;

  function toGrid(x, y) {
    return {
      gx: Math.max(0, Math.min(GRID_SIZE - 1, Math.round(x) + OFFSET)),
      gy: Math.max(0, Math.min(GRID_SIZE - 1, Math.round(y) + OFFSET))
    };
  }

  function fromGrid(gx, gy) {
    return {
      x: gx - OFFSET,
      y: gy - OFFSET
    };
  }

  // Determine if a world coordinate is walkable
  function isWalkable(x, y) {
    const rx = Math.round(x);
    const ry = Math.round(y);

    // Obstacle 1: Fênix HQ building footprint (-1..1, -5..-3)
    if (rx >= -1 && rx <= 1 && ry >= -5 && ry <= -3) return false;
    // Obstacle 2: Dev Loft building footprint (4..7, -5..-3)
    if (rx >= 4 && rx <= 7 && ry >= -5 && ry <= -3) return false;
    // Obstacle 3: Research Lab building footprint (-7..-4, 3..5)
    if (rx >= -7 && rx <= -4 && ry >= 3 && ry <= 5) return false;

    // Obstacle 4: Tree footprints
    const treeFootprints = [
      [-4, -4], [-7, -3], [-3, 4], [4, 5], [7, -2], [8, 3], [-7, 6]
    ];
    for (const [tx, ty] of treeFootprints) {
      if (rx === tx && ry === ty) return false;
    }

    // Obstacle 5: Server Rack footprint
    if (rx === -4 && ry === 3) return false;

    return true;
  }

  // A* Pathfinding implementation
  function findPath(startX, startY, targetX, targetY) {
    const start = toGrid(startX, startY);
    const target = toGrid(targetX, targetY);

    if (start.gx === target.gx && start.gy === target.gy) {
      return [{ x: targetX, y: targetY }];
    }

    const openSet = [];
    const openSetMap = new Map();
    const closedSet = new Set();
    const cameFrom = new Map();

    const gScore = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(Infinity));
    const fScore = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(Infinity));

    function key(gx, gy) { return `${gx},${gy}`; }
    function heuristic(gx, gy) {
      return Math.abs(gx - target.gx) + Math.abs(gy - target.gy);
    }

    gScore[start.gx][start.gy] = 0;
    fScore[start.gx][start.gy] = heuristic(start.gx, start.gy);

    openSet.push({ gx: start.gx, gy: start.gy, f: fScore[start.gx][start.gy] });
    openSetMap.set(key(start.gx, start.gy), true);

    while (openSet.length > 0) {
      // Node with lowest fScore
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();
      const curKey = key(current.gx, current.gy);
      openSetMap.delete(curKey);

      if (current.gx === target.gx && current.gy === target.gy) {
        // Reconstruct path
        const path = [];
        let curr = curKey;
        while (cameFrom.has(curr)) {
          const [cx, cy] = curr.split(',').map(Number);
          path.unshift(fromGrid(cx, cy));
          curr = cameFrom.get(curr);
        }
        path.push({ x: targetX, y: targetY });
        return path;
      }

      closedSet.add(curKey);

      // 4 cardinal neighbors
      const neighbors = [
        { gx: current.gx + 1, gy: current.gy },
        { gx: current.gx - 1, gy: current.gy },
        { gx: current.gx, gy: current.gy + 1 },
        { gx: current.gx, gy: current.gy - 1 }
      ];

      for (const n of neighbors) {
        if (n.gx < 0 || n.gx >= GRID_SIZE || n.gy < 0 || n.gy >= GRID_SIZE) continue;
        const nKey = key(n.gx, n.gy);
        if (closedSet.has(nKey)) continue;

        const worldCoord = fromGrid(n.gx, n.gy);
        if (!isWalkable(worldCoord.x, worldCoord.y)) continue;

        const tentativeG = gScore[current.gx][current.gy] + 1;
        if (tentativeG < gScore[n.gx][n.gy]) {
          cameFrom.set(nKey, curKey);
          gScore[n.gx][n.gy] = tentativeG;
          fScore[n.gx][n.gy] = tentativeG + heuristic(n.gx, n.gy);

          if (!openSetMap.has(nKey)) {
            openSet.push({ gx: n.gx, gy: n.gy, f: fScore[n.gx][n.gy] });
            openSetMap.set(nKey, true);
          }
        }
      }
    }

    // Fallback if no path found: direct waypoint
    return [{ x: targetX, y: targetY }];
  }

  // ── 9. INITIALIZATION ────────────────────────────────────────
  function init() {
    if (Cache.ready) return;
    initTiles();
    initArchitecturalFloors();
    initCutawayWalls();
    initProps();
    initWorkstations();
    initBuildings();
    Cache.ready = true;
    console.log('[FênixPixelEngine] 2.5D Living Pixel World pipeline ready with architectural cutaways & procedural floors.');
  }

  // Export engine
  window.FenixPixelEngine = {
    init,
    Cache,
    PALETTE,
    TILE_W,
    TILE_H,
    drawPixelCharacter,
    getProfileForAgent,
    findPath,
    isWalkable
  };

  // Auto-init
  init();

})(window);
