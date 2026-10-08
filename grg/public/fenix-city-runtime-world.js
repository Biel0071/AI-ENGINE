(() => {
  'use strict';

  const Engine = window.FenixWorld3DEngine;
  const sceneModel = window.FenixCityMachineScene;
  if (!Engine || !sceneModel) return;

  const proto = Engine.prototype;
  const NAV_KEY = 'fenix_city_navigation_v1';
  const apiPlatform = { x: -18, z: 2 };
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
    camera.distance = Number.isFinite(snapshot.distance) ? snapshot.distance : camera.distance;
    camera.targetDistance = Number.isFinite(snapshot.targetDistance) ? snapshot.targetDistance : camera.targetDistance;
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
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
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

    const label = spriteLabel(projected.name, String(projected.kind === 'worker' ? '#7aa2ff' : '#27d7c4'));
    label.scale.set(4.6, 0.95, 1);
    label.position.set(0, 3.15, 0);
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
    const T = THREE;
    const group = new T.Group();
    group.name = `ProjectSite_${site.sceneId}`;
    group.position.set(site.position.x, site.position.y, site.position.z);

    const baseMaterial = new T.MeshStandardMaterial({ color: 0x1b2835, metalness: 0.45, roughness: 0.5 });
    const bodyMaterial = new T.MeshStandardMaterial({ color: 0x233443, metalness: 0.42, roughness: 0.32, transparent: true, opacity: 0.94 });
    const trimColor = new T.Color(projectStatusColor(site.activityStatus, site.color));
    const trimMaterial = new T.MeshStandardMaterial({ color: trimColor, emissive: trimColor, emissiveIntensity: 0.32, metalness: 0.25, roughness: 0.35 });
    const base = new T.Mesh(new T.BoxGeometry(6.2, 0.45, 5.7), baseMaterial);
    base.position.y = 0.25;
    const body = new T.Mesh(new T.BoxGeometry(4.9, 2.5, 4.2), bodyMaterial);
    body.position.y = 1.7;
    const roof = new T.Mesh(new T.BoxGeometry(5.2, 0.3, 4.5), trimMaterial);
    roof.position.y = 3.1;
    const window = new T.Mesh(new T.BoxGeometry(4.92, 0.85, 0.09), new T.MeshStandardMaterial({ color: 0x91c6d3, metalness: 0.2, roughness: 0.16, transparent: true, opacity: 0.45 }));
    window.position.set(0, 1.75, 2.12);
    const status = new T.Mesh(new T.SphereGeometry(0.19, 10, 8), new T.MeshBasicMaterial({ color: trimColor }));
    status.position.set(2.2, 3.55, 1.65);
    const label = spriteLabel(site.name, projectStatusColor(site.activityStatus, site.color));
    label.scale.set(5.3, 1.1, 1);
    label.position.set(0, 4.05, 0);
    group.add(base, body, roof, window, status, label);

    const hitBox = new T.Mesh(new T.BoxGeometry(6.4, 4.6, 5.9), new T.MeshBasicMaterial({ visible: false }));
    hitBox.position.y = 2.1;
    hitBox.userData = { type: 'project', projectId: site.id, sceneId: site.sceneId, name: site.name };
    group.add(hitBox);
    instance.interactiveMeshes.push(hitBox);
    instance.scene.add(group);
    return { id: site.id, sceneId: site.sceneId, group, hitBox, status, trimMaterial, label, site };
  }

  function syncProjectSites(instance, projects, recentJobs) {
    const sites = sceneModel.projectSceneSites(projects, recentJobs);
    instance.projectNodes ||= new Map();
    const activeIds = new Set(sites.map((site) => site.id));
    for (const site of sites) {
      const existing = instance.projectNodes.get(site.id);
      if (!existing) {
        instance.projectNodes.set(site.id, makeProjectNode(instance, site));
        continue;
      }
      existing.site = site;
      existing.hitBox.userData.name = site.name;
      existing.hitBox.userData.status = site.status;
      existing.hitBox.userData.activityStatus = site.activityStatus;
      const color = new THREE.Color(projectStatusColor(site.activityStatus, site.color));
      existing.status.material.color.copy(color);
      existing.trimMaterial.color.copy(color);
      existing.trimMaterial.emissive.copy(color);
    }
    for (const [id, node] of instance.projectNodes) {
      if (activeIds.has(id)) continue;
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
    const existing = this.dynamicBuildings?.get(buildingId);
    if (existing) {
      return setSelection(this, 'building', buildingId, { focus: () => this.focusBuilding?.(buildingId) });
    }
    return setSelection(this, 'building', buildingId, { focus: () => this.focusBuilding?.(buildingId) });
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
    if (node) this.focusEntity(node.group.position.clone().add(new THREE.Vector3(0, 1.4, 0)), 10);
    else this.focusDistrict?.('project-district');
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
