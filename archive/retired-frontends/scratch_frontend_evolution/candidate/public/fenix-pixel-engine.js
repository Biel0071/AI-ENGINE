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

      // Pixel lettering: FENIX
      ctx.fillStyle = '#f8fafc';
      ctx.font = '900 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('FÊNIX HQ', bx, by - 106);
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

      // DEV LOFT Neon Sign
      ctx.save();
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 8;
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DEV LOFT', bx, by - 62);
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

      // RESEARCH LAB Neon Sign
      ctx.save();
      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#9333ea';
      ctx.shadowBlur = 8;
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('RESEARCH LAB', bx, by - 64);
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

      // Neon Sign
      ctx.save();
      ctx.fillStyle = '#e9d5ff';
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 8;
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('AI NEXUS', bx, by - 70);
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

      // Neon Sign
      ctx.save();
      ctx.fillStyle = '#f472b6';
      ctx.shadowColor = '#db2777';
      ctx.shadowBlur = 8;
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DESIGN STUDIO', bx, by - 62);
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

      // Sign
      ctx.save();
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 8;
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DATA VAULT', bx, by - 70);
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

      // Sign
      ctx.save();
      ctx.fillStyle = '#a5b4fc';
      ctx.shadowColor = '#6366f1';
      ctx.shadowBlur = 8;
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('OBSERVATORY', bx, by - 26);
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

      // Sign
      ctx.save();
      ctx.fillStyle = '#22d3ee';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 8;
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CODE FORGE', bx, by - 62);
      ctx.restore();

      Cache.buildings.projectForge = canvas;
    }
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
    initProps();
    initWorkstations();
    initBuildings();
    Cache.ready = true;
    console.log('[FênixPixelEngine] 2.5D Living Pixel World pipeline ready.');
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
