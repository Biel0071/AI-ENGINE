const fs = require('fs');
const path = require('path');

// 1. Update fenix-spatial-city.js
const spatialPath = path.resolve(__dirname, '../public/fenix-spatial-city.js');
let spatialCode = fs.readFileSync(spatialPath, 'utf8');

// Ensure selectBuilding adds .has-inspector-open
if (!spatialCode.includes("classList.add('has-inspector-open')")) {
  spatialCode = spatialCode.replace(
    /selectBuilding\(buildingId\)\s*\{([\s\S]*?)const stage = document\.getElementById\('spatialBuildingCutawayStage'\);/,
    `selectBuilding(buildingId) {$1document.getElementById('view-city')?.classList.add('has-inspector-open');\n      const stage = document.getElementById('spatialBuildingCutawayStage');`
  );
  console.log('Updated selectBuilding with has-inspector-open');
}

// Ensure closeBuilding removes .has-inspector-open
if (!spatialCode.includes("classList.remove('has-inspector-open')")) {
  spatialCode = spatialCode.replace(
    /closeBuilding\(\)\s*\{([\s\S]*?)const stage = document\.getElementById\('spatialBuildingCutawayStage'\);/,
    `closeBuilding() {$1document.getElementById('view-city')?.classList.remove('has-inspector-open');\n      const stage = document.getElementById('spatialBuildingCutawayStage');`
  );
  console.log('Updated closeBuilding with has-inspector-open removal');
}

// Add closeInspectorOnly and toggleImmersiveBuilding if not present
if (!spatialCode.includes('closeInspectorOnly()')) {
  spatialCode = spatialCode.replace(
    /closeBuilding\(\)\s*\{[\s\S]*?SpatialState\.selectedBuildingId = null;\s*\},/,
    `closeBuilding() {
      document.getElementById('view-city')?.classList.remove('has-inspector-open');
      const stage = document.getElementById('spatialBuildingCutawayStage');
      const panel = document.getElementById('spatialBuildingInspectorPanel');
      if (stage) stage.style.display = 'none';
      if (panel) panel.style.display = 'none';
      SpatialState.selectedBuildingId = null;
    },

    closeInspectorOnly() {
      document.getElementById('view-city')?.classList.remove('has-inspector-open');
      const panel = document.getElementById('spatialBuildingInspectorPanel');
      if (panel) panel.style.display = 'none';
    },

    toggleImmersiveBuilding() {
      const stage = document.getElementById('spatialBuildingCutawayStage');
      if (!stage) return;
      SpatialState.isIsolated = !SpatialState.isIsolated;
      stage.classList.toggle('isolated', SpatialState.isIsolated);
      const btn = document.getElementById('btnToggleImmersiveBuilding');
      if (btn) btn.classList.toggle('active', SpatialState.isIsolated);
      if (this.cutaway) this.cutaway.render();
    },`
  );
  console.log('Added closeInspectorOnly and toggleImmersiveBuilding methods');
}

// Expose them to window
if (!spatialCode.includes('window.fenixCloseInspectorOnly')) {
  spatialCode = spatialCode.replace(
    /window\.fenixCloseBuilding = \(\) => FenixSpatialCity\.closeBuilding\(\);/,
    `window.fenixCloseBuilding = () => FenixSpatialCity.closeBuilding();
  window.fenixCloseInspectorOnly = () => FenixSpatialCity.closeInspectorOnly();
  window.fenixToggleImmersiveBuilding = () => FenixSpatialCity.toggleImmersiveBuilding();`
  );
  console.log('Exposed inspector and immersive helpers to window');
}

fs.writeFileSync(spatialPath, spatialCode, 'utf8');
console.log('Saved fenix-spatial-city.js successfully.');
