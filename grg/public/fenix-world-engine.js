class FenixWorldEngine {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0e1a, 0.015);
    
    // Background gradient
    this.container.style.background = 'linear-gradient(to bottom, #0a0e1a, #1a1e3a)';

    const aspect = container.clientWidth / container.clientHeight;
    const d = 20;
    this.orthoCamera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
    this.orthoCamera.position.set(20, 20, 20);
    this.orthoCamera.lookAt(this.scene.position);
    
    this.perspCamera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.perspCamera.position.set(0, 0.5, 5);
    
    this.camera = this.orthoCamera;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.zIndex = '1';
    
    this.container.appendChild(this.renderer.domElement);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minZoom = 0.5;
    this.controls.maxZoom = 3;
    this.controls.target.set(0, 0, 0);

    this.clock = new THREE.Clock();
    
    this.entities = [];
    this.characters = [];
    this.vehicles = [];
    
    this.initLighting();
    this.initTerrain();
    this.initBuildings();
    this.initVegetation();
    this.initProps();
    this.initCharacters();
    this.initVehicles();
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));
    window.addEventListener('resize', this.onResize.bind(this));

    this.animate = this.animate.bind(this);
    this.animate();
  }

  initLighting() {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff4e6, 1.0);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    this.scene.add(dirLight);
  }

  initTerrain() {
    const gridLimit = 24;
    const size = 49;
    
    const geom = new THREE.BoxGeometry(1, 0.1, 1);
    
    const matGrass = new THREE.MeshLambertMaterial({color: 0x2d4c1e});
    const matRoad = new THREE.MeshLambertMaterial({color: 0x222222});
    const matSidewalk = new THREE.MeshLambertMaterial({color: 0x888888});
    const matWater = new THREE.MeshLambertMaterial({color: 0x1e3f5a, transparent: true, opacity: 0.8});
    const matPlaza = new THREE.MeshLambertMaterial({color: 0x555555});
    
    const instGrass = new THREE.InstancedMesh(geom, matGrass, size*size);
    const instRoad = new THREE.InstancedMesh(geom, matRoad, size*size);
    const instSidewalk = new THREE.InstancedMesh(geom, matSidewalk, size*size);
    const instWater = new THREE.InstancedMesh(geom, matWater, size*size);
    const instPlaza = new THREE.InstancedMesh(geom, matPlaza, size*size);
    
    instGrass.receiveShadow = true;
    instRoad.receiveShadow = true;
    instSidewalk.receiveShadow = true;
    instWater.receiveShadow = true;
    instPlaza.receiveShadow = true;

    let idxGrass=0, idxRoad=0, idxSidewalk=0, idxWater=0, idxPlaza=0;
    const dummy = new THREE.Object3D();

    for(let x=-gridLimit; x<=gridLimit; x++) {
      for(let z=-gridLimit; z<=gridLimit; z++) {
        dummy.position.set(x, 0, z);
        dummy.updateMatrix();
        
        let isWater = Math.abs(x) >= gridLimit-1 || Math.abs(z) >= gridLimit-1;
        let isRoad = (x % 6 === 0) || (z % 6 === 0);
        let isSidewalk = !isRoad && !isWater && ((Math.abs(x%6) === 1) || (Math.abs(z%6) === 1));
        let isPlaza = !isWater && !isRoad && !isSidewalk && Math.abs(x) < 3 && Math.abs(z) < 3;
        
        if (isWater) { instWater.setMatrixAt(idxWater++, dummy.matrix); }
        else if (isRoad) { instRoad.setMatrixAt(idxRoad++, dummy.matrix); }
        else if (isSidewalk) { instSidewalk.setMatrixAt(idxSidewalk++, dummy.matrix); }
        else if (isPlaza) { instPlaza.setMatrixAt(idxPlaza++, dummy.matrix); }
        else { instGrass.setMatrixAt(idxGrass++, dummy.matrix); }
      }
    }
    
    instGrass.count = idxGrass;
    instRoad.count = idxRoad;
    instSidewalk.count = idxSidewalk;
    instWater.count = idxWater;
    instPlaza.count = idxPlaza;
    
    this.scene.add(instGrass, instRoad, instSidewalk, instWater, instPlaza);
    
    // Road markings
    const markGeom = new THREE.PlaneGeometry(0.1, 0.4);
    const markMat = new THREE.MeshBasicMaterial({color: 0xddaa00});
    const instMark = new THREE.InstancedMesh(markGeom, markMat, 2000);
    let idxMark = 0;
    
    for(let x=-gridLimit+2; x<=gridLimit-2; x+=1) {
      if(x%6 !== 0) {
        dummy.position.set(x, 0.06, 0);
        dummy.rotation.set(-Math.PI/2, 0, Math.PI/2);
        dummy.updateMatrix();
        instMark.setMatrixAt(idxMark++, dummy.matrix);
      }
    }
    for(let z=-gridLimit+2; z<=gridLimit-2; z+=1) {
      if(z%6 !== 0) {
        dummy.position.set(0, 0.06, z);
        dummy.rotation.set(-Math.PI/2, 0, 0);
        dummy.updateMatrix();
        instMark.setMatrixAt(idxMark++, dummy.matrix);
      }
    }
    instMark.count = idxMark;
    this.scene.add(instMark);
  }

  createBuilding(type) {
    const group = new THREE.Group();
    group.userData.type = type;
    
    const matFound = new THREE.MeshLambertMaterial({color: 0x222222, flatShading: true});
    const matGlass = new THREE.MeshLambertMaterial({color: 0x114488, flatShading: true});
    const matWall1 = new THREE.MeshLambertMaterial({color: 0xdddddd, flatShading: true});
    const matWall2 = new THREE.MeshLambertMaterial({color: 0x888888, flatShading: true});
    const matDark = new THREE.MeshLambertMaterial({color: 0x111111, flatShading: true});
    const matRed = new THREE.MeshLambertMaterial({color: 0xcc2222, flatShading: true});
    const matGreen = new THREE.MeshLambertMaterial({color: 0x22cc22, flatShading: true});
    
    let height=1, width=1, depth=1;
    let bMat = matWall1;
    
    if (type === 'fenixHQ') { height = 8; width = 2; depth = 2; bMat = matDark; }
    else if (type === 'dataCenter') { height = 3; width = 3; depth = 2; bMat = matWall2; }
    else if (type === 'researchLab') { height = 4; width = 2; depth = 2; }
    else if (type === 'hospital') { height = 5; width = 2.5; depth = 2.5; }
    else if (type === 'shopping') { height = 2; width = 3; depth = 3; }
    else if (type === 'residential') { height = 6; width = 1.5; depth = 1.5; }
    else if (type === 'officeA') { height = 4; width = 1.5; depth = 1.5; bMat = matGlass; }
    else if (type === 'officeB') { height = 3; width = 1.5; depth = 1.5; bMat = matWall2; }
    else if (type === 'retailShop') { height = 1; width = 1; depth = 1; }
    else if (type === 'warehouse') { height = 1; width = 3; depth = 2; bMat = matWall2; }
    else if (type === 'apartmentSmall') { height = 3; width = 1; depth = 1; }
    else if (type === 'techStartup') { height = 3; width = 2; depth = 1.5; }
    
    // Foundation
    const foundMesh = new THREE.Mesh(new THREE.BoxGeometry(width+0.1, 0.2, depth+0.1), matFound);
    foundMesh.position.y = 0.1;
    group.add(foundMesh);
    
    // Main body
    const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), bMat);
    bodyMesh.position.y = height/2 + 0.2;
    bodyMesh.castShadow = true; bodyMesh.receiveShadow = true;
    group.add(bodyMesh);
    
    // Roof details
    const roofY = height + 0.2;
    if (type === 'researchLab') {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(width/2.5, 8, 8, 0, Math.PI*2, 0, Math.PI/2), matGlass);
      dome.position.y = roofY;
      group.add(dome);
    } else if (type === 'dataCenter' || type === 'warehouse') {
      const hvac = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.5), matFound);
      hvac.position.set(0, roofY + 0.15, 0);
      group.add(hvac);
    } else if (type === 'techStartup') {
      const garden = new THREE.Mesh(new THREE.BoxGeometry(width-0.2, 0.1, depth-0.2), matGreen);
      garden.position.y = roofY + 0.05;
      group.add(garden);
    } else {
      const border = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, depth), matFound);
      border.position.y = roofY + 0.05;
      group.add(border);
    }
    
    // Entrance
    const entMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.2), matDark);
    entMesh.position.set(0, 0.6, depth/2);
    group.add(entMesh);
    
    // Windows
    const winGeom = new THREE.BoxGeometry(0.2, 0.3, 0.05);
    const numFloors = Math.floor(height);
    for(let f=1; f<numFloors; f++) {
      for(let w=0; w<2; w++) {
        const wx = (w === 0 ? -0.3 : 0.3) * width;
        const win1 = new THREE.Mesh(winGeom, matGlass);
        win1.position.set(wx, 0.2 + f, depth/2 + 0.01);
        group.add(win1);
        
        const win2 = new THREE.Mesh(winGeom, matGlass);
        win2.position.set(wx, 0.2 + f, -depth/2 - 0.01);
        group.add(win2);
      }
    }
    
    if (type === 'hospital') {
      const cross1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.1), matRed);
      const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), matRed);
      cross1.position.set(0, height, depth/2 + 0.05);
      cross2.position.set(0, height, depth/2 + 0.05);
      group.add(cross1, cross2);
    }
    
    return group;
  }

  initBuildings() {
    const types = ['fenixHQ', 'dataCenter', 'researchLab', 'hospital', 'shopping', 'residential', 'officeA', 'officeB', 'retailShop', 'warehouse', 'apartmentSmall', 'techStartup'];
    
    for(let i=0; i<45; i++) {
      const type = types[i % types.length];
      const b = this.createBuilding(type);
      
      let bx, bz, tries=0;
      do {
        bx = Math.floor((Math.random()-0.5)*40);
        bz = Math.floor((Math.random()-0.5)*40);
        tries++;
      } while(tries < 100 && (bx%6 === 0 || bz%6 === 0 || (Math.abs(bx)<3 && Math.abs(bz)<3)));
      
      b.position.set(bx, 0, bz);
      this.scene.add(b);
      this.entities.push(b);
    }
  }

  createCharacter(prof) {
    const group = new THREE.Group();
    group.userData.prof = prof;
    
    const mHead = new THREE.MeshLambertMaterial({color: 0xffccaa, flatShading: true});
    let cBody = 0x3366ff;
    if (prof === 'Engineer') cBody = 0x2244cc;
    else if (prof === 'Developer') cBody = 0x333333;
    else if (prof === 'Researcher') cBody = 0xffffff;
    else if (prof === 'Security') cBody = 0x111111;
    else if (prof === 'Manager') cBody = 0x000080;
    else if (prof === 'Operator') cBody = 0x008000;
    else if (prof === 'Architect') cBody = 0x8b4513;
    else if (prof === 'Worker') cBody = 0xff8c00;
    
    const mBody = new THREE.MeshLambertMaterial({color: cBody, flatShading: true});
    const mDark = new THREE.MeshLambertMaterial({color: 0x111111, flatShading: true});
    
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.06), mHead);
    head.position.y = 0.32;
    group.add(head);
    
    const bHeight = prof === 'Researcher' ? 0.20 : 0.15;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, bHeight, 0.08), mBody);
    body.position.y = 0.19;
    group.add(body);
    
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.04), mBody);
    armL.position.set(-0.08, 0.2, 0);
    group.add(armL);
    
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.04), mBody);
    armR.position.set(0.08, 0.2, 0);
    group.add(armR);
    
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.04), mDark);
    legL.position.set(-0.03, 0.06, 0);
    group.add(legL);
    
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.04), mDark);
    legR.position.set(0.03, 0.06, 0);
    group.add(legR);
    
    // Accessories
    if(prof === 'Engineer' || prof === 'Worker') {
      const hat = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8, 0, Math.PI*2, 0, Math.PI/2), new THREE.MeshLambertMaterial({color: 0xdddd00}));
      hat.position.y = 0.32;
      group.add(hat);
    } else if (prof === 'Developer') {
      const hp = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.015, 8, 16), mDark);
      hp.position.y = 0.32;
      group.add(hp);
    } else if (prof === 'Manager') {
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.01), new THREE.MeshLambertMaterial({color: 0xcc1111}));
      tie.position.set(0, 0.22, 0.045);
      group.add(tie);
    } else if (prof === 'Architect') {
      const bp = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 0.08), new THREE.MeshLambertMaterial({color: 0xaaaaff}));
      bp.position.set(0.1, 0.15, 0.05);
      group.add(bp);
    }
    
    group.userData = { legL, legR, armL, armR, body, timeOff: Math.random()*10 };
    group.traverse(o => { if(o.isMesh) { o.castShadow = true; } });
    
    return group;
  }

  initCharacters() {
    const profs = ['Engineer', 'Developer', 'Researcher', 'Security', 'Manager', 'Operator', 'Architect', 'Worker'];
    for(let i=0; i<25; i++) {
      const c = this.createCharacter(profs[i%profs.length]);
      c.position.set((Math.random()-0.5)*40, 0, (Math.random()-0.5)*40);
      this.scene.add(c);
      this.characters.push(c);
      this.entities.push(c);
    }
  }

  initVegetation() {
    const mTrunk = new THREE.MeshLambertMaterial({color: 0x5c4033, flatShading: true});
    const mPine = new THREE.MeshLambertMaterial({color: 0x2d4c1e, flatShading: true});
    const mOak = new THREE.MeshLambertMaterial({color: 0x3a5f2b, flatShading: true});
    const mSakura = new THREE.MeshLambertMaterial({color: 0xffb7c5, flatShading: true});
    const gTrunk = new THREE.CylinderGeometry(0.1, 0.15, 0.8);
    
    const iTrunk = new THREE.InstancedMesh(gTrunk, mTrunk, 50);
    const iPine = new THREE.InstancedMesh(new THREE.ConeGeometry(0.6, 1.5), mPine, 20);
    const iOak = new THREE.InstancedMesh(new THREE.SphereGeometry(0.8), mOak, 20);
    const iSakura = new THREE.InstancedMesh(new THREE.SphereGeometry(0.8), mSakura, 10);
    
    iTrunk.castShadow = true; iPine.castShadow = true; iOak.castShadow = true; iSakura.castShadow = true;
    
    const dummy = new THREE.Object3D();
    let idxT=0, idxP=0, idxO=0, idxS=0;
    
    for(let i=0; i<45; i++) {
      let vx = (Math.random()-0.5)*40, vz = (Math.random()-0.5)*40;
      dummy.position.set(vx, 0.4, vz);
      dummy.updateMatrix();
      iTrunk.setMatrixAt(idxT++, dummy.matrix);
      
      dummy.position.set(vx, 1.2, vz);
      dummy.updateMatrix();
      
      const r = Math.random();
      if(r < 0.4) { iPine.setMatrixAt(idxP++, dummy.matrix); }
      else if(r < 0.8) { iOak.setMatrixAt(idxO++, dummy.matrix); }
      else { iSakura.setMatrixAt(idxS++, dummy.matrix); }
    }
    
    iTrunk.count = idxT; iPine.count = idxP; iOak.count = idxO; iSakura.count = idxS;
    this.scene.add(iTrunk, iPine, iOak, iSakura);
  }

  initVehicles() {
    const matBody = new THREE.MeshLambertMaterial({color: 0xcc2222, flatShading: true});
    const matWheel = new THREE.MeshLambertMaterial({color: 0x111111});
    const wGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.1);
    
    for(let i=0; i<5; i++) {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(1, 0.4, 0.5), matBody);
      b.position.y = 0.3; b.castShadow = true;
      g.add(b);
      
      for(let w=0; w<4; w++) {
        const wheel = new THREE.Mesh(wGeom, matWheel);
        wheel.rotation.x = Math.PI/2;
        wheel.position.set((w%2===0?-0.3:0.3), 0.1, (w<2?-0.25:0.25));
        g.add(wheel);
      }
      
      g.position.set((Math.random()-0.5)*40, 0, (i*6)%40 - 20);
      g.userData = { speed: 2 + Math.random()*2, timeOff: Math.random()*10 };
      this.scene.add(g);
      this.vehicles.push(g);
    }
  }

  initProps() {
    const mMetal = new THREE.MeshLambertMaterial({color: 0x444444});
    const mLight = new THREE.MeshBasicMaterial({color: 0xffffee});
    
    for(let i=0; i<15; i++) {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2), mMetal);
      pole.position.y = 1;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15), mLight);
      bulb.position.set(0.3, 1.9, 0);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3), mMetal);
      arm.rotation.z = Math.PI/2;
      arm.position.set(0.15, 1.9, 0);
      
      const pl = new THREE.PointLight(0xffdd88, 0.5, 8);
      pl.position.set(0.3, 1.8, 0);
      
      g.add(pole, bulb, arm, pl);
      g.position.set((Math.random()-0.5)*30, 0, (Math.random()-0.5)*30);
      this.scene.add(g);
    }
  }

  setCameraMode(mode) {
    if (mode === 'isometric') {
      this.camera = this.orthoCamera;
      this.controls.object = this.camera;
      this.orthoCamera.position.set(20, 20, 20);
      this.orthoCamera.lookAt(0,0,0);
    } else if (mode === 'street') {
      this.camera = this.perspCamera;
      this.controls.object = this.camera;
      this.perspCamera.position.set(0, 0.5, 5);
      this.perspCamera.lookAt(0, 0.5, 0);
    } else {
      this.camera = this.perspCamera;
      this.controls.object = this.camera;
      this.perspCamera.position.set(0, 20, 20);
      this.perspCamera.lookAt(0,0,0);
    }
    this.controls.update();
  }

  focusEntity(entity) {
    if(!entity) return;
    this.controls.target.copy(entity.position);
    this.controls.update();
  }

  onClick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    
    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj && obj !== this.scene) {
        if (this.entities.includes(obj)) {
          if (window.fenixSelectEntity) window.fenixSelectEntity(obj);
          break;
        }
        obj = obj.parent;
      }
    }
  }

  onResize() {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    const d = 20;
    this.orthoCamera.left = -d * aspect;
    this.orthoCamera.right = d * aspect;
    this.orthoCamera.top = d;
    this.orthoCamera.bottom = -d;
    this.orthoCamera.updateProjectionMatrix();

    this.perspCamera.aspect = aspect;
    this.perspCamera.updateProjectionMatrix();

    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  animate() {
    requestAnimationFrame(this.animate);
    const t = this.clock.getElapsedTime();
    
    this.characters.forEach(c => {
      const { legL, legR, armL, armR, body, timeOff } = c.userData;
      legL.rotation.x = Math.sin(t * 5 + timeOff) * 0.4;
      legR.rotation.x = -Math.sin(t * 5 + timeOff) * 0.4;
      armL.rotation.x = -Math.sin(t * 5 + timeOff) * 0.4;
      armR.rotation.x = Math.sin(t * 5 + timeOff) * 0.4;
      c.position.y = Math.abs(Math.sin(t * 10 + timeOff)) * 0.02;
    });
    
    this.vehicles.forEach(v => {
      v.position.x += Math.sin(t + v.userData.timeOff) * 0.05 * v.userData.speed;
    });
    
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
