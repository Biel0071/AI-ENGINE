const fs = require('fs');
const path = require('path');

const indexPath = path.resolve(__dirname, '../public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const target = `<button type="button" data-action="close-inspector" onclick="document.getElementById('spatialBuildingInspectorPanel').style.display='none'" style="background:none; border:none; color:var(--city-muted); font-size:18px; cursor:pointer;">×</button>`;
const replacement = `<div style="display:flex; align-items:center; gap:6px;">
                  <button type="button" id="btnToggleImmersiveBuilding" onclick="window.fenixToggleImmersiveBuilding ? window.fenixToggleImmersiveBuilding() : null" title="Visão Imersiva 3D do Edifício" style="background:rgba(0,217,255,0.12); border:1px solid rgba(0,217,255,0.3); color:#00D9FF; border-radius:5px; font-size:10px; font-weight:700; padding:3px 8px; cursor:pointer;"><i class="ph-bold ph-cube"></i> Imersivo</button>
                  <button type="button" data-action="close-inspector" onclick="window.fenixCloseInspectorOnly ? window.fenixCloseInspectorOnly() : document.getElementById('spatialBuildingInspectorPanel').style.display='none'" style="background:none; border:none; color:var(--city-muted); font-size:18px; cursor:pointer;" title="Fechar Painel">×</button>
                </div>`;

if (html.includes(target)) {
  html = html.replace(target, replacement);
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('Updated inspector header with immersive button in index.html');
} else {
  console.log('Target not found in index.html or already updated');
}
