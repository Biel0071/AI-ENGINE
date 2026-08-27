/**
 * FENIX OS - Visual IDE & Project Mirror (Fases C, D, E)
 * This file adds the Visual Engineering Environment capabilities to the FENIX OS.
 */

(function () {
  const $ = (id) => document.getElementById(id);
  const api = window.FENIX?.api || (async (path, opt) => fetch(path, opt).then(r => r.json()));

  // ==========================================
  // FASE C: PROJECT MIRROR & SCREEN GALLERY
  // ==========================================
  
  let projectSnapshot = null;

  async function loadProjectMirror() {
    try {
      const pmContent = $('pmContent');
      if (!pmContent) return;
      pmContent.innerHTML = '<div style="padding: 40px; text-align: center;"><i class="ph ph-spinner ph-spin" style="font-size: 32px;"></i><p>Scanning Active Project...</p></div>';
      
      projectSnapshot = await api('/project-mirror');
      
      // Auto-load Overview
      renderProjectSection('overview');
    } catch (e) {
      if ($('pmContent')) $('pmContent').innerHTML = `<div style="color: var(--danger);">Error loading Project Mirror: ${e.message}</div>`;
    }
  }

  function renderProjectSection(section) {
    if (!projectSnapshot) return;
    
    // Update nav highlights
    document.querySelectorAll('.pm-nav-item').forEach(el => el.classList.remove('active'));
    const activeNav = document.querySelector(`.pm-nav-item[data-pm="${section}"]`);
    if (activeNav) activeNav.classList.add('active');

    const pmContent = $('pmContent');
    const pmTitle = $('pmTitle');

    if (section === 'overview') {
      pmTitle.textContent = 'Project Overview';
      pmContent.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
          <div style="background: var(--bg-surface); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">
             <div style="font-size: 12px; color: var(--text-muted);">Total Files</div>
             <div style="font-size: 24px; font-weight: bold;">${projectSnapshot.files?.total || '--'}</div>
          </div>
          <div style="background: var(--bg-surface); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">
             <div style="font-size: 12px; color: var(--text-muted);">APIs Discovered</div>
             <div style="font-size: 24px; font-weight: bold;">${projectSnapshot.apis?.length || '--'}</div>
          </div>
          <div style="background: var(--bg-surface); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">
             <div style="font-size: 12px; color: var(--text-muted);">Screens Found</div>
             <div style="font-size: 24px; font-weight: bold;">${projectSnapshot.screens?.length || '--'}</div>
          </div>
        </div>
        <div style="background: var(--bg-surface); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">
           <h3>Active Source</h3>
           <p style="font-family: monospace; margin-top: 8px; color: var(--text-muted);">${projectSnapshot.path}</p>
        </div>
      `;
    } else if (section === 'screens') {
      pmTitle.textContent = 'Screen Gallery';
      const screens = projectSnapshot.screens || [];
      if (screens.length === 0) {
        pmContent.innerHTML = `<p>No UI screens discovered yet.</p>`;
        return;
      }

      let html = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;">`;
      screens.forEach(s => {
        html += `
          <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; cursor: pointer; transition: transform 0.2s;" onclick="window.showScreenDetail('${s.name}')">
            <div style="height: 160px; background: var(--bg-base); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: center;">
              <i class="ph ph-browser" style="font-size: 48px; color: var(--text-muted);"></i>
              <!-- Real preview could be rendered here -->
            </div>
            <div style="padding: 16px;">
              <h4 style="margin: 0; font-size: 16px;">${s.name}</h4>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--text-muted); font-family: monospace;">${s.path || s.file}</p>
            </div>
          </div>
        `;
      });
      html += `</div>`;
      pmContent.innerHTML = html;
    } else if (section === 'apis') {
      pmTitle.textContent = 'API Registry';
      const apis = projectSnapshot.apis || [];
      let html = `<div style="display: flex; flex-direction: column; gap: 8px;">`;
      apis.forEach(a => {
        html += `
          <div style="background: var(--bg-surface); padding: 12px 16px; border-radius: 6px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="color: var(--primary);">${a.method}</strong> <span style="font-family: monospace; margin-left: 8px;">${a.path}</span>
            </div>
            <div style="font-size: 12px; color: var(--text-muted);">${a.file}</div>
          </div>
        `;
      });
      html += `</div>`;
      pmContent.innerHTML = html;
    } else if (section === 'graph') {
      pmTitle.textContent = 'Architecture Graph';
      pmContent.innerHTML = `
        <div style="height: 600px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-surface); position: relative;">
           <div id="visNetworkContainer" style="width: 100%; height: 100%;"></div>
           <div style="position: absolute; top: 16px; right: 16px; background: var(--bg-base); padding: 12px; border-radius: 8px; border: 1px solid var(--border); width: 250px; font-size: 12px;" id="graphDetails">
              Select a node to view details.
           </div>
        </div>
      `;
      setTimeout(renderArchitectureGraph, 100);
    } else if (section === 'runtime') {
      pmTitle.textContent = 'Runtime Status';
      pmContent.innerHTML = '<div style="padding: 40px; text-align: center;"><i class="ph ph-spinner ph-spin" style="font-size: 32px;"></i></div>';
      setTimeout(renderRuntimeStatus, 100);
    } else {
      pmTitle.textContent = section.toUpperCase();
      pmContent.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-muted);">Detailed view for ${section} is under construction in this vertical slice.</div>`;
    }
  }

  // ==========================================
  // FASE F: ARCHITECTURE & RUNTIME GRAPH
  // ==========================================

  async function renderArchitectureGraph() {
    const container = document.getElementById('visNetworkContainer');
    if (!container || !window.vis) return;

    try {
      const status = await api('/v2/system/status');
      
      const nodes = new vis.DataSet([
        { id: 1, label: 'FÊNIX API\n(Orchestrator)', shape: 'box', color: '#3b82f6' },
        { id: 2, label: 'ExecutiveBrain', shape: 'ellipse', color: '#6366f1' },
        { id: 3, label: 'MissionKernel', shape: 'ellipse', color: '#6366f1' },
        { id: 4, label: 'PostgreSQL\n(State Store)', shape: 'database', color: (status.postgres?.ok ? '#10b981' : '#ef4444') },
        { id: 5, label: 'Redis / BullMQ\n(Queue)', shape: 'cylinder', color: (status.bullmq?.ok ? '#10b981' : '#ef4444') },
        { id: 6, label: 'Worker Pool\n(' + (status.workers?.connected || 0) + ' active)', shape: 'box', color: (status.workers?.connected > 0 ? '#10b981' : '#f59e0b') },
        { id: 7, label: 'AI Layer', shape: 'ellipse', color: '#8b5cf6' },
        { id: 8, label: 'AI Platform', shape: 'box', color: (status.aiPlatform?.ok ? '#10b981' : '#ef4444') },
        { id: 9, label: 'Qwen 2.5:3b', shape: 'ellipse', color: (status.aiPlatform?.ok ? '#10b981' : '#ef4444') },
        { id: 10, label: 'IDE / MCP', shape: 'box', color: '#eab308' },
      ]);

      const edges = new vis.DataSet([
        { from: 10, to: 1, label: 'MCP / REST' },
        { from: 1, to: 2 },
        { from: 1, to: 3 },
        { from: 1, to: 4, label: 'state' },
        { from: 1, to: 5, label: 'jobs' },
        { from: 2, to: 5 },
        { from: 3, to: 5 },
        { from: 5, to: 6, label: 'consume' },
        { from: 6, to: 4, label: 'update state' },
        { from: 6, to: 7 },
        { from: 7, to: 8 },
        { from: 8, to: 9, label: 'LLM calls' }
      ]);

      const data = { nodes: nodes, edges: edges };
      const options = {
        nodes: { font: { color: '#ffffff' }, borderWidth: 2, shadow: true },
        edges: { color: '#6b7280', arrows: 'to', font: { color: '#9ca3af', size: 10 } },
        physics: { hierarchicalRepulsion: { nodeDistance: 150 } },
        layout: { hierarchical: { direction: 'UD', sortMethod: 'directed', levelSeparation: 100 } }
      };

      const network = new vis.Network(container, data, options);
      
      network.on("selectNode", function (params) {
        const nodeId = params.nodes[0];
        const details = document.getElementById('graphDetails');
        if (!details) return;
        
        let html = '<b>' + nodes.get(nodeId).label.replace('\\n', ' ') + '</b><hr style="border-color: var(--border); margin: 8px 0;">';
        if (nodeId === 4) html += 'Status: ' + (status.postgres?.ok ? 'ONLINE' : 'OFFLINE');
        else if (nodeId === 5) html += 'Status: ' + (status.bullmq?.ok ? 'ONLINE' : 'OFFLINE') + '<br>Waiting: ' + (status.bullmq?.waiting || 0) + '<br>Active: ' + (status.bullmq?.active || 0);
        else if (nodeId === 6) html += 'Connected: ' + (status.workers?.connected || 0) + '<br>Queue: ' + status.workers?.queue;
        else if (nodeId === 8) html += 'Status: ' + (status.aiPlatform?.ok ? 'ONLINE' : 'OFFLINE');
        else html += 'Core System Component';
        
        details.innerHTML = html;
      });

    } catch (e) {
      container.innerHTML = `<div style="padding: 24px; color: var(--danger);">Failed to load architecture graph: ${e.message}</div>`;
    }
  }

  async function renderRuntimeStatus() {
    try {
      const status = await api('/v2/system/status');
      const pmContent = $('pmContent');
      
      const renderItem = (name, isOk, extra) => `
        <div style="background: var(--bg-surface); padding: 16px; border-radius: 8px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 12px; height: 12px; border-radius: 50%; background: ${isOk ? 'var(--success)' : 'var(--danger)'}; box-shadow: 0 0 8px ${isOk ? 'var(--success)' : 'var(--danger)'};"></div>
            <strong>${name}</strong>
          </div>
          <div style="font-size: 12px; color: var(--text-muted);">${isOk ? 'ONLINE' : 'OFFLINE / DEGRADED'} ${extra ? `&bull; ${extra}` : ''}</div>
        </div>
      `;

      pmContent.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto;">
          ${renderItem('FÊNIX API', status.api?.ok, 'Port: 4400')}
          ${renderItem('PostgreSQL', status.postgres?.ok, 'State Store')}
          ${renderItem('Redis / BullMQ', status.bullmq?.ok, `Jobs Waiting: ${status.bullmq?.waiting || 0}`)}
          ${renderItem('Worker Pool', status.workers?.connected > 0, `Connected: ${status.workers?.connected || 0}`)}
          ${renderItem('AI Platform', status.aiPlatform?.ok, 'Qwen Provider')}
          
          <h3 style="margin-top: 32px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">Job Activity</h3>
          <pre style="background: var(--bg-surface); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">${JSON.stringify(status.runtime?.jobs || {}, null, 2)}</pre>
        </div>
      `;
    } catch (e) {
      if ($('pmContent')) $('pmContent').innerHTML = `<div style="padding: 24px; color: var(--danger);">Failed to load runtime status: ${e.message}</div>`;
    }
  }

  window.showScreenDetail = async function(name) {
    const pmContent = $('pmContent');
    pmContent.innerHTML = '<div style="padding: 40px; text-align: center;"><i class="ph ph-spinner ph-spin" style="font-size: 32px;"></i></div>';
    try {
      const data = await api(`/project-mirror/screen/${encodeURIComponent(name)}`);
      const screen = data.screen;
      
      let html = `
        <div style="display: flex; gap: 24px; height: 100%;">
          <div style="flex: 2; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-base); display: flex; flex-direction: column;">
            <div style="padding: 12px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between;">
              <span style="font-weight: 500;">Visual Preview</span>
              <span style="font-family: monospace; font-size: 12px; color: var(--text-muted);">${screen.path}</span>
            </div>
            <div style="flex: 1; display: flex; align-items: center; justify-content: center; position: relative;">
              <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(59,130,246,0.05); pointer-events: none;"></div>
              <p style="color: var(--text-muted); text-align: center;">
                <i class="ph ph-browser" style="font-size: 64px;"></i><br>
                Interactive preview maps to:<br>
                <strong>${screen.file}</strong>
              </p>
            </div>
          </div>
          
          <div style="flex: 1; display: flex; flex-direction: column; gap: 16px;">
            <div style="background: var(--bg-surface); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">
              <h4 style="margin-top: 0;">Components</h4>
              <ul style="padding-left: 20px; font-family: monospace; font-size: 12px; margin-bottom: 0;">
                ${(screen.components || []).map(c => `<li>${c}</li>`).join('')}
              </ul>
            </div>
            
            <div style="background: var(--bg-surface); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">
              <h4 style="margin-top: 0;">APIs (Dependencies)</h4>
              <ul style="padding-left: 20px; font-family: monospace; font-size: 12px; margin-bottom: 0;">
                ${(data.relatedApis || []).map(a => `<li>${a.method} ${a.path}</li>`).join('')}
                ${(data.relatedApis || []).length === 0 ? '<li style="color: var(--text-muted); list-style: none;">None detected explicitly</li>' : ''}
              </ul>
            </div>
            
            <button class="btn-primary" onclick="alert('Sending Context to Chat...')">Edit Screen with AI</button>
          </div>
        </div>
      `;
      
      $('pmTitle').innerHTML = `<span style="cursor: pointer; color: var(--text-muted);" onclick="window.renderProjectSection('screens')">Screens</span> / ${screen.name}`;
      pmContent.innerHTML = html;
    } catch (e) {
      pmContent.innerHTML = `<div style="color: var(--danger);">Error loading screen detail: ${e.message}</div>`;
    }
  };

  // Bind Sidebar Nav
  document.addEventListener('FENIX_READY', () => {
    document.querySelectorAll('.pm-nav-item').forEach(el => {
      el.addEventListener('click', (e) => {
        renderProjectSection(e.currentTarget.dataset.pm);
      });
    });
    
    const pmScanBtn = $('pmScanBtn');
    if (pmScanBtn) {
      pmScanBtn.addEventListener('click', async () => {
        pmScanBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Scanning...';
        await api('/project-mirror/scan', { method: 'POST', body: JSON.stringify({}) });
        await loadProjectMirror();
        pmScanBtn.innerHTML = '<i class="ph ph-scan"></i> Scan Real';
      });
    }

    // Auto load when project view is opened
    document.querySelector('[data-view="project"]')?.addEventListener('click', () => {
      if (!projectSnapshot) loadProjectMirror();
    });
  });


  // ==========================================
  // FASE E: CHAT -> JOB REAL
  // ==========================================

  // We override the global runChat function to submit Jobs instead of autonomous cycles
  window.runChat = async function (message) {
    const value = String(message || '').trim();
    if (!value) return;
    
    // Bubble UI
    if (typeof bubble === 'function') bubble(value, 'user');
    
    const chatLog = $('chatLog');
    const pendingId = 'pipe-' + Date.now();
    const pending = document.createElement('div');
    pending.id = pendingId;
    pending.className = 'chat-bubble system'; // assuming style for system messages
    pending.innerHTML = `
      <div class="chat-text-wrapper" style="border-left: 3px solid var(--primary); padding-left: 12px; margin-bottom: 12px;">
        <strong style="color: var(--primary);">SYSTEM: FÊNIX JOB ENGINE</strong>
        <div class="chat-text">
          <i class="ph ph-spinner ph-spin"></i> Analyzing intent & creating Job in BullMQ...
        </div>
      </div>
    `;
    if (chatLog) {
      chatLog.appendChild(pending);
      chatLog.scrollTop = chatLog.scrollHeight;
    }

    try {
      // 1. Send Prompt to create a Job
      const jobRes = await api('/v2/jobs', {
        method: 'POST',
        body: JSON.stringify({
          prompt: value,
          type: 'development.execute',
          source: 'fenix-chat',
          workspace: window.state?.currentFilePath || (projectSnapshot ? projectSnapshot.path : undefined)
        })
      });

      // 2. Job Created - transition to Job Timeline view
      pending.innerHTML = `
        <div class="chat-text-wrapper" style="border-left: 3px solid var(--success); padding-left: 12px; margin-bottom: 12px;">
          <strong style="color: var(--success);">JOB QUEUED [${jobRes.jobId}]</strong>
          <div class="chat-text" style="margin-top: 8px;">
            The Job has been successfully queued to the workers.<br>
            <button class="btn-primary-sm" style="margin-top: 8px;" onclick="window.openJobTimeline('${jobRes.jobId}')">View Job Timeline</button>
          </div>
        </div>
      `;
    } catch (e) {
      pending.innerHTML = `
        <div class="chat-text-wrapper" style="border-left: 3px solid var(--danger); padding-left: 12px; margin-bottom: 12px;">
          <strong style="color: var(--danger);">ERROR CREATING JOB</strong>
          <div class="chat-text" style="margin-top: 8px;">${e.message}</div>
        </div>
      `;
    }
  };


  // ==========================================
  // FASE D: JOB CENTER VISUAL & TIMELINE
  // ==========================================

  window.openJobTimeline = async function(jobId) {
    // Switch to Project View -> Jobs tab
    const projectBtn = document.querySelector('[data-view="project"]');
    if (projectBtn) projectBtn.click();
    
    renderProjectSection('jobs');
    
    const pmContent = $('pmContent');
    $('pmTitle').innerHTML = `Job Timeline: <span style="font-family: monospace;">${jobId}</span>`;
    pmContent.innerHTML = '<div style="padding: 40px; text-align: center;"><i class="ph ph-spinner ph-spin" style="font-size: 32px;"></i></div>';

    // Start polling the job status
    pollJobTimeline(jobId);
  };

  async function pollJobTimeline(jobId) {
    const pmContent = $('pmContent');
    let isActive = true;
    
    // Cleanup old polling if any
    if (window._currentJobPoll) clearInterval(window._currentJobPoll);

    async function fetchRender() {
      if (!document.getElementById('view-project').classList.contains('active')) return;
      if ($('pmTitle').innerText.indexOf(jobId) === -1) {
        isActive = false;
        clearInterval(window._currentJobPoll);
        return;
      }

      try {
        const [job, eventsRes] = await Promise.all([
          api(`/v2/jobs/${jobId}`),
          api(`/v2/jobs/${jobId}/events`)
        ]);

        const events = eventsRes.events || [];
        
        let statusColor = 'var(--text-muted)';
        if (job.status === 'RUNNING') statusColor = 'var(--primary)';
        if (job.status === 'SUCCEEDED') statusColor = 'var(--success)';
        if (job.status === 'FAILED') statusColor = 'var(--danger)';
        if (job.status === 'AWAITING_APPROVAL') statusColor = 'var(--warning)';

        let html = `
          <div style="display: flex; gap: 24px; max-width: 1200px; margin: 0 auto;">
            
            <div style="flex: 1; min-width: 300px;">
              <div style="background: var(--bg-surface); padding: 24px; border-radius: 8px; border: 1px solid var(--border); position: sticky; top: 24px;">
                <h3 style="margin-top: 0;">Job Context</h3>
                <div style="margin-bottom: 16px;">
                  <div style="font-size: 12px; color: var(--text-muted);">Status</div>
                  <div style="font-size: 16px; font-weight: bold; color: ${statusColor};">${job.status}</div>
                </div>
                <div style="margin-bottom: 16px;">
                  <div style="font-size: 12px; color: var(--text-muted);">Prompt</div>
                  <div style="font-size: 14px; background: var(--bg-base); padding: 8px; border-radius: 4px; margin-top: 4px;">${job.payload?.prompt || '--'}</div>
                </div>
                <div style="margin-bottom: 16px;">
                  <div style="font-size: 12px; color: var(--text-muted);">Worker ID</div>
                  <div style="font-family: monospace; font-size: 12px;">${job.workerId || 'Pending Allocation'}</div>
                </div>
                
                ${job.status === 'AWAITING_APPROVAL' ? `
                  <div style="margin-top: 24px; padding: 16px; background: rgba(234,179,8,0.1); border: 1px solid var(--warning); border-radius: 8px;">
                    <h4 style="margin-top: 0; color: var(--warning);">Approval Required</h4>
                    <p style="font-size: 12px; margin-bottom: 16px;">This job requires manual approval to proceed with high-risk operations.</p>
                    <div style="display: flex; gap: 8px;">
                      <button class="btn-primary-sm" style="background: var(--success);" onclick="window.approveJob('${jobId}')">Approve</button>
                      <button class="btn-ghost" style="color: var(--danger);" onclick="window.rejectJob('${jobId}')">Reject</button>
                    </div>
                  </div>
                ` : ''}
              </div>
            </div>

            <div style="flex: 2;">
              <h3 style="margin-top: 0;">Timeline</h3>
              <div style="position: relative; padding-left: 24px;">
                <div style="position: absolute; left: 7px; top: 12px; bottom: 0; width: 2px; background: var(--border);"></div>
                
                ${events.length === 0 ? '<p style="color: var(--text-muted);">Waiting for worker events...</p>' : ''}
                
                ${events.map(ev => {
                  let icon = 'ph-check-circle';
                  let color = 'var(--text-muted)';
                  
                  if (ev.type === 'started') { icon = 'ph-play-circle'; color = 'var(--primary)'; }
                  if (ev.type === 'progress') { icon = 'ph-arrows-clockwise ph-spin'; color = 'var(--primary)'; }
                  if (ev.type === 'completed') { icon = 'ph-check-circle-fill'; color = 'var(--success)'; }
                  if (ev.type === 'failed') { icon = 'ph-x-circle-fill'; color = 'var(--danger)'; }
                  if (ev.type === 'ai_request') { icon = 'ph-cpu'; color = 'var(--info)'; }
                  
                  return `
                    <div style="position: relative; margin-bottom: 24px;">
                      <div style="position: absolute; left: -24px; top: 0px; background: var(--bg-base); border-radius: 50%; padding: 2px;">
                        <i class="ph ${icon}" style="font-size: 20px; color: ${color}; background: var(--bg-surface); border-radius: 50%;"></i>
                      </div>
                      <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-left: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                          <strong style="font-size: 14px;">${ev.message || ev.type}</strong>
                          <span style="font-size: 11px; color: var(--text-muted);">${new Date(ev.timestamp).toLocaleTimeString()}</span>
                        </div>
                        ${ev.details ? `<pre style="margin: 0; padding: 8px; background: var(--bg-base); border-radius: 4px; font-size: 11px; max-height: 200px; overflow: auto;">${JSON.stringify(ev.details, null, 2)}</pre>` : ''}
                      </div>
                    </div>
                  `;
                }).join('')}
                
                ${job.status === 'RUNNING' ? `
                  <div style="position: relative; margin-bottom: 24px; opacity: 0.7;">
                      <div style="position: absolute; left: -24px; top: 0px; background: var(--bg-base); border-radius: 50%; padding: 2px;">
                        <i class="ph ph-spinner ph-spin" style="font-size: 20px; color: var(--primary); background: var(--bg-surface); border-radius: 50%;"></i>
                      </div>
                      <div style="margin-left: 12px; padding-top: 2px;">
                        <span style="font-size: 14px; color: var(--text-muted); font-style: italic;">Awaiting next event...</span>
                      </div>
                  </div>
                ` : ''}
              </div>
            </div>
            
          </div>
        `;
        
        pmContent.innerHTML = html;
        
        if (job.status === 'SUCCEEDED' || job.status === 'FAILED' || job.status === 'CANCELLED') {
          isActive = false;
          clearInterval(window._currentJobPoll);
        }
        
      } catch (e) {
        console.error("Job poll error", e);
      }
    }

    fetchRender();
    window._currentJobPoll = setInterval(() => {
      if (isActive) fetchRender();
    }, 2000); // Fast 2s polling for real-time feel
  };

  window.approveJob = async function(jobId) {
    if (!confirm('Are you sure you want to approve this job to proceed?')) return;
    try {
      await api(`/v2/jobs/${jobId}/approve`, { method: 'POST' });
      alert('Job approved.');
    } catch (e) {
      alert('Error approving: ' + e.message);
    }
  };

  window.rejectJob = async function(jobId) {
    const reason = prompt('Reason for rejection:');
    if (reason === null) return;
    try {
      await api(`/v2/jobs/${jobId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
      alert('Job rejected.');
    } catch (e) {
      alert('Error rejecting: ' + e.message);
    }
  };

})();
