(function attachMemoryBrainWebGL(root) {
  'use strict';

  function create(canvas) {
    const THREE = root?.THREE;
    if (!THREE?.WebGLRenderer || !canvas) return null;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setClearColor(0x050d1b, 0);
    if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 4000);
    const brain = new THREE.Group();
    const graph = new THREE.Group();
    const pulseGroup = new THREE.Group();
    brain.add(graph);
    brain.add(pulseGroup);
    scene.add(brain);

    let size = { width: 1, height: 1, pixelRatio: 1 };
    let graphPoints = [];
    let curvedEdges = [];
    let pulseParticles = null;
    let animTime = 0;

    // Interactive Physics & Shader Parameters (hooked to #fenixNeuralPhysicsPanel)
    const physics = {
      repulsion: 1.15,
      linkDist: 1.0,
      gravity: 0.05,
      orbitSpeed: 0.002,
      bloom: 1.35
    };

    function setPhysicsParams(params) {
      if (!params) return;
      if (typeof params.repulsion === 'number') physics.repulsion = params.repulsion;
      if (typeof params.linkDist === 'number') physics.linkDist = params.linkDist;
      if (typeof params.gravity === 'number') physics.gravity = params.gravity;
      if (typeof params.orbitSpeed === 'number') physics.orbitSpeed = params.orbitSpeed;
      if (typeof params.bloom === 'number') physics.bloom = params.bloom;
    }

    function disposeGraph() {
      for (const child of graph.children) {
        child.geometry?.dispose?.();
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const m of mats) m?.dispose?.();
      }
      graph.clear();

      for (const child of pulseGroup.children) {
        child.geometry?.dispose?.();
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const m of mats) m?.dispose?.();
      }
      pulseGroup.clear();

      graphPoints = [];
      curvedEdges = [];
      pulseParticles = null;
    }

    // Resolves color based on node type / provenance
    function resolveCategoryColor(item, fallbackColor) {
      const type = String(item?.type || '').toLowerCase();
      const id = String(item?.id || '').toLowerCase();
      if (type.includes('project') || id.includes('project')) return 0x00f0ff; // Electric Cyan
      if (type.includes('agent') || id.includes('agent')) return 0x10b981;     // Neon Emerald
      if (type.includes('tool') || type.includes('mcp') || id.includes('mcp')) return 0xc084fc; // Vivid Magenta
      if (type.includes('memory') || type.includes('pattern') || type.includes('knowledge')) return 0xf59e0b; // Amber Gold
      if (type.includes('decision') || id.includes('decision')) return 0x3b82f6; // Cobalt Blue
      if (fallbackColor) {
        try { return new THREE.Color(fallbackColor).getHex(); } catch (_) {}
      }
      return 0x38bdf8;
    }

    function setGraph(points, links, selectedId, selectedNeighbors, colorForNode) {
      disposeGraph();
      graphPoints = points;
      if (!points.length) return;

      const byId = new Map();
      const nodeMeshes = [];

      // Reusable Geometries
      const coreSphereGeo = new THREE.SphereGeometry(1, 16, 12);
      const haloSphereGeo = new THREE.SphereGeometry(1, 14, 10);

      // Orbital Spatial Rings (Constellation Reference Guides)
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.04,
        side: THREE.DoubleSide
      });
      for (const rad of [180, 260, 340]) {
        const ringGeo = new THREE.RingGeometry(rad, rad + 1.2, 48);
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        graph.add(ringMesh);
      }

      // Build Volumetric Glowing Orbs
      for (const point of points) {
        byId.set(point.item.id, point);
        const isSelected = point.item.id === selectedId;
        const isNeighbor = selectedNeighbors.has(point.item.id);
        const isEmphasized = !selectedId || isSelected || isNeighbor;

        const hexColor = resolveCategoryColor(point.item, colorForNode ? colorForNode(point.item) : null);
        const baseColor = new THREE.Color(hexColor);
        if (!isEmphasized) baseColor.multiplyScalar(0.32);

        const nodeGroup = new THREE.Group();
        const spreadX = point.x * physics.repulsion;
        const spreadY = point.y * physics.repulsion;
        const spreadZ = point.z * physics.repulsion;
        nodeGroup.position.set(spreadX, spreadY, spreadZ);

        // 1. Core Glowing Sphere
        const coreScale = isSelected ? 5.2 : (isNeighbor ? 3.8 : 2.8);
        const coreMat = new THREE.MeshBasicMaterial({
          color: baseColor,
          transparent: true,
          opacity: isEmphasized ? 0.95 : 0.4
        });
        const coreMesh = new THREE.Mesh(coreSphereGeo, coreMat);
        coreMesh.scale.setScalar(coreScale);
        nodeGroup.add(coreMesh);

        // 2. Outer Translucent Emissive Halo Shell
        const haloScale = coreScale * (isSelected ? 2.4 : 1.9) * (physics.bloom || 1.2);
        const haloMat = new THREE.MeshBasicMaterial({
          color: baseColor,
          transparent: true,
          opacity: isSelected ? 0.45 : (isEmphasized ? 0.22 : 0.06),
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const haloMesh = new THREE.Mesh(haloSphereGeo, haloMat);
        haloMesh.scale.setScalar(haloScale);
        nodeGroup.add(haloMesh);

        // 3. Selection Pulsing Diamond / Bracket
        if (isSelected) {
          const selectRingGeo = new THREE.RingGeometry(haloScale * 1.15, haloScale * 1.35, 24);
          const selectRingMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide
          });
          const selectRing = new THREE.Mesh(selectRingGeo, selectRingMat);
          selectRing.rotation.x = Math.PI / 2;
          nodeGroup.add(selectRing);
        }

        graph.add(nodeGroup);
        nodeMeshes.push(nodeGroup);
      }

      // Build 3D Curved Bezier Splines & Pulses for Links
      const pulseCurves = [];
      for (const edge of links) {
        const from = byId.get(edge.from);
        const to = byId.get(edge.to);
        if (!from || !to) continue;

        const vFrom = new THREE.Vector3(from.x * physics.repulsion, from.y * physics.repulsion, from.z * physics.repulsion);
        const vTo = new THREE.Vector3(to.x * physics.repulsion, to.y * physics.repulsion, to.z * physics.repulsion);

        // Calculate 3D mid-point arc
        const mid = new THREE.Vector3().addVectors(vFrom, vTo).multiplyScalar(0.5);
        const dist = vFrom.distanceTo(vTo);
        const normal = new THREE.Vector3(vFrom.y - vTo.y, vTo.x - vFrom.x, dist * 0.2).normalize();
        mid.add(normal.multiplyScalar(dist * 0.18 * physics.linkDist));

        const curve = new THREE.QuadraticBezierCurve3(vFrom, mid, vTo);
        const curvePoints = curve.getPoints(20);
        const lineGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);

        const isHighlight = edge.from === selectedId || edge.to === selectedId;
        const lineMat = new THREE.LineBasicMaterial({
          color: isHighlight ? 0x00f0ff : 0x38bdf8,
          transparent: true,
          opacity: isHighlight ? 0.75 : 0.22,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        graph.add(new THREE.Line(lineGeo, lineMat));

        pulseCurves.push({ curve, length: dist });
      }

      curvedEdges = pulseCurves;

      // Pulse Particles along Bezier Links
      if (pulseCurves.length > 0) {
        const pulseCount = Math.min(120, pulseCurves.length);
        const pulsePositions = new Float32Array(pulseCount * 3);
        const pulseColors = new Float32Array(pulseCount * 3);

        for (let i = 0; i < pulseCount; i++) {
          const pt = pulseCurves[i].curve.getPoint(0);
          pulsePositions[i * 3] = pt.x;
          pulsePositions[i * 3 + 1] = pt.y;
          pulsePositions[i * 3 + 2] = pt.z;

          pulseColors[i * 3] = 0.0;
          pulseColors[i * 3 + 1] = 0.95;
          pulseColors[i * 3 + 2] = 1.0;
        }

        const pulseGeo = new THREE.BufferGeometry();
        pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePositions, 3));
        pulseGeo.setAttribute('color', new THREE.BufferAttribute(pulseColors, 3));

        const pulseMat = new THREE.ShaderMaterial({
          uniforms: {
            pSize: { value: 24.0 * (physics.bloom || 1.2) },
            pOpacity: { value: 0.9 }
          },
          vertexShader: `
            attribute vec3 color;
            varying vec3 vColor;
            uniform float pSize;
            void main() {
              vColor = color;
              vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = pSize * (600.0 / max(120.0, -mvPos.z));
              gl_Position = projectionMatrix * mvPos;
            }
          `,
          fragmentShader: `
            varying vec3 vColor;
            uniform float pOpacity;
            void main() {
              float d = distance(gl_PointCoord, vec2(0.5));
              float core = 1.0 - smoothstep(0.08, 0.45, d);
              float alpha = core * pOpacity;
              if (alpha < 0.02) discard;
              gl_FragColor = vec4(vColor, alpha);
            }
          `,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });

        pulseParticles = new THREE.Points(pulseGeo, pulseMat);
        pulseGroup.add(pulseParticles);
      }
    }

    function resize(width, height, pixelRatio = 1) {
      size = {
        width: Math.max(1, width),
        height: Math.max(1, height),
        pixelRatio: Math.min(2, Math.max(1, pixelRatio))
      };
      renderer.setPixelRatio(size.pixelRatio);
      renderer.setSize(size.width, size.height, false);
      camera.aspect = size.width / size.height;
      camera.updateProjectionMatrix();

      const fit = Math.max(0.72, Math.min(1.5, Math.min(size.width / 460, size.height / 350)));
      brain.scale.setScalar(fit);
    }

    function render(rotation = { x: 0, y: 0 }, zoom = 1) {
      animTime += 0.016;

      // Auto-orbit if orbitSpeed > 0
      const autoY = (physics.orbitSpeed || 0) > 0 ? (animTime * physics.orbitSpeed * 60) : 0;
      brain.rotation.set(rotation.x, rotation.y + autoY, 0);

      // Camera distance with zoom bounds
      camera.position.set(0, 0, 720 / Math.max(0.70, Math.min(1.75, zoom)));
      camera.lookAt(0, 0, 0);
      brain.updateMatrixWorld(true);

      // Animate Pulse Particles Along Curved Edges
      if (pulseParticles && curvedEdges.length > 0) {
        const positions = pulseParticles.geometry.attributes.position.array;
        const count = Math.min(positions.length / 3, curvedEdges.length);

        for (let i = 0; i < count; i++) {
          const tProgress = (animTime * 0.45 + i * 0.17) % 1.0;
          const curve = curvedEdges[i].curve;
          const pt = curve.getPoint(tProgress);
          positions[i * 3] = pt.x;
          positions[i * 3 + 1] = pt.y;
          positions[i * 3 + 2] = pt.z;
        }
        pulseParticles.geometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);

      // Project Hit Targets for Mouse/Touch Interaction
      return graphPoints.map((point) => {
        const pVec = new THREE.Vector3(point.x * physics.repulsion, point.y * physics.repulsion, point.z * physics.repulsion);
        const projected = pVec.applyMatrix4(brain.matrixWorld).project(camera);
        return {
          id: point.item.id,
          x: (projected.x + 1) * size.width / 2,
          y: (1 - projected.y) * size.height / 2,
          radius: 14 * Math.max(0.8, zoom)
        };
      });
    }

    function dispose() {
      disposeGraph();
      renderer.dispose();
    }

    return { setGraph, resize, render, dispose, setPhysicsParams };
  }

  if (root) root.FenixMemoryBrainWebGL = { create };
})(typeof window !== 'undefined' ? window : globalThis);
