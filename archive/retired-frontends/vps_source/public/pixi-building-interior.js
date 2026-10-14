/**
 * FÊNIX CITY V4.5 — Building Interior System (Art Director Overhaul)
 * High-Fidelity 2.5D Isometric Cutaway Interiors, Floors, Rooms, and Workstations.
 * - Architectural floors (Herringbone parquet, slate, acoustic carpet, obsidian marble).
 * - Cutaway walls with windows showing city skyline, wall sconces, framed schematics.
 * - Workstations with dual monitors, code displays, gaming towers with RGB, chairs, coffee.
 * - Rich room props: Server racks with animated LEDs, glass Kanban boards, plants, espresso bars.
 * - Seated animated characters engaged in live development.
 * - Deep Link: Building -> Floor -> Room -> Station -> Agent -> Mission -> IDE.
 */
(function() {
  'use strict';

  const ISO_TILE_WIDTH = 32;
  const ISO_TILE_HEIGHT = 16;
  const HALF_W = 16;
  const HALF_H = 8;

  function isoGridToScreen(col, row, ox = 0, oy = 0) {
    return {
      x: ox + (col - row) * HALF_W,
      y: oy + (col + row) * HALF_H
    };
  }

  // ── Floor & Room Definitions for Vertical Slice ──
  const BUILDING_INTERIORS = {
    'dev-loft': {
      id: 'dev-loft',
      name: 'ZapAI CRM & Development Center',
      project: 'ZapAI CRM',
      floors: [
        {
          id: 'dev-loft-f1',
          floorNum: 1,
          name: 'Lobby & Infrastructure',
          icon: 'ph-hard-drives',
          theme: 'slate',
          floorCols: 14,
          floorRows: 10,
          rooms: [
            { id: 'reception', name: 'Reception & Welcome', bounds: { c1: 0, r1: 0, c2: 6, r2: 5 }, color: '#1E293B' },
            { id: 'server-room', name: 'Server Vault & VPS', bounds: { c1: 7, r1: 0, c2: 13, r2: 5 }, color: '#0F172A' },
            { id: 'comms-bay', name: 'WhatsApp Gateway Bay', bounds: { c1: 0, r1: 6, c2: 13, r2: 9 }, color: '#064E3B' }
          ],
          props: [
            { type: 'desk', col: 3, row: 2, label: 'Reception Desk' },
            { type: 'server', col: 9, row: 2, label: 'VPS Cluster 01', blink: true },
            { type: 'server', col: 11, row: 2, label: 'Database Storage Node', blink: true },
            { type: 'whatsapp_terminal', col: 6, row: 7, label: 'WhatsApp Baileys Worker' },
            { type: 'espresso', col: 1, row: 1, label: 'Espresso Bar' },
            { type: 'water_cooler', col: 1, row: 3, label: 'Water Cooler' },
            { type: 'plant', col: 5, row: 0, label: 'Monstera Plant' }
          ],
          stations: [
            { id: 'st-devops', col: 9, row: 4, label: 'DevOps Terminal', role: 'devops', agentName: 'DevOps Lead Bruno', module: 'VPS & Docker' },
            { id: 'st-comms', col: 4, row: 7, label: 'WhatsApp Webhook Station', role: 'backend', agentName: 'Gateway Worker Lucas', module: 'Baileys Webhooks' }
          ]
        },
        {
          id: 'dev-loft-f2',
          floorNum: 2,
          name: 'Backend & Database',
          icon: 'ph-code',
          theme: 'wood',
          floorCols: 14,
          floorRows: 10,
          rooms: [
            { id: 'api-room', name: 'API & Microservices', bounds: { c1: 0, r1: 0, c2: 7, r2: 5 }, color: '#451A03' },
            { id: 'auth-room', name: 'Auth & JWT Security', bounds: { c1: 8, r1: 0, c2: 13, r2: 5 }, color: '#311002' },
            { id: 'db-vault', name: 'PostgreSQL Database Vault', bounds: { c1: 0, r1: 6, c2: 13, r2: 9 }, color: '#271206' }
          ],
          props: [
            { type: 'mission_board', col: 4, row: 0, label: 'Sprint Mission Board' },
            { type: 'server', col: 10, row: 7, label: 'PostgreSQL Primary Replica', blink: true },
            { type: 'server', col: 12, row: 7, label: 'Redis Cache Node', blink: true },
            { type: 'plant', col: 0, row: 0, label: 'Ficus Plant' },
            { type: 'espresso', col: 13, row: 0, label: 'Coffee Station' },
            { type: 'filing_cabinet', col: 8, row: 0, label: 'Architecture Specs' }
          ],
          stations: [
            { id: 'st-api-lead', col: 3, row: 3, label: 'API Lead Workstation', role: 'developer', agentName: 'Senior Backend Dev', module: 'REST & GraphQL API', file: 'src/server.js' },
            { id: 'st-auth-dev', col: 10, row: 3, label: 'Auth & Token Engineer', role: 'architect', agentName: 'Security Architect', module: 'JWT / OAuth Service', file: 'src/auth.js' },
            { id: 'st-db-admin', col: 5, row: 8, label: 'Database Optimization Station', role: 'backend', agentName: 'Database Admin', module: 'PostgreSQL Queries', file: 'src/db.js' }
          ]
        },
        {
          id: 'dev-loft-f3',
          floorNum: 3,
          name: 'Frontend & QA Suite',
          icon: 'ph-browsers',
          theme: 'carpet',
          floorCols: 14,
          floorRows: 10,
          rooms: [
            { id: 'ui-lab', name: 'React & UI/UX Lab', bounds: { c1: 0, r1: 0, c2: 6, r2: 5 }, color: '#1E1B4B' },
            { id: 'qa-suite', name: 'Playwright QA Suite', bounds: { c1: 7, r1: 0, c2: 13, r2: 5 }, color: '#064E3B' },
            { id: 'deploy-center', name: 'CI/CD & Deploy Room', bounds: { c1: 0, r1: 6, c2: 13, r2: 9 }, color: '#172554' }
          ],
          props: [
            { type: 'mission_board', col: 3, row: 0, label: 'QA Test Results Board' },
            { type: 'browser_monitor', col: 10, row: 1, label: 'Playwright E2E Headless Display' },
            { type: 'deploy_monolith', col: 7, row: 8, label: 'Production Deploy Pipe' },
            { type: 'plant', col: 13, row: 0, label: 'Monstera Plant' },
            { type: 'espresso', col: 0, row: 4, label: 'Espresso Bar' }
          ],
          stations: [
            { id: 'st-frontend-1', col: 3, row: 3, label: 'UI Engineer Desk', role: 'frontend', agentName: 'Frontend Engineer', module: 'React UI Components', file: 'public/index.html' },
            { id: 'st-qa-lead', col: 10, row: 3, label: 'Automated QA Station', role: 'qa', agentName: 'QA Automation Lead', module: 'Playwright E2E Tests', file: 'qa/pixi-v4-validation.js' },
            { id: 'st-deploy-lead', col: 3, row: 8, label: 'Release Orchestrator', role: 'devops', agentName: 'Release Manager', module: 'Production CI/CD', file: 'docker-compose.yml' }
          ]
        }
      ]
    },
    'fenix-hq': {
      id: 'fenix-hq',
      name: 'FÊNIX Operating System HQ',
      project: 'FÊNIX Core',
      floors: [
        {
          id: 'fenix-f1',
          floorNum: 1,
          name: 'Command Center & Orchestration',
          icon: 'ph-cpu',
          theme: 'obsidian',
          floorCols: 14,
          floorRows: 10,
          rooms: [
            { id: 'master-bridge', name: 'Master Command Bridge', bounds: { c1: 0, r1: 0, c2: 13, r2: 6 }, color: '#0B0F19' },
            { id: 'kernel-vault', name: 'AI Kernel Core Vault', bounds: { c1: 0, r1: 7, c2: 13, r2: 9 }, color: '#030712' }
          ],
          props: [
            { type: 'mission_board', col: 6, row: 0, label: 'Global Fênix Mission Board' },
            { type: 'server', col: 3, row: 8, label: 'AI Gateway Monolith', blink: true },
            { type: 'server', col: 10, row: 8, label: 'Semantic Memory Bank', blink: true },
            { type: 'plant', col: 1, row: 1, label: 'Executive Ficus' },
            { type: 'plant', col: 12, row: 1, label: 'Executive Ficus' }
          ],
          stations: [
            { id: 'st-master-avatar', col: 6, row: 3, label: 'Master Orchestrator Station', role: 'master-avatar', agentName: 'Master Avatar', module: 'Autonomous Core', file: 'src/server.js' },
            { id: 'st-architect-1', col: 2, row: 4, label: 'Systems Architect Desk', role: 'architect', agentName: 'Principal Architect', module: 'Runtime Kernel', file: 'src/kernel.js' }
          ]
        }
      ]
    },
    'research-lab': {
      id: 'research-lab',
      name: 'AI Platform & VPS Inference Hub',
      project: 'API Platform',
      floors: [
        {
          id: 'ai-f1',
          floorNum: 1,
          name: 'Ollama & Model Cluster (VPS 209.50.241.22)',
          icon: 'ph-brain',
          theme: 'slate',
          floorCols: 14,
          floorRows: 10,
          rooms: [
            { id: 'ollama-bay', name: 'Ollama Model Bay (qwen2.5:3b)', bounds: { c1: 0, r1: 0, c2: 7, r2: 5 }, color: '#0F172A' },
            { id: 'vps-uplink', name: 'VPS Satellite Uplink Control', bounds: { c1: 8, r1: 0, c2: 13, r2: 5 }, color: '#1E293B' },
            { id: 'inference-farm', name: 'Neural Tensor Compute Grid', bounds: { c1: 0, r1: 6, c2: 13, r2: 9 }, color: '#090D16' }
          ],
          props: [
            { type: 'server', col: 3, row: 2, label: 'Ollama Cluster Node (qwen2.5:3b)', blink: true },
            { type: 'server', col: 5, row: 2, label: 'Ollama Secondary Replica', blink: true },
            { type: 'browser_monitor', col: 10, row: 1, label: 'VPS Status: 209.50.241.22:3001' },
            { type: 'mission_board', col: 6, row: 6, label: 'Active Inference Queue' },
            { type: 'espresso', col: 0, row: 3, label: 'AI Lab Espresso Machine' },
            { type: 'plant', col: 13, row: 0, label: 'Lab Planter' }
          ],
          stations: [
            { id: 'st-ai-lead', col: 3, row: 4, label: 'AI Inference Engineer', role: 'backend', agentName: 'AI Specialist Leo', module: 'Ollama Qwen 3B Engine', file: 'apps/api/src/server.ts' },
            { id: 'st-vps-lead', col: 10, row: 4, label: 'VPS Infrastructure Lead', role: 'devops', agentName: 'Cluster Operator Iris', module: 'Docker & VPS Gateway', file: 'docker-compose.yml' }
          ]
        },
        {
          id: 'ai-f2',
          floorNum: 2,
          name: 'High-Throughput Gateway & Token Router',
          icon: 'ph-cpu',
          theme: 'obsidian',
          floorCols: 14,
          floorRows: 10,
          rooms: [
            { id: 'gw-control', name: 'FastAPI Gateway Proxy', bounds: { c1: 0, r1: 0, c2: 7, r2: 5 }, color: '#0B0F19' },
            { id: 'redis-vault', name: 'Redis BullMQ Queue Vault', bounds: { c1: 8, r1: 0, c2: 13, r2: 5 }, color: '#161B26' }
          ],
          props: [
            { type: 'server', col: 3, row: 2, label: 'Redis Cache 6380', blink: true },
            { type: 'server', col: 10, row: 2, label: 'Postgres 5433 Node', blink: true },
            { type: 'browser_monitor', col: 6, row: 1, label: 'Swagger API Telemetry' }
          ],
          stations: [
            { id: 'st-gw-arch', col: 4, row: 4, label: 'Gateway Systems Lead', role: 'architect', agentName: 'Gateway Architect Marco', module: 'Multi-Model Router', file: 'packages/gateway/src/index.ts' }
          ]
        }
      ]
    }
  };

  // ── BuildingInteriorSystem ──
  class BuildingInteriorSystem {
    constructor(cityRenderer) {
      this.city = cityRenderer;
      this.app = cityRenderer.app;
      this.activeBuildingId = null;
      this.activeFloorIndex = 0;
      this.container = null;
      this.textures = {};
      this.characters = new Map();
      this.interiorCharacters = [];

      this.init();
    }

    init() {
      if (!this.app) return;

      this.container = new PIXI.Container();
      this.container.visible = false;
      this.container.sortableChildren = true;
      this.app.stage.addChild(this.container);

      this.generateTextures();

      // Animate seated interior characters on ticker
      this.app.ticker.add((ticker) => {
        if (this.container && this.container.visible) {
          const dtMs = ticker.deltaTime * 16.66;
          for (const char of this.interiorCharacters) {
            if (char && char.update) {
              char.update(dtMs, this.city?.camera?.zoom || 2.5);
            }
          }
        }
      });

      // Listen for building enter requests
      document.addEventListener('fenix:city:buildingEnter', (e) => {
        const { buildingId } = e.detail;
        this.enter(buildingId, 0);
      });

      // Listen for level changes from semantic zoom
      document.addEventListener('fenix:city:levelChange', (e) => {
        const { level, context } = e.detail;
        if (level === 'building' && context?.buildingId) {
          this.enter(context.buildingId, context.activeFloor || 0);
        } else if (level === 'floor' && context?.buildingId) {
          this.enter(context.buildingId, context.activeFloor || 0);
        } else if (level === 'city' || level === 'world') {
          this.exit();
        }
      });
    }

    createTexture(width, height, drawFn) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      drawFn(ctx, width, height);
      return PIXI.Texture.from(canvas);
    }

    drawIsoDiamond(ctx, cx, cy, w, h) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + w/2, cy + h/2);
      ctx.lineTo(cx, cy + h);
      ctx.lineTo(cx - w/2, cy + h/2);
      ctx.closePath();
    }

    generateTextures() {
      // 1. Herringbone Parquet Wood Floor
      this.textures.floorWood = this.createTexture(32, 16, (ctx, w, h) => {
        ctx.fillStyle = '#78350F';
        this.drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.fill();

        // Parquet planks pattern
        ctx.strokeStyle = '#92400E';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w/4, h/4); ctx.lineTo(w*3/4, h*3/4);
        ctx.moveTo(w/2, 0); ctx.lineTo(w/2, h);
        ctx.stroke();

        ctx.strokeStyle = '#5A2609';
        ctx.lineWidth = 0.5;
        this.drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.stroke();
      });

      // 2. Architectural Slate Floor
      this.textures.floorSlate = this.createTexture(32, 16, (ctx, w, h) => {
        ctx.fillStyle = '#1E293B';
        this.drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.fill();

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(w/4, h/4); ctx.lineTo(w*3/4, h*3/4);
        ctx.stroke();

        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1;
        this.drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.stroke();
      });

      // 3. Acoustic Woven Office Carpet
      this.textures.floorCarpet = this.createTexture(32, 16, (ctx, w, h) => {
        ctx.fillStyle = '#1E1B4B';
        this.drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.fill();

        ctx.strokeStyle = '#312E81';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(w/4, h/4); ctx.lineTo(w*3/4, h*3/4);
        ctx.moveTo(w*3/4, h/4); ctx.lineTo(w/4, h*3/4);
        ctx.stroke();

        ctx.strokeStyle = '#17143A';
        ctx.lineWidth = 1;
        this.drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.stroke();
      });

      // 4. Executive Obsidian Marble Floor
      this.textures.floorObsidian = this.createTexture(32, 16, (ctx, w, h) => {
        ctx.fillStyle = '#0B0F19';
        this.drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.fill();

        // Cyan subtle neon grid border
        ctx.strokeStyle = '#0284C7';
        ctx.lineWidth = 0.5;
        this.drawIsoDiamond(ctx, w/2, 0, w, h);
        ctx.stroke();

        // Polished marble reflection streak
        ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.fillRect(w/2 - 4, h/2 - 1, 8, 2);
      });

      // 5. North-East Cutaway Wall Module (dx=16, dy=8, height=48, total=16x56)
      this.textures.wallNE = this.createTexture(16, 56, (ctx, w, h) => {
        // Upper wall panel (slate navy)
        ctx.fillStyle = '#1E2536';
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(16, 8);
        ctx.lineTo(16, 42); ctx.lineTo(0, 34);
        ctx.closePath();
        ctx.fill();

        // Wainscoting baseboard (dark mahogany)
        ctx.fillStyle = '#2E1508';
        ctx.beginPath();
        ctx.moveTo(0, 34); ctx.lineTo(16, 42);
        ctx.lineTo(16, 56); ctx.lineTo(0, 48);
        ctx.closePath();
        ctx.fill();

        // Polished brass wainscot divider rail
        ctx.strokeStyle = '#B45309';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 34); ctx.lineTo(16, 42);
        ctx.stroke();

        // Top wall cap showing 3D depth
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(16, 8);
        ctx.stroke();

        // Architectural Window with Night City View
        ctx.fillStyle = '#090D16';
        ctx.beginPath();
        ctx.moveTo(3, 10); ctx.lineTo(13, 15);
        ctx.lineTo(13, 29); ctx.lineTo(3, 24);
        ctx.closePath();
        ctx.fill();

        // Distant illuminated skyscrapers in window
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(5, 14, 2, 8);
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(9, 17, 2, 9);
      });

      // 6. North-West Cutaway Wall Module (dx=-16, dy=8, height=48, total=16x56)
      this.textures.wallNW = this.createTexture(16, 56, (ctx, w, h) => {
        // Upper wall panel (shaded slate)
        ctx.fillStyle = '#161C2A';
        ctx.beginPath();
        ctx.moveTo(16, 0); ctx.lineTo(0, 8);
        ctx.lineTo(0, 42); ctx.lineTo(16, 34);
        ctx.closePath();
        ctx.fill();

        // Wainscoting baseboard (dark mahogany shadow)
        ctx.fillStyle = '#220E05';
        ctx.beginPath();
        ctx.moveTo(16, 34); ctx.lineTo(0, 42);
        ctx.lineTo(0, 56); ctx.lineTo(16, 48);
        ctx.closePath();
        ctx.fill();

        // Wainscot rail
        ctx.strokeStyle = '#92400E';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(16, 34); ctx.lineTo(0, 42);
        ctx.stroke();

        // Top wall cap
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(16, 0); ctx.lineTo(0, 8);
        ctx.stroke();

        // Wall sconce with warm light
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(7, 18, 2, 3);
        ctx.fillStyle = 'rgba(254, 240, 138, 0.2)';
        ctx.beginPath();
        ctx.moveTo(8, 14); ctx.lineTo(3, 25); ctx.lineTo(13, 25);
        ctx.closePath();
        ctx.fill();
      });

      // 6b. Corner Architectural Pillar (8x56)
      this.textures.wallCorner = this.createTexture(8, 56, (ctx, w, h) => {
        ctx.fillStyle = '#0F131D';
        ctx.fillRect(0, 0, 4, 56);
        ctx.fillStyle = '#1E2536';
        ctx.fillRect(4, 0, 4, 56);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, 8, 56);
      });

      // 7. Workstation (Dual Monitor, Chair, Keyboard, PC Tower, Coffee) (42x36)
      this.textures.workstation = this.createTexture(42, 36, (ctx, w, h) => {
        const cx = Math.floor(w / 2);
        const cy = h - 6;

        // Ground shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 2, 16, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Curved Wood Desk Surface
        ctx.fillStyle = '#B45309';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 10);
        ctx.lineTo(cx + 16, cy - 18);
        ctx.lineTo(cx, cy - 26);
        ctx.lineTo(cx - 16, cy - 18);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Metallic Trim Edge
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx - 16, cy - 18);
        ctx.lineTo(cx, cy - 10);
        ctx.lineTo(cx + 16, cy - 18);
        ctx.stroke();

        // Desk Steel Legs
        ctx.fillStyle = '#18181B';
        ctx.fillRect(cx - 15, cy - 18, 2, 16);
        ctx.fillRect(cx + 13, cy - 18, 2, 16);
        ctx.fillRect(cx - 1, cy - 10, 2, 10);

        // PC Gaming Tower on Floor with RGB Glow
        ctx.fillStyle = '#090D16';
        ctx.fillRect(cx + 10, cy - 8, 6, 10);
        ctx.fillStyle = '#00F0FF';
        ctx.fillRect(cx + 11, cy - 6, 4, 3); // RGB fan glow

        // Ergonomic Mesh Chair
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(cx - 6, cy - 14, 12, 9);
        ctx.fillStyle = '#0284C7';
        ctx.fillRect(cx - 5, cy - 13, 10, 5); // seat pad
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(cx - 1, cy - 5, 2, 6); // chair cylinder

        // Primary Widescreen Monitor (Code Editor with Cyan/Green text)
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(cx - 12, cy - 31, 14, 10);
        ctx.fillStyle = '#00F0FF';
        ctx.fillRect(cx - 11, cy - 30, 12, 8);
        // Syntax highlighted code lines
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cx - 10, cy - 28, 5, 1);
        ctx.fillRect(cx - 10, cy - 26, 8, 1);
        ctx.fillStyle = '#22C55E';
        ctx.fillRect(cx - 8, cy - 24, 7, 1);

        // Secondary Vertical Monitor (Terminal with Amber text)
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(cx + 3, cy - 33, 8, 13);
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(cx + 4, cy - 32, 6, 11);
        ctx.fillStyle = '#000000';
        ctx.fillRect(cx + 5, cy - 30, 4, 1);
        ctx.fillRect(cx + 5, cy - 28, 4, 1);
        ctx.fillRect(cx + 5, cy - 26, 3, 1);

        // Backlit Mechanical Keyboard & Mouse
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(cx - 5, cy - 18, 9, 3);
        ctx.fillStyle = '#00F0FF';
        ctx.fillRect(cx - 4, cy - 17, 7, 1); // underglow
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(cx + 6, cy - 17, 2, 2); // mouse

        // Steaming Coffee Mug
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(cx - 14, cy - 21, 3, 3);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cx - 13, cy - 23, 1, 2); // steam

        // Desk Lamp with Warm Light Cone
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(cx + 12, cy - 25, 2, 6);
        ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
        ctx.beginPath();
        ctx.ellipse(cx + 5, cy - 18, 7, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // 8. Server Rack Monolith
      this.textures.server = this.createTexture(28, 44, (ctx, w, h) => {
        const cx = Math.floor(w / 2);
        const cy = h - 4;

        ctx.fillStyle = 'rgba(0,0,0,0.38)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0B0F19';
        ctx.fillRect(cx - 9, cy - 38, 18, 38);
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 9, cy - 38, 18, 38);

        for (let i = 0; i < 5; i++) {
          const by = cy - 34 + i * 7;
          ctx.fillStyle = '#1E293B';
          ctx.fillRect(cx - 7, by, 14, 5);
          ctx.fillStyle = (i % 2 === 0) ? '#22C55E' : '#38BDF8';
          ctx.fillRect(cx - 5, by + 1, 2, 2);
          ctx.fillStyle = (i === 2) ? '#F59E0B' : '#22C55E';
          ctx.fillRect(cx - 1, by + 1, 2, 2);
          ctx.fillStyle = '#38BDF8';
          ctx.fillRect(cx + 3, by + 1, 2, 2);
        }
      });

      // 9. Glass Kanban Mission Board
      this.textures.missionBoard = this.createTexture(40, 32, (ctx, w, h) => {
        const cx = Math.floor(w / 2);
        const cy = h - 4;

        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(cx - 18, cy - 26, 36, 22);
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - 18, cy - 26, 36, 22);

        // Multi-colored Sprint Post-it Notes
        ctx.fillStyle = '#FACC15'; // To Do
        ctx.fillRect(cx - 15, cy - 23, 6, 5);
        ctx.fillRect(cx - 15, cy - 15, 6, 5);
        ctx.fillStyle = '#38BDF8'; // In Progress
        ctx.fillRect(cx - 5, cy - 23, 6, 5);
        ctx.fillRect(cx - 5, cy - 15, 6, 5);
        ctx.fillStyle = '#4ADE80'; // Succeeded
        ctx.fillRect(cx + 5, cy - 23, 6, 5);
        ctx.fillRect(cx + 5, cy - 15, 6, 5);
      });

      // 10. Breakroom Espresso Bar
      this.textures.espresso = this.createTexture(28, 32, (ctx, w, h) => {
        const cx = Math.floor(w / 2);
        const cy = h - 4;

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Counter cabinet
        ctx.fillStyle = '#3E1A11';
        ctx.fillRect(cx - 8, cy - 16, 16, 16);
        ctx.fillStyle = '#CBD5E1';
        ctx.fillRect(cx - 10, cy - 18, 20, 2); // marble top

        // Chrome machine
        ctx.fillStyle = '#94A3B8';
        ctx.fillRect(cx - 6, cy - 26, 12, 8);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cx - 4, cy - 28, 1, 2); // steam
      });

      // 11. Water Cooler
      this.textures.waterCooler = this.createTexture(18, 30, (ctx, w, h) => {
        const cx = Math.floor(w / 2);
        const cy = h - 4;

        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(cx - 4, cy - 16, 8, 16);
        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.arc(cx, cy - 20, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      // 12. Potted Monstera Plant
      this.textures.plant = this.createTexture(24, 32, (ctx, w, h) => {
        const cx = Math.floor(w / 2);
        const cy = h - 4;

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 9, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // White ceramic pot
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(cx - 5, cy - 10, 10, 10);
        ctx.fillStyle = '#CBD5E1';
        ctx.fillRect(cx - 5, cy - 10, 10, 2);

        // Lush green monstera foliage
        ctx.fillStyle = '#15803D';
        ctx.beginPath();
        ctx.arc(cx, cy - 16, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22C55E';
        ctx.beginPath();
        ctx.arc(cx - 3, cy - 19, 5, 0, Math.PI * 2);
        ctx.arc(cx + 4, cy - 15, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // 13. Steel Filing Cabinet
      this.textures.filingCabinet = this.createTexture(22, 30, (ctx, w, h) => {
        const cx = Math.floor(w / 2);
        const cy = h - 4;

        ctx.fillStyle = '#475569';
        ctx.fillRect(cx - 6, cy - 22, 12, 22);
        ctx.fillStyle = '#64748B';
        ctx.fillRect(cx - 5, cy - 20, 10, 5);
        ctx.fillRect(cx - 5, cy - 13, 10, 5);
        ctx.fillRect(cx - 5, cy - 6, 10, 5);
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(cx - 1, cy - 18, 2, 1);
        ctx.fillRect(cx - 1, cy - 11, 2, 1);
        ctx.fillRect(cx - 1, cy - 4, 2, 1);
      });

      // 14. WhatsApp Terminal
      this.textures.whatsapp = this.createTexture(32, 32, (ctx, w, h) => {
        const cx = Math.floor(w / 2);
        const cy = h - 6;

        ctx.fillStyle = '#111827';
        ctx.fillRect(cx - 10, cy - 22, 20, 16);
        ctx.strokeStyle = '#22C55E';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 10, cy - 22, 20, 16);

        ctx.fillStyle = '#22C55E';
        ctx.beginPath();
        ctx.arc(cx, cy - 14, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 5px sans-serif';
        ctx.fillText('W', cx - 2, cy - 12);
      });
    }

    enter(buildingId, floorIndex = 0) {
      const bldData = BUILDING_INTERIORS[buildingId] || BUILDING_INTERIORS['dev-loft'];
      this.activeBuildingId = buildingId;
      this.activeFloorIndex = Math.max(0, Math.min(floorIndex, bldData.floors.length - 1));

      if (this.city && this.city.worldContainer) {
        this.city.worldContainer.visible = false;
      }

      this.container.visible = true;
      this.renderFloor(bldData, this.activeFloorIndex);

      const floor = bldData.floors[this.activeFloorIndex];
      const centerScreen = isoGridToScreen(floor.floorCols / 2, floor.floorRows / 2);
      if (this.city) {
        this.city.camera.x = centerScreen.x;
        this.city.camera.y = centerScreen.y;
        this.city.targetCamera.x = centerScreen.x;
        this.city.targetCamera.y = centerScreen.y;
        this.city.camera.zoom = 2.4;
        this.city.targetCamera.zoom = 2.4;
      }

      this.renderFloorSelectorUI(bldData);
      this.renderBreadcrumbUI(bldData, floor);
    }

    renderFloor(building, floorIdx) {
      this.container.removeChildren();
      this.interiorCharacters = [];

      const floor = building.floors[floorIdx];
      const floorTheme = floor.theme || 'wood';
      const floorTex = (floorTheme === 'wood') ? this.textures.floorWood :
                       (floorTheme === 'slate') ? this.textures.floorSlate :
                       (floorTheme === 'obsidian') ? this.textures.floorObsidian :
                       this.textures.floorCarpet;

      // 0. Ground Floor Foundation Mat & Ambient Architectural Shadow
      const slabShadow = new PIXI.Graphics();
      const pTop = isoGridToScreen(0, 0);
      const pRight = isoGridToScreen(floor.floorCols, 0);
      const pBottom = isoGridToScreen(floor.floorCols, floor.floorRows);
      const pLeft = isoGridToScreen(0, floor.floorRows);

      slabShadow.poly([
        pTop.x, pTop.y - 20,
        pRight.x + 30, pRight.y + 4,
        pBottom.x, pBottom.y + 36,
        pLeft.x - 30, pLeft.y + 4
      ]);
      slabShadow.fill({ color: 0x060913, alpha: 0.9 });
      slabShadow.stroke({ color: 0x0284C7, width: 1, alpha: 0.25 });
      slabShadow.zIndex = -1200;
      this.container.addChild(slabShadow);

      // 1. Render Architectural Floor Slab
      for (let r = 0; r < floor.floorRows; r++) {
        for (let c = 0; c < floor.floorCols; c++) {
          const tile = new PIXI.Sprite(floorTex);
          tile.anchor.set(0.5, 0);
          const pos = isoGridToScreen(c, r);
          tile.x = Math.round(pos.x);
          tile.y = Math.round(pos.y);
          tile.zIndex = -1000 + (c + r);
          this.container.addChild(tile);
        }
      }

      // 1b. Floor Slab Extruded 3D Facet (Architectural Depth)
      const slabGraphics = new PIXI.Graphics();
      const pCornerLeft = isoGridToScreen(0, floor.floorRows - 1);
      const pCornerBottom = isoGridToScreen(floor.floorCols - 1, floor.floorRows - 1);
      const pCornerRight = isoGridToScreen(floor.floorCols - 1, 0);

      // Left front slab edge (dark shaded concrete/wood)
      slabGraphics.poly([
        pCornerLeft.x - 16, pCornerLeft.y + 8,
        pCornerBottom.x, pCornerBottom.y + 16,
        pCornerBottom.x, pCornerBottom.y + 24,
        pCornerLeft.x - 16, pCornerLeft.y + 16
      ]);
      slabGraphics.fill({ color: 0x18100A });
      slabGraphics.stroke({ color: 0x0F0804, width: 1 });

      // Right front slab edge (medium shaded facet)
      slabGraphics.poly([
        pCornerBottom.x, pCornerBottom.y + 16,
        pCornerRight.x + 16, pCornerRight.y + 8,
        pCornerRight.x + 16, pCornerRight.y + 16,
        pCornerBottom.x, pCornerBottom.y + 24
      ]);
      slabGraphics.fill({ color: 0x2E1E14 });
      slabGraphics.stroke({ color: 0x18100A, width: 1 });

      slabGraphics.zIndex = -950;
      this.container.addChild(slabGraphics);

      // 2. Render Seamless Cutaway Back Walls with Windows and Sconces
      // North-East Wall (along c from 0 to floorCols - 1)
      for (let c = 0; c < floor.floorCols; c++) {
        const wall = new PIXI.Sprite(this.textures.wallNE);
        wall.x = Math.round(c * 16);
        wall.y = Math.round(c * 8 - 48);
        wall.zIndex = -990 + c;
        this.container.addChild(wall);
      }

      // North-West Wall (along r from 0 to floorRows - 1)
      for (let r = 0; r < floor.floorRows; r++) {
        const wall = new PIXI.Sprite(this.textures.wallNW);
        wall.x = Math.round(-(r + 1) * 16);
        wall.y = Math.round(r * 8 - 48);
        wall.zIndex = -990 + r;
        this.container.addChild(wall);
      }

      // Corner Architectural Pillar at (0, 0)
      const corner = new PIXI.Sprite(this.textures.wallCorner);
      corner.x = -4;
      corner.y = -48;
      corner.zIndex = -985;
      this.container.addChild(corner);

      // 3. Render Architectural Room Zones & Hotspots (Gate 07)
      if (floor.rooms) {
        for (const rm of floor.rooms) {
          const midC = (rm.bounds.c1 + rm.bounds.c2) / 2;
          const midR = (rm.bounds.r1 + rm.bounds.r2) / 2;
          const pos = isoGridToScreen(midC, midR);

          // Subtle floor area runner outline (Clean Game World, No harsh text clutter)
          const p1 = isoGridToScreen(rm.bounds.c1, rm.bounds.r1);
          const p2 = isoGridToScreen(rm.bounds.c2 + 1, rm.bounds.r1);
          const p3 = isoGridToScreen(rm.bounds.c2 + 1, rm.bounds.r2 + 1);
          const p4 = isoGridToScreen(rm.bounds.c1, rm.bounds.r2 + 1);

          const zoneG = new PIXI.Graphics();
          zoneG.poly([
            p1.x, p1.y,
            p2.x, p2.y,
            p3.x, p3.y,
            p4.x, p4.y
          ]);
          zoneG.stroke({ color: 0x00F0FF, width: 1, alpha: 0.22 });
          zoneG.fill({ color: 0x0284C7, alpha: 0.04 });
          zoneG.zIndex = -920;
          zoneG.eventMode = 'static';
          zoneG.cursor = 'pointer';
          zoneG.on('pointertap', () => {
            this.showRoomInspector(rm, building, floor);
          });
          this.container.addChild(zoneG);

          // Sleek interactive room hotspot badge (mounted cleanly on cutaway perimeter wall)
          const badge = new PIXI.Container();
          let badgeX = 0, badgeY = 0;
          if (rm.bounds.r1 === 0) {
            // Back North-East wall (above wall height, off desks)
            const cMid = (rm.bounds.c1 + rm.bounds.c2) / 2;
            const wallPos = isoGridToScreen(cMid, 0);
            badgeX = Math.round(wallPos.x);
            badgeY = Math.round(wallPos.y - 54);
          } else if (rm.bounds.c1 === 0) {
            // Back North-West wall
            const rMid = (rm.bounds.r1 + rm.bounds.r2) / 2;
            const wallPos = isoGridToScreen(0, rMid);
            badgeX = Math.round(wallPos.x - 30);
            badgeY = Math.round(wallPos.y - 36);
          } else {
            const wallPos = isoGridToScreen(rm.bounds.c1, rm.bounds.r1);
            badgeX = Math.round(wallPos.x);
            badgeY = Math.round(wallPos.y - 42);
          }

          badge.x = badgeX;
          badge.y = badgeY;
          badge.zIndex = -850;
          badge.eventMode = 'static';
          badge.cursor = 'pointer';

          const bg = new PIXI.Graphics();
          const labelText = `🚪 ${rm.name}`;
          const pillW = Math.min(74, Math.max(50, rm.name.length * 4.6 + 18));
          bg.roundRect(-pillW / 2, -7, pillW, 14, 4);
          bg.fill({ color: 0x090D16, alpha: 0.90 });
          bg.stroke({ color: 0x38BDF8, width: 0.8, alpha: 0.75 });
          badge.addChild(bg);

          const label = new PIXI.Text({
            text: labelText,
            style: {
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: 5.5,
              fontWeight: 'bold',
              fill: '#E0F2FE',
              align: 'center'
            }
          });
          label.anchor.set(0.5, 0.5);
          badge.addChild(label);

          badge.on('pointertap', () => {
            this.showRoomInspector(rm, building, floor);
          });

          this.container.addChild(badge);
        }
      }

      // 4. Render Architectural Props
      if (floor.props) {
        for (const p of floor.props) {
          let tex = this.textures.server;
          if (p.type === 'mission_board') tex = this.textures.missionBoard;
          else if (p.type === 'whatsapp_terminal') tex = this.textures.whatsapp;
          else if (p.type === 'plant') tex = this.textures.plant;
          else if (p.type === 'espresso') tex = this.textures.espresso;
          else if (p.type === 'water_cooler') tex = this.textures.waterCooler;
          else if (p.type === 'filing_cabinet') tex = this.textures.filingCabinet;

          const sprite = new PIXI.Sprite(tex);
          sprite.anchor.set(0.5, 1);
          const pos = isoGridToScreen(p.col, p.row);
          sprite.x = Math.round(pos.x);
          sprite.y = Math.round(pos.y + ISO_TILE_HEIGHT / 2);
          sprite.zIndex = sprite.y;
          sprite.eventMode = 'static';
          sprite.cursor = 'pointer';

          sprite.on('pointertap', () => {
            if (p.type === 'mission_board') {
              BuildingInteriorSystem.openMissionModal();
            } else if (p.type === 'server') {
              window.location.hash = '#telemetry';
            } else if (p.type === 'whatsapp_terminal') {
              window.location.hash = '#automations';
            }
          });

          this.container.addChild(sprite);
        }
      }

      // 5. Render Workstations & Animated Seated Characters (Gate 06)
      if (floor.stations) {
        for (const st of floor.stations) {
          const pos = isoGridToScreen(st.col, st.row);
          const deskY = Math.round(pos.y + ISO_TILE_HEIGHT / 2);

          // Animated character sitting at workstation (BEHIND desk surface & monitors)
          if (window.FenixCharacterSystem && window.FenixCharacterSystem.CityCharacter) {
            const charCache = this.city?.charCache || new window.FenixCharacterSystem.CharacterTextureCache(this.app);
            const char = new window.FenixCharacterSystem.CityCharacter({
              id: st.id,
              name: st.agentName,
              role: st.role || 'developer',
              isSeated: true // Keeps room walls clean from floating labels
            }, charCache);

            char.setState(window.FenixCharacterSystem.CHAR_STATES.WORK);
            char.sprite.x = Math.round(pos.x);
            char.sprite.y = deskY - 8;
            char.sprite.zIndex = deskY - 1;
            char.sprite.eventMode = 'static';
            char.sprite.cursor = 'pointer';

            char.sprite.on('pointertap', (e) => {
              e.stopPropagation();
              this.showStationInspector(st, building, floor);
            });

            this.container.addChild(char.sprite);
            this.interiorCharacters.push(char);
          }

          // Workstation desk (in foreground: monitors, keyboard, desk surface)
          const desk = new PIXI.Sprite(this.textures.workstation);
          desk.anchor.set(0.5, 1);
          desk.x = Math.round(pos.x);
          desk.y = deskY;
          desk.zIndex = deskY;
          desk.eventMode = 'static';
          desk.cursor = 'pointer';

          desk.on('pointertap', () => {
            this.showStationInspector(st, building, floor);
          });

          this.container.addChild(desk);
        }
      }

      this.container.sortChildren();
    }

    // ── Room Inspector (Gate 07) ──
    showRoomInspector(room, building, floor) {
      const inspector = document.getElementById('cityInspector');
      if (!inspector) return;

      this.renderBreadcrumbUI(building, floor, room);

      const roomStations = (floor.stations || []).filter(st =>
        st.col >= room.bounds.c1 && st.col <= room.bounds.c2 &&
        st.row >= room.bounds.r1 && st.row <= room.bounds.r2
      );

      const targetFile = roomStations[0]?.file || 'src/server.js';

      const html = `
        <div class="inspector-header">
          <h3>🚪 ${room.name}</h3>
          <button class="inspector-close" onclick="document.getElementById('cityInspector').classList.remove('open')">&times;</button>
        </div>
        <div class="inspector-section">
          <h4>Room Context</h4>
          <div class="inspector-row"><span class="label">Building</span><span class="value">${building.name}</span></div>
          <div class="inspector-row"><span class="label">Floor</span><span class="value">${floor.name}</span></div>
          <div class="inspector-row"><span class="label">Module</span><span class="value">${room.name}</span></div>
          <div class="inspector-row"><span class="label">Workstations</span><span class="value">${roomStations.length} Active</span></div>
        </div>
        <div class="inspector-section">
          <h4>Hosted Stations & Agents</h4>
          ${roomStations.map(st => `
            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:4px;padding:6px 8px;margin-bottom:6px;">
              <div style="font-weight:600;font-size:11px;color:#f1f5f9;">${st.label}</div>
              <div style="font-size:10px;color:#38bdf8;">👤 ${st.agentName} (${st.role})</div>
              ${st.file ? `<div style="font-size:9px;color:#94a3b8;font-family:monospace;margin-top:2px;">${st.file}</div>` : ''}
            </div>
          `).join('')}
        </div>
        <div class="inspector-actions" style="margin-top:16px;display:flex;flex-direction:column;gap:8px">
          <button style="background:#0284c7;color:#fff;font-weight:600;padding:10px;border-radius:6px;border:none;cursor:pointer"
                  onclick="window.BuildingInteriorSystem?.openIDE('${targetFile}')">
            💻 OPEN ROOM CODE IN IDE
          </button>
          <button style="background:#047857;color:#fff;font-weight:600;padding:8px;border-radius:6px;border:none;cursor:pointer"
                  onclick="window.BuildingInteriorSystem?.openAppPreview('${building.project || 'ZapAI CRM'}')">
            🌐 OPEN APPLICATION
          </button>
          <button style="background:#1e293b;color:#e2e8f0;padding:8px;border-radius:6px;border:1px solid rgba(148,163,184,0.2);cursor:pointer"
                  onclick="window.BuildingInteriorSystem?.openMissionModal()">
            📋 VIEW ROOM MISSIONS
          </button>
        </div>
      `;

      inspector.innerHTML = html;
      inspector.style.display = 'block';
      inspector.classList.add('open');
    }

    // ── Station Inspector & IDE Deep Link (Gate 06, 10, 12) ──
    showStationInspector(station, building, floor) {
      const inspector = document.getElementById('cityInspector');
      if (!inspector) return;

      const html = `
        <div class="inspector-header">
          <h3>🖥️ ${station.label}</h3>
          <button class="inspector-close" onclick="document.getElementById('cityInspector').classList.remove('open')">&times;</button>
        </div>
        <div class="inspector-section">
          <h4>Station Context</h4>
          <div class="inspector-row"><span class="label">Building</span><span class="value">${building.name}</span></div>
          <div class="inspector-row"><span class="label">Floor</span><span class="value">${floor.name}</span></div>
          <div class="inspector-row"><span class="label">Module</span><span class="value">${station.module}</span></div>
          <div class="inspector-row"><span class="label">Assigned Agent</span><span class="value">${station.agentName}</span></div>
          <div class="inspector-row"><span class="label">Role</span><span class="value">${station.role.toUpperCase()}</span></div>
          ${station.file ? `<div class="inspector-row"><span class="label">Source File</span><span class="value" style="color:#38bdf8;font-family:monospace">${station.file}</span></div>` : ''}
        </div>
        <div class="inspector-section">
          <h4>Live Activity</h4>
          <div style="font-size:11px;color:#94a3b8;line-height:1.5">
            Agent <b style="color:#e2e8f0">${station.agentName}</b> is currently executing tasks in <b style="color:#38bdf8">${station.module}</b>.
          </div>
        </div>
        <div class="inspector-actions" style="margin-top:16px;display:flex;flex-direction:column;gap:8px">
          <button style="background:#0284c7;color:#fff;font-weight:600;padding:10px;border-radius:6px;border:none;cursor:pointer"
                  onclick="window.BuildingInteriorSystem?.openIDE('${station.file || ''}')">
            💻 OPEN IN IDE / CODE
          </button>
          <button style="background:#047857;color:#fff;font-weight:600;padding:8px;border-radius:6px;border:none;cursor:pointer"
                  onclick="window.BuildingInteriorSystem?.openAppPreview('${building.project || 'ZapAI CRM'}')">
            🌐 OPEN APPLICATION
          </button>
          <button style="background:#1e293b;color:#e2e8f0;padding:8px;border-radius:6px;border:1px solid rgba(148,163,184,0.2);cursor:pointer"
                  onclick="window.BuildingInteriorSystem?.openMissionModal()">
            📋 VIEW ACTIVE MISSIONS
          </button>
        </div>
      `;

      inspector.innerHTML = html;
      inspector.style.display = 'block';
      inspector.classList.add('open');
    }

    static openIDE(filePath) {
      console.log('[BuildingInterior] Deep linking to IDE at file:', filePath);
      const ideNav = document.querySelector('[data-nav="ide"]');
      if (ideNav) {
        ideNav.click();
      } else {
        window.location.hash = '#workflows';
      }

      setTimeout(() => {
        if (typeof window.openFile === 'function' && filePath) {
          window.openFile(filePath);
        } else if (window.fenixVisualIDE && filePath) {
          window.fenixVisualIDE.openFile?.(filePath);
        }
      }, 200);
    }

    static openAppPreview(projectName = 'ZapAI CRM') {
      let modal = document.getElementById('fenixAppPreviewModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'fenixAppPreviewModal';
        modal.className = 'fenix-app-preview-modal';
        document.body.appendChild(modal);
      }

      const isAiPlatform = /API Platform|Research/i.test(projectName);
      const isZapAI = /ZapAI/i.test(projectName);
      let previewSrc = isAiPlatform 
        ? 'http://209.50.241.22:8081/' 
        : (isZapAI ? 'http://209.50.241.22/' : '/app?preview=true');

      let tabsHtml = '';
      if (isAiPlatform) {
        tabsHtml = `
          <button id="btnAiDash" style="padding:4px 8px;background:#0369a1;color:#fff;border:1px solid #38bdf8;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600;">⚡ Enterprise Dashboard (8081)</button>
          <button id="btnAiDocs" style="padding:4px 8px;background:#0f172a;color:#94a3b8;border:1px solid rgba(255,255,255,0.2);border-radius:4px;cursor:pointer;font-size:11px;">📖 Swagger API Docs</button>
          <button id="btnAiHealth" style="padding:4px 8px;background:#0f172a;color:#94a3b8;border:1px solid rgba(255,255,255,0.2);border-radius:4px;cursor:pointer;font-size:11px;">🩺 Engine Health</button>
        `;
      } else if (isZapAI) {
        tabsHtml = `
          <button id="btnZaiLive" style="padding:4px 8px;background:#059669;color:#fff;border:1px solid #10b981;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600;">💬 ZAI WhatsApp Live (80)</button>
          <button id="btnZaiLocal" style="padding:4px 8px;background:#0f172a;color:#94a3b8;border:1px solid rgba(255,255,255,0.2);border-radius:4px;cursor:pointer;font-size:11px;">📱 Local Sandbox</button>
        `;
      } else {
        tabsHtml = `
          <button id="btnFenixApp" style="padding:4px 8px;background:#6366f1;color:#fff;border:1px solid #818cf8;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600;">🏙️ Fênix OS Digital Twin</button>
          <button id="btnFenixCmd" style="padding:4px 8px;background:#0f172a;color:#94a3b8;border:1px solid rgba(255,255,255,0.2);border-radius:4px;cursor:pointer;font-size:11px;">📊 Command Center</button>
        `;
      }

      modal.innerHTML = `
        <div class="fenix-app-preview-head">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:16px;">🌐</span>
            <span style="font-weight:700;color:#fff;font-size:13px;">${projectName} — LIVE APPLICATION PREVIEW</span>
            <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:#059669;color:#fff;font-weight:700;">LIVE</span>
            <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:#3b82f6;color:#fff;font-weight:600;">VPS: 209.50.241.22</span>
            <div style="display:flex;gap:4px;margin-left:8px;">${tabsHtml}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <button id="btnVpDesktop" style="padding:4px 10px;background:#1e293b;border:1px solid #38bdf8;color:#fff;border-radius:4px;cursor:pointer;font-size:11px;">🖥️ Desktop (1280px)</button>
            <button id="btnVpTablet" style="padding:4px 10px;background:#0f172a;border:1px solid rgba(255,255,255,0.2);color:#94a3b8;border-radius:4px;cursor:pointer;font-size:11px;">📱 Tablet (768px)</button>
            <button id="btnVpMobile" style="padding:4px 10px;background:#0f172a;border:1px solid rgba(255,255,255,0.2);color:#94a3b8;border-radius:4px;cursor:pointer;font-size:11px;">📱 Mobile (390px)</button>
            <button id="btnToggleVpsChat" style="padding:4px 10px;background:#0284c7;border:1px solid #38bdf8;color:#fff;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600;">💬 Conversar com Fênix (VPS)</button>
            <button onclick="document.getElementById('fenixAppPreviewModal').style.display='none'" style="background:none;border:none;color:#94a3b8;font-size:18px;cursor:pointer;padding:4px 8px;">&times;</button>
          </div>
        </div>
        <div class="fenix-app-preview-stage" style="display:flex;position:relative;">
          <div class="fenix-app-viewport" id="fenixAppViewport" style="flex:1;">
            <iframe id="previewIframe" src="${previewSrc}" style="width:100%;height:100%;border:none;"></iframe>
          </div>
          <div id="vpsChatDrawer" style="width:340px;background:#090d16;border-left:1px solid rgba(56,189,248,0.25);display:flex;flex-direction:column;padding:12px;">
            <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:8px;margin-bottom:8px;">
              <span style="font-size:12px;font-weight:700;color:#38bdf8;">⚡ Fênix AI Core @ VPS</span>
              <span style="font-size:10px;background:#15803d;color:#fff;padding:2px 6px;border-radius:10px;">qwen2.5:3b</span>
            </div>
            <div id="vpsChatMessages" style="flex:1;overflow-y:auto;font-size:12px;color:#cbd5e1;display:flex;flex-direction:column;gap:8px;padding-right:4px;">
              <div style="background:rgba(255,255,255,0.05);padding:8px;border-radius:6px;border-left:3px solid #38bdf8;">
                <b>Fênix:</b> Olá! Estou online e respondendo na VPS (209.50.241.22:3001) com o modelo <b>qwen2.5:3b</b>. Como posso auxiliar nos projetos da cidade?
              </div>
            </div>
            <div style="display:flex;gap:6px;margin-top:8px;">
              <input id="vpsChatInput" type="text" placeholder="Instrução para a IA na VPS..." style="flex:1;background:#0f172a;border:1px solid #334155;color:#fff;padding:6px 8px;border-radius:4px;font-size:11px;outline:none;" />
              <button id="vpsChatSendBtn" style="background:#0284c7;border:none;color:#fff;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600;">Enviar</button>
            </div>
          </div>
        </div>
      `;

      modal.style.display = 'flex';

      const iframe = modal.querySelector('#previewIframe');
      const btnAiDash = modal.querySelector('#btnAiDash');
      const btnAiDocs = modal.querySelector('#btnAiDocs');
      const btnAiHealth = modal.querySelector('#btnAiHealth');
      const btnZaiLive = modal.querySelector('#btnZaiLive');
      const btnZaiLocal = modal.querySelector('#btnZaiLocal');
      const btnFenixApp = modal.querySelector('#btnFenixApp');
      const btnFenixCmd = modal.querySelector('#btnFenixCmd');

      if (btnAiDash) btnAiDash.onclick = () => { iframe.src = 'http://209.50.241.22:8081/'; };
      if (btnAiDocs) btnAiDocs.onclick = () => { iframe.src = '/api/v2/proxy/vps-docs/'; };
      if (btnAiHealth) btnAiHealth.onclick = () => { iframe.src = '/api/v2/proxy/vps-health'; };
      if (btnZaiLive) btnZaiLive.onclick = () => { iframe.src = 'http://209.50.241.22/'; };
      if (btnZaiLocal) btnZaiLocal.onclick = () => { iframe.src = '/app?preview=true&project=zapai'; };
      if (btnFenixApp) btnFenixApp.onclick = () => { iframe.src = '/app?preview=true'; };
      if (btnFenixCmd) btnFenixCmd.onclick = () => { iframe.src = '/'; };

      const vp = modal.querySelector('#fenixAppViewport');
      const bD = modal.querySelector('#btnVpDesktop');
      const bT = modal.querySelector('#btnVpTablet');
      const bM = modal.querySelector('#btnVpMobile');
      const drawer = modal.querySelector('#vpsChatDrawer');
      const btnToggle = modal.querySelector('#btnToggleVpsChat');
      const chatInput = modal.querySelector('#vpsChatInput');
      const chatSend = modal.querySelector('#vpsChatSendBtn');
      const chatMsgs = modal.querySelector('#vpsChatMessages');

      btnToggle.onclick = () => {
        drawer.style.display = (drawer.style.display === 'none') ? 'flex' : 'none';
      };

      async function sendVpsMessage() {
        const text = chatInput.value.trim();
        if (!text) return;
        chatInput.value = '';

        const userMsg = document.createElement('div');
        userMsg.style.cssText = 'background:rgba(56,189,248,0.15);padding:8px;border-radius:6px;border-right:3px solid #38bdf8;align-self:flex-end;max-width:90%;';
        userMsg.innerHTML = `<b>Você:</b> ${text}`;
        chatMsgs.appendChild(userMsg);

        const typingMsg = document.createElement('div');
        typingMsg.style.cssText = 'background:rgba(255,255,255,0.03);padding:6px 8px;border-radius:6px;font-style:italic;color:#94a3b8;';
        typingMsg.innerHTML = '⚡ Fênix (VPS Ollama) gerando resposta...';
        chatMsgs.appendChild(typingMsg);
        chatMsgs.scrollTop = chatMsgs.scrollHeight;

        try {
          const res = await fetch('/api/v2/vps-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: text, model: 'qwen2.5:3b' })
          });
          const data = await res.json();
          typingMsg.remove();

          const botMsg = document.createElement('div');
          botMsg.style.cssText = 'background:rgba(255,255,255,0.05);padding:8px;border-radius:6px;border-left:3px solid #10b981;';
          botMsg.innerHTML = `<b>Fênix (VPS):</b> ${data.response || 'Resposta recebida'}`;
          chatMsgs.appendChild(botMsg);
          chatMsgs.scrollTop = chatMsgs.scrollHeight;
        } catch (e) {
          typingMsg.remove();
          const errDiv = document.createElement('div');
          errDiv.style.cssText = 'color:#f87171;padding:4px;';
          errDiv.textContent = 'Erro ao consultar VPS: ' + e.message;
          chatMsgs.appendChild(errDiv);
        }
      }

      chatSend.onclick = sendVpsMessage;
      chatInput.onkeydown = (e) => { if (e.key === 'Enter') sendVpsMessage(); };

      bD.onclick = () => {
        vp.className = 'fenix-app-viewport';
        bD.style.background = '#1e293b'; bD.style.borderColor = '#38bdf8'; bD.style.color = '#fff';
        bT.style.background = '#0f172a'; bT.style.borderColor = 'rgba(255,255,255,0.2)'; bT.style.color = '#94a3b8';
        bM.style.background = '#0f172a'; bM.style.borderColor = 'rgba(255,255,255,0.2)'; bM.style.color = '#94a3b8';
      };

      bT.onclick = () => {
        vp.className = 'fenix-app-viewport tablet';
        bT.style.background = '#1e293b'; bT.style.borderColor = '#38bdf8'; bT.style.color = '#fff';
        bD.style.background = '#0f172a'; bD.style.borderColor = 'rgba(255,255,255,0.2)'; bD.style.color = '#94a3b8';
        bM.style.background = '#0f172a'; bM.style.borderColor = 'rgba(255,255,255,0.2)'; bM.style.color = '#94a3b8';
      };

      bM.onclick = () => {
        vp.className = 'fenix-app-viewport mobile';
        bM.style.background = '#1e293b'; bM.style.borderColor = '#38bdf8'; bM.style.color = '#fff';
        bD.style.background = '#0f172a'; bD.style.borderColor = 'rgba(255,255,255,0.2)'; bD.style.color = '#94a3b8';
        bT.style.background = '#0f172a'; bT.style.borderColor = 'rgba(255,255,255,0.2)'; bT.style.color = '#94a3b8';
      };
    }

    static async openMissionModal() {
      let modal = document.getElementById('fenixMissionBoardModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'fenixMissionBoardModal';
        modal.className = 'fenix-mission-board-modal';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="fenix-mission-board-content">
          <div class="fenix-mission-board-head">
            <h2>📋 FÊNIX KANBAN MISSION BOARD — REAL JOBS</h2>
            <button onclick="document.getElementById('fenixMissionBoardModal').style.display='none'" style="background:none;border:none;color:#94a3b8;font-size:20px;cursor:pointer;">&times;</button>
          </div>
          <div class="fenix-mission-board-body" id="fenixMissionBoardColumns">
            <div style="grid-column:span 4;padding:30px;text-align:center;color:#94a3b8;">Carregando jobs do runtime...</div>
          </div>
        </div>
      `;

      modal.style.display = 'flex';

      try {
        const token = localStorage.getItem('fenix_token') || localStorage.getItem('grg_token') || '';
        const res = await fetch('/api/v2/jobs', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const data = await res.json();
        const jobs = data.jobs || [];

        const cols = {
          QUEUED: [],
          RUNNING: [],
          SUCCEEDED: [],
          FAILED: []
        };

        jobs.forEach(j => {
          const st = (j.status || 'QUEUED').toUpperCase();
          if (cols[st]) cols[st].push(j);
          else if (st === 'COMPLETED') cols.SUCCEEDED.push(j);
          else cols.QUEUED.push(j);
        });

        const renderCard = (job) => `
          <div class="mission-card" onclick="window.BuildingInteriorSystem?.inspectJob('${job.id}')">
            <div class="mission-card-title">${job.type || 'Mission Task'}</div>
            <div class="mission-card-meta">
              <span><b>ID:</b> ${job.id ? job.id.substring(0, 8) : '—'}</span>
              <span><b>Agent:</b> ${job.agent?.name || job.workerId || 'Auto Assigned'}</span>
              ${job.result?.name ? `<span><b>Artifact:</b> ${job.result.name}</span>` : ''}
              <span><b>Progress:</b> ${job.progress || 0}%</span>
            </div>
            <span class="mission-card-badge ${job.status}">${job.status}</span>
          </div>
        `;

        const boardBody = document.getElementById('fenixMissionBoardColumns');
        if (boardBody) {
          boardBody.innerHTML = `
            <div class="mission-col">
              <div class="mission-col-title"><span>⏳ Queued</span> <span>${cols.QUEUED.length}</span></div>
              ${cols.QUEUED.map(renderCard).join('') || '<div style="font-size:10px;color:#64748b;padding:8px;">Nenhum job na fila</div>'}
            </div>
            <div class="mission-col">
              <div class="mission-col-title"><span style="color:#38bdf8;">⚡ Running</span> <span>${cols.RUNNING.length}</span></div>
              ${cols.RUNNING.map(renderCard).join('') || '<div style="font-size:10px;color:#64748b;padding:8px;">Nenhum job em execução</div>'}
            </div>
            <div class="mission-col">
              <div class="mission-col-title"><span style="color:#22c55e;">✅ Succeeded</span> <span>${cols.SUCCEEDED.length}</span></div>
              ${cols.SUCCEEDED.map(renderCard).join('') || '<div style="font-size:10px;color:#64748b;padding:8px;">Nenhum job concluído</div>'}
            </div>
            <div class="mission-col">
              <div class="mission-col-title"><span style="color:#ef4444;">❌ Failed</span> <span>${cols.FAILED.length}</span></div>
              ${cols.FAILED.map(renderCard).join('') || '<div style="font-size:10px;color:#64748b;padding:8px;">Nenhuma falha</div>'}
            </div>
          `;
        }
      } catch (err) {
        console.error('[BuildingInterior] Error loading jobs:', err);
      }
    }

    static inspectJob(jobId) {
      console.log('[BuildingInterior] Inspecting job:', jobId);
      window.location.hash = '#operations';
    }

    renderFloorSelectorUI(building) {
      const el = document.getElementById('cityFloorSelector');
      if (!el) return;

      let html = '';
      building.floors.forEach((fl, idx) => {
        const active = (idx === this.activeFloorIndex) ? ' active' : '';
        html += `
          <button class="floor-btn${active}" data-floor="${idx}">
            <span class="floor-num">${fl.floorNum}</span>
            ${fl.name}
          </button>
        `;
      });

      el.innerHTML = html;
      el.style.display = 'flex';

      el.querySelectorAll('.floor-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const fIdx = parseInt(btn.dataset.floor, 10);
          this.enter(building.id, fIdx);
        });
      });
    }

    renderBreadcrumbUI(building, floor, room = null) {
      const el = document.getElementById('cityBreadcrumb');
      if (!el) return;

      let html = `
        <span class="breadcrumb-item" onclick="window.BuildingInteriorSystem?.exitActive()">🏙️ City</span>
        <span class="breadcrumb-sep">›</span>
        <span class="breadcrumb-item" onclick="window.BuildingInteriorSystem?.enterActive(0)">🏢 ${building.name}</span>
        <span class="breadcrumb-sep">›</span>
        <span class="breadcrumb-item" onclick="window.BuildingInteriorSystem?.enterActive(${this.activeFloorIndex})">📐 Floor ${floor.floorNum}: ${floor.name}</span>
      `;

      if (room) {
        html += `
          <span class="breadcrumb-sep">›</span>
          <span class="breadcrumb-current">🚪 ${room.name}</span>
        `;
      }

      el.innerHTML = html;
      el.style.display = 'flex';
    }

    exit() {
      this.activeBuildingId = null;
      if (this.container) this.container.visible = false;

      if (this.city && this.city.worldContainer) {
        this.city.worldContainer.visible = true;
        this.city.targetCamera.zoom = 1.6;
        const center = window.gridToScreen ? window.gridToScreen(14, 18) : { x: 0, y: 0 };
        this.city.targetCamera.x = center.x;
        this.city.targetCamera.y = center.y;
      }

      const floorSel = document.getElementById('cityFloorSelector');
      if (floorSel) floorSel.style.display = 'none';

      const breadcrumb = document.getElementById('cityBreadcrumb');
      if (breadcrumb) breadcrumb.style.display = 'none';

      const inspector = document.getElementById('cityInspector');
      if (inspector) inspector.classList.remove('open');

      const missionModal = document.getElementById('fenixMissionBoardModal');
      if (missionModal) missionModal.style.display = 'none';
      const appModal = document.getElementById('fenixAppPreviewModal');
      if (appModal) appModal.style.display = 'none';
    }

    static exitActive() {
      if (window.fenixInterior) {
        window.fenixInterior.exit();
      }
      if (window.fenixZoom) {
        window.fenixZoom.enter('city', '🏙️ FÊNIX City', {}, 0, 0);
      }
    }

    static enterActive(floorIdx = 0) {
      if (window.fenixInterior && window.fenixInterior.activeBuildingId) {
        window.fenixInterior.enter(window.fenixInterior.activeBuildingId, floorIdx);
      }
    }
  }

  // Global ESC listener for World Return (Gate 13)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const missionModal = document.getElementById('fenixMissionBoardModal');
      if (missionModal && missionModal.style.display !== 'none') {
        missionModal.style.display = 'none';
        return;
      }
      const appModal = document.getElementById('fenixAppPreviewModal');
      if (appModal && appModal.style.display !== 'none') {
        appModal.style.display = 'none';
        return;
      }
      const inspector = document.getElementById('cityInspector');
      if (inspector && inspector.classList.contains('open')) {
        inspector.classList.remove('open');
        return;
      }
      if (window.fenixInterior && window.fenixInterior.activeBuildingId) {
        window.BuildingInteriorSystem.exitActive();
      }
    }
  });

  // Export
  window.BuildingInteriorSystem = BuildingInteriorSystem;
  window.BUILDING_INTERIORS = BUILDING_INTERIORS;

})();
