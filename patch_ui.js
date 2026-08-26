const fs = require('fs');

let html = fs.readFileSync('grg/public/index.html', 'utf8');

// 1. Add Cockpit tab
html = html.replace(
    '<button class="tab-btn active" data-tab="editor">',
    '<button class="tab-btn active" data-tab="cockpit"><i class="ph ph-rocket-launch"></i> COMMAND CENTER</button>\n              <button class="tab-btn" data-tab="editor">'
);

const cockpitHtml = `
            <!-- DEV COMMAND CENTER COCKPIT -->
            <div id="tab-cockpit" class="workspace-tab active" style="position:absolute; inset:0; flex-direction:column; overflow-y:auto; padding:20px; gap:20px; background:var(--bg-app);">
              
              <div style="background:var(--bg-panel); border:1px solid var(--border); padding:16px; border-radius:6px;">
                <h3 style="margin-top:0; display:flex; align-items:center; gap:8px;"><i class="ph ph-terminal-window"></i> COMMAND ROUTER</h3>
                <div style="display:flex; gap:10px; margin-bottom:12px;">
                  <input type="text" id="cockpitProjectId" class="grg-input" placeholder="Project ID" style="width:250px;" value="fenix_main" />
                  <button id="cockpitConnectBtn" class="conn-btn primary"><i class="ph ph-plug"></i> CONNECT</button>
                  <span id="cockpitStatus" style="margin-left:10px; align-self:center; font-weight:bold; color:var(--text-muted);"></span>
                </div>
                <div style="display:flex; gap:10px;">
                  <textarea id="cockpitPrompt" class="grg-input" placeholder="Ex: /FULLDEV Crie uma função de autenticação com JWT..." style="flex:1; height:60px; resize:vertical;"></textarea>
                  <button id="cockpitExecuteBtn" class="conn-btn primary" style="width:120px; font-weight:bold; font-size:14px;">EXECUTE</button>
                </div>
              </div>

              <div style="display:flex; gap:20px; flex:1;">
                <div style="flex:1; display:flex; flex-direction:column; gap:20px;">
                  <div style="background:var(--bg-panel); border:1px solid var(--border); padding:16px; border-radius:6px; flex:1; display:flex; flex-direction:column;">
                    <h4 style="margin:0 0 10px 0; border-bottom:1px solid var(--border); padding-bottom:8px;"><i class="ph ph-git-commit"></i> ACTIVE MISSION DAG</h4>
                    <div id="cockpitMissionJobs" style="flex:1; overflow-y:auto; padding-right:10px; display:flex; flex-direction:column; gap:8px;">
                      <div style="color:var(--text-muted); font-size:12px;">Waiting for mission...</div>
                    </div>
                  </div>
                </div>
                
                <div style="flex:1; display:flex; flex-direction:column; gap:20px;">
                  <div style="background:var(--bg-panel); border:1px solid var(--border); padding:16px; border-radius:6px; flex:1; display:flex; flex-direction:column;">
                    <h4 style="margin:0 0 10px 0; border-bottom:1px solid var(--border); padding-bottom:8px;"><i class="ph ph-terminal"></i> LIVE EVIDENCE & RAG</h4>
                    <div id="cockpitLogs" style="flex:1; overflow-y:auto; background:#000; color:#0f0; font-family:monospace; font-size:12px; padding:10px; border-radius:4px;">
                      > SYSTEM READY
                    </div>
                  </div>
                </div>
              </div>
            </div>
`;

html = html.replace(
    '<div id="tab-editor" class="workspace-tab active"',
    '<div id="tab-editor" class="workspace-tab"'
);

html = html.replace(
    '<!-- 2. PREVIEW -->',
    cockpitHtml + '\n            <!-- 2. PREVIEW -->'
);

fs.writeFileSync('grg/public/index.html', html, 'utf8');
console.log("UI Patched with Node!");
