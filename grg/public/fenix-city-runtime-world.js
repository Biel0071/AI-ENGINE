(() => {
  'use strict';

  const Engine = window.FenixWorld3DEngine;
  const sceneModel = window.FenixCityMachineScene;
  if (!Engine || !sceneModel) return;

  const proto = Engine.prototype;
  const NAV_KEY = 'fenix_city_navigation_v1';
  const apiPlatform = { x: -52, z: -29 };
  const engine = window.fenixWorld3D || window.fenixWorldEngine3D;

  function selection(kind, id) {
    return kind && id ? { kind, id: String(id) } : null;
  }

  function cameraSnapshot(instance) {
    const camera = instance.cameraState;
    return {
      azimuth: camera.azimuth,
      elevation: camera.elevation,
      distance: camera.distance,
      targetDistance: camera.targetDistance,
      target: { x: camera.target.x, y: camera.target.y, z: camera.target.z },
      targetLookAt: { x: camera.targetLookAt.x, y: camera.targetLookAt.y, z: camera.targetLookAt.z },
      mode: instance.cameraMode || 'orbit',
      floor: instance.activeApiFloor ?? null,
    };
  }

  function saveNavigation(instance) {
    try {
      sessionStorage.setItem(NAV_KEY, JSON.stringify({
        selected: instance.state.selected || null,
        level: instance.state.level || 'world',
        history: instance.state.history || [],
        camera: cameraSnapshot(instance),
      }));
    } catch (_) {}
  }

  function restoreCamera(instance, snapshot) {
    if (!snapshot || !instance.cameraState) return;
    const camera = instance.cameraState;
    camera.azimuth = Number.isFinite(snapshot.azimuth) ? snapshot.azimuth : camera.azimuth;
    camera.elevation = Number.isFinite(snapshot.elevation) ? snapshot.elevation : camera.elevation;
    const restoredDist = Number.isFinite(snapshot.distance) ? (snapshot.distance >= 175 ? 128 : snapshot.distance) : camera.distance;
    const restoredTargetDist = Number.isFinite(snapshot.targetDistance) ? (snapshot.targetDistance >= 175 ? 128 : snapshot.targetDistance) : camera.targetDistance;
    camera.distance = restoredDist;
    camera.targetDistance = restoredTargetDist;
    if (snapshot.target) camera.target.set(snapshot.target.x, snapshot.target.y, snapshot.target.z);
    if (snapshot.targetLookAt) camera.targetLookAt.set(snapshot.targetLookAt.x, snapshot.targetLookAt.y, snapshot.targetLookAt.z);
    instance.cameraMode = snapshot.mode || 'orbit';
    instance.activeApiFloor = snapshot.floor ?? null;
    instance._updateCameraPosition?.(true);
  }

  function emitSelection(instance) {
    window.dispatchEvent(new CustomEvent('fenix:world-selection', { detail: { ...instance.state.selected, level: instance.state.level } }));
  }

  function pushNavigation(instance) {
    const history = instance.state.history || (instance.state.history = []);
    history.push({ selected: instance.state.selected || null, level: instance.state.level || 'world', camera: cameraSnapshot(instance) });
    if (history.length > 20) history.splice(0, history.length - 20);
  }

  function setSelection(instance, kind, id, options = {}) {
    const next = selection(kind, id);
    if (!next) return false;
    const previous = instance.state.selected;
    if (options.push !== false && (previous?.kind !== next.kind || previous?.id !== next.id || options.level)) pushNavigation(instance);
    instance.state.selected = next;
    instance.state.level = options.level || 'world';
    if (typeof options.focus === 'function') options.focus();
    saveNavigation(instance);
    emitSelection(instance);
    return true;
  }

  function statusColor(status) {
    const value = String(status || '').toUpperCase();
    if (['FAILED', 'DEAD_LETTER', 'ERROR', 'OFFLINE'].includes(value)) return 0xf16a72;
    if (['STALE', 'UNKNOWN', 'DEGRADED'].includes(value)) return 0xe8b45d;
    return 0x27d7c4;
  }

  function spriteLabel(text, color = '#dce8f5') {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 160;
    const context = canvas.getContext('2d');
    context.fillStyle = 'rgba(7, 13, 23, 0.92)';
    context.beginPath();
    if (typeof context.roundRect === 'function') context.roundRect(10, 10, 748, 140, 28);
    else context.rect(10, 10, 748, 140);
    context.fill();
    context.strokeStyle = color;
    context.lineWidth = 5;
    context.stroke();
    context.fillStyle = '#f4f7fb';
    context.font = '600 44px Inter, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const label = String(text || '').trim();
    context.fillText(label.length > 25 ? `${label.slice(0, 23)}…` : label, 384, 80, 700);
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true });
    return new THREE.Sprite(material);
  }

  function makeMachineNode(instance, projected) {
    const T = THREE;
    const group = new T.Group();
    group.name = `RuntimeNode_${projected.id}`;
    group.position.set(projected.position.x, projected.position.y, projected.position.z);

    const baseMaterial = new T.MeshStandardMaterial({ color: 0x182431, metalness: 0.55, roughness: 0.38 });
    const caseMaterial = new T.MeshStandardMaterial({ color: 0x263647, metalness: 0.62, roughness: 0.3 });
    const ledColor = statusColor(projected.status);
    const base = new T.Mesh(new T.BoxGeometry(2.6, 0.35, 2.25), baseMaterial);
    base.position.y = 0.2;
    const cabinet = new T.Mesh(new T.BoxGeometry(projected.kind === 'runtime' ? 1.75 : 1.35, projected.kind === 'runtime' ? 2.6 : 1.9, 1.45), caseMaterial);
    cabinet.position.y = projected.kind === 'runtime' ? 1.65 : 1.3;
    const face = new T.Mesh(new T.BoxGeometry(projected.kind === 'runtime' ? 1.25 : 0.95, projected.kind === 'runtime' ? 2.25 : 1.55, 0.08), new T.MeshStandardMaterial({ color: 0x101820, metalness: 0.5, roughness: 0.45 }));
    face.position.set(0, cabinet.position.y, 0.77);
    group.add(base, cabinet, face);

    const lights = [];
    for (let index = 0; index < 3; index++) {
      const ledMaterial = new T.MeshStandardMaterial({ color: ledColor, emissive: ledColor, emissiveIntensity: 1.2, metalness: 0.2, roughness: 0.3 });
      const led = new T.Mesh(new T.SphereGeometry(0.085, 8, 6), ledMaterial);
      led.position.set(-0.38 + index * 0.38, cabinet.position.y + 0.56 - index * 0.18, 0.84);
      group.add(led);
      lights.push(led);
    }

    const displayTitle = projected.kind === 'worker'
      ? `Worker · ${String(projected.workerId || projected.id || '').replace(/^worker:|^fenix-local:/g, '').slice(0, 8)}`
      : projected.name;
    const label = spriteLabel(displayTitle, String(projected.kind === 'worker' ? '#7aa2ff' : '#27d7c4'));
    label.scale.set(2.8, 0.58, 1);
    label.position.set(0, 2.75, 0);
    group.add(label);

    const hitBox = new T.Mesh(new T.BoxGeometry(3.1, 3.8, 2.8), new T.MeshBasicMaterial({ visible: false }));
    hitBox.position.y = 1.8;
    hitBox.userData = { type: 'machine', machineId: projected.id, name: projected.name };
    group.add(hitBox);
    instance.interactiveMeshes.push(hitBox);
    instance.scene.add(group);
    return { id: projected.id, group, hitBox, lights, label, machine: projected };
  }

  function disposeNode(instance, node) {
    instance.interactiveMeshes = instance.interactiveMeshes.filter((mesh) => mesh !== node.hitBox);
    instance.scene.remove(node.group);
    node.group.traverse((child) => {
      child.geometry?.dispose?.();
      if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose?.());
      else child.material?.dispose?.();
      child.material?.map?.dispose?.();
    });
  }

  function projectStatusColor(status, fallback) {
    const value = String(status || '').toUpperCase();
    if (['FAILED', 'ERROR', 'DEAD_LETTER'].includes(value)) return '#f16a72';
    if (['RUNNING', 'IN_PROGRESS', 'BUILDING', 'ACTIVE'].includes(value)) return '#27d7c4';
    if (value === 'QUEUED') return '#e8b45d';
    if (['UNKNOWN', 'OFFLINE'].includes(value)) return '#8d9aaa';
    return fallback;
  }

  function makeProjectNode(instance, site) {
    const T = typeof THREE !== 'undefined' ? THREE : {};
    if (typeof T.Group !== 'function' || typeof T.Mesh !== 'function') {
      return {
        id: site.id,
        sceneId: site.sceneId,
        group: { position: site.position || { x: 0, y: 0, z: 0 } },
        hitBox: { userData: { type: 'project', projectId: site.id, name: site.name } },
        status: { material: { color: { copy() {} } } },
        trimMaterial: {},
        accentMaterial: { color: { copy() {} }, emissive: { copy() {} } },
        label: {},
        site,
        roofGroup: {},
        interiorGroup: {}
      };
    }

    const group = new T.Group();
    group.name = `ProjectSite_${site.sceneId}`;
    group.position.set(site.position.x, site.position.y, site.position.z);

    const archetype = site.archetype || 'dev_studio';
    const dim = site.dimensions || { width: 6.2, depth: 5.0, height: 4.8 };
    const lotW = site.lot?.width || 8.8;
    const lotD = site.lot?.depth || 6.6;

    const trimColor = new T.Color(projectStatusColor(site.activityStatus, site.color));

    const lotBaseMat = new T.MeshStandardMaterial({ color: 0x182430, metalness: 0.22, roughness: 0.78 });
    const curbMat = new T.MeshStandardMaterial({ color: 0x2e3d4d, metalness: 0.3, roughness: 0.65 });
    const walkwayMat = new T.MeshStandardMaterial({ color: 0x253342, metalness: 0.2, roughness: 0.7 });

    const wallColor = archetype === 'warehouse' ? 0x253648
      : archetype === 'tech_cloud' ? 0x141e28
      : archetype === 'commerce_crm' ? 0x202d3a
      : archetype === 'fintech' ? 0x161c24
      : 0x273442;
    const bodyMaterial = new T.MeshStandardMaterial({ color: wallColor, metalness: archetype === 'warehouse' ? 0.52 : 0.42, roughness: 0.45 });
    const trimMaterial = new T.MeshStandardMaterial({ color: 0x334556, metalness: 0.35, roughness: 0.55 });
    const accentMaterial = new T.MeshStandardMaterial({ color: trimColor, emissive: trimColor, emissiveIntensity: 0.25, metalness: 0.3, roughness: 0.4 });
    const glassMaterial = new T.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.2, roughness: 0.15, transparent: true, opacity: 0.68 });
    const doorMaterial = new T.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6, roughness: 0.35 });

    // 1. Parcel Lot Base & Curbs
    const base = new T.Mesh(new T.BoxGeometry(lotW, 0.16, lotD), lotBaseMat);
    base.position.y = 0.08;
    const curbF = new T.Mesh(new T.BoxGeometry(lotW, 0.22, 0.18), curbMat);
    curbF.position.set(0, 0.11, lotD / 2 - 0.09);
    const curbB = new T.Mesh(new T.BoxGeometry(lotW, 0.22, 0.18), curbMat);
    curbB.position.set(0, 0.11, -lotD / 2 + 0.09);
    const curbL = new T.Mesh(new T.BoxGeometry(0.18, 0.22, lotD), curbMat);
    curbL.position.set(-lotW / 2 + 0.09, 0.11, 0);
    const curbR = new T.Mesh(new T.BoxGeometry(0.18, 0.22, lotD), curbMat);
    curbR.position.set(lotW / 2 - 0.09, 0.11, 0);

    const walkwayLen = Math.max(0.6, (lotD - dim.depth) / 2);
    const walkway = new T.Mesh(new T.BoxGeometry(1.8, 0.18, walkwayLen), walkwayMat);
    walkway.position.set(0, 0.09, dim.depth / 2 + walkwayLen / 2);
    group.add(base, curbF, curbB, curbL, curbR, walkway);

    // 2. Main Building Body
    const body = new T.Mesh(new T.BoxGeometry(dim.width, dim.height, dim.depth), bodyMaterial);
    body.position.y = 0.16 + dim.height / 2;
    group.add(body);

    // 3. Facade Windows
    const winLower = new T.Mesh(new T.BoxGeometry(dim.width * 0.72, 0.62, 0.1), glassMaterial);
    winLower.position.set(0, 1.85, dim.depth / 2 + 0.05);
    const winUpper = new T.Mesh(new T.BoxGeometry(dim.width * 0.72, 0.62, 0.1), glassMaterial);
    winUpper.position.set(0, Math.min(dim.height - 0.6, 3.4), dim.depth / 2 + 0.05);
    group.add(winLower, winUpper);

    // 4. Entrance Door & Canopy
    const door = new T.Mesh(new T.BoxGeometry(1.1, 1.9, 0.12), doorMaterial);
    door.position.set(0, 1.05, dim.depth / 2 + 0.06);
    const canopy = new T.Mesh(new T.BoxGeometry(2.2, 0.12, 1.1), accentMaterial);
    canopy.position.set(0, 2.1, dim.depth / 2 + 0.6);
    group.add(door, canopy);

    // 5. Archetype-specific features
    if (archetype === 'warehouse') {
      const dockBay = new T.Mesh(new T.BoxGeometry(1.6, 2.1, 0.14), new T.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.4 }));
      dockBay.position.set(dim.width * 0.28, 1.15, dim.depth / 2 + 0.06);
      const hazardBumper = new T.Mesh(new T.BoxGeometry(1.8, 0.2, 0.22), accentMaterial);
      hazardBumper.position.set(dim.width * 0.28, 0.16, dim.depth / 2 + 0.15);
      group.add(dockBay, hazardBumper);
    } else if (archetype === 'tech_cloud') {
      const conduit = new T.Mesh(new T.BoxGeometry(0.12, dim.height, 0.12), accentMaterial);
      conduit.position.set(-dim.width / 2 - 0.06, 0.16 + dim.height / 2, dim.depth / 2 + 0.04);
      group.add(conduit);
    }

    // 6. Roof Group (Displaceable on Interior Cutaway)
    const roofGroup = new T.Group();
    roofGroup.name = 'RoofGroup';
    const roofY = 0.16 + dim.height;
    const roofSlab = new T.Mesh(new T.BoxGeometry(dim.width + 0.35, 0.24, dim.depth + 0.35), trimMaterial);
    roofSlab.position.y = roofY + 0.12;
    roofGroup.add(roofSlab);

    const acUnit = new T.Mesh(new T.BoxGeometry(1.2, 0.65, 1.0), new T.MeshStandardMaterial({ color: 0x334155, metalness: 0.5, roughness: 0.5 }));
    acUnit.position.set(-dim.width * 0.25, roofY + 0.55, 0);
    roofGroup.add(acUnit);

    if (archetype === 'tech_cloud') {
      const mast = new T.Mesh(new T.CylinderGeometry(0.04, 0.08, 2.4, 8), new T.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 }));
      mast.position.set(dim.width * 0.25, roofY + 1.4, 0);
      const beacon = new T.Mesh(new T.SphereGeometry(0.12, 8, 8), new T.MeshBasicMaterial({ color: 0x00f0ff }));
      beacon.position.set(dim.width * 0.25, roofY + 2.6, 0);
      roofGroup.add(mast, beacon);
    }
    group.add(roofGroup);

    // 7. Modular Interior Group
    const interiorGroup = new T.Group();
    interiorGroup.name = 'InteriorGroup';
    interiorGroup.visible = false;

    const interiorFloorMat = new T.MeshStandardMaterial({
      color: archetype === 'warehouse' ? 0x384554 : archetype === 'tech_cloud' ? 0x1a2634 : 0x2a3848,
      metalness: 0.2,
      roughness: 0.7
    });
    const intFloor = new T.Mesh(new T.BoxGeometry(dim.width - 0.4, 0.06, dim.depth - 0.4), interiorFloorMat);
    intFloor.position.y = 0.2;
    interiorGroup.add(intFloor);

    const deskMat = new T.MeshStandardMaterial({ color: 0x334155, metalness: 0.4, roughness: 0.5 });
    const desk = new T.Mesh(new T.BoxGeometry(1.6, 0.75, 0.8), deskMat);
    desk.position.set(0, 0.56, -0.4);
    const monitor = new T.Mesh(new T.BoxGeometry(0.7, 0.5, 0.06), new T.MeshBasicMaterial({ color: 0x38bdf8 }));
    monitor.position.set(0, 1.15, -0.35);
    const chair = new T.Mesh(new T.BoxGeometry(0.5, 0.6, 0.5), new T.MeshStandardMaterial({ color: 0x1e293b }));
    chair.position.set(0, 0.48, 0.35);
    interiorGroup.add(desk, monitor, chair);

    if (archetype === 'warehouse') {
      const rack = new T.Mesh(new T.BoxGeometry(0.6, 2.8, 3.2), new T.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6, roughness: 0.3 }));
      rack.position.set(-dim.width / 2 + 0.9, 1.5, 0);
      interiorGroup.add(rack);
    } else if (archetype === 'tech_cloud') {
      const server1 = new T.Mesh(new T.BoxGeometry(0.8, 2.6, 1.2), new T.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.7, roughness: 0.3 }));
      server1.position.set(-dim.width / 2 + 0.9, 1.4, -0.8);
      interiorGroup.add(server1);
    } else {
      const cabinet = new T.Mesh(new T.BoxGeometry(0.7, 1.8, 1.4), new T.MeshStandardMaterial({ color: 0x334155, metalness: 0.3, roughness: 0.6 }));
      cabinet.position.set(-dim.width / 2 + 0.8, 1.0, -0.6);
      interiorGroup.add(cabinet);
    }
    group.add(interiorGroup);

    // 8. Architectural Brand Totem Pylon & Status LED
    const totemPylon = new T.Mesh(new T.BoxGeometry(0.38, 1.8, 0.38), new T.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.3 }));
    totemPylon.position.set(-dim.width / 2 - 0.5, 0.9, dim.depth / 2 + 0.5);
    const totemAccent = new T.Mesh(new T.BoxGeometry(0.42, 0.3, 0.42), accentMaterial);
    totemAccent.position.set(-dim.width / 2 - 0.5, 1.5, dim.depth / 2 + 0.5);
    const statusOrb = new T.Mesh(new T.SphereGeometry(0.16, 10, 8), new T.MeshBasicMaterial({ color: trimColor }));
    statusOrb.position.set(-dim.width / 2 - 0.5, 1.95, dim.depth / 2 + 0.5);
    group.add(totemPylon, totemAccent, statusOrb);

    // 9. Floating Brand Label Sprite
    const label = spriteLabel(site.name, projectStatusColor(site.activityStatus, site.color));
    label.scale.set(5.2, 1.1, 1);
    label.position.set(0, roofY + 0.95, 0);
    group.add(label);

    // 10. Clickable HitBox
    const hitBox = new T.Mesh(new T.BoxGeometry(lotW, dim.height + 2.2, lotD), new T.MeshBasicMaterial({ visible: false }));
    hitBox.position.y = (dim.height + 2.2) / 2;
    hitBox.userData = {
      type: 'project',
      projectId: site.id,
      sceneId: site.sceneId,
      name: site.name,
      archetype,
      supervisor: site.supervisor,
      entryPosition: site.entryPosition
    };
    group.add(hitBox);
    if (Array.isArray(instance.interactiveMeshes)) instance.interactiveMeshes.push(hitBox);
    if (instance.scene?.add) instance.scene.add(group);

    return {
      id: site.id,
      sceneId: site.sceneId,
      group,
      hitBox,
      status: statusOrb,
      trimMaterial,
      accentMaterial,
      label,
      site,
      roofGroup,
      interiorGroup
    };
  }

  function syncProjectSites(instance, projects, recentJobs) {
    const sites = sceneModel.projectSceneSites(projects, recentJobs);
    instance.projectNodes ||= new Map();
    const activeIds = new Set(sites.map((site) => site.id));
    for (const site of sites) {
      let existing = instance.projectNodes.get(site.id);
      if (!existing) {
        existing = makeProjectNode(instance, site);
        instance.projectNodes.set(site.id, existing);
      } else {
        const appearanceChanged = existing.site.name !== site.name
          || existing.site.activityStatus !== site.activityStatus
          || existing.site.color !== site.color;
        if (appearanceChanged) {
          disposeNode(instance, existing);
          existing = makeProjectNode(instance, site);
          instance.projectNodes.set(site.id, existing);
        } else {
          existing.site = site;
          if (existing.group?.position) existing.group.position.set(site.position.x, site.position.y, site.position.z);
          if (existing.hitBox?.userData) {
            existing.hitBox.userData.name = site.name;
            existing.hitBox.userData.status = site.status;
            existing.hitBox.userData.activityStatus = site.activityStatus;
          }
          if (typeof THREE !== 'undefined' && existing.status?.material?.color) {
            const color = new THREE.Color(projectStatusColor(site.activityStatus, site.color));
            existing.status.material.color.copy(color);
            existing.accentMaterial?.color?.copy?.(color);
            existing.accentMaterial?.emissive?.copy?.(color);
          }
        }
      }

      // Register building into spatial obstacle map
      if (typeof instance.registerObstacle === 'function') {
        const dim = site.dimensions || { width: 6.2, depth: 5.0 };
        instance.registerObstacle(site.id, {
          minX: site.position.x - dim.width / 2,
          maxX: site.position.x + dim.width / 2,
          minZ: site.position.z - dim.depth / 2,
          maxZ: site.position.z + dim.depth / 2,
          entryPos: site.entryPosition,
          name: site.name,
        });
      }
    }
    for (const [id, node] of instance.projectNodes) {
      if (activeIds.has(id)) continue;
      instance.unregisterObstacle?.(id);
      disposeNode(instance, node);
      instance.projectNodes.delete(id);
    }
  }

  proto.syncMachineNodes = function syncMachineNodes(machines) {
    if (!this.scene || !Array.isArray(machines)) return;
    this.machineNodes ||= new Map();
    const projected = sceneModel.projectMachineScene(machines, apiPlatform);
    const activeIds = new Set(projected.map((node) => node.id));
    for (const item of projected) {
      let node = this.machineNodes.get(item.id);
      if (!node) {
        node = makeMachineNode(this, item);
        this.machineNodes.set(item.id, node);
      } else {
        node.machine = item;
        node.group.position.set(item.position.x, item.position.y, item.position.z);
        node.hitBox.userData.name = item.name;
        const color = statusColor(item.status);
        for (const led of node.lights) {
          led.material.color.setHex(color);
          led.material.emissive.setHex(color);
        }
      }
      node.hitBox.userData.machineId = item.id;
    }
    for (const [id, node] of this.machineNodes) {
      if (activeIds.has(id)) continue;
      disposeNode(this, node);
      this.machineNodes.delete(id);
    }
  };

  proto.syncProjectSites = function syncProjectScene(projects, recentJobs) {
    if (this.scene && Array.isArray(projects)) syncProjectSites(this, projects, recentJobs);
  };

  proto._captureCityNavigation = function captureCityNavigation() {
    return { selected: this.state.selected || null, level: this.state.level || 'world', camera: cameraSnapshot(this) };
  };

  proto.selectCityEntity = function selectCityEntity(kind, id, options = {}) {
    return setSelection(this, kind, id, options);
  };

  proto.selectMachine = function selectMachine(machineId) {
    const node = this.machineNodes?.get(String(machineId));
    return setSelection(this, 'machine', machineId, { focus: () => { if (node) this.focusEntity(node.group.position, 11); } });
  };

  proto.selectAgent = function selectLiveAgent(agentId) {
    return setSelection(this, 'agent', agentId, { focus: () => this.focusAgent?.(agentId) });
  };

  proto.selectBuilding = function selectLiveBuilding(buildingId) {
    const node = this.projectNodes && [...this.projectNodes.values()].find((item) => item.sceneId === buildingId || item.id === buildingId);
    if (node) return setSelection(this, 'project', node.id, { focus: () => this.focusEntity(node.group.position, 15) });
    const id = sceneModel.canonicalBuildingId({ type: 'building', id: String(buildingId || '') }) || String(buildingId || '');
    return setSelection(this, 'building', id, { focus: () => this.focusBuilding?.(id) });
  };

  proto.enterProject = function enterProject(projectId) {
    const id = String(projectId || '');
    const node = this.projectNodes?.get(id);
    if (this.state.selected?.kind !== 'project' || this.state.selected?.id !== id) {
      pushNavigation(this);
      this.state.selected = selection('project', id);
      this.state.level = 'world';
      if (node) this.focusEntity(node.group.position, 15);
    }
    pushNavigation(this);
    this.state.level = 'interior';
    if (node) {
      if (node.roofGroup) node.roofGroup.visible = false;
      if (node.interiorGroup) node.interiorGroup.visible = true;
      const targetPos = typeof THREE !== 'undefined' && typeof THREE.Vector3 === 'function' && node.group?.position?.clone
        ? node.group.position.clone().add(new THREE.Vector3(0, 1.4, 0))
        : { x: node.group?.position?.x || 0, y: 1.4, z: node.group?.position?.z || 0 };
      this.focusEntity(targetPos, 10);
    } else {
      this.focusDistrict?.('project-district');
    }
    saveNavigation(this);
    emitSelection(this);
    return true;
  };

  proto.enterBuilding = function enterBuilding(buildingId, floorNumber) {
    const id = String(buildingId || '');
    pushNavigation(this);
    this.state.level = 'interior';
    this.focusBuilding?.(id, floorNumber);
    saveNavigation(this);
    emitSelection(this);
    return true;
  };

  proto.back = function backFromCityContext() {
    const previous = this.state.history?.pop();
    if (previous) {
      this.state.selected = previous.selected || null;
      this.state.level = previous.level || 'world';
      restoreCamera(this, previous.camera);
    } else {
      this.state.selected = null;
      this.state.level = 'world';
      this.resetCamera?.();
    }
    if (this.projectNodes) {
      const activeProjId = this.state.level === 'interior' && this.state.selected?.kind === 'project' ? this.state.selected.id : null;
      for (const [id, pNode] of this.projectNodes) {
        const isCurrent = id === activeProjId;
        if (pNode.roofGroup) pNode.roofGroup.visible = !isCurrent;
        if (pNode.interiorGroup) pNode.interiorGroup.visible = isCurrent;
      }
    }
    saveNavigation(this);
    emitSelection(this);
    return true;
  };

  proto.clearSelection = function clearCitySelection() {
    this.state ||= {};
    this.state.selected = null;
    this.state.level = 'world';
    this.state.history = [];
    saveNavigation(this);
    emitSelection(this);
    return true;
  };

  proto.refresh = async function refreshCityWorld() {
    const result = await window.FENIX?.cityWorld?.refresh?.(true);
    await this.syncRealData?.();
    return result;
  };

  const originalCanvasClick = proto._handleCanvasClick;
  proto._handleCanvasClick = function handleCityEntityClick(event) {
    const data = this.hoveredObject?.userData;
    if (data?.type === 'machine') return this.selectMachine(data.machineId);
    if (data?.type === 'project') return this.selectCityEntity('project', data.projectId, { focus: () => this.focusEntity(this.hoveredObject.parent.position, 15) });
    if (data?.type === 'agent') return this.selectAgent(data.agentId || data.id);
    if (data?.type === 'company') {
      const buildingId = sceneModel.canonicalBuildingId({
        type: 'company',
        id: data.id,
        districtId: data.districtId,
        companyId: data.companyId,
      });
      if (buildingId) return this.selectBuilding(buildingId);
    }
    if (data?.type === 'district') {
      this.focusDistrict?.(data.districtId || data.id);
      return this.selectCityEntity('district', data.districtId || data.id, { focus: false });
    }
    if (typeof originalCanvasClick === 'function') originalCanvasClick.call(this, event);
  };

  function applySnapshot(instance, data) {
    if (!data || typeof data !== 'object') return;
    instance.lastCitySnapshot = data;
    if (Array.isArray(data.machines)) instance.syncMachineNodes(data.machines);
    if (Array.isArray(data.projects)) instance.syncProjectSites(data.projects, data.recentJobs);
    const restored = instance._pendingNavigation;
    if (restored && restored.selected) {
      const exists = restored.selected.kind === 'machine'
        ? data.machines?.some((item) => item.id === restored.selected.id)
        : restored.selected.kind === 'project'
          ? data.projects?.some((item) => item.id === restored.selected.id)
          : restored.selected.kind === 'agent'
            ? data.agents?.some((item) => item.id === restored.selected.id)
            : true;
      if (exists) {
        instance.state.selected = restored.selected;
        instance.state.level = restored.level || 'world';
        emitSelection(instance);
      }
      instance._pendingNavigation = null;
    }
  }

  const originalSaveState = proto._saveState;
  proto._saveState = function saveCityState() {
    if (typeof originalSaveState === 'function') originalSaveState.call(this);
    saveNavigation(this);
  };

  function initializeEngine(instance) {
    if (!instance || instance._cityRuntimeWorldReady) return;
    instance._cityRuntimeWorldReady = true;
    instance.state ||= {};
    instance.state.selected ||= null;
    instance.state.level ||= 'world';
    instance.state.history ||= [];
    instance.state.labels ||= [];
    try {
      const stored = JSON.parse(sessionStorage.getItem(NAV_KEY) || 'null');
      if (stored && typeof stored === 'object') {
        instance.state.selected = stored.selected || null;
        instance.state.level = stored.level || 'world';
        instance.state.history = Array.isArray(stored.history) ? stored.history.slice(-20) : [];
        instance._pendingNavigation = stored;
        restoreCamera(instance, stored.camera);
      }
    } catch (_) {}
    if (window.FENIX?.cityWorld?.snapshot) applySnapshot(instance, window.FENIX.cityWorld.snapshot);
  }

  if (engine) initializeEngine(engine);
  else document.addEventListener('DOMContentLoaded', () => initializeEngine(window.fenixWorld3D || window.fenixWorldEngine3D), { once: true });

  window.addEventListener('fenix:city-world', (event) => {
    const current = window.fenixWorld3D || window.fenixWorldEngine3D;
    if (current) {
      initializeEngine(current);
      applySnapshot(current, event.detail);
    }
  });
  if (engine && window.FENIX?.cityWorld?.snapshot) applySnapshot(engine, window.FENIX.cityWorld.snapshot);

  window.fenixPanToDistrict = (districtId) => {
    const current = window.fenixWorld3D || window.fenixWorldEngine3D;
    return current?.panToDistrict?.(districtId) || false;
  };
})();
