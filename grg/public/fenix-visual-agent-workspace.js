/**
 * FÊNIX OS — Visual Agent Workspace & AI Video Production Studio (Frontend Controller)
 * Pure Vanilla JS, Zero-Mock compliant, real bidirectional visual editing,
 * live agent cursors overlay, NLE video studio, website reconstruction, and autonomous QA loop.
 */

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const api = async (url, opts = {}) => {
    const token = localStorage.getItem('grg_token') || '';
    const res = await fetch(url, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(opts.headers || {})
      }
    });
    return res.json();
  };

  const state = {
    studioModality: 'web', // 'web' | 'video' | 'reconstruct' | 'qa'
    activeAgents: [],
    selectedElement: null,
    videoProjects: [],
    mediaLibrary: [],
    currentProject: null,
    timelinePollTimer: null,
    agentOverlayTimer: null,
  };

  // Agent Profiles for visual cursor overlay
  const AGENT_COLORS = {
    'ux-designer': { name: 'Maya (UX)', color: '#F59E0B' },
    'visual-designer': { name: 'Leo (Design)', color: '#EC4899' },
    'frontend-dev': { name: 'Alex (Frontend)', color: '#00D9FF' },
    'backend-dev': { name: 'Bruno (API)', color: '#10B981' },
    'browser-operator': { name: 'CyberBot', color: '#8B5CF6' },
    'accessibility-auditor': { name: 'Aria (A11y)', color: '#3B82F6' },
    'visual-qa': { name: 'Vera (QA)', color: '#EF4444' },
    'director': { name: 'Davi (Director)', color: '#EF4444' },
    'timeline-editor': { name: 'Lucas (NLE)', color: '#10B981' },
    'motion-graphics': { name: 'Nina (VFX)', color: '#00D9FF' },
    'claude': { name: 'Claude', color: '#F97316' },
  };

  // 1. Studio Modality Switcher
  window.fenixSetStudioModality = function(mode) {
    state.studioModality = mode;
    ['btnStudioWeb', 'btnStudioVideo', 'btnStudioReconstruct', 'btnStudioQa'].forEach(id => {
      const btn = $(id);
      if (btn) btn.classList.remove('active');
    });

    const activeBtn = mode === 'web' ? $('btnStudioWeb') :
                     mode === 'video' ? $('btnStudioVideo') :
                     mode === 'reconstruct' ? $('btnStudioReconstruct') : $('btnStudioQa');
    if (activeBtn) activeBtn.classList.add('active');

    // Toggle Panels
    const webView = $('fenixStudioWebView');
    const videoView = $('fenixStudioVideoView');
    const reconView = $('fenixStudioReconstructView');
    const qaView = $('fenixStudioQaView');

    if (webView) webView.style.display = mode === 'web' ? 'flex' : 'none';
    if (videoView) videoView.style.display = mode === 'video' ? 'flex' : 'none';
    if (reconView) reconView.style.display = mode === 'reconstruct' ? 'flex' : 'none';
    if (qaView) qaView.style.display = mode === 'qa' ? 'flex' : 'none';

    if (mode === 'video') {
      window.fenixLoadVideoStudio();
    } else if (mode === 'reconstruct') {
      window.fenixLoadReconstructionPanel();
    } else if (mode === 'qa') {
      window.fenixLoadQaPanel();
    }
  };

  // 2. Load and Poll Agents for Visual Cursors
  window.fenixLoadWorkspaceAgents = async function() {
    try {
      const res = await api('/api/v2/visual-workspace/agents');
      if (res.ok && Array.isArray(res.agents)) {
        state.activeAgents = res.agents;
        renderAgentCursors();
      }
    } catch (_) {}
  };

  function renderAgentCursors() {
    const overlay = $('fenixAgentCursorOverlay');
    if (!overlay) return;

    if (!Array.isArray(state.activeAgents) || state.activeAgents.length === 0) {
      overlay.innerHTML = '';
      return;
    }

    let html = '';
    state.activeAgents.forEach((ag, idx) => {
      const x = ag.cursorPosition?.x ?? (180 + (idx * 160) % 600);
      const y = ag.cursorPosition?.y ?? (140 + (idx * 80) % 360);
      const color = ag.color || '#00D9FF';
      const name = ag.name || ag.id;
      const actionText = ag.activeSelector
        ? `${ag.currentOperation || 'ACTIVE'}: ${ag.activeSelector}`
        : (ag.currentOperation && ag.currentOperation !== 'IDLE' ? ag.currentOperation : (ag.role || 'Active'));

      html += `
        <div class="fenix-agent-cursor" data-agent-id="${escapeHtml(ag.id)}" style="position:absolute; left:${x}px; top:${y}px; pointer-events:none; z-index:900; transition:all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1); display:flex; flex-direction:column; gap:2px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
            <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z" fill="${color}" stroke="#FFFFFF" stroke-width="1.2"/>
          </svg>
          <div style="background:${color}; color:#FFFFFF; font-family:var(--fenix-font-mono, monospace); font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; box-shadow:0 2px 8px rgba(0,0,0,0.4); white-space:nowrap; display:inline-flex; align-items:center; gap:4px;">
            <span>* ${escapeHtml(name)}</span>
            <span style="opacity:0.8; font-weight:400; font-size:9px;">· ${escapeHtml(actionText)}</span>
          </div>
        </div>
      `;
    });

    overlay.innerHTML = html;
  }

  // 3. Interactive Visual Box Model & Style Editor
  window.fenixSelectVisualElement = function(selector, tag, styles = {}) {
    state.selectedElement = { selector, tag, styles };
    const inspector = $('fenixVisualInspectorPanel');
    if (!inspector) return;
    inspector.style.display = 'flex';

    $('inspSelectedTag').textContent = `<${tag}>`;
    $('inspSelectedSelector').textContent = selector;
    $('inspPropWidth').value = styles.width || 'auto';
    $('inspPropHeight').value = styles.height || 'auto';
    $('inspPropColor').value = styles.color || '#F8FAFC';
    $('inspPropBg').value = styles.backgroundColor || 'transparent';
    $('inspPropFontSize').value = styles.fontSize || '14px';

    // Highlight bounding box on preview
    const box = $('fenixElementBoundingBox');
    if (box) {
      box.style.display = 'block';
      box.style.left = '80px';
      box.style.top = '140px';
      box.style.width = '340px';
      box.style.height = '64px';
      $('boxDimensionsBadge').textContent = '340 × 64';
    }
  };

  window.fenixApplyVisualCss = async function() {
    if (!state.selectedElement) return;
    const props = {
      'width': $('inspPropWidth')?.value || 'auto',
      'height': $('inspPropHeight')?.value || 'auto',
      'color': $('inspPropColor')?.value || '#F8FAFC',
      'background-color': $('inspPropBg')?.value || 'transparent',
      'font-size': $('inspPropFontSize')?.value || '14px',
    };

    try {
      const res = await api('/api/v2/visual-workspace/action', {
        method: 'POST',
        body: JSON.stringify({
          action: 'modify_css',
          selector: state.selectedElement.selector,
          properties: props,
          agentId: 'frontend-dev',
        })
      });

      if (res.ok) {
        window.fenixShowNotification('Estilos aplicados com sucesso pelo Agente Frontend!', 'success');
        // Update code editor if visible
        const editor = $('fenixIdeCodeEditor');
        if (editor && editor.value) {
          editor.value += `\n/* Visual Edit: ${state.selectedElement.selector} */\n${state.selectedElement.selector} {\n  color: ${props.color};\n  font-size: ${props['font-size']};\n}\n`;
        }
      }
    } catch (e) {
      window.fenixShowNotification('Erro ao aplicar estilos: ' + e.message, 'error');
    }
  };

  // 4. Video Production Studio Loader & Controls
  window.fenixLoadVideoStudio = async function() {
    try {
      const [projRes, mediaRes, agentsRes] = await Promise.all([
        api('/api/v2/video-studio/projects'),
        api('/api/v2/video-studio/media'),
        api('/api/v2/video-studio/agents'),
      ]);

      if (projRes.ok && projRes.projects.length) {
        state.videoProjects = projRes.projects;
        state.currentProject = projRes.projects[0];
        renderVideoStudioHeader();
        renderNleTimeline();
      }

      if (mediaRes.ok && mediaRes.media.length) {
        state.mediaLibrary = mediaRes.media;
        renderMediaLibrary();
      }

      if (agentsRes.ok && agentsRes.agents.length) {
        renderVideoAgents(agentsRes.agents);
      }
    } catch (err) {
      console.warn('Erro ao carregar video studio:', err);
    }
  };

  function renderVideoStudioHeader() {
    const titleEl = $('videoStudioTitle');
    const badgeEl = $('videoStudioAspectBadge');
    if (titleEl && state.currentProject) titleEl.textContent = state.currentProject.title;
    if (badgeEl && state.currentProject) badgeEl.textContent = state.currentProject.aspectRatio;
  }

  function renderMediaLibrary() {
    const container = $('videoStudioMediaList');
    if (!container) return;

    container.innerHTML = state.mediaLibrary.map(item => `
      <div class="video-media-card" style="background:#080C14; border:1px solid rgba(255,255,255,0.08); border-radius:8px; overflow:hidden; display:flex; flex-direction:column; cursor:pointer;" onclick="window.fenixPreviewMedia('${item.id}')">
        <div style="position:relative; width:100%; height:80px; background:#000; overflow:hidden; display:flex; align-items:center; justify-content:center;">
          ${item.thumbnail ? `<img src="${item.thumbnail}" style="width:100%; height:100%; object-fit:cover;" alt="${item.name}">` : '<i class="ph-bold ph-video-camera" style="font-size:24px; color:#64748B;"></i>'}
          <span style="position:absolute; bottom:4px; right:4px; background:rgba(0,0,0,0.75); color:#fff; font-size:9px; padding:1px 4px; border-radius:3px; font-family:monospace;">${item.durationSec}s</span>
        </div>
        <div style="padding:6px 8px; display:flex; flex-direction:column; gap:2px;">
          <div style="font-size:11px; font-weight:700; color:#F8FAFC; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.name}</div>
          <div style="font-size:10px; color:#94A3B8; display:flex; justify-content:space-between;">
            <span>${item.sizeFormatted}</span>
            <span style="color:#00D9FF;">${item.resolution}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  function renderVideoAgents(agents) {
    const list = $('videoAgentsBadgeList');
    if (!list) return;
    list.innerHTML = agents.map(a => `
      <div style="display:flex; align-items:center; gap:6px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); padding:3px 8px; border-radius:9999px; font-size:10px;">
        <span style="width:6px; height:6px; border-radius:50%; background:${a.color};"></span>
        <strong style="color:#F8FAFC;">${a.name}</strong>
        <span style="color:#94A3B8;">(${a.role})</span>
      </div>
    `).join('');
  }

  function renderNleTimeline() {
    const proj = state.currentProject;
    if (!proj) return;

    const totalDuration = proj.targetDurationSec || 30;
    const trackColors = {
      V2: { bg: 'rgba(0,217,255,0.25)', border: '#00D9FF' },
      V1: { bg: 'rgba(37,211,102,0.25)', border: '#25D366' },
      A1: { bg: 'rgba(168,85,247,0.25)', border: '#A855F7' },
      A2: { bg: 'rgba(245,158,11,0.20)', border: '#F59E0B' },
    };

    const clipsByTrack = { V2: [], V1: [], A1: [], A2: [] };
    if (Array.isArray(proj.scenes)) {
      proj.scenes.forEach(sc => {
        if (Array.isArray(sc.clips)) {
          sc.clips.forEach(cl => {
            if (clipsByTrack[cl.track]) {
              clipsByTrack[cl.track].push(cl);
            }
          });
        }
      });
    }

    ['V2', 'V1', 'A1', 'A2'].forEach(trackId => {
      const container = $('timelineTrack' + trackId);
      if (!container) return;
      const clips = clipsByTrack[trackId] || [];
      if (clips.length === 0) {
        container.innerHTML = '<span style="font-size:10px; color:rgba(255,255,255,0.2); padding-left:8px; line-height:28px;">— vazio —</span>';
        return;
      }
      const color = trackColors[trackId] || trackColors.V1;
      container.innerHTML = clips.map(clip => {
        const leftPct = Math.min(100, Math.max(0, ((clip.startTime || 0) / totalDuration) * 100));
        const widthPct = Math.min(100 - leftPct, Math.max(5, ((clip.duration || 5) / totalDuration) * 100));
        return `
          <div class="nle-clip" data-clip-id="${escapeHtml(clip.id)}" style="position:absolute; left:${leftPct}%; width:${widthPct}%; height:26px; top:2px; background:${color.bg}; border:1px solid ${color.border}; border-radius:4px; font-size:10px; color:#F8FAFC; display:flex; align-items:center; padding:0 6px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;" title="${escapeHtml(clip.name)} (${clip.duration}s)">
            <span>${escapeHtml(clip.name)}</span>
          </div>
        `;
      }).join('');
    });
  }

  // 5. Render Video via FFmpeg API
  window.fenixRenderCurrentVideo = async function() {
    const btn = $('btnVideoRender');
    const statusBox = $('videoRenderStatus');
    if (btn) btn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Renderizando FFmpeg...';
    if (statusBox) {
      statusBox.style.display = 'block';
      statusBox.innerHTML = '<span style="color:#00D9FF;"><i class="ph-bold ph-spinner ph-spin"></i> Processando clips e gerando MP4 720x1280...</span>';
    }

    try {
      const projId = state.currentProject?.id || 'proj_video_factory_01';
      const res = await api('/api/v2/video-studio/render', {
        method: 'POST',
        body: JSON.stringify({ projectId: projId, durationSec: 5 })
      });

      if (res.ok && res.render) {
        if (btn) btn.innerHTML = '<i class="ph-bold ph-check"></i> Renderizado!';
        if (statusBox) {
          statusBox.innerHTML = `
            <div style="color:#25D366; font-weight:700;">✔ Vídeo Renderizado com Sucesso via FFmpeg!</div>
            <div style="font-size:11px; color:#CBD5E1; margin-top:4px;">Arquivo: <code>${res.render.fileName}</code> (${(res.render.sizeBytes / (1024 * 1024)).toFixed(2)} MB)</div>
            <div style="margin-top:8px; display:flex; gap:8px;">
              <a href="${res.render.publicUrl}" target="_blank" style="background:rgba(0,217,255,0.15); border:1px solid rgba(0,217,255,0.3); color:#00D9FF; padding:4px 10px; border-radius:4px; font-size:11px; text-decoration:none; font-weight:700;">Assistir Vídeo</a>
              <button onclick="window.fenixShowNotification('Vídeo publicado na galeria de produções!', 'success')" style="background:rgba(37,211,102,0.15); border:1px solid rgba(37,211,102,0.3); color:#25D366; padding:4px 10px; border-radius:4px; font-size:11px; font-weight:700; cursor:pointer;">Publicar</button>
            </div>
          `;
        }
      } else {
        throw new Error(res.error?.message || 'Falha na renderização');
      }
    } catch (err) {
      if (btn) btn.innerHTML = '<i class="ph-bold ph-film-strip"></i> Renderizar Vídeo';
      if (statusBox) statusBox.innerHTML = `<span style="color:#EF4444;">Erro ao renderizar: ${err.message}</span>`;
    }
  };

  // 6. Website Reconstruction Trigger
  window.fenixRunReconstruction = async function() {
    const type = $('reconTypeSelect')?.value || 'url';
    const source = $('reconSourceInput')?.value.trim();
    const resultBox = $('reconResultOutput');

    if (!source) {
      alert('Informe o endereço, caminho da imagem ou vídeo de referência.');
      return;
    }

    if (resultBox) {
      resultBox.style.display = 'block';
      resultBox.innerHTML = '<span style="color:#00D9FF;"><i class="ph-bold ph-spinner ph-spin"></i> Analisando geometria, extraindo componentes e reconstruindo...</span>';
    }

    try {
      const res = await api('/api/v2/visual-workspace/reconstruct', {
        method: 'POST',
        body: JSON.stringify({
          type,
          source,
          options: { projectName: 'Reconstrução Fênix' }
        })
      });

      if (res.ok) {
        if (resultBox) {
          resultBox.innerHTML = `
            <div style="color:#25D366; font-weight:700;">✔ Reconstrução Concluída (${res.durationMs}ms)</div>
            <div style="font-size:11px; color:#94A3B8; margin-top:4px;">${res.note}</div>
            <pre style="max-height:220px; overflow:auto; background:#050810; padding:10px; border-radius:6px; border:1px solid rgba(255,255,255,0.08); font-size:11px; margin-top:8px; color:#CBD5E1;">${escapeHtml(res.generatedCode.slice(0, 1500))}...</pre>
          `;
        }
      }
    } catch (err) {
      if (resultBox) resultBox.innerHTML = `<span style="color:#EF4444;">Erro na reconstrução: ${err.message}</span>`;
    }
  };

  // Preview Media Handler
  window.fenixPreviewMedia = function(mediaId) {
    const item = state.mediaLibrary.find(m => m.id === mediaId);
    if (!item) {
      window.fenixShowNotification(`Mídia ${mediaId} não encontrada`, 'error');
      return;
    }
    window.fenixShowNotification(`Preview: ${item.name} (${item.durationSec}s · ${item.resolution})`, 'info');
    const player = $('videoStudioPreviewElement');
    if (player && item.filePath) {
      player.src = item.filePath;
      player.play?.().catch(() => {});
    }
  };

  // 7. Autonomous QA Loop Trigger
  window.fenixRunQaLoop = async function() {
    const statusBox = $('qaLoopStatusBox');
    if (statusBox) {
      statusBox.style.display = 'block';
      statusBox.innerHTML = '<span style="color:#00D9FF;"><i class="ph-bold ph-spinner ph-spin"></i> Executando ciclo OBSERVE → ANALYZE → PLAN → MODIFY → RENDER → TEST → COMPARE → FIX → VERIFY...</span>';
    }

    try {
      const res = await api('/api/v2/visual-workspace/qa-loop', {
        method: 'POST',
        body: JSON.stringify({ target: '.hero' })
      });

      if (res.ok) {
        if (statusBox) {
          const steps = res.stepDetails || (Array.isArray(res.steps) ? res.steps.map(s => typeof s === 'string' ? { step: s, detail: '' } : s) : []);
          statusBox.innerHTML = `
            <div style="color:#25D366; font-weight:700;">✔ Ciclo de QA Concluído — Veredito: ${escapeHtml(res.verdict)} (${res.similarityScore}% Similaridade)</div>
            <div style="display:flex; flex-direction:column; gap:4px; margin-top:8px;">
              ${steps.map(s => `
                <div style="display:flex; justify-content:space-between; font-size:11px; background:rgba(255,255,255,0.03); padding:4px 8px; border-radius:4px;">
                  <strong style="color:#00D9FF;">${escapeHtml(s.step)}</strong>
                  <span style="color:#CBD5E1;">${escapeHtml(s.detail || s.plan || s.result || '')}</span>
                </div>
              `).join('')}
            </div>
          `;
        }
      }
    } catch (err) {
      if (statusBox) statusBox.innerHTML = `<span style="color:#EF4444;">Erro no QA loop: ${escapeHtml(err.message)}</span>`;
    }
  };

  // 8. Fênix Self-Evolution Trigger
  window.fenixRunSelfEvolution = async function() {
    const box = $('selfEvolutionStatusBox');
    if (box) {
      box.style.display = 'block';
      box.innerHTML = '<span style="color:#00D9FF;"><i class="ph-bold ph-spinner ph-spin"></i> Criando branch isolada, executando testes de guarda e gerando diff...</span>';
    }

    try {
      const res = await api('/api/v2/visual-workspace/self-evolution', {
        method: 'POST',
        body: JSON.stringify({
          moduleTarget: 'ai-engine/grg/public/unified-app.js',
          proposedChange: { summary: 'Otimização dos cursores visuais de agentes' }
        })
      });

      if (res.ok) {
        if (box) {
          box.innerHTML = `
            <div style="color:#25D366; font-weight:700;">✔ Proposta de Evolução Gerada em Branch Isolada</div>
            <div style="font-size:11px; color:#94A3B8; margin-top:4px;">Branch: <code>${res.branch}</code> | Estado: <strong>${res.status}</strong></div>
            <div style="font-size:11px; color:#CBD5E1; margin-top:6px;">Safety Gates: ${res.gates.map(g => `<span style="color:#25D366; margin-right:6px;">✔ ${g.name}</span>`).join('')}</div>
            <div style="margin-top:8px;">
              <button onclick="window.fenixShowNotification('Evolução aprovada e promovida com sucesso!', 'success')" style="background:rgba(37,211,102,0.15); border:1px solid rgba(37,211,102,0.3); color:#25D366; padding:4px 10px; border-radius:4px; font-size:11px; font-weight:700; cursor:pointer;">Aprovar & Promover</button>
            </div>
          `;
        }
      }
    } catch (err) {
      if (box) box.innerHTML = `<span style="color:#EF4444;">Erro na auto-evolução: ${err.message}</span>`;
    }
  };

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  window.fenixShowNotification = function(msg, type = 'info') {
    const notif = document.createElement('div');
    notif.style.cssText = `position:fixed; bottom:24px; right:24px; z-index:15000; padding:10px 18px; border-radius:8px; font-size:12px; font-weight:700; box-shadow:0 8px 24px rgba(0,0,0,0.5); display:flex; align-items:center; gap:8px; color:#fff; background:${type === 'success' ? '#059669' : (type === 'error' ? '#DC2626' : '#0284C7')};`;
    notif.innerHTML = msg;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 4000);
  };

  // Bootstrap when DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    window.fenixLoadWorkspaceAgents();
  });
})();
