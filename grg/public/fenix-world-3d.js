/* Fênix World: one WebGL scene projected exclusively from the authenticated City snapshot. */
(() => {
  'use strict';
  const area = document.querySelector('#view-city .fenix-city-canvas-area');
  if (!area) return;
  const world = window.FENIX?.cityWorld;
  if (!window.THREE) {
    const fallback=document.createElement('section'); fallback.className='fw3-no-engine'; fallback.innerHTML='<h2>Visualização 3D indisponível</h2><p>Projetos e agentes continuam acessíveis abaixo.</p><div class="fw3-fallback-list"></div>';
    const list=fallback.querySelector('.fw3-fallback-list');
    const render=data=>{ list.replaceChildren(); if (!data) { list.textContent='Carregando entidades…'; return; }
      for (const project of data.projects||[]) { const button=document.createElement('button'); button.type='button'; button.textContent=project.name||project.id; button.addEventListener('click',()=>{ if (window.openProjectWorkspace) window.openProjectWorkspace(project.id); else window.showView?.('projects'); }); list.append(button); }
      for (const agent of data.agents||[]) { const button=document.createElement('button'); button.type='button'; button.textContent=agent.name||agent.id; button.addEventListener('click',()=>{ if (window.fenixInspectAgent) window.fenixInspectAgent(agent.id); else window.showView?.('agents'); }); list.append(button); }
    };
    render(world?.snapshot); window.addEventListener('fenix:city-world',event=>render(event.detail));
    area.append(fallback); return;
  }
  const T = window.THREE;
  const storageKey = 'fenix_world_camera_v1';
  const districts = [
    { id: 'command-center', name: 'FÊNIX HQ', subtitle: 'Núcleo operacional', color: 0x50d7ac, x: 0, z: 0 },
    { id: 'dev-district', name: 'DEV WORKSHOP', subtitle: 'Código e sistemas', color: 0x82b9b0, x: -19, z: -14 },
    { id: 'project-district', name: 'PROJECT FORGE', subtitle: 'Projetos e versões', color: 0xd6ad6c, x: 19, z: -14 },
    { id: 'ai-district', name: 'MISSION KERNEL', subtitle: 'Agentes e missões', color: 0x9db4ad, x: -24, z: 8 },
    { id: 'creative-district', name: 'DESIGN LAB', subtitle: 'Criação e interface', color: 0xbcae98, x: 24, z: 8 },
    { id: 'data-center', name: 'MEMORY VAULT', subtitle: 'Dados e memória', color: 0x83b9bd, x: -13, z: 24 },
    { id: 'observatory', name: 'OBSERVATÓRIO', subtitle: 'Operação e eventos', color: 0xd1bf8a, x: 13, z: 24 },
  ];
  const byDistrict = new Map(districts.map(item => [item.id, item]));
  const safeNumber = n => Number.isFinite(Number(n)) ? Number(n) : 0;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const saved = (() => { try { return JSON.parse(sessionStorage.getItem(storageKey) || '{}'); } catch { return {}; } })();
  const state = { level: saved.level || 'world', selected: saved.selected || null, azimuth: saved.azimuth == null ? -0.71 : safeNumber(saved.azimuth), distance: saved.distance == null ? 128 : safeNumber(saved.distance), userZoomed:saved.distance != null, target: new T.Vector3(), cameraTarget: new T.Vector3(), cameraDistance: 128, dragging: false, moved: false, pointer: null, snapshot: null, meshes: [], labels: [], agentMeshes: [], selectedObject: null, lastFrame: 0, fallback: false, night: true };

  const host = document.createElement('div'); host.className = 'fenix-world-3d'; host.setAttribute('aria-label', 'Mundo Fênix tridimensional');
  if (saved.selected && !world?.snapshot) host.classList.add('fw3-awaiting-selection');
  const worldDistance = () => clamp(190 / Math.min(host.clientWidth / Math.max(host.clientHeight, 1), 1.28), 145, 300);
  const labelLayer = document.createElement('div'); labelLayer.className = 'fw3-label-layer';
  const fallback = document.createElement('section'); fallback.className = 'fw3-fallback'; fallback.hidden = true;
  fallback.innerHTML = '<h2>Mapa visual indisponível</h2><p>Os dados continuam acessíveis na lista.</p><div class="fw3-fallback-list"></div>';
  host.append(labelLayer, fallback); area.prepend(host);
  const scene = new T.Scene(); scene.background = new T.Color(0x050d19); scene.fog = new T.FogExp2(0x071729, 0.0035);
  const camera = new T.PerspectiveCamera(39, 1, 0.1, 300);
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .95;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.domElement.className = 'fw3-canvas';
    host.prepend(renderer.domElement);
  } catch (error) { state.fallback = true; fallback.hidden = false; host.classList.add('is-fallback'); }
  const ambient = new T.HemisphereLight(0xb9ccc8, 0x071020, 1.28); scene.add(ambient);
  const sun = new T.DirectionalLight(0xffd2a0, 1.55); sun.position.set(-22, 44, -18); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = sun.shadow.camera.bottom = -75; sun.shadow.camera.right = sun.shadow.camera.top = 75; scene.add(sun);
  const cityLight = new T.PointLight(0x4abf9b, 8, 26); cityLight.position.set(0, 12, 0); scene.add(cityLight);
  const staticGroup = new T.Group(), dynamicGroup = new T.Group(), interiorGroup = new T.Group();
  scene.add(staticGroup, dynamicGroup, interiorGroup);
  const mat = (color, extra = {}) => new T.MeshStandardMaterial({ color, roughness: .53, metalness: .43, ...extra });
  const dark = mat(0x1b2a32), darkRoof = mat(0x16232c), groundMat = mat(0x142a2d), asphalt = mat(0x0c1720, { roughness: .94 });
  const gold = mat(0xffb961, { emissive: 0x7d3d09, emissiveIntensity: .55 });
  function box(group, x, y, z, w, h, d, material, meta) {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.castShadow = h > .5; mesh.receiveShadow = true;
    if (meta) { mesh.userData.city = meta; state.meshes.push(mesh); }
    group.add(mesh); return mesh;
  }
  function cylinder(group, x, y, z, r1, r2, h, material, sides = 8, meta) {
    const mesh = new T.Mesh(new T.CylinderGeometry(r1, r2, h, sides), material);
    mesh.position.set(x, y, z); mesh.castShadow = true;
    if (meta) { mesh.userData.city = meta; state.meshes.push(mesh); }
    group.add(mesh); return mesh;
  }
  function line(group, pts, color, opacity = .65) {
    const geometry = new T.BufferGeometry().setFromPoints(pts.map(p => new T.Vector3(...p)));
    const mesh = new T.Line(geometry, new T.LineBasicMaterial({ color, transparent: true, opacity })); group.add(mesh); return mesh;
  }
  function led(group, x, y, z, w, d, color) { box(group, x, y, z, w, .08, d, mat(color, { emissive: color, emissiveIntensity: 1.5 })); }
  function label(text, subtitle, position, kind, id, color) {
    const button = document.createElement('button'); button.type = 'button'; button.className = `fw3-label fw3-${kind}`;
    button.innerHTML = '<span class="fw3-marker"></span><span class="fw3-label-copy"><strong></strong><small></small></span>';
    button.querySelector('strong').textContent = text; button.querySelector('small').textContent = subtitle || '';
    button.style.setProperty('--label-color', '#' + color.toString(16).padStart(6, '0'));
    button.addEventListener('click', () => select(kind, id)); labelLayer.append(button);
    state.labels.push({ element: button, position: new T.Vector3(...position), kind, id });
    return button;
  }
  function districtOf(agent) {
    const known = String(agent.district || '').toLowerCase();
    if (byDistrict.has(known)) return known;
    const role = String(agent.role || agent.name || '').toLowerCase();
    if (/frontend|design|visual|ux/.test(role)) return 'creative-district';
    if (/database|memory|security|data/.test(role)) return 'data-center';
    if (/qa|browser|devops|observ/.test(role)) return 'observatory';
    if (/backend|developer|architect|code/.test(role)) return 'dev-district';
    if (/project|github/.test(role)) return 'project-district';
    if (/research|ai|agent|model/.test(role)) return 'ai-district';
    return 'command-center';
  }
  function tower(group, x, z, h, color, type = 0, meta) {
    const tint = mat(color, { emissive: color, emissiveIntensity: .1 });
    const glass = mat(0x27404b, { metalness: .68, roughness: .28 });
    box(group, x, .65, z, 4.5, 1.1, 4.5, dark, meta);
    if (type === 0) {
      box(group, x, 1.3 + h / 2, z, 3.2, h, 3.1, glass, meta);
      for (let y = 2.4; y < h + 1; y += 1.5) {
        box(group, x, y, z, 3.35, .12, 3.25, tint);
        led(group, x, y + .08, z + 1.66, 2.8, .09, color);
      }
      box(group, x, h + 1.4, z, 3.6, .5, 3.5, darkRoof, meta);
      cylinder(group, x, h + 2.3, z, .12, .28, 1.6, tint, 6);
      for (let y = 2; y < h + 1; y += .9) for (let col = -1; col <= 1; col++) {
        if ((Math.round(y * 10) + col + Math.round(x)) % 4 === 0) continue;
        box(group, x + col * .82, y, z + 1.565, .48, .43, .06, mat(col===0?0xe8b978:0x8daeb0,{emissive:col===0?0x805332:0x25454a,emissiveIntensity:.35}),meta);
        box(group, x + 1.625, y, z + col * .78, .06, .43, .45, mat(0x89a8a9,{emissive:0x25434a,emissiveIntensity:.3}),meta);
      }
    } else if (type === 1) {
      for (const side of [-1, 1]) box(group, x + side * .87, 1.3 + h / 2, z, 1.5, h, 3.25, glass, meta);
      box(group, x, h + 1.5, z, 4.2, .45, 3.75, tint, meta);
      for (let y = 2.2; y < h + 1; y += 1.65) for (const side of [-1, 1]) led(group, x + side * .87, y, z + 1.66, 1.1, .1, color);
      for (let y = 2.05; y < h + .8; y += .86) for (const side of [-1, 1]) {
        box(group, x + side * .87, y, z + 1.67, .86, .42, .08, mat(0xc7aa7a,{emissive:0x6c4c2d,emissiveIntensity:.35}),meta);
      }
    } else {
      cylinder(group, x, h / 2 + .9, z, 1.7, 2, h, glass, 8, meta);
      for (let y = 2; y < h + 1; y += 1.7) cylinder(group, x, y, z, 1.95, 1.95, .14, tint, 8, meta);
      cylinder(group, x, h + 1.2, z, .2, 1.8, 1.1, darkRoof, 8, meta);
    }
    for (let i = 0; i < 4; i++) led(group, x + (i % 2 ? 1 : -1) * 1.85, 1.32, z + (i < 2 ? -1 : 1) * 1.85, .28, .28, color);
  }
  function landmark(d) {
    const group = staticGroup, x = d.x, z = d.z, meta = { kind: 'district', id: d.id };
    const stone = mat(0x27383b, { roughness: .82 }), wall = mat(0x25353e), roof = mat(0x111e27), windowWarm = mat(0xcbaa79, { emissive: 0x735032, emissiveIntensity: .38 });
    const edge = mat(d.color, { emissive: d.color, emissiveIntensity: .15 });
    box(group, x, .49, z, 10.8, .5, 9.4, stone, meta);
    if (d.id === 'command-center') {
      box(group,x,4.9,z,4.5,8.5,4.4,wall,meta);
      for(let y=2;y<9;y+=1.25) { box(group,x,y,z+2.28,3.9,.48,.08,windowWarm); box(group,x,y,z-2.28,3.9,.48,.08,windowWarm); }
      for(let y=2;y<9;y+=1.35) box(group,x,y,z+2.37,1.1,.12,.1,edge);
      box(group,x,9.6,z,5.2,.75,5.1,roof,meta);
      cylinder(group,x,12,z,.32,1.15,4,edge,6,meta);
      for(const side of [-1,1]) { box(group,x+side*3.65,2.7,z,2,4.6,3.2,wall,meta); box(group,x+side*3.65,5.1,z,2.3,.28,3.5,roof); }
    } else if (d.id === 'dev-district') {
      for(const side of [-1,1]) {
        box(group,x+side*2.65,2.2,z,4.4,3.3,6.5,wall,meta);
        box(group,x+side*2.65,4.02,z,4.75,.38,6.8,roof);
        for(let p=-2.2;p<=2.2;p+=1.1) box(group,x+side*2.65+p,2.5,z+3.3,.64,1.45,.09,windowWarm);
      }
      box(group,x,1.4,z+3.5,3.1,1.6,1.2,mat(0x4b6b6c,{roughness:.25}),meta);
      box(group,x,2.45,z+3.9,2.6,.18,.12,edge);
    } else if (d.id === 'project-district') {
      for(const side of [-1,1]) {
        box(group,x+side*2.35,3.25,z,3.5,5.3,5.4,wall,meta);
        box(group,x+side*2.35,6.12,z,3.9,.42,5.8,roof);
        for(let y=1.9;y<6;y+=1.15) box(group,x+side*2.35,y,z+2.76,2.6,.44,.1,windowWarm);
      }
      box(group,x,1.55,z+3.1,4.1,2,1.4,mat(0x48565b,{metalness:.75}),meta);
    } else if (d.id === 'ai-district') {
      box(group,x,2.6,z,7.8,4.1,6.2,wall,meta);
      box(group,x,4.85,z,8.3,.35,6.7,roof);
      cylinder(group,x,5.4,z,.95,2.1,1.1,mat(0x466365,{metalness:.7,roughness:.25}),12,meta);
      for(let p=-2.8;p<=2.8;p+=1.4) box(group,x+p,2.5,z+3.2,.85,1.65,.1,windowWarm);
      cylinder(group,x,6.15,z,.12,.45,.55,edge,12);
    } else if (d.id === 'creative-district') {
      box(group,x-1.8,2.25,z,4.4,3.3,6.3,wall,meta);
      box(group,x+2.1,3.3,z-.4,3.4,5.4,5,wall,meta);
      box(group,x-1.8,4.1,z,4.8,.28,6.7,roof);
      box(group,x+2.1,6.15,z-.4,3.8,.3,5.3,roof);
      for(let p=-2;p<=2;p+=1.2) box(group,x-1.8+p,2.35,z+3.2,.75,1.55,.1,windowWarm);
      for(let y=2;y<6;y+=1.2) box(group,x+2.1,y,z+2.17,2.4,.5,.1,windowWarm);
    } else if (d.id === 'data-center') {
      for(const side of [-1,0,1]) {
        box(group,x+side*2.45,2.8,z,2.1,4.4,5.8,wall,meta);
        box(group,x+side*2.45,5.15,z,2.3,.3,6,roof);
        for(let y=1.5;y<5;y+=.75) box(group,x+side*2.45,y,z+2.98,1.3,.12,.1,side===0?edge:windowWarm);
      }
    } else {
      box(group,x,2,z,6.8,2.9,6.7,wall,meta);
      cylinder(group,x,4.35,z,2.7,3.3,2,mat(0x39545b,{metalness:.6,roughness:.28}),12,meta);
      cylinder(group,x,5.36,z,.9,.9,.12,edge,12);
      for(const side of [-1,1]) box(group,x+side*3.65,2.35,z,1.1,3.6,2.2,wall,meta);
    }
    box(group,x,.76,z+4.78,2.2,.14,.45,edge);
  }
  function buildStatic() {
    box(staticGroup, 0, -1.47, 5, 170, .12, 156, mat(0x061a32,{metalness:.72,roughness:.24}));
    for (let i=0;i<18;i++) {
      const z=-59+i*7.4;
      line(staticGroup,[[-84,-1.37,z],[-68,-1.37,z+2.5],[66,-1.37,z+2],[84,-1.37,z+4]],0x125b7c,.22);
    }
    box(staticGroup, 0, -.72, 5, 96, 1.2, 83, mat(0x071521));
    box(staticGroup, 0, -.08, 5, 95, .1, 82, groundMat);
    for (const d of districts) {
      box(staticGroup, d.x, .08, d.z, 15.8, .42, 13.3, darkRoof, { kind: 'district', id: d.id });
      const ring = [
        [[-7.9,.32,-6.7],[7.9,.32,-6.7]], [[7.9,.32,-6.7],[7.9,.32,6.7]],
        [[7.9,.32,6.7],[-7.9,.32,6.7]], [[-7.9,.32,6.7],[-7.9,.32,-6.7]],
      ];
      ring.forEach(([a,b]) => line(staticGroup, [[a[0]+d.x,a[1],a[2]+d.z],[b[0]+d.x,b[1],b[2]+d.z]], d.color, .8));
      landmark(d);
      for (const side of [-1,1]) {
        box(staticGroup,d.x+side*6.6,.4,d.z,1.1,.25,9.7,mat(0x34474a,{roughness:.85}));
        for (const offset of [-4,0,4]) cylinder(staticGroup,d.x+side*6.6,.95,d.z+offset,.24,.29,.9,mat(0x4c665b),6);
      }
      label(d.name, d.subtitle, [d.x, d.id === 'command-center' ? 15 : 9.5, d.z], 'district', d.id, d.color);
      if (d.id !== 'command-center') {
        const points = [new T.Vector3(0,.16,0),new T.Vector3(d.x * .53,.16,d.z * .53),new T.Vector3(d.x,.16,d.z)];
        const curve = new T.CatmullRomCurve3(points);
        const road = new T.Mesh(new T.TubeGeometry(curve, 20, .5, 5, false), asphalt); staticGroup.add(road);
        const route = new T.Line(new T.BufferGeometry().setFromPoints(curve.getPoints(30)), new T.LineBasicMaterial({ color:d.color, transparent:true, opacity:.66 })); route.position.y += .18; staticGroup.add(route);
      }
    }
    for (let i = 0; i < 82; i++) {
      const x = (Math.sin(i * 27.12) * 41), z = (Math.cos(i * 17.4) * 36) + 5;
      if (districts.some(d => Math.abs(x-d.x) < 9 && Math.abs(z-d.z) < 8)) continue;
      const h = .65 + (i % 4) * .3;
      cylinder(staticGroup, x, h / 2, z, .5, .68, h, mat(0x14544a), 5);
      cylinder(staticGroup, x, h + .18, z, .8, .18, .75, mat(i % 4 ? 0x176a58 : 0x25917a), 6);
    }
  }
  function cleanDynamic() {
    for (const child of [...dynamicGroup.children, ...interiorGroup.children]) {
      child.traverse(obj => { obj.geometry?.dispose?.(); if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose?.()); else obj.material?.dispose?.(); });
      child.parent?.remove(child);
    }
    state.meshes = state.meshes.filter(mesh => mesh.parent && mesh.parent !== dynamicGroup && mesh.parent !== interiorGroup);
    state.labels.filter(item => item.kind !== 'district').forEach(item => item.element.remove());
    state.labels = state.labels.filter(item => item.kind === 'district'); state.agentMeshes = [];
  }
  function projectPositions(count) {
    const result = [];
    for (let i = 0; i < count; i++) {
      const ring = Math.floor(i / 12), slot = i % 12, angle = slot * Math.PI / 6 + ring * .23;
      const radius = 34 + ring * 12;
      result.push([Math.cos(angle) * radius, Math.sin(angle) * radius + 5]);
    }
    return result;
  }
  function drawAgent(agent, index, perDistrict) {
    const id = districtOf(agent), d = byDistrict.get(id), ordinal = perDistrict.get(id) || 0;
    perDistrict.set(id, ordinal + 1);
    const row = Math.floor(ordinal / 6), slot = ordinal % 6;
    const x = d.x - 6.4 + slot * 2.55, z = d.z + 7.7 + row * 2.25;
    const working = String(agent.status || '').toUpperCase() === 'WORKING';
    const suit = mat(working ? 0x14bc89 : 0x225e8d, { emissive: working ? 0x0a8564 : 0x10345a, emissiveIntensity: working ? .85 : .28 });
    const skin = mat(0xffcea2); const meta = { kind: 'agent', id: agent.id };
    cylinder(dynamicGroup, x, .23, z, .75, .8, .22, mat(working ? 0x16e9a3 : 0x3c83b5, { emissive: working ? 0x16e9a3 : 0x183552, emissiveIntensity: .9 }), 8, meta);
    box(dynamicGroup, x, .87, z, .55, .9, .37, suit, meta);
    cylinder(dynamicGroup, x, 1.55, z, .32, .3, .42, skin, 8, meta);
    box(dynamicGroup, x, 1.79, z-.04, .66, .18, .47, mat(0x101923), meta);
    led(dynamicGroup, x, 1.02, z+.2, .22, .1, working ? 0x15f3ac : 0x51b6ff);
    state.agentMeshes.push({ x, z, agent });
    label(agent.name || agent.id, working ? 'EM EXECUÇÃO' : String(agent.status || '—'), [x,2.6,z], 'agent', agent.id, working ? 0x38ffc0 : 0x72cfff);
  }
  function renderSnapshot(data) {
    if (!data || !Array.isArray(data.projects) || !Array.isArray(data.agents)) return;
    state.snapshot = data; cleanDynamic();
    const positions = projectPositions(data.projects.length);
    data.projects.forEach((project, i) => {
      const [x,z] = positions[i], related = (data.recentJobs || []).filter(job => job.projectId === project.id);
      const running = related.some(job => String(job.status).toUpperCase() === 'RUNNING');
      const failed = related.some(job => ['FAILED','DEAD_LETTER'].includes(String(job.status).toUpperCase()));
      const color = failed ? 0xff715f : running ? 0x24f3a5 : 0x6dbbff;
      box(dynamicGroup, x, .18, z, 8, .38, 8, mat(0x092336), { kind: 'project', id: project.id });
      tower(dynamicGroup, x, z, 5 + (i % 4) * 1.2, color, i % 3, { kind: 'project', id: project.id });
      label(project.name || project.id, running ? 'JOB EM EXECUÇÃO' : failed ? 'FALHA RECENTE' : project.workspace ? 'WORKSPACE CONECTADO' : 'SEM WORKSPACE', [x,10.5,z], 'project', project.id, color);
    });
    const perDistrict = new Map(); data.agents.forEach((agent, i) => drawAgent(agent, i, perDistrict));
    (data.machines || []).forEach((machine, i) => {
      const x = 8 + i * 7, z = 34, meta = { kind: 'machine', id: machine.id };
      const color = machine.status === 'ONLINE' ? 0x52cba4 : 0xd99176;
      box(dynamicGroup,x,.26,z,4.7,.5,4,mat(0x1d3034),meta);
      for (const side of [-1,1]) {
        box(dynamicGroup,x+side*1.2,2.1,z,1.8,3.2,2.5,mat(0x24323b,{metalness:.56}),meta);
        for(let y=1.15;y<3.3;y+=.62) box(dynamicGroup,x+side*1.2,y,z+1.28,1.35,.25,.08,mat(0x6d918a,{emissive:color,emissiveIntensity:.14}),meta);
      }
      label(machine.name || machine.id, machine.status || '—', [x,5.5,z], 'machine', machine.id, color);
    });
    if (state.selected) focusSelection(false);
    host.classList.remove('fw3-awaiting-selection');
    renderFallback();
  }
  function renderFallback() {
    const list = fallback.querySelector('.fw3-fallback-list'); list.replaceChildren();
    const data = state.snapshot; if (!data) { list.textContent = world?.error ? 'Dados indisponíveis. Atualize a Cidade.' : 'Carregando dados…'; return; }
    for (const item of [...data.projects.map(p => ({ kind:'project', id:p.id, text:p.name || p.id })), ...data.agents.map(a => ({ kind:'agent', id:a.id, text:a.name || a.id })), ...(data.machines || []).map(m => ({ kind:'machine', id:m.id, text:m.name || m.id }))]) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = item.text; button.addEventListener('click', () => select(item.kind, item.id)); list.append(button);
    }
  }
  function renderInterior(agent, x, z) {
    for (const child of [...interiorGroup.children]) { child.traverse(obj => {obj.geometry?.dispose?.();obj.material?.dispose?.();}); interiorGroup.remove(child); }
    const d = agent ? byDistrict.get(districtOf(agent)) : { color:0x6dbbff }; interiorGroup.position.set(x, 0, z);
    const accent = mat(d.color, { emissive:d.color, emissiveIntensity:.6 });
    box(interiorGroup, 0, .45, 0, 11, .4, 9, mat(0x10212d));
    box(interiorGroup, 0, 2.6, -4.5, 11, 4.2, .3, mat(0x193143));
    box(interiorGroup, -5.5, 2.6, 0, .3, 4.2, 9, mat(0x193143));
    for (let tile=-4;tile<=4;tile+=2) {
      line(interiorGroup,[[tile,.67,-4.3],[tile,.67,4.3]],d.color,.28);
      line(interiorGroup,[[-5.3,.67,tile],[5.3,.67,tile]],d.color,.28);
    }
    for (const side of [-1,1]) {
      box(interiorGroup,side*4.7,2.65,-4.22,.62,2.55,.22,mat(0x082431));
      for (let ledY=1.7;ledY<4;ledY+=.46) led(interiorGroup,side*4.7,ledY,-4.08,.36,.08,side<0?0x4cb8ff:d.color);
      box(interiorGroup,side*4.65,1.2,3.1,1.1,.2,1.1,gold);
      cylinder(interiorGroup,side*4.65,1.85,3.1,.38,.42,.95,mat(0x19414c),7);
      cylinder(interiorGroup,side*4.65,2.5,3.1,.58,.48,.54,mat(0x17594e),7);
    }
    box(interiorGroup,0,3.05,-4.28,3.7,1.65,.14,mat(0x063a4c,{emissive:d.color,emissiveIntensity:.38}));
    for(let i=0;i<5;i++) led(interiorGroup,-1.3+i*.65,2.65+(i%3)*.25,-4.19,.38,.07,d.color);
    for (let i = 0; i < 3; i++) {
      const x = -3.2 + i * 3.2;
      box(interiorGroup, x, 1.35, 0, 2.5, .2, 1.2, gold);
      for (const side of [-1,1]) box(interiorGroup,x+side*1.05,.93,0,.13,.72,.13,dark);
      box(interiorGroup, x, 2.05, -.4, 1.8, 1.17, .18, mat(0x071522));
      box(interiorGroup, x, 2.05, -.3, 1.57,.91,.05, mat(0x08364a, { emissive:d.color, emissiveIntensity:.75 }));
      for (let row=0;row<3;row++) led(interiorGroup,x-.48+row*.48,2.25-row*.18,-.24,.32,.04,row===1?0xffb45f:d.color);
      box(interiorGroup, x, 1.5, 1.9, .75, .2, .7, dark);
      if (agent && i===1) {
        cylinder(interiorGroup, x, 1.13, 2.25, .33, .36, .65, mat(String(agent.status).toUpperCase()==='WORKING'?0x14af85:0x1a6580), 8);
        cylinder(interiorGroup, x, 1.74, 2.25, .28, .28, .44, mat(0xe9ae83), 8);
      }
      led(interiorGroup, x, 2.4, -.32, 1.2, .12, d.color);
    }
    led(interiorGroup, 0, 4.7, -4.3, 8.4, .16, d.color);
    for(const side of [-1,1]) line(interiorGroup,[[side*5.25,.72,-4.2],[side*5.25,.72,4.1]],d.color,.8);
    interiorGroup.visible = true;
  }
  function saveState() { try { sessionStorage.setItem(storageKey, JSON.stringify({ level:state.level, selected:state.selected, azimuth:state.azimuth, distance:state.distance })); } catch {} }
  function focusSelection(animate = true) {
    const selected = state.selected; if (!selected) return;
    let x = 0, z = 0, distance = worldDistance();
    const aspect=Math.min(host.clientWidth/Math.max(host.clientHeight,1),1.3);
    if (selected.kind === 'district') { const d = byDistrict.get(selected.id); if (!d) return; x=d.x; z=d.z; distance=clamp(55/aspect,44,105); state.level='district'; }
    if (selected.kind === 'project') { const index = state.snapshot?.projects?.findIndex(p => p.id === selected.id) ?? -1; if (index < 0) return; [x,z]=projectPositions(state.snapshot.projects.length)[index]; if (state.level==='interior') { distance=clamp(32/aspect,26,65); renderInterior(null,x,z); } else { distance=clamp(38/aspect,30,75); state.level='building'; } }
    if (selected.kind === 'agent') { const found = state.agentMeshes.find(a => a.agent.id === selected.id); if (!found) return; x=found.x; z=found.z; distance=clamp(30/aspect,24,60); state.level='station'; renderInterior(found.agent,x,z); }
    else if (selected.kind === 'machine') { const index = state.snapshot?.machines?.findIndex(m => m.id === selected.id) ?? -1; if (index < 0) return; x=8+index*7; z=34; distance=clamp(38/aspect,30,75); state.level='building'; }
    else if (state.level!=='interior') interiorGroup.visible = false;
    staticGroup.visible = !['station','interior'].includes(state.level);
    dynamicGroup.visible = !['station','interior'].includes(state.level);
    state.cameraTarget.set(x, 1.6, z); state.cameraDistance=distance; state.distance=distance;
    if (!animate) { state.target.copy(state.cameraTarget); }
    saveState(); window.dispatchEvent(new CustomEvent('fenix:world-selection', { detail:{ level:state.level, selected:state.selected } }));
  }
  function select(kind, id) {
    if (kind === 'world') { state.selected=null; state.level='world'; state.userZoomed=false; state.cameraTarget.set(0,0,5); state.cameraDistance=worldDistance(); state.distance=state.cameraDistance; interiorGroup.visible=false; staticGroup.visible=true; dynamicGroup.visible=true; saveState(); window.dispatchEvent(new CustomEvent('fenix:world-selection', { detail:{ level:'world', selected:null } })); return; }
    state.selected={kind,id}; if (kind==='project') state.level='building'; focusSelection();
  }
  function enterProject(id) { state.selected={kind:'project',id}; state.level='interior'; focusSelection(); }
  function back() { if (state.level === 'interior') select('project',state.selected?.id); else if (state.level === 'station') { const agent=state.snapshot?.agents?.find(a => a.id===state.selected?.id); select('district',districtOf(agent || {})); } else select('world'); }
  function zoom(direction) { state.cameraDistance=clamp(state.cameraDistance + (direction==='in'?-6:6),8,330); state.distance=state.cameraDistance; state.userZoomed=true; saveState(); }
  function resize() { if (!renderer) return; const w=host.clientWidth,h=host.clientHeight; if (!w || !h) return; camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h,false); if (state.level==='world' && !state.userZoomed) { state.cameraDistance=worldDistance(); state.distance=state.cameraDistance; } }
  const raycaster = new T.Raycaster(), pointer = new T.Vector2();
  function onPointerDown(event) { state.pointer={x:event.clientX,y:event.clientY}; state.dragging=true; state.moved=false; }
  function onPointerMove(event) {
    if (!state.dragging || !state.pointer) return;
    const dx=event.clientX-state.pointer.x, dy=event.clientY-state.pointer.y;
    if (Math.abs(dx)+Math.abs(dy)>2) state.moved=true;
    if (state.moved) { state.azimuth+=dx*.005; state.cameraDistance=clamp(state.cameraDistance+dy*.03,8,100); state.pointer={x:event.clientX,y:event.clientY}; saveState(); }
  }
  function onPointerUp(event) {
    state.dragging=false; if (state.moved || !renderer) return;
    const bounds=renderer.domElement.getBoundingClientRect(); pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);
    raycaster.setFromCamera(pointer,camera);
    const hits=raycaster.intersectObjects(state.meshes,false);
    if (hits[0]?.object.userData.city) { const {kind,id}=hits[0].object.userData.city; select(kind,id); }
  }
  if (renderer) {
    renderer.domElement.addEventListener('pointerdown',onPointerDown);
    renderer.domElement.addEventListener('pointermove',onPointerMove);
    renderer.domElement.addEventListener('pointerup',onPointerUp);
    renderer.domElement.addEventListener('pointerleave',() => { state.dragging=false; });
    renderer.domElement.addEventListener('wheel',event => { event.preventDefault(); zoom(event.deltaY<0?'in':'out'); }, { passive:false });
    renderer.domElement.addEventListener('webglcontextlost',event => { event.preventDefault(); state.fallback=true; fallback.hidden=false; host.classList.add('is-fallback'); renderFallback(); });
    new ResizeObserver(resize).observe(host);
  }
  function frame(time) {
    requestAnimationFrame(frame);
    if (!renderer || state.fallback || !document.getElementById('view-city')?.classList.contains('active') || document.visibilityState==='hidden') return;
    if (time-state.lastFrame<32) return; state.lastFrame=time;
    state.target.lerp(state.cameraTarget,.065);
    const dist=state.cameraDistance;
    const desired=new T.Vector3(state.target.x+Math.cos(state.azimuth)*dist*.7,state.target.y+dist*.62,state.target.z+Math.sin(state.azimuth)*dist*.7);
    camera.position.lerp(desired,.09); camera.lookAt(state.target);
    renderer.render(scene,camera);
    const occupied=[];
    for (const item of state.labels) {
      const agent=state.snapshot?.agents?.find(a=>a.id===item.id);
      const relevant = state.level==='world' ? item.kind==='district' || item.kind==='project' || item.kind==='machine'
        : state.level==='district' ? (item.kind==='district' && item.id===state.selected?.id) || (item.kind==='agent' && agent && districtOf(agent)===state.selected?.id) || (item.kind==='machine' && state.selected?.id==='observatory')
          : state.level==='building' ? (item.kind==='project' && item.id===state.selected?.id) || (item.kind==='machine' && item.id===state.selected?.id) || (item.kind==='agent' && agent?.projectId===state.selected?.id)
            : item.kind==='agent' && item.id===state.selected?.id;
      item.element.hidden = !relevant; if (item.element.hidden) continue;
      const p=item.position.clone().project(camera);
      item.element.hidden=p.z>1 || p.z< -1 || Math.abs(p.x)>1.2 || Math.abs(p.y)>1.2;
      if (!item.element.hidden) {
        const x=(p.x*.5+.5)*host.clientWidth, width=item.element.offsetWidth ?? 110, height=item.element.offsetHeight ?? 32;
        let y=(-p.y*.5+.5)*host.clientHeight;
        for (let attempt=0;attempt<8 && occupied.some(other=>Math.abs(x-other.x)<(width+other.width)/2+6 && Math.abs(y-other.y)<(height+other.height)/2+5);attempt++) y+=height+8;
        item.element.style.left=`${x}px`; item.element.style.top=`${y}px`;
        occupied.push({x,y,width,height});
      }
    }
    const badge=document.getElementById('cityZoomBadge'),level=document.getElementById('fenixCityZoomLevel');
    if (badge) badge.textContent=({world:'MUNDO',district:'BAIRRO',building:'EDIFÍCIO',interior:'INTERIOR',station:'ESTAÇÃO'})[state.level];
    if (level) level.textContent=`${Math.round(worldDistance() / state.cameraDistance * 100)}%`;
  }
  buildStatic(); resize(); state.cameraTarget.set(0,0,5); state.target.copy(state.cameraTarget); state.cameraDistance=saved.distance || worldDistance(); state.distance=state.cameraDistance;
  camera.position.set(47,48,-45); camera.lookAt(state.target);
  if (world?.snapshot) renderSnapshot(world.snapshot);
  window.addEventListener('fenix:city-world',event => renderSnapshot(event.detail));
  window.addEventListener('keydown',event => { if (event.key==='Escape' && document.getElementById('view-city')?.classList.contains('active')) back(); });
  window.fenixWorld3D={ select, back, zoom, state, renderSnapshot, enterProject, refresh:()=>world?.refresh(true) };
  window.fenixCity={
    DISTRICTS:Object.fromEntries(districts.map(d=>[d.id,d])),
    resize, resetCamera:()=>select('world'), rotateCamera:()=>{state.azimuth+=Math.PI/2;saveState();},
    zoomStep:step=>zoom(step>0?'in':'out'), panToDistrict:id=>select(id==='ALL'?'world':'district',id),
    syncRealData:()=>world?.refresh(true), centerAgent:id=>select('agent',id), followAgent:id=>select('agent',id),
    setCameraMode:()=>{}, navigateToLevel:()=>select('world'),
  };
  window.fenixPanToDistrict=id => select(id==='ALL'?'world':'district',id);
  window.fenixCityZoom=zoom;
  window.fenixToggleDayNight=() => { state.night=!state.night; scene.background.setHex(state.night?0x050d19:0x1b3651); ambient.intensity=state.night?1.05:2.1; sun.intensity=state.night?1.45:3; };
  window.fenixToggleCityList=() => { state.fallback=!state.fallback; fallback.hidden=!state.fallback; host.classList.toggle('is-fallback',state.fallback); renderFallback(); };
  document.getElementById('btnRotateCity')?.addEventListener('click', event => { event.stopImmediatePropagation(); state.azimuth+=Math.PI/2; saveState(); }, true);
  document.getElementById('btnResetCamera')?.addEventListener('click', event => { event.stopImmediatePropagation(); state.azimuth=-.71; select('world'); }, true);
  const listToggle=document.getElementById('btnCityListView'); listToggle?.addEventListener('click',()=>listToggle.setAttribute('aria-pressed',String(state.fallback)));
  if (saved.selected) { state.selected=saved.selected; state.level=saved.level; setTimeout(()=>focusSelection(false),800); }
  requestAnimationFrame(frame);
})();
