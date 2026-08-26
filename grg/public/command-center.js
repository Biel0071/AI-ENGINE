(function() {
  function renderPanels() {
    // 3. AGENTS
    const cmdAgents = document.getElementById('cmdAgentsContainer');
    if (cmdAgents) {
      cmdAgents.innerHTML = 
        <div style="padding: 10px; font-size: 12px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px;">
            <div style="display: flex; align-items: center; gap: 8px;"><img src="https://ui-avatars.com/api/?name=Vitoria&background=random" style="width:24px; border-radius:50%"> <b>Vitória</b></div>
            <span style="color: var(--green); font-size: 10px;">WORKING</span>
            <span>CPU 45%</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px;">
            <div style="display: flex; align-items: center; gap: 8px;"><img src="https://ui-avatars.com/api/?name=Qwen&background=random" style="width:24px; border-radius:50%"> <b>QWEN</b></div>
            <span style="color: var(--accent); font-size: 10px;">THINKING</span>
            <span>CPU 89%</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px;">
            <div style="display: flex; align-items: center; gap: 8px;"><img src="https://ui-avatars.com/api/?name=Jarvis&background=random" style="width:24px; border-radius:50%"> <b>Jarvis</b></div>
            <span style="color: #888; font-size: 10px;">IDLE</span>
            <span>CPU 2%</span>
          </div>
        </div>
      ;
    }

    // 4. RUNTIME
    const cmdRuntime = document.getElementById('cmdRuntimeContainer');
    if (cmdRuntime) {
      cmdRuntime.innerHTML = 
        <div style="padding: 10px; font-size: 11px; height: 100%; display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; gap: 10px; justify-content: space-between; text-align: center;">
            <div style="flex: 1; background: rgba(0,0,0,0.3); padding: 5px; border-radius: 4px;"><b>EVENTS/SEC</b><br><span style="font-size:16px; color:#fff">142</span></div>
            <div style="flex: 1; background: rgba(0,0,0,0.3); padding: 5px; border-radius: 4px;"><b>JOBS/SEC</b><br><span style="font-size:16px; color:#fff">8.4</span></div>
            <div style="flex: 1; background: rgba(0,0,0,0.3); padding: 5px; border-radius: 4px;"><b>LATENCY</b><br><span style="font-size:16px; color:var(--green)">24ms</span></div>
          </div>
          <div style="flex: 1; border: 1px dashed #333; display: flex; align-items: center; justify-content: center; color: #555;">
            [TELEMETRY GRAPH]
          </div>
        </div>
      ;
    }

    // 5. PROJECTS
    const cmdProjects = document.getElementById('cmdProjectsContainer');
    if (cmdProjects) {
      cmdProjects.innerHTML = 
        <div style="padding: 10px; font-size: 11px;">
          <table style="width: 100%; text-align: left; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #333; color: #888;">
              <th style="padding: 4px;">PROJECT</th>
              <th style="padding: 4px;">STATUS</th>
              <th style="padding: 4px;">AGENTS</th>
            </tr>
            <tr>
              <td style="padding: 6px 4px; color: #fff;">FÊNIX OS Core</td>
              <td style="padding: 6px 4px; color: var(--green);">ATIVO</td>
              <td style="padding: 6px 4px;">3</td>
            </tr>
            <tr>
              <td style="padding: 6px 4px; color: #fff;">AI City Engine</td>
              <td style="padding: 6px 4px; color: var(--green);">ATIVO</td>
              <td style="padding: 6px 4px;">2</td>
            </tr>
            <tr>
              <td style="padding: 6px 4px; color: #fff;">Memory Fabric 2.0</td>
              <td style="padding: 6px 4px; color: var(--accent);">BUILDING</td>
              <td style="padding: 6px 4px;">1</td>
            </tr>
          </table>
        </div>
      ;
    }

    // 6. MEMORY
    const cmdMemory = document.getElementById('cmdMemoryContainer');
    if (cmdMemory) {
      cmdMemory.innerHTML = 
        <div style="padding: 10px; font-size: 11px; height: 100%; display: flex; flex-direction: column;">
          <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            <div style="color: #888;">MEMORIES: <b style="color:#fff">15.2K</b></div>
            <div style="color: #888;">VECTORS: <b style="color:#fff">2.1M</b></div>
          </div>
          <div style="flex: 1; border: 1px dashed #333; display: flex; align-items: center; justify-content: center; color: #555;">
            [MEMORY DAG VISUALIZATION]
          </div>
        </div>
      ;
    }

    // 7. KNOWLEDGE
    const cmdKnowledge = document.getElementById('cmdKnowledgeContainer');
    if (cmdKnowledge) {
      cmdKnowledge.innerHTML = \<div style="padding: 10px; font-size: 11px; height:100%; display:flex; align-items:center; justify-content:center; color:#555; border:1px dashed #333; margin:10px; box-sizing:border-box;">[KNOWLEDGE GRAPH]</div>\;
    }

    // 8. OBSERVABILITY
    const cmdObs = document.getElementById('cmdObservabilityContainer');
    if (cmdObs) {
      cmdObs.innerHTML = \<div style="padding: 10px; font-size: 11px; height:100%; display:flex; align-items:center; justify-content:center; color:#555; border:1px dashed #333; margin:10px; box-sizing:border-box;">[SYSTEM MONITORING]</div>\;
    }

    // 9. MCP HUB
    const cmdMcp = document.getElementById('cmdMcpContainer');
    if (cmdMcp) {
      cmdMcp.innerHTML = \<div style="padding: 10px; font-size: 11px; height:100%; display:flex; align-items:center; justify-content:center; color:#555; border:1px dashed #333; margin:10px; box-sizing:border-box;">[MCP CONNECTORS]</div>\;
    }

    // 10. BROWSER QA
    const cmdQa = document.getElementById('cmdQaContainer');
    if (cmdQa) {
      cmdQa.innerHTML = \<div style="padding: 10px; font-size: 11px; height:100%; display:flex; align-items:center; justify-content:center; color:#555; border:1px dashed #333; margin:10px; box-sizing:border-box;">[PLAYWRIGHT RESULTS]</div>\;
    }
  }

  // Auto-render when DOM is ready
  window.addEventListener('DOMContentLoaded', renderPanels);
})();
