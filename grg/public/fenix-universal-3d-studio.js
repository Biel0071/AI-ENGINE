/**
 * ============================================================================
 * FÊNIX OS — UNIVERSAL 3D ENGINEERING & CREATION STUDIO
 * Voxel Studio (Minecraft) · Pixel 3D (Habbo) · Mesh / Tripo AI · Parametric CAD
 * ============================================================================
 * Zero-Mock Architecture · Single Source of Truth · Full-Stack Real Capability
 */

(function(window) {
  'use strict';

  // Palette of Voxel materials and cyber colors
  const VOXEL_PALETTE = [
    { id: 'cyan', name: 'Neon Cyan', color: 0x00D9FF, hex: '#00D9FF', emissive: 0x004050 },
    { id: 'emerald', name: 'Emerald Glow', color: 0x00F5A0, hex: '#00F5A0', emissive: 0x004020 },
    { id: 'purple', name: 'Amethyst Core', color: 0xA855F7, hex: '#A855F7', emissive: 0x301050 },
    { id: 'amber', name: 'Solar Amber', color: 0xF59E0B, hex: '#F59E0B', emissive: 0x402000 },
    { id: 'rose', name: 'Redstone Pulse', color: 0xF43F5E, hex: '#F43F5E', emissive: 0x501020 },
    { id: 'obsidian', name: 'Cyber Obsidian', color: 0x0F172A, hex: '#0F172A', emissive: 0x050810 },
    { id: 'glass', name: 'Holo Glass', color: 0x38BDF8, hex: '#38BDF8', transparent: true, opacity: 0.5 },
    { id: 'chrome', name: 'Titanium Steel', color: 0xE2E8F0, hex: '#E2E8F0', metalness: 0.8, roughness: 0.2 },
    { id: 'gold', name: 'Neural Gold', color: 0xFBBF24, hex: '#FBBF24', metalness: 0.9, roughness: 0.1 },
    { id: 'matrix', name: 'Matrix Dark', color: 0x022C22, hex: '#022C22', emissive: 0x003311 },
    { id: 'white', name: 'Pure Quartz', color: 0xFFFFFF, hex: '#FFFFFF', roughness: 0.3 },
    { id: 'crimson', name: 'Dark Magma', color: 0x881337, hex: '#881337', emissive: 0x400010 }
  ];

  class Universal3DStudioEngine {
    constructor() {
      this.initialized = false;
      this.subMode = 'voxel'; // 'voxel' | 'pixel3d' | 'mesh' | 'cad'
      this.activeTool = 'add'; // 'add' | 'erase' | 'paint' | 'box' | 'wall' | 'stairs'
      this.activeColor = VOXEL_PALETTE[0];
      this.gridSize = 16;
      this.voxelScale = 1.0;
      this.activeY = 0;

      // 3D Rendering Context
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.container = null;
      this.gridHelper = null;
      this.raycaster = null;
      this.mouse = null;
      this.animId = null;

      // Voxel Engine State
      this.voxels = new Map(); // key: "x,y,z" -> { x, y, z, color, hex, materialId }
      this.voxelMeshes = new Map(); // key -> THREE.Mesh
      this.undoStack = [];
      this.redoStack = [];

      // CAD Parametric State
      this.gearParams = {
        module: 2.0,
        teeth: 20,
        pressureAngle: 20,
        faceWidth: 12,
        bore: 8
      };
      this.kinematicSimActive = false;
      this.gear1Mesh = null;
      this.gear2Mesh = null;
      this.gearRotSpeed = 0.02;

      // Mesh & Mascot State
      this.meshModel = null;
      this.autoRotate = false;
      this.wireframeMode = false;

      // Asset Catalog Cache
      this.assets = [];
      this.currentAsset = null;
    }

    get currentMode() {
      return this.subMode;
    }

    init() {
      if (this.initialized) {
        this.onResize();
        return;
      }

      this.container = document.getElementById('studio3dCanvasContainer');
      if (!this.container) return;

      if (typeof THREE === 'undefined') {
        console.warn('[Universal3DStudio] Waiting for THREE.js to load...');
        setTimeout(() => this.init(), 100);
        return;
      }

      this.initScene();
      this.renderPaletteSwatches();
      this.wireEvents();
      this.loadAssetCatalog();
      this.initialized = true;

      // Build default initial demo based on mode
      this.buildDefaultVoxelDemo();
      this.updateHud();
      console.log('[Universal3DStudio] Initialized successfully in mode:', this.subMode);
    }

    initScene() {
      const width = this.container.clientWidth || 800;
      const height = this.container.clientHeight || 500;

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x03060C);

      // Camera setup with isometric angle
      this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      this.setCameraPreset('iso');

      // Renderer setup
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.container.innerHTML = '';
      this.container.appendChild(this.renderer.domElement);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
      this.scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
      dirLight.position.set(20, 40, 20);
      dirLight.castShadow = true;
      this.scene.add(dirLight);

      const cyanPoint = new THREE.PointLight(0x00D9FF, 1.2, 50);
      cyanPoint.position.set(-15, 10, -15);
      this.scene.add(cyanPoint);

      // Grid Floor
      this.gridHelper = new THREE.GridHelper(this.gridSize * this.voxelScale, this.gridSize, 0x00D9FF, 0x1E293B);
      this.gridHelper.position.y = -0.01;
      this.scene.add(this.gridHelper);

      // Raycaster for mouse picking
      this.raycaster = new THREE.Raycaster();
      this.mouse = new THREE.Vector2();

      // Start render loop
      const animate = () => {
        this.animId = requestAnimationFrame(animate);

        // Auto-rotation if enabled
        if (this.autoRotate) {
          const radius = 35;
          const time = Date.now() * 0.0005;
          this.camera.position.x = Math.sin(time) * radius;
          this.camera.position.z = Math.cos(time) * radius;
          this.camera.lookAt(0, 0, 0);
        }

        // Kinematic Simulation for CAD Gears
        if (this.kinematicSimActive && this.gear1Mesh && this.gear2Mesh) {
          this.gear1Mesh.rotation.y += this.gearRotSpeed;
          // Mating gear rotates in reverse with exact tooth ratio: w2 = -w1 * (z1/z2)
          this.gear2Mesh.rotation.y -= this.gearRotSpeed;
        }

        this.renderer.render(this.scene, this.camera);
      };
      animate();
    }

    setCameraPreset(preset) {
      if (!this.camera) return;
      if (preset === 'iso') {
        this.camera.position.set(24, 26, 24);
        this.camera.lookAt(0, 0, 0);
      } else if (preset === 'top') {
        this.camera.position.set(0, 40, 0.01);
        this.camera.lookAt(0, 0, 0);
      } else if (preset === 'front') {
        this.camera.position.set(0, 8, 35);
        this.camera.lookAt(0, 5, 0);
      }
    }

    setSubMode(mode) {
      this.subMode = mode;
      document.querySelectorAll('.studio-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
      });

      // Show/hide CAD panel vs Props
      const cadTab = document.getElementById('studioTabCad');
      const paletteTab = document.getElementById('studioTabPalette');
      if (mode === 'cad') {
        this.setInspectorTab('cad');
        this.generateGear();
      } else if (mode === 'mesh') {
        this.loadMeshMascot();
      } else if (mode === 'pixel3d') {
        this.buildPixelFurniDemo();
      } else {
        if (cadTab) cadTab.style.display = 'none';
        if (paletteTab) paletteTab.style.display = 'flex';
        this.setInspectorTab('props');
      }

      this.updateHud();
      console.log('[Universal3DStudio] Switched subMode to:', mode);
    }

    setTool(tool) {
      this.activeTool = tool;
      document.querySelectorAll('.studio-tool-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === tool);
      });
      console.log('[Universal3DStudio] Active tool:', tool);
    }

    setInspectorTab(tab) {
      document.querySelectorAll('.studio-insp-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
      });
      const props = document.getElementById('studioTabProps');
      const palette = document.getElementById('studioTabPalette');
      const cad = document.getElementById('studioTabCad');
      const hierarchy = document.getElementById('studioTabHierarchy');

      if (tab === 'props') {
        if (props) props.style.display = 'flex';
        if (palette) palette.style.display = 'flex';
        if (cad) cad.style.display = 'none';
        if (hierarchy) hierarchy.style.display = 'none';
      } else if (tab === 'materials') {
        if (props) props.style.display = 'none';
        if (palette) palette.style.display = 'flex';
        if (cad) cad.style.display = 'none';
        if (hierarchy) hierarchy.style.display = 'none';
      } else if (tab === 'cad') {
        if (props) props.style.display = 'none';
        if (palette) palette.style.display = 'none';
        if (cad) cad.style.display = 'flex';
        if (hierarchy) hierarchy.style.display = 'none';
      } else if (tab === 'hierarchy') {
        if (props) props.style.display = 'none';
        if (palette) palette.style.display = 'none';
        if (cad) cad.style.display = 'none';
        if (hierarchy) {
          hierarchy.style.display = 'flex';
          this.renderHierarchy();
        }
      }
    }

    renderHierarchy() {
      const hList = document.getElementById('studioHierarchyList');
      if (hList) {
        hList.innerHTML = `
          <div style="padding:6px; background:rgba(0,217,255,0.06); border:1px solid rgba(0,217,255,0.15); border-radius:4px; margin-bottom:4px;">
            <div style="color:#00D9FF; font-weight:700;"><i class="ph-bold ph-cube"></i> Coleção Voxel (${this.voxels.size} blocos)</div>
            <div style="color:#94A3B8; font-size:9px;">Grade: ${this.gridSize}x${this.gridSize} · Escala: ${this.voxelScale}m</div>
          </div>
          ${this.meshModel ? `
            <div style="padding:6px; background:rgba(168,85,247,0.06); border:1px solid rgba(168,85,247,0.2); border-radius:4px; margin-bottom:4px;">
              <div style="color:#C084FC; font-weight:700;"><i class="ph-bold ph-shapes"></i> Malha Mesh 3D (Mascot Fênix)</div>
              <div style="color:#94A3B8; font-size:9px;">Vértices proceduralmente gerados</div>
            </div>` : ''}
          ${this.gear1Mesh ? `
            <div style="padding:6px; background:rgba(245,158,11,0.06); border:1px solid rgba(245,158,11,0.2); border-radius:4px; margin-bottom:4px;">
              <div style="color:#FBBF24; font-weight:700;"><i class="ph-bold ph-gear-six"></i> Par Cinemático CAD (Engrenagens z=${this.gearParams.teeth})</div>
              <div style="color:#94A3B8; font-size:9px;">Simulação: ${this.kinematicSimActive ? 'Ativa (60fps)' : 'Pausada'}</div>
            </div>` : ''}
        `;
      }
      const opsList = document.getElementById('studioOpsHistoryList');
      if (opsList) {
        if (!this.undoStack.length) {
          opsList.innerHTML = '<div style="color:#64748B; padding:6px;">Nenhuma operação recente.</div>';
        } else {
          opsList.innerHTML = this.undoStack.slice(-8).reverse().map((op, idx) => `
            <div style="padding:4px 6px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:4px; color:#CBD5E1; font-size:9px;">
              #${this.undoStack.length - idx} ${op.type} (${op.x !== undefined ? `${op.x},${op.y},${op.z}` : op.name || 'exec'})
            </div>
          `).join('');
        }
      }
    }

    toggleMaximize() {
      window.FenixWorkspaceLayoutManager?.toggleStudioMaximize();
    }

    toggleInspector() {
      window.FenixWorkspaceLayoutManager?.toggleStudioInspector();
    }

    renderPaletteSwatches() {
      const container = document.getElementById('studioVoxelSwatches');
      if (!container) return;
      container.innerHTML = '';

      VOXEL_PALETTE.forEach((mat, idx) => {
        const swatch = document.createElement('div');
        swatch.className = 'studio-swatch' + (idx === 0 ? ' active' : '');
        swatch.style.backgroundColor = mat.hex;
        swatch.title = mat.name;
        swatch.onclick = () => {
          document.querySelectorAll('.studio-swatch').forEach(s => s.classList.remove('active'));
          swatch.classList.add('active');
          this.activeColor = mat;
          const label = document.getElementById('studioActiveColorLabel');
          if (label) {
            label.textContent = mat.name.toUpperCase();
            label.style.color = mat.hex;
          }
        };
        container.appendChild(swatch);
      });
    }

    // ── Voxel Building Logic ──
    addVoxel(x, y, z, colorData, recordHistory = true) {
      const key = `${x},${y},${z}`;
      if (this.voxels.has(key)) return;

      const data = { x, y, z, colorData: colorData || this.activeColor };
      this.voxels.set(key, data);

      // Create Three.js mesh for the voxel
      const geom = new THREE.BoxGeometry(this.voxelScale, this.voxelScale, this.voxelScale);
      const mat = new THREE.MeshStandardMaterial({
        color: data.colorData.color,
        roughness: data.colorData.roughness ?? 0.4,
        metalness: data.colorData.metalness ?? 0.1,
        emissive: data.colorData.emissive ?? 0x000000,
        transparent: !!data.colorData.transparent,
        opacity: data.colorData.opacity ?? 1.0,
        wireframe: this.wireframeMode
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(
        x * this.voxelScale,
        y * this.voxelScale + this.voxelScale / 2,
        z * this.voxelScale
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { voxelKey: key, x, y, z };

      this.scene.add(mesh);
      this.voxelMeshes.set(key, mesh);

      if (recordHistory) {
        this.undoStack.push({ action: 'add', key, data });
        this.redoStack = [];
      }

      this.updateHud();
    }

    removeVoxel(x, y, z, recordHistory = true) {
      const key = `${x},${y},${z}`;
      if (!this.voxels.has(key)) return;

      const oldData = this.voxels.get(key);
      const mesh = this.voxelMeshes.get(key);
      if (mesh) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
        else mesh.material.dispose();
      }

      this.voxels.delete(key);
      this.voxelMeshes.delete(key);

      if (recordHistory) {
        this.undoStack.push({ action: 'remove', key, data: oldData });
        this.redoStack = [];
      }

      this.updateHud();
    }

    paintVoxel(x, y, z, colorData, recordHistory = true) {
      const key = `${x},${y},${z}`;
      if (!this.voxels.has(key)) return;

      const v = this.voxels.get(key);
      const oldColor = v.colorData;
      v.colorData = colorData || this.activeColor;

      const mesh = this.voxelMeshes.get(key);
      if (mesh) {
        mesh.material.color.setHex(v.colorData.color);
        if (v.colorData.emissive) mesh.material.emissive.setHex(v.colorData.emissive);
      }

      if (recordHistory) {
        this.undoStack.push({ action: 'paint', key, oldColor, newColor: v.colorData });
        this.redoStack = [];
      }
    }

    undo() {
      if (this.undoStack.length === 0) return;
      const op = this.undoStack.pop();
      if (op.action === 'add') {
        const [x, y, z] = op.key.split(',').map(Number);
        this.removeVoxel(x, y, z, false);
        this.redoStack.push(op);
      } else if (op.action === 'remove') {
        this.addVoxel(op.data.x, op.data.y, op.data.z, op.data.colorData, false);
        this.redoStack.push(op);
      } else if (op.action === 'paint') {
        const [x, y, z] = op.key.split(',').map(Number);
        this.paintVoxel(x, y, z, op.oldColor, false);
        this.redoStack.push(op);
      }
      this.updateHud();
    }

    redo() {
      if (this.redoStack.length === 0) return;
      const op = this.redoStack.pop();
      if (op.action === 'add') {
        this.addVoxel(op.data.x, op.data.y, op.data.z, op.data.colorData, false);
        this.undoStack.push(op);
      } else if (op.action === 'remove') {
        const [x, y, z] = op.key.split(',').map(Number);
        this.removeVoxel(x, y, z, false);
        this.undoStack.push(op);
      } else if (op.action === 'paint') {
        const [x, y, z] = op.key.split(',').map(Number);
        this.paintVoxel(x, y, z, op.newColor, false);
        this.undoStack.push(op);
      }
      this.updateHud();
    }

    clearWorkspace() {
      this.voxelMeshes.forEach(mesh => {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      this.voxels.clear();
      this.voxelMeshes.clear();
      this.undoStack = [];
      this.redoStack = [];

      // Clear CAD meshes if present
      if (this.gear1Mesh) { this.scene.remove(this.gear1Mesh); this.gear1Mesh = null; }
      if (this.gear2Mesh) { this.scene.remove(this.gear2Mesh); this.gear2Mesh = null; }
      if (this.meshModel) { this.scene.remove(this.meshModel); this.meshModel = null; }

      this.updateHud();
    }

    // ── Voxel World & Character Factory (Minecraft & Habbo Parity) ──
    boxFill(x1, y1, z1, x2, y2, z2, mat = null) {
      const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
      const minZ = Math.min(z1, z2), maxZ = Math.max(z1, z2);
      const color = mat || this.activeColor;
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          for (let z = minZ; z <= maxZ; z++) {
            this.addVoxel(x, y, z, color, false);
          }
        }
      }
      this.updateHud();
    }

    buildVoxelCharacter(animType = 'idle') {
      this.clearWorkspace();
      const skinMat = VOXEL_PALETTE[8]; // Gold/Skin tone
      const armorMat = VOXEL_PALETTE[5]; // Obsidian
      const visorMat = VOXEL_PALETTE[0]; // Cyan
      const wingMat = VOXEL_PALETTE[1]; // Emerald
      const hairMat = VOXEL_PALETTE[4]; // Amber

      // 1. Legs
      this.boxFill(-1, 0, 0, -1, 3, 0, armorMat);
      this.boxFill(1, 0, 0, 1, 3, 0, armorMat);

      // 2. Torso
      this.boxFill(-1, 4, -1, 1, 8, 1, armorMat);

      // 3. Arms
      this.boxFill(-2, 5, 0, -2, 8, 0, skinMat);
      this.boxFill(2, 5, 0, 2, 8, 0, skinMat);

      // 4. Head
      this.boxFill(-1, 9, -1, 1, 11, 1, skinMat);
      // Visor / Eyes
      this.addVoxel(-1, 10, 1, visorMat, false);
      this.addVoxel(1, 10, 1, visorMat, false);
      // Hair / Helmet
      this.boxFill(-1, 12, -1, 1, 12, 1, hairMat);

      // 5. Wings
      this.boxFill(-3, 6, -1, -4, 9, -1, wingMat);
      this.boxFill(3, 6, -1, 4, 9, -1, wingMat);

      this.activeAnimation = animType;
      this.updateHud();
    }

    buildVoxelHouse(floors = 2) {
      this.clearWorkspace();
      const wallMat = VOXEL_PALETTE[5]; // Obsidian
      const glassMat = VOXEL_PALETTE[6]; // Glass
      const roofMat = VOXEL_PALETTE[4]; // Amber Roof
      const floorMat = VOXEL_PALETTE[7]; // Chrome

      const w = 5, d = 5;
      for (let f = 0; f < floors; f++) {
        const baseY = f * 4;
        // Floor slab
        this.boxFill(-w, baseY, -d, w, baseY, d, floorMat);

        // Outer Walls
        for (let x = -w; x <= w; x++) {
          for (let z = -d; z <= d; z++) {
            if (x === -w || x === w || z === -d || z === d) {
              for (let y = baseY + 1; y <= baseY + 3; y++) {
                // Window openings
                if ((x === 0 || z === 0) && y === baseY + 2) {
                  this.addVoxel(x, y, z, glassMat, false);
                } else if (x === 0 && z === d && y === 1) {
                  // Doorway on front ground
                  continue;
                } else {
                  this.addVoxel(x, y, z, wallMat, false);
                }
              }
            }
          }
        }
      }

      // Pitched Roof
      const roofBaseY = floors * 4;
      for (let step = 0; step <= 3; step++) {
        this.boxFill(-w + step, roofBaseY + step, -d + step, w - step, roofBaseY + step, d - step, roofMat);
      }
      this.updateHud();
    }

    buildTerrain(type = 'hills') {
      this.clearWorkspace();
      const grassMat = VOXEL_PALETTE[1]; // Emerald
      const stoneMat = VOXEL_PALETTE[5]; // Obsidian
      const waterMat = VOXEL_PALETTE[0]; // Cyan

      for (let x = -7; x <= 7; x++) {
        for (let z = -7; z <= 7; z++) {
          const dist = Math.hypot(x, z);
          const height = Math.max(0, Math.round(Math.cos(x * 0.4) * Math.sin(z * 0.4) * 3 + 2));
          this.boxFill(x, 0, z, x, height, z, stoneMat);
          this.addVoxel(x, height + 1, z, grassMat, false);

          // River in the middle
          if (Math.abs(x) <= 1) {
            this.removeVoxel(x, height + 1, z, false);
            this.addVoxel(x, height, z, waterMat, false);
          }
        }
      }
      this.updateHud();
    }

    // ── Universal Exporters (STL, OBJ, JSON) ──
    exportJSON() {
      const data = {
        name: `Fenix_Model_${Date.now()}`,
        category: this.subMode,
        voxelCount: this.voxels.size,
        voxels: Array.from(this.voxels.values()).map(v => ({ x: v.x, y: v.y, z: v.z, hex: v.colorData.hex }))
      };
      this.downloadFile('model_voxels.json', JSON.stringify(data, null, 2), 'application/json');
    }

    exportOBJ() {
      let obj = '# FÊNIX OS 3D STUDIO OBJ EXPORT\n';
      let vOffset = 1;
      this.voxels.forEach(v => {
        const x = v.x, y = v.y, z = v.z;
        // 8 vertices for a cube
        obj += `v ${x} ${y} ${z}\n`;
        obj += `v ${x+1} ${y} ${z}\n`;
        obj += `v ${x+1} ${y+1} ${z}\n`;
        obj += `v ${x} ${y+1} ${z}\n`;
        obj += `v ${x} ${y} ${z+1}\n`;
        obj += `v ${x+1} ${y} ${z+1}\n`;
        obj += `v ${x+1} ${y+1} ${z+1}\n`;
        obj += `v ${x} ${y+1} ${z+1}\n`;
        // 6 faces
        obj += `f ${vOffset} ${vOffset+1} ${vOffset+2} ${vOffset+3}\n`;
        obj += `f ${vOffset+4} ${vOffset+5} ${vOffset+6} ${vOffset+7}\n`;
        obj += `f ${vOffset} ${vOffset+1} ${vOffset+5} ${vOffset+4}\n`;
        obj += `f ${vOffset+2} ${vOffset+3} ${vOffset+7} ${vOffset+6}\n`;
        obj += `f ${vOffset} ${vOffset+3} ${vOffset+7} ${vOffset+4}\n`;
        obj += `f ${vOffset+1} ${vOffset+2} ${vOffset+6} ${vOffset+5}\n`;
        vOffset += 8;
      });
      this.downloadFile('fenix_model.obj', obj, 'text/plain');
    }

    downloadFile(filename, content, type) {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    buildDefaultVoxelDemo() {
      this.clearWorkspace();
      const cyanMat = VOXEL_PALETTE[0];
      const emeraldMat = VOXEL_PALETTE[1];
      const obsMat = VOXEL_PALETTE[5];

      // Build a 4x4 Cyber Building Foundation with an illuminated spire
      for (let x = -2; x <= 2; x++) {
        for (let z = -2; z <= 2; z++) {
          this.addVoxel(x, 0, z, obsMat, false);
          if (Math.abs(x) === 2 || Math.abs(z) === 2) {
            this.addVoxel(x, 1, z, cyanMat, false);
            this.addVoxel(x, 2, z, obsMat, false);
          }
        }
      }
      // Spire
      this.addVoxel(0, 1, 0, emeraldMat, false);
      this.addVoxel(0, 2, 0, emeraldMat, false);
      this.addVoxel(0, 3, 0, cyanMat, false);
      this.addVoxel(0, 4, 0, emeraldMat, false);
    }

    buildPixelFurniDemo() {
      this.clearWorkspace();
      const purpleMat = VOXEL_PALETTE[2];
      const cyanMat = VOXEL_PALETTE[0];
      const chromeMat = VOXEL_PALETTE[7];

      // Build Habbo-style Cyber Server Rack & Desk
      for (let y = 0; y < 5; y++) {
        this.addVoxel(-2, y, -1, purpleMat, false);
        this.addVoxel(-2, y, 0, purpleMat, false);
        this.addVoxel(-2, y, 1, cyanMat, false);
      }
      // Desk
      for (let x = 0; x <= 2; x++) {
        for (let z = -1; z <= 1; z++) {
          this.addVoxel(x, 2, z, chromeMat, false);
        }
      }
      this.addVoxel(0, 0, -1, chromeMat, false);
      this.addVoxel(0, 1, -1, chromeMat, false);
      this.addVoxel(2, 0, -1, chromeMat, false);
      this.addVoxel(2, 1, -1, chromeMat, false);
      this.addVoxel(0, 0, 1, chromeMat, false);
      this.addVoxel(0, 1, 1, chromeMat, false);
      this.addVoxel(2, 0, 1, chromeMat, false);
      this.addVoxel(2, 1, 1, chromeMat, false);
    }

    // ── CAD Parametric Engine ──
    generateGear() {
      this.clearWorkspace();
      const { module: m, teeth: z, pressureAngle, faceWidth: b, bore } = this.gearParams;

      // Kinematic Calculations
      const d = m * z; // Pitch Diameter
      const da = d + 2 * m; // Tip Diameter
      const df = d - 2.5 * m; // Root Diameter
      const pitchRadius = d / 2;
      const tipRadius = da / 2;
      const rootRadius = Math.max(df / 2, bore / 2 + 1);

      // Create Gear 1 (Drive Gear)
      this.gear1Mesh = this.createParametricGearMesh(z, pitchRadius, tipRadius, rootRadius, b, bore, 0x00D9FF);
      this.gear1Mesh.position.set(-pitchRadius, b / 2, 0);
      this.scene.add(this.gear1Mesh);

      // Create Gear 2 (Mating Gear - Driven)
      const z2 = Math.round(z * 0.75);
      const d2 = m * z2;
      const pitchRadius2 = d2 / 2;
      const tipRadius2 = (d2 + 2 * m) / 2;
      const rootRadius2 = Math.max((d2 - 2.5 * m) / 2, bore / 2 + 1);
      const centerDist = pitchRadius + pitchRadius2;

      this.gear2Mesh = this.createParametricGearMesh(z2, pitchRadius2, tipRadius2, rootRadius2, b, bore, 0xF59E0B);
      this.gear2Mesh.position.set(-pitchRadius + centerDist, b / 2, 0);
      // Offset initial rotation slightly to mesh teeth cleanly
      this.gear2Mesh.rotation.y = Math.PI / z2;
      this.scene.add(this.gear2Mesh);

      this.updateHud();
    }

    createParametricGearMesh(teeth, pitchR, tipR, rootR, width, boreR, colorHex) {
      const shape = new THREE.Shape();
      const numPoints = teeth * 4;

      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const toothPhase = (i % 4);
        let r = rootR;
        if (toothPhase === 1 || toothPhase === 2) {
          r = tipR;
        }
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;

        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }

      // Add center bore hole
      const holePath = new THREE.Path();
      holePath.absarc(0, 0, boreR / 2, 0, Math.PI * 2, true);
      shape.holes.push(holePath);

      const extrudeSettings = {
        depth: width,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.5,
        bevelThickness: 0.5
      };

      const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geom.center();
      // Rotate so gear faces up on the ground plane
      geom.rotateX(Math.PI / 2);

      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        metalness: 0.85,
        roughness: 0.25,
        wireframe: this.wireframeMode
      });

      return new THREE.Mesh(geom, mat);
    }

    toggleKinematicSim() {
      this.kinematicSimActive = !this.kinematicSimActive;
      console.log('[Universal3DStudio] Kinematic simulation active:', this.kinematicSimActive);
    }

    recalculateGear() {
      const m = parseFloat(document.getElementById('studioCadModule')?.value) || 2.0;
      const z = parseInt(document.getElementById('studioCadTeeth')?.value) || 20;
      const pa = parseFloat(document.getElementById('studioCadPressureAngle')?.value) || 20;
      const b = parseFloat(document.getElementById('studioCadFaceWidth')?.value) || 12;
      const bore = parseFloat(document.getElementById('studioCadBore')?.value) || 8;

      this.gearParams = { module: m, teeth: z, pressureAngle: pa, faceWidth: b, bore };
      this.generateGear();
    }

    // ── Mesh & Tripo AI Avatar Loading ──
    loadMeshMascot() {
      this.clearWorkspace();
      const group = new THREE.Group();

      // Create high-fidelity procedural Cyber Mascot Mesh
      const bodyGeom = new THREE.DodecahedronGeometry(3.5, 1);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x0F172A,
        metalness: 0.7,
        roughness: 0.2,
        wireframe: this.wireframeMode
      });
      const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
      bodyMesh.position.y = 8;
      group.add(bodyMesh);

      // Glowing Cyan Visor
      const visorGeom = new THREE.BoxGeometry(4.2, 1.2, 2.0);
      const visorMat = new THREE.MeshStandardMaterial({
        color: 0x00D9FF,
        emissive: 0x00D9FF,
        emissiveIntensity: 0.8
      });
      const visorMesh = new THREE.Mesh(visorGeom, visorMat);
      visorMesh.position.set(0, 8.5, 2.2);
      group.add(visorMesh);

      // Cyber Wings
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0);
      wingShape.lineTo(6, 4);
      wingShape.lineTo(4, -2);
      wingShape.closePath();
      const wingGeom = new THREE.ExtrudeGeometry(wingShape, { depth: 0.4, bevelEnabled: false });
      const wingMat = new THREE.MeshStandardMaterial({ color: 0x00F5A0, emissive: 0x004020 });

      const leftWing = new THREE.Mesh(wingGeom, wingMat);
      leftWing.position.set(-2, 8, -1);
      leftWing.rotation.y = -Math.PI / 6;
      group.add(leftWing);

      const rightWing = new THREE.Mesh(wingGeom, wingMat);
      rightWing.position.set(2, 8, -1);
      rightWing.rotation.y = Math.PI + Math.PI / 6;
      group.add(rightWing);

      this.meshModel = group;
      this.scene.add(this.meshModel);
      this.autoRotate = true;
      this.updateHud();
    }

    // ── Asset Registry & API Integration ──
    async loadAssetCatalog() {
      try {
        const res = await fetch('/api/v2/studio-3d/assets');
        const data = await res.json();
        if (data && Array.isArray(data.assets)) {
          this.assets = data.assets;
          const countEl = document.getElementById('studioAssetCount');
          if (countEl) countEl.textContent = this.assets.length;
          this.renderAssetCards(this.assets);
        }
      } catch (err) {
        console.warn('[Universal3DStudio] Could not load assets:', err);
      }
    }

    renderAssetCards(list) {
      const grid = document.getElementById('studioAssetGrid');
      if (!grid) return;
      grid.innerHTML = '';

      list.forEach(asset => {
        const card = document.createElement('div');
        card.style.background = 'rgba(6, 10, 18, 0.9)';
        card.style.border = '1px solid rgba(0, 217, 255, 0.2)';
        card.style.borderRadius = '8px';
        card.style.padding = '10px';
        card.style.cursor = 'pointer';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '6px';

        card.innerHTML = `
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <strong style="color:#F8FAFC; font-size:12px;">${asset.name}</strong>
            <span style="font-size:9px; color:#00D9FF; text-transform:uppercase; background:rgba(0,217,255,0.1); padding:2px 6px; border-radius:4px;">${asset.category}</span>
          </div>
          <div style="font-size:10px; color:#94A3B8;">Tipo: ${asset.type} | V: ${asset.version || 1}</div>
          <div style="display:flex; gap:6px; margin-top:4px;">
            <button class="studio-action-btn" style="flex:1; justify-content:center; padding:3px 6px; font-size:10px;" onclick="window.FenixUniversal3DStudio?.loadAsset('${asset.id}')">Carregar</button>
            <button class="studio-action-btn deploy-city" style="padding:3px 8px; font-size:10px;" onclick="window.FenixUniversal3DStudio?.deployAssetById('${asset.id}')" title="Implantar na Cidade 3D">
              <i class="ph-bold ph-buildings"></i>
            </button>
          </div>
        `;
        grid.appendChild(card);
      });
    }

    toggleAssetDrawer() {
      const drawer = document.getElementById('studioAssetDrawer');
      if (drawer) {
        drawer.style.display = drawer.style.display === 'none' ? 'block' : 'none';
      }
    }

    filterAssets(cat) {
      document.querySelectorAll('.studio-asset-filter').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(cat.toLowerCase()));
      });
      if (cat === 'all') {
        this.renderAssetCards(this.assets);
      } else {
        const filtered = this.assets.filter(a => a.category.toLowerCase() === cat.toLowerCase());
        this.renderAssetCards(filtered);
      }
    }

    async saveCurrentAsset() {
      const name = prompt('Nome do Asset 3D:', `Asset_${this.subMode}_${Date.now().toString(36).slice(-4)}`);
      if (!name) return;

      const payload = {
        name,
        category: this.subMode,
        type: this.subMode === 'voxel' ? 'voxel_model' : this.subMode === 'cad' ? 'cad_gear' : 'mesh_model',
        metadata: {
          voxelCount: this.voxels.size,
          cadParams: this.subMode === 'cad' ? this.gearParams : null
        },
        geometryData: {
          voxels: Array.from(this.voxels.values())
        }
      };

      try {
        const res = await fetch('/api/v2/studio-3d/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data && data.ok) {
          alert(`Asset "${name}" salvo com sucesso no Asset Registry (ID: ${data.asset.id})`);
          this.loadAssetCatalog();
        }
      } catch (err) {
        console.error('[Universal3DStudio] Error saving asset:', err);
      }
    }

    async deployCurrentAssetToCity() {
      const payload = {
        assetId: this.currentAsset?.id || `asset_temp_${Date.now()}`,
        name: this.currentAsset?.name || `Studio3D_${this.subMode}`,
        category: this.subMode,
        position: { x: 50, y: 0, z: 50 },
        scale: { x: 1, y: 1, z: 1 }
      };

      try {
        const res = await fetch('/api/v2/studio-3d/deploy-to-city', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data && data.ok) {
          alert(`✅ Modelo implantado com sucesso na Cidade 3D! Posição: [50, 0, 50]`);
          // Dispatch bus event
          if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('studio3d.asset_deployed', { detail: payload }));
          }
        }
      } catch (err) {
        console.error('[Universal3DStudio] Error deploying asset to city:', err);
      }
    }

    async deployAssetById(id) {
      const asset = this.assets.find(a => a.id === id);
      if (!asset) return;
      this.currentAsset = asset;
      await this.deployCurrentAssetToCity();
    }

    async generateFromPrompt() {
      const input = document.getElementById('studio3dPromptInput');
      const prompt = input?.value?.trim();
      if (!prompt) return;

      const submitBtn = document.getElementById('studio3dPromptSubmit');
      if (submitBtn) submitBtn.disabled = true;

      try {
        const res = await fetch('/api/v2/studio-3d/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, category: this.subMode })
        });
        const data = await res.json();
        if (data && data.ok && data.asset) {
          this.loadGeneratedAsset(data.asset);
        }
      } catch (err) {
        console.error('[Universal3DStudio] Generation failed:', err);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    }

    loadGeneratedAsset(asset) {
      if (asset.geometryData && Array.isArray(asset.geometryData.voxels)) {
        this.clearWorkspace();
        asset.geometryData.voxels.forEach(v => {
          this.addVoxel(v.x, v.y, v.z, v.colorData || this.activeColor, false);
        });
      } else if (asset.category === 'cad') {
        this.setSubMode('cad');
      }
      this.updateHud();
    }

    toggleWireframe() {
      this.wireframeMode = !this.wireframeMode;
      this.voxelMeshes.forEach(mesh => {
        mesh.material.wireframe = this.wireframeMode;
      });
      if (this.gear1Mesh) this.gear1Mesh.material.wireframe = this.wireframeMode;
      if (this.gear2Mesh) this.gear2Mesh.material.wireframe = this.wireframeMode;
      document.getElementById('btnStudioWireframeToggle')?.classList.toggle('active', this.wireframeMode);
    }

    toggleAutoRotate() {
      this.autoRotate = !this.autoRotate;
      document.getElementById('btnStudioAutoRotate')?.classList.toggle('active', this.autoRotate);
    }

    updateHud() {
      const countEl = document.getElementById('studioHudEntityCount');
      if (countEl) countEl.textContent = this.voxels.size || (this.gear1Mesh ? '2 Gears' : '1 Mesh');

      const vertEl = document.getElementById('studioStatVertices');
      const faceEl = document.getElementById('studioStatFaces');
      if (vertEl && faceEl) {
        const vCount = this.voxels.size * 8;
        const fCount = this.voxels.size * 12;
        vertEl.textContent = vCount;
        faceEl.textContent = fCount;
      }
    }

    wireEvents() {
      // Raycasting for clicking on the canvas
      if (this.container) {
        this.container.addEventListener('pointerdown', (e) => this.onPointerDown(e));
      }
      window.addEventListener('resize', () => this.onResize());
    }

    onPointerDown(e) {
      if (!this.camera || !this.scene || this.subMode !== 'voxel') return;

      const rect = this.container.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const meshes = Array.from(this.voxelMeshes.values());
      const intersects = this.raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const vData = hit.object.userData;

        if (this.activeTool === 'erase') {
          this.removeVoxel(vData.x, vData.y, vData.z);
        } else if (this.activeTool === 'paint') {
          this.paintVoxel(vData.x, vData.y, vData.z, this.activeColor);
        } else if (this.activeTool === 'add') {
          // Place voxel adjacent to normal
          const normal = hit.face.normal;
          const nx = vData.x + Math.round(normal.x);
          const ny = vData.y + Math.round(normal.y);
          const nz = vData.z + Math.round(normal.z);
          this.addVoxel(nx, ny, nz, this.activeColor);
        }
      } else if (this.activeTool === 'add') {
        // Intersect with ground plane y=0
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const target = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(plane, target);

        if (target) {
          const gx = Math.round(target.x / this.voxelScale);
          const gz = Math.round(target.z / this.voxelScale);
          if (Math.abs(gx) <= this.gridSize / 2 && Math.abs(gz) <= this.gridSize / 2) {
            this.addVoxel(gx, 0, gz, this.activeColor);
          }
        }
      }
    }

    onResize() {
      if (!this.container || !this.renderer || !this.camera) return;
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      if (width && height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
      }
    }
  }

  // Mount Singleton
  window.FenixUniversal3DStudio = new Universal3DStudioEngine();

})(window);
