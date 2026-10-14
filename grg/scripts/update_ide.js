const fs = require('fs');
const filePath = 'c:/projetos/ai-engine-core/ai-engine/grg/public/index.html';
let html = fs.readFileSync(filePath, 'utf8');

const startIndex = html.indexOf('<div id=\"view-ide\"');
if (startIndex === -1) throw new Error('view-ide not found');

const nextViewIndex = html.indexOf('<div id=\"view-project\"', startIndex);
if (nextViewIndex === -1) throw new Error('view-project not found');

const newIdeBlock = `
<div id="view-ide" class="view fenix-ide-layout-evolution" style="display:none; flex-direction:column; width:100%; height:100%; background:#04060b; overflow:hidden;">
  <!-- Top Control Header / Toolbar -->
  <div class="fenix-ide-top-toolbar" style="display:flex; align-items:center; justify-content:space-between; padding:8px 16px; background:rgba(11, 19, 43, 0.8); backdrop-filter:blur(10px); border-bottom:1px solid rgba(56,189,248,0.1); z-index:10;">
    <div style="display:flex; align-items:center; gap:12px;">
      <div class="fenix-ide-breadcrumb" id="fenixIdeBreadcrumb" style="font-family:var(--fenix-font-mono); font-size:12px; color:#94A3B8; display:flex; align-items:center; gap:6px;">
        <i class="ph-fill ph-code" style="color:#38BDF8;"></i> Workspace <span style="color:#64748B;">&gt;</span> <span id="fenixIdeCurrentPath" style="color:#E2E8F0; font-weight:600;">Active File</span>
      </div>
    </div>

    <!-- View Modes & Controls -->
    <div style="display:flex; align-items:center; gap:12px;">
      <!-- Code / Split / Live Preview Toggle -->
      <div class="fenix-ide-mode-group" style="display:flex; background:rgba(2,6,23,0.5); border:1px solid rgba(255,255,255,0.05); border-radius:8px; padding:3px; box-shadow:inset 0 2px 4px rgba(0,0,0,0.2);">
        <button class="fenix-ide-mode-btn" id="btnIdeModeCode" onclick="window.fenixSetIdeMode('code')" style="background:transparent; border:none; color:#94A3B8; padding:5px 12px; font-size:11px; font-weight:600; border-radius:6px; cursor:pointer; transition:all 0.2s;"><i class="ph-bold ph-code"></i> Code</button>
        <button class="fenix-ide-mode-btn active" id="btnIdeModeSplit" onclick="window.fenixSetIdeMode('split')" style="background:rgba(56,189,248,0.15); border:none; color:#38BDF8; padding:5px 12px; font-size:11px; font-weight:700; border-radius:6px; cursor:pointer; transition:all 0.2s; box-shadow:0 2px 8px rgba(56,189,248,0.1);"><i class="ph-bold ph-columns"></i> Split</button>
        <button class="fenix-ide-mode-btn" id="btnIdeModePreview" onclick="window.fenixSetIdeMode('preview')" style="background:transparent; border:none; color:#94A3B8; padding:5px 12px; font-size:11px; font-weight:600; border-radius:6px; cursor:pointer; transition:all 0.2s;"><i class="ph-bold ph-browsers"></i> Preview</button>
      </div>

      <!-- Viewport Switcher -->
      <div class="fenix-ide-vp-group" id="fenixIdeVpGroup" style="display:flex; background:rgba(2,6,23,0.5); border:1px solid rgba(255,255,255,0.05); border-radius:8px; padding:3px; box-shadow:inset 0 2px 4px rgba(0,0,0,0.2);">
        <button class="fenix-ide-vp-btn active" id="btnVpDesktop" onclick="window.fenixSetIdeViewport('desktop')" title="Desktop (100%)" style="background:rgba(0,229,160,0.15); border:none; color:#00E5A0; padding:5px 8px; font-size:13px; border-radius:6px; cursor:pointer;"><i class="ph-bold ph-desktop"></i></button>
        <button class="fenix-ide-vp-btn" id="btnVpTablet" onclick="window.fenixSetIdeViewport('tablet')" title="Tablet (768px)" style="background:transparent; border:none; color:#64748B; padding:5px 8px; font-size:13px; border-radius:6px; cursor:pointer;"><i class="ph-bold ph-device-tablet"></i></button>
        <button class="fenix-ide-vp-btn" id="btnVpMobile" onclick="window.fenixSetIdeViewport('mobile')" title="Mobile (375px)" style="background:transparent; border:none; color:#64748B; padding:5px 8px; font-size:13px; border-radius:6px; cursor:pointer;"><i class="ph-bold ph-device-mobile"></i></button>
      </div>

      <!-- Visual Element Inspector Toggle -->
      <button class="fenix-ide-inspector-btn" id="btnVisualInspector" onclick="window.fenixToggleVisualInspector()" style="display:flex; align-items:center; gap:6px; background:linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2)); border:1px solid rgba(139,92,246,0.3); color:#C7D2FE; padding:6px 14px; font-size:11px; font-weight:700; border-radius:8px; cursor:pointer; transition:all 0.2s; box-shadow:0 4px 12px rgba(99,102,241,0.15);">
        <i class="ph-bold ph-magic-wand"></i> Visual Edit
      </button>
    </div>
  </div>

  <!-- Main Workspace Body -->
  <div class="fenix-ide-body" style="display:flex; flex:1; overflow:hidden; position:relative;">
    <!-- Left Multi-Tab Panel (Chat/Files) -->
    <aside class="fenix-ide-left-panel" style="width:280px; flex-shrink:0; background:rgba(7, 12, 24, 0.95); border-right:1px solid rgba(255,255,255,0.05); display:flex; flex-direction:column; overflow:hidden; box-shadow:4px 0 24px rgba(0,0,0,0.2);">
      <!-- Tabs Row -->
      <div style="display:flex; background:rgba(0,0,0,0.2); padding:4px; gap:2px; border-bottom:1px solid rgba(255,255,255,0.05);">
        <button style="flex:1; background:rgba(56,189,248,0.1); border:1px solid rgba(56,189,248,0.2); color:#38BDF8; border-radius:6px; padding:6px 0; font-size:10px; font-weight:700; cursor:pointer;"><i class="ph-bold ph-chat-teardrop-text"></i> CHAT</button>
        <button style="flex:1; background:transparent; border:1px solid transparent; color:#64748B; border-radius:6px; padding:6px 0; font-size:10px; font-weight:600; cursor:pointer;"><i class="ph-bold ph-folder-open"></i> ARQUIVOS</button>
        <button style="flex:1; background:transparent; border:1px solid transparent; color:#64748B; border-radius:6px; padding:6px 0; font-size:10px; font-weight:600; cursor:pointer;"><i class="ph-bold ph-kanban"></i> JOBS</button>
      </div>
      
      <!-- Chat Container -->
      <div style="flex:1; display:flex; flex-direction:column; padding:12px; gap:12px; overflow-y:auto;">
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); border-radius:8px; padding:12px; font-size:12px; color:#E2E8F0; line-height:1.5;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
            <i class="ph-fill ph-robot" style="color:#00E5A0; font-size:16px;"></i> <span style="font-weight:700; color:#00E5A0;">Fênix AI</span>
          </div>
          Olá! Estou sincronizado com o live mode. O que vamos construir agora? Você pode clicar em qualquer elemento no preview para editar visualmente.
        </div>
      </div>
      <!-- Prompt Input -->
      <div style="padding:12px; background:rgba(0,0,0,0.2); border-top:1px solid rgba(255,255,255,0.05);">
        <div style="display:flex; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:4px;">
          <input type="text" placeholder="Como posso ajudar?" style="flex:1; background:transparent; border:none; outline:none; color:#fff; font-size:12px; padding:8px;" />
          <button style="background:var(--fenix-primary); border:none; border-radius:6px; padding:0 12px; color:#fff; cursor:pointer;"><i class="ph-bold ph-paper-plane-right"></i></button>
        </div>
      </div>
    </aside>

    <!-- Center Split Area (Code Editor + Lovable Live Preview) -->
    <div class="fenix-ide-center-split" id="fenixIdeCenterSplit" style="display:flex; flex:1; overflow:hidden; background:#020408;">
      <!-- Editor Area -->
      <div class="fenix-ide-editor-area" id="fenixIdeEditorArea" style="flex:1; display:flex; flex-direction:column; border-right:1px solid rgba(255,255,255,0.05); background:#060A14;">
        <div class="fenix-ide-tabs-header" id="fenixIdeTabsHeader" style="display:flex; background:#0A0F1E; border-bottom:1px solid rgba(255,255,255,0.05);">
          <button class="fenix-ide-tab active" style="background:#060A14; border:none; border-top:2px solid #38BDF8; color:#E2E8F0; padding:10px 16px; font-size:11px; font-weight:600; display:flex; align-items:center; gap:8px;">
            <i class="ph-fill ph-file-code" style="color:#38BDF8;"></i> main.tsx
          </button>
          <button class="fenix-ide-tab" style="background:transparent; border:none; border-top:2px solid transparent; color:#64748B; padding:10px 16px; font-size:11px; font-weight:600; display:flex; align-items:center; gap:8px;">
            <i class="ph-fill ph-file-css" style="color:#A78BFA;"></i> styles.css
          </button>
        </div>
        <div class="fenix-ide-code-viewport" style="flex:1; display:flex; position:relative; overflow:hidden;">
          <div class="fenix-ide-line-numbers" id="fenixIdeLineNumbers" style="width:48px; background:#04070D; color:#334155; font-family:var(--fenix-font-mono); font-size:13px; line-height:1.6; padding:16px 8px; text-align:right; user-select:none; border-right:1px solid rgba(255,255,255,0.02);">1<br>2<br>3<br>4<br>5</div>
          <div style="flex:1; position:relative; overflow:hidden;" id="fenixIdeEditorWrapper">
            <pre id="fenixIdeCodeHighlight" style="margin:0; padding:16px; font-family:var(--fenix-font-mono); font-size:13px; line-height:1.6; white-space:pre; pointer-events:none; position:absolute; top:0; left:0; width:100%; height:100%; box-sizing:border-box; color:#94A3B8; z-index:1; overflow:hidden;"></pre>
            <textarea id="fenixIdeCodeEditor" style="position:relative; z-index:2; width:100%; height:100%; background:transparent; border:none; outline:none; color:transparent; caret-color:#38BDF8; font-family:var(--fenix-font-mono); font-size:13px; line-height:1.6; padding:16px; resize:none; white-space:pre; tab-size:2; box-sizing:border-box; overflow:auto;" spellcheck="false">// Fênix Code Editor
export function App() {
  return <div>Ready for evolution</div>;
}</textarea>
          </div>
        </div>
      </div>

      <!-- Lovable / v0 Style Live Preview Pane -->
      <div class="fenix-ide-preview-pane" id="fenixIdePreviewPane" style="flex:1; display:flex; flex-direction:column; background:radial-gradient(circle at top, #0A1128 0%, #030612 100%); overflow:hidden;">
        <!-- Preview Toolbar -->
        <div class="fenix-preview-top-bar" style="display:flex; align-items:center; gap:12px; padding:8px 16px; background:rgba(2,6,23,0.4); backdrop-filter:blur(10px); border-bottom:1px solid rgba(255,255,255,0.05);">
          <div style="display:flex; gap:6px;">
            <span style="width:10px; height:10px; border-radius:50%; background:#EF4444; opacity:0.8;"></span>
            <span style="width:10px; height:10px; border-radius:50%; background:#F59E0B; opacity:0.8;"></span>
            <span style="width:10px; height:10px; border-radius:50%; background:#10B981; opacity:0.8;"></span>
          </div>
          <div class="fenix-preview-url-bar" style="flex:1; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:5px 12px; font-family:var(--fenix-font-mono); font-size:11px; color:#94A3B8; display:flex; align-items:center; gap:8px; box-shadow:inset 0 2px 4px rgba(0,0,0,0.2);">
            <i class="ph-bold ph-lock-key" style="color:#00E5A0;"></i> <span id="fenixPreviewUrlText">localhost:3000/live</span>
          </div>
          <button class="fenix-hud-btn" style="background:rgba(56,189,248,0.1); border:1px solid rgba(56,189,248,0.2); color:#38BDF8; border-radius:6px; padding:5px 10px; cursor:pointer; font-size:12px;"><i class="ph-bold ph-arrow-clockwise"></i></button>
        </div>

        <!-- Preview Canvas Frame -->
        <div class="fenix-preview-wrapper" id="fenixPreviewWrapper" style="flex:1; display:flex; align-items:center; justify-content:center; padding:24px; overflow:auto;">
          <div class="fenix-device-frame" id="fenixDeviceFrame" style="width:100%; max-width:100%; height:100%; border-radius:12px; background:#FFFFFF; border:1px solid rgba(255,255,255,0.1); overflow:hidden; position:relative; box-shadow:0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05); display:flex; flex-direction:column; transition:max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1);">
            <div id="fenixLivePreviewContainer" style="width:100%; height:100%; overflow:auto; position:relative; color:#0f172a;">
              <!-- Real Interactive Live Preview Elements rendered here -->
              <div style="padding:40px; text-align:center; font-family:system-ui;">
                <h1 style="font-size:24px; font-weight:800; margin-bottom:16px;">Live Canvas Render</h1>
                <p style="color:#64748b;">The application interface is rendered here in real-time.</p>
              </div>
            </div>
            <div id="fenixInspectorTooltip" style="position:absolute; display:none; background:rgba(15,23,42,0.95); border:1px solid #38BDF8; color:#38BDF8; padding:3px 8px; border-radius:4px; font-family:var(--fenix-font-mono); font-size:10px; pointer-events:none; z-index:100; box-shadow:0 4px 12px rgba(0,0,0,0.5);"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Lateral Structure / Inspector Panel -->
    <aside class="fenix-ide-assistant-sidebar" style="width:280px; flex-shrink:0; background:rgba(7, 12, 24, 0.95); border-left:1px solid rgba(255,255,255,0.05); display:flex; flex-direction:column; padding:16px; gap:16px; overflow-y:auto; box-shadow:-4px 0 24px rgba(0,0,0,0.2);">
      <div style="font-size:11px; font-weight:800; letter-spacing:0.05em; color:#FFFFFF; text-transform:uppercase; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:12px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <i class="ph-bold ph-tree-structure" style="color:#A78BFA; font-size:14px;"></i> ESTRUTURA (DOM)
        </div>
      </div>
      
      <div style="display:flex; flex-direction:column; gap:8px; font-family:var(--fenix-font-mono); font-size:11px; color:#CBD5E1;">
        <div style="display:flex; align-items:center; gap:6px; padding:6px; border-radius:6px; background:rgba(255,255,255,0.03);"><i class="ph-fill ph-caret-down"></i> &lt;App&gt;</div>
        <div style="display:flex; align-items:center; gap:6px; padding:6px; border-radius:6px; margin-left:12px; background:rgba(56,189,248,0.1); color:#38BDF8; border:1px solid rgba(56,189,248,0.2);"><i class="ph-fill ph-caret-right"></i> &lt;Header /&gt;</div>
        <div style="display:flex; align-items:center; gap:6px; padding:6px; border-radius:6px; margin-left:12px;"><i class="ph-fill ph-caret-right"></i> &lt;MainContent /&gt;</div>
      </div>
      
      <div style="margin-top:auto; background:rgba(167, 139, 250, 0.1); border:1px solid rgba(167, 139, 250, 0.2); border-radius:8px; padding:12px;">
        <div style="font-size:10px; font-weight:700; color:#A78BFA; margin-bottom:4px;">AI AGENTS (LIVE)</div>
        <div style="font-size:11px; color:#E2E8F0;">2 agentes observando DOM.</div>
      </div>
    </aside>
  </div>
</div>
\n`;

html = html.substring(0, startIndex) + newIdeBlock + html.substring(nextViewIndex);
fs.writeFileSync(filePath, html, 'utf8');
console.log('Successfully updated view-ide!');
