const fs = require('node:fs');
let html = fs.readFileSync('grg/public/index.html', 'utf8');

// 1. Add Cockpit tab button
html = html.replace(
  '<button class="tab-btn active" data-tab="editor">',
  '<button class="tab-btn active" data-tab="cockpit"><i class="ph ph-rocket-launch"></i> DEV COMMAND CENTER</button>\n              <button class="tab-btn" data-tab="editor">'
);

// 2. Add Cockpit tab content
const cockpitHtml = \
            <!-- NEW DEV COCKPIT -->
            <div id=\"tab-cockpit\" class=\"workspace-tab active\" style=\"position:absolute; inset:0; flex-direction:column; overflow-y:auto; padding:20px; gap:20px; background:var(--bg-app);\">
              
              <!-- PROJECT / PROMPT -->
              <div style=\"background:var(--bg-panel); border:1px solid var(--border); padding:16px; border-radius:6px;\">
                <h3 style=\"margin-top:0;\"><i class=\"ph ph-folder\"></i> Project & Command</h3>
                <div style=\"display:flex; gap:10px; margin-bottom:12px;\">
                  <input type=\"text\" id=\"cockpitProjectId\" class=\"grg-input\" placeholder=\"Project ID\" style=\"width:300px;\" value=\"fenix_main\" />
                  <button id=\"cockpitConnectBtn\" class=\"conn-btn primary\">CONNECT</button>
                </div>
                <div style=\"display:flex; gap:10px;\">
                  <textarea id=\"cockpitPrompt\" class=\"grg-input\" placeholder=\"Ex: Crie uma função completa de gerenciamento de tarefas...\" style=\"flex:1; height:80px; resize:vertical;\"></textarea>
                  <button id=\"cockpitExecuteBtn\" class=\"conn-btn primary\" style=\"width:120px; font-weight:bold;\">EXECUTE</button>
                </div>
              </div>

              <!-- LIVE PIPELINE / JOBS -->
              <div style=\"background:var(--bg-panel); border:1px solid var(--border); padding:16px; border-radius:6px; flex:1; display:flex; flex-direction:column;\">
                <h3 style=\"margin-top:0;\"><i class=\"ph ph-activity\"></i> Job Pipeline Monitor</h3>
                <div id=\"cockpitPipelineStages\" style=\"display:flex; flex-wrap:wrap; gap:10px; margin-bottom:20px;\">
                  <!-- dynamically filled -->
                </div>
                
                <h4 style=\"margin:0 0 10px 0;\">Active Jobs</h4>
                <div id=\"cockpitJobsList\" style=\"border:1px solid var(--border); border-radius:4px; padding:10px; min-height:100px; overflow-y:auto; background:#111;\"></div>
                
                <h4 style=\"margin:16px 0 10px 0;\">Fênix Dev Factory Logs (Agents, Memory, RAG, Tests)</h4>
                <div id=\"cockpitLogsList\" style=\"border:1px solid var(--border); border-radius:4px; padding:10px; flex:1; overflow-y:auto; background:#000; font-family:monospace; font-size:12px;\"></div>
              </div>
            </div>
\;

html = html.replace(
  '<div id="tab-editor" class="workspace-tab active"',
  '<div id="tab-editor" class="workspace-tab"'
);
html = html.replace(
  '<!-- 2. PREVIEW -->',
  cockpitHtml.replace(/\/g, '') + '\n            <!-- 2. PREVIEW -->'
);

fs.writeFileSync('grg/public/index.html', html, 'utf8');
console.log('HTML patched');

