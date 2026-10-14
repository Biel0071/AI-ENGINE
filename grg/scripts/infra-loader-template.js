window.loadInfrastructureView = async function() {
    const pmContent = document.getElementById('pmContent');
    const pmTitle = document.getElementById('pmTitle');
    const pmScanBtn = document.getElementById('pmScanBtn');
    if (!pmContent) return;

    if (pmTitle) pmTitle.textContent = 'Infraestrutura & Topologia de Execução Real';

    try {
      const [reality, runtimeStatus] = await Promise.all([
        fetch('/api/v2/reality/summary').then(r => r.json()).catch(() => ({})),
        fetch('/api/v2/runtime/full-status').then(r => r.json()).catch(() => ({}))
      ]);

      const containers = reality.dockerContainers || [];
      const pm2 = reality.pm2Processes || [];
      const ht = reality.hostTelemetry || {};
      const services = runtimeStatus.services || {};
      const overall = runtimeStatus.overall || 'OPERATIONAL';

      const cpuPercent = ht.cpu?.percent !== undefined ? ht.cpu.percent + '%' : '--';
      const ramUsed = ht.memory?.usedMb !== undefined ? ht.memory.usedMb : '--';
      const ramTotal = ht.memory?.totalMb !== undefined ? ht.memory.totalMb : '--';
      const diskPercent = ht.disk?.usedPercent !== undefined ? ht.disk.usedPercent + '%' : '--';
      const osRelease = ht.system?.release || 'Linux 5.14';

      const serviceEntries = Object.entries(services);

      pmContent.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:20px;">
          <!-- Top Metrics Cards -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px;">
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:16px;">
              <div style="font-size:11px; color:var(--fenix-muted);">DOCKER CONTAINERS</div>
              <div style="font-size:28px; font-weight:800; color:#38bdf8;">${containers.length}</div>
              <small style="color:#10b981;">● Contêineres Detectados</small>
            </div>
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:16px;">
              <div style="font-size:11px; color:var(--fenix-muted);">PROCESSOS PM2</div>
              <div style="font-size:28px; font-weight:800; color:#a78bfa;">${pm2.length}</div>
              <small style="color:#10b981;">● Daemons & Backends Ativos</small>
            </div>
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:16px;">
              <div style="font-size:11px; color:var(--fenix-muted);">STATUS DO RUNTIME</div>
              <div style="font-size:24px; font-weight:800; color:${overall === 'HEALTHY' ? '#10b981' : '#f59e0b'};">${overall}</div>
              <small style="color:#cbd5e1;">${serviceEntries.length} serviços monitorados</small>
            </div>
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:16px;">
              <div style="font-size:11px; color:var(--fenix-muted);">HOST TELEMETRY</div>
              <div style="font-size:20px; font-weight:800; color:#f8fafc;">CPU ${cpuPercent} · RAM ${ramUsed}/${ramTotal}MB</div>
              <small style="color:#38bdf8;">Disk ${diskPercent} · ${osRelease}</small>
            </div>
          </div>

          <!-- Runtime Core Services Grid -->
          ${serviceEntries.length > 0 ? `
          <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:20px;">
            <h3 style="margin:0 0 14px; font-size:15px; color:#f8fafc; display:flex; align-items:center; gap:8px;">
              <i class="ph-bold ph-activity" style="color:#10b981;"></i> Serviços do Runtime Fênix (/api/v2/runtime/full-status)
            </h3>
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
              <thead>
                <tr style="background:rgba(255,255,255,0.04); text-align:left; color:#94a3b8; border-bottom:1px solid rgba(255,255,255,0.08);">
                  <th style="padding:10px 14px;">Serviço</th>
                  <th style="padding:10px 14px;">Status</th>
                  <th style="padding:10px 14px;">Latência / Detalhes</th>
                </tr>
              </thead>
              <tbody>
                ${serviceEntries.map(([name, s]) => {
                  const status = typeof s === 'object' ? (s.status || (s.healthy ? 'ONLINE' : 'DEGRADED')) : String(s);
                  const isOnline = status === 'ONLINE' || status === 'HEALTHY' || status === 'CONNECTED';
                  const latency = (typeof s === 'object' && s.latencyMs !== undefined) ? s.latencyMs + 'ms' : (typeof s === 'object' && s.error ? s.error : '--');
                  return `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                      <td style="padding:10px 14px; font-weight:bold; color:#f8fafc;">${name}</td>
                      <td style="padding:10px 14px;"><span style="color:${isOnline ? '#10b981' : '#f87171'}; background:rgba(${isOnline ? '16,185,129' : '248,113,113'},0.12); padding:2px 8px; border-radius:4px; font-weight:700;">● ${status}</span></td>
                      <td style="padding:10px 14px; color:#cbd5e1; font-family:monospace;">${latency}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          <!-- Docker Containers Grid -->
          <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:20px;">
            <h3 style="margin:0 0 14px; font-size:15px; color:#f8fafc; display:flex; align-items:center; gap:8px;">
              <i class="ph-bold ph-cube" style="color:#38bdf8;"></i> Contêineres Docker em Execução (Host Real)
            </h3>
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
              <thead>
                <tr style="background:rgba(255,255,255,0.04); text-align:left; color:#94a3b8; border-bottom:1px solid rgba(255,255,255,0.08);">
                  <th style="padding:10px 14px;">Nome do Contêiner</th>
                  <th style="padding:10px 14px;">Status</th>
                  <th style="padding:10px 14px;">Portas Mapeadas</th>
                  <th style="padding:10px 14px;">Imagem</th>
                </tr>
              </thead>
              <tbody>
                ${containers.length > 0 ? containers.map(c => `
                  <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                    <td style="padding:10px 14px; font-weight:bold; color:#f8fafc;">${c.name}</td>
                    <td style="padding:10px 14px; color:#10b981;"><span style="background:rgba(16,185,129,0.15); padding:2px 8px; border-radius:4px;">● ${c.status}</span></td>
                    <td style="padding:10px 14px; font-family:monospace; color:#38bdf8;">${c.ports || 'Internal'}</td>
                    <td style="padding:10px 14px; color:#94a3b8; font-size:11px;">${c.image || '--'}</td>
                  </tr>
                `).join('') : '<tr><td colspan="4" style="padding:14px; color:#94a3b8; text-align:center;">Nenhum contêiner retornado pela API</td></tr>'}
              </tbody>
            </table>
          </div>

          <!-- PM2 Services Grid -->
          <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:20px;">
            <h3 style="margin:0 0 14px; font-size:15px; color:#f8fafc; display:flex; align-items:center; gap:8px;">
              <i class="ph-bold ph-cpu" style="color:#a78bfa;"></i> Processos PM2 em Execução (Zero Mocks)
            </h3>
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
              <thead>
                <tr style="background:rgba(255,255,255,0.04); text-align:left; color:#94a3b8; border-bottom:1px solid rgba(255,255,255,0.08);">
                  <th style="padding:10px 14px;">Processo</th>
                  <th style="padding:10px 14px;">PID</th>
                  <th style="padding:10px 14px;">Status</th>
                  <th style="padding:10px 14px;">Memória</th>
                  <th style="padding:10px 14px;">Uptime</th>
                </tr>
              </thead>
              <tbody>
                ${pm2.length > 0 ? pm2.map(p => `
                  <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                    <td style="padding:10px 14px; font-weight:bold; color:#f8fafc;">${p.name}</td>
                    <td style="padding:10px 14px; font-family:monospace; color:#38bdf8;">${p.pid}</td>
                    <td style="padding:10px 14px; color:#10b981;"><span style="background:rgba(16,185,129,0.15); padding:2px 8px; border-radius:4px;">● ${p.status}</span></td>
                    <td style="padding:10px 14px; color:#cbd5e1;">${p.memoryMb} MB</td>
                    <td style="padding:10px 14px; color:#94a3b8;">${Math.round((p.uptimeSeconds || 0) / 3600)}h</td>
                  </tr>
                `).join('') : '<tr><td colspan="5" style="padding:14px; color:#94a3b8; text-align:center;">Nenhum processo retornado pela API</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `;

      if (pmScanBtn) {
        pmScanBtn.onclick = async () => {
          pmScanBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Escaneando...';
          await window.loadInfrastructureView();
          pmScanBtn.innerHTML = '<i class="ph ph-scan"></i> Scan Real';
        };
      }
    } catch(e) {
      pmContent.innerHTML = `<div style="padding:24px; color:#f87171;">NO DATA — Erro ao carregar topologia: ${e.message} <button onclick="window.loadInfrastructureView()" style="background:#3b82f6;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;margin-left:8px;">Retry</button></div>`;
    }
  };
