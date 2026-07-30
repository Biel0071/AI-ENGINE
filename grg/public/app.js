let accessToken = localStorage.getItem('grg_token');
let redirectingToLogin = false;
if (!accessToken) location.replace('/GRG-login');

class FenixApiError extends Error {
  constructor(message, details = {}) { super(message); this.name = 'FenixApiError'; Object.assign(this, details); }
}
function clearSessionAndRedirect() {
  localStorage.removeItem('grg_token'); localStorage.removeItem('grg_user'); sessionStorage.removeItem('grg_refresh_token');
  if (!redirectingToLogin) { redirectingToLogin = true; location.replace('/GRG-login?reason=session-expired'); }
}
async function refreshAccessToken() {
  const refreshToken = sessionStorage.getItem('grg_refresh_token'); if (!refreshToken) return false;
  try {
    const configResponse = await fetch('/api/oidc/config'); const config = await configResponse.json();
    const body = new URLSearchParams({ grant_type:'refresh_token', client_id:config.clientId, refresh_token:refreshToken });
    const response = await fetch(config.tokenEndpoint, { method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'}, body }); const tokens = await response.json();
    if (!response.ok || !tokens.access_token) return false; accessToken = tokens.access_token; localStorage.setItem('grg_token', accessToken);
    if (tokens.refresh_token) sessionStorage.setItem('grg_refresh_token', tokens.refresh_token); return true;
  } catch { return false; }
}
const api = async (p, opts = {}, retried = false) => {
  const response = await fetch(`/api${p}`, { ...opts, headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json', ...(opts.headers || {}) } });
  if (response.status === 401 && !retried && await refreshAccessToken()) return api(p, opts, true);
  if (response.status === 401) { clearSessionAndRedirect(); throw new FenixApiError('Sessão expirada', { status: 401 }); }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new FenixApiError(payload.error || 'Falha na operação', { status: response.status, requestId: payload.requestId || response.headers.get('x-request-id'), correlationId: payload.correlationId || response.headers.get('x-correlation-id') });
  return payload;
};

const ui = Object.fromEntries(['fenix','avatarPhrase','avatarState','avatarLocation','avatarProgress','chatlog','msg','micBtn','ttsToggle','voiceSupport','missionStatus','missionTitle','missionMeta','missionPercent','missionBar','missionSteps','cityMap','citySummary','cityViewport','healthScore','healthList','timeline','jobCount','gatewayState','aiStats','systemMetrics','sidebarDot','sidebarStatus','sidebarDetail','actor','lastUpdate','nodeDialog','nodeTitle','nodeDetails','consoleMasterNode','consoleSpeedScore','consoleHotMemory','consoleMission','consoleJobs','connectorSummary','connectorList','multimodalBtn','multimodalDialog','closeMultimodal','multimodalForm','fileSelect','ingestResult'].map((id) => [id, document.getElementById(id)]));

// MISSION-0004 — conectores previstos mas ainda não implementados. Aparecem como PLANNED
// explícito no painel: o organismo diz "ainda não existe" em vez de simular CONNECTED. Só
// o GitHub é um conector real (vem do runtime); os demais são declaração de roadmap.
const PLANNED_CONNECTORS = ['google','meta','whatsapp','supabase','cloudflare','openai'];
const state = { city: null, missions: [], activeMission: null, operations: null, jobs: [], zoom: 1, speaking: false, refreshing: false };
const statusClass = (value) => ['ACTIVE','READY','RUNNING','SUCCEEDED'].includes(String(value).toUpperCase()) ? 'active' : ['WARNING','PAUSED','AWAITING_APPROVAL','UNCONFIGURED'].includes(String(value).toUpperCase()) ? 'warning' : ['DEGRADED','FAILED','NOT_READY','DEAD_LETTER'].includes(String(value).toUpperCase()) ? 'degraded' : 'neutral';
const escapeHtml = (value) => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const formatTime = (value) => { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.valueOf()) ? date.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) : '—'; };
const formatNumber = (value) => new Intl.NumberFormat('pt-BR',{notation:Number(value)>9999?'compact':'standard',maximumFractionDigits:2}).format(Number(value || 0));

function bubble(text, who = 'bot') {
  const div = document.createElement('div'); div.className = `bubble ${who}`;
  const safeText = typeof text === 'string' && text.trim() ? text : 'Resposta indisponível no momento.';
  const escaped = safeText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  div.innerHTML = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'); ui.chatlog.appendChild(div); ui.chatlog.scrollTop = ui.chatlog.scrollHeight;
}
function operatorError(error) { const reference = error && (error.correlationId || error.requestId); return `Não foi possível concluir a operação.${reference ? ` Referência: ${reference}` : ' Tente novamente em instantes.'}`; }
function showFallback(error) {
  console.error('fenix.ui.boundary', { name:error?.name, message:error?.message, correlationId:error?.correlationId || null }); let fallback = document.getElementById('runtimeFallback');
  if (!fallback) { fallback = document.createElement('div'); fallback.id = 'runtimeFallback'; fallback.className = 'runtime-fallback'; fallback.textContent = 'Uma área do FÊNIX encontrou uma falha e foi isolada. A operação principal continua disponível.'; document.body.prepend(fallback); setTimeout(() => fallback.remove(), 8000); }
}
window.addEventListener('error', (event) => showFallback(event.error || new Error(event.message)));
window.addEventListener('unhandledrejection', (event) => { event.preventDefault(); showFallback(event.reason); });

function setAvatar(data = {}) {
  const labels = { SLEEPING:'DORMINDO', SCANNING:'ESCANEANDO', WALKING:'CAMINHANDO', BUILDING:'CONSTRUINDO', PROGRAMMING:'PROGRAMANDO', LEARNING:'APRENDENDO', WAITING:'AGUARDANDO', RECOVERING:'RECUPERANDO', DEPLOYING:'IMPLANTANDO', CELEBRATING:'COMEMORANDO', PENSANDO:'PENSANDO', PLANEJANDO:'PLANEJANDO', CONVERSANDO:'CONVERSANDO', ANALISANDO:'ANALISANDO', LENDO:'LENDO', EXECUTANDO:'EXECUTANDO', CORRIGINDO:'CORRIGINDO', TESTANDO:'TESTANDO', OBSERVANDO:'OBSERVANDO' };
  const phrases = { SLEEPING:'Pronto para transformar seu próximo objetivo em missão.', SCANNING:'Descobrindo serviços e evidências do ecossistema.', WALKING:'Coordenando agentes pela cidade cognitiva.', BUILDING:'A Engineering Factory está construindo com governança.', PROGRAMMING:'Código em execução dentro do Runtime autorizado.', LEARNING:'Consolidando conhecimento baseado em evidências.', WAITING:'Aguardando contexto ou aprovação humana.', RECOVERING:'Verificando saúde e recuperando serviços permitidos.', DEPLOYING:'Acompanhando a implantação governada.', CELEBRATING:'Missão concluída e conhecimento registrado.' };
  const current = data.state || 'SLEEPING'; ui.fenix.dataset.state = current; ui.avatarState.textContent = labels[current] || current; ui.avatarLocation.textContent = data.building || 'Praça Central'; ui.avatarProgress.textContent = `${Number(data.progress || 0)}%`; ui.avatarPhrase.textContent = phrases[current] || phrases.SLEEPING;
}

// Le um envelope measured()/unknown() do contrato de medicao. Sem valor medido devolve
// null — nunca um numero inventado. O chamador decide o texto de ausencia (um traco), o
// que respeita a Regra 2: ausencia de medicao aparece como ausencia, nao como zero.
const measuredValue = (entry) => (entry && entry.state === 'measured' ? entry.value : null);

// A barra de console operacional. Antes era quatro literais congelados no HTML
// (98.4/100, L0-L5 PREWARMED, 15 NPCs, VPS ONLINE) ligados a IDs que nao existiam, entao
// nunca mudava. Agora cada campo reflete estado real; o que ainda nao se mede mostra "—".
function renderConsoleBar({ operations, speed, hotMemory, mission, jobs }) {
  const readiness = operations?.readiness;
  if (ui.consoleMasterNode) {
    ui.consoleMasterNode.textContent = readiness?.status || 'SEM READINESS';
    ui.consoleMasterNode.style.color = readiness?.status === 'READY' ? 'var(--green)' : readiness ? 'var(--red)' : 'var(--yellow)';
  }
  if (ui.consoleSpeedScore) {
    const score = measuredValue(speed?.overallScore);
    ui.consoleSpeedScore.textContent = score === null ? '— sem chamadas' : `${Number(score).toFixed(1)} / 100`;
  }
  if (ui.consoleHotMemory) {
    const active = measuredValue(hotMemory?.cachedItemsCount);
    ui.consoleHotMemory.textContent = active === null ? '— aguardando' : `${active} pré-aquecidas`;
  }
  if (ui.consoleMission) ui.consoleMission.textContent = mission ? `${mission.title} (${Number(mission.progress || 0)}%)` : 'SEM MISSÃO';
  if (ui.consoleJobs) ui.consoleJobs.textContent = String(jobs.length);
}

// MISSION-0004 — painel de conectores honesto. Estado vem DERIVADO do runtime
// (/api/connectors), nunca de configuração. CONNECTED só aparece se o runtime derivou
// CONNECTED (authenticate + selfTest reais). Conectores não implementados: PLANNED.
function renderConnectors(connectors) {
  if (!ui.connectorList) return;
  const real = Array.isArray(connectors?.connectors) ? connectors.connectors : [];
  const realIds = new Set(real.map((c) => c.connectorId));
  const rows = real.map((c) => {
    const st = c.state?.value || 'UNKNOWN';
    return { id: c.connectorId, state: st };
  });
  // Os previstos que não têm conector real ainda: PLANNED explícito.
  for (const id of PLANNED_CONNECTORS) if (!realIds.has(id)) rows.push({ id, state: 'PLANNED' });

  const connected = rows.filter((r) => r.state === 'CONNECTED').length;
  ui.connectorSummary.textContent = `${connected}/${rows.length} conectados`;
  const cls = (s) => s === 'CONNECTED' ? 'ACTIVE' : ['DEGRADED','ERROR','DISCONNECTED'].includes(s) ? 'DEGRADED' : 'WARNING';
  ui.connectorList.innerHTML = rows.map((r) =>
    `<div class="health-item ${cls(r.state)}"><i></i><b>${escapeHtml(r.id)}</b><span>${escapeHtml(r.state)}</span></div>`
  ).join('');
}

function renderMission(mission) {
  if (!mission) {
    ui.missionStatus.className='status-pill neutral'; ui.missionStatus.textContent='SEM MISSÃO'; ui.missionTitle.textContent='Aguardando objetivo'; ui.missionMeta.textContent='O Avatar transformará solicitações operacionais em missões governadas.'; ui.missionPercent.textContent='0%'; ui.missionBar.style.width='0%'; ui.missionSteps.innerHTML='';
    if (ui.consoleMission) ui.consoleMission.textContent = 'SEM MISSÃO';
    return;
  }
  const progress = Number(mission.progress || 0); ui.missionStatus.className=`status-pill ${statusClass(mission.status)}`; ui.missionStatus.textContent=mission.status; ui.missionTitle.textContent=mission.title; ui.missionMeta.textContent=`${mission.steps?.length || 0} etapas · criada ${formatTime(mission.createdAt)} · ${mission.id}`; ui.missionPercent.textContent=`${progress}%`; ui.missionBar.style.width=`${progress}%`;
  ui.missionSteps.innerHTML=(mission.steps || []).map((step)=>`<div class="step ${escapeHtml(step.status)}"><b>${escapeHtml(step.key)}</b>${escapeHtml(step.agent)} · ${escapeHtml(step.status)}</div>`).join('');
  if (ui.consoleMission) ui.consoleMission.textContent = `${mission.title} (${progress}%)`;
}
function renderCity(city) {
  state.city=city; const nodes=Array.isArray(city?.nodes)?city.nodes:[]; const districts=nodes.filter((n)=>n.type==='DISTRICT'); const buildings=nodes.filter((n)=>n.type==='BUILDING'); ui.citySummary.textContent=`${districts.length} distritos · ${buildings.length} prédios · ${city?.projection?.eventCount || 0} eventos`;
  if (!buildings.length) { ui.cityMap.innerHTML='<div class="empty-city"><b>A cidade está aguardando eventos reais.</b><br>Execute o Health Orchestrator ou uma missão para projetar os componentes.</div>'; return; }
  const groups=new Map(); for(const district of districts) groups.set(district.id,{district,buildings:[]}); for(const building of buildings){const group=groups.get(building.parentId); if(group) group.buildings.push(building); else {const key=`orphan:${building.parentId}`; if(!groups.has(key)) groups.set(key,{district:{label:'Operações'},buildings:[]}); groups.get(key).buildings.push(building);}}
  ui.cityMap.innerHTML=[...groups.values()].filter((g)=>g.buildings.length).map((group)=>`<div class="district" data-label="${escapeHtml(group.district.label)}">${group.buildings.map((node,index)=>`<button class="building ${escapeHtml(node.status)}" data-node="${escapeHtml(node.id)}" style="--height:${15+(node.metrics?.eventCount || index)%55}px">${escapeHtml(node.label)}</button>`).join('')}</div>`).join('');
  ui.cityMap.querySelectorAll('.building').forEach((button)=>button.addEventListener('click',()=>openNode(button.dataset.node)));
}
function openNode(id) { const node=state.city?.nodes?.find((item)=>item.id===id); if(!node)return; const children=state.city.nodes.filter((item)=>item.parentId===id); ui.nodeTitle.textContent=node.label; const rows={Tipo:node.type,Estado:node.status,'Último evento':node.lastEventId || '—',Atualizado:node.updatedAt || '—',Eventos:node.metrics?.eventCount || 0,Dependências:children.length}; ui.nodeDetails.innerHTML=Object.entries(rows).map(([key,value])=>`<div class="detail-row"><span>${escapeHtml(key)}</span><b>${escapeHtml(value)}</b></div>`).join(''); ui.nodeDialog.showModal(); }

function renderOperations(operations) {
  state.operations=operations; const components=Array.isArray(operations?.components)?operations.components:[]; const active=components.filter((item)=>item.status==='ACTIVE').length; const score=components.length?Math.round(active/components.length*100):0; ui.healthScore.textContent=`${score}%`; ui.healthScore.style.color=score===100?'var(--green)':score>=75?'var(--yellow)':'var(--red)';
  ui.healthList.innerHTML=components.length?components.slice().sort((a,b)=>Number(b.critical)-Number(a.critical)).map((item)=>`<div class="health-item ${escapeHtml(item.status)}"><i></i><b>${escapeHtml(item.label || item.componentId)}</b><span>${escapeHtml(item.status)} · ${Number(item.latencyMs || 0)}ms</span></div>`).join(''):'<div class="empty-city">Health Orchestrator ainda não executado.</div>';
  const readiness=operations?.readiness; ui.sidebarStatus.textContent=readiness?.status || 'SEM READINESS'; ui.sidebarDetail.textContent=readiness?`${readiness.score}% · ${readiness.blockers?.length || 0} bloqueios`:'aguardando ativação'; ui.sidebarDot.style.background=readiness?.status==='READY'?'var(--green)':readiness?'var(--red)':'var(--yellow)';
}
function renderJobs(jobs) { state.jobs=jobs; ui.jobCount.textContent=`${jobs.length} jobs`; if (ui.consoleJobs) ui.consoleJobs.textContent = String(jobs.length); const ordered=jobs.slice().sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0,12); ui.timeline.innerHTML=ordered.length?ordered.map((job)=>`<div class="timeline-item"><b>${escapeHtml(job.type)} · ${escapeHtml(job.status)}</b><small>${formatTime(job.updatedAt)} · tentativa ${job.attempts}/${job.maxAttempts}</small></div>`).join(''):'<div class="empty-city">Nenhuma execução registrada.</div>'; }
function renderTelemetry(telemetry, overview) { const calls=telemetry?.calls || telemetry?.totalCalls || overview?.metrics?.aiCalls || 0; const tokens=telemetry?.tokens || telemetry?.totalTokens || 0; const cost=telemetry?.costUsd || telemetry?.totalCostUsd || 0; ui.gatewayState.className=`status-pill ${calls?'active':'neutral'}`; ui.gatewayState.textContent=calls?'OPERACIONAL':'SEM CHAMADAS'; ui.aiStats.innerHTML=`<div class="ai-stat"><strong>${formatNumber(calls)}</strong><span>Chamadas</span></div><div class="ai-stat"><strong>${formatNumber(tokens)}</strong><span>Tokens</span></div><div class="ai-stat"><strong>$${Number(cost).toFixed(4)}</strong><span>Custo estimado</span></div><div class="ai-stat"><strong>${formatNumber(overview?.metrics?.capabilities)}</strong><span>Capabilities</span></div>`; const metrics=[['Projetos',overview?.metrics?.projects],['Repositórios',overview?.metrics?.repositories],['Memórias',overview?.metrics?.memories],['Nós da cidade',overview?.metrics?.cityNodes]]; ui.systemMetrics.innerHTML=metrics.map(([label,value])=>`<div class="mini-metric"><span>${escapeHtml(label)}</span><b>${formatNumber(value)}</b></div>`).join(''); }

// ---------------------------------------------------------------------------
// PAINEIS VIVOS — cada slot que antes tinha numero escrito no HTML.
//
// Regra unica destes renderers: sem dado medido, escrever o marcador de ausencia.
// Nunca zero no lugar de "nao sei", nunca um numero plausivel de fallback. Um "—" na
// tela e informacao honesta ("o FENIX ainda nao mediu isso"); um 99.99% inventado
// destroi a confianca em todos os outros numeros do painel.
// ---------------------------------------------------------------------------

const DASH = '—';
const setText = (el, value) => { if (el) el.textContent = value === null || value === undefined || value === '' ? DASH : String(value); };
const el = (id) => document.getElementById(id);

// Uptime do processo vem de /health (checks) ou da telemetria de sistema. Formata em
// dias/horas legiveis; sem medicao, ausencia.
function formatUptime(seconds) {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return null;
  const d = Math.floor(total / 86400), h = Math.floor((total % 86400) / 3600), m = Math.floor((total % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function renderMasterNode({ health, operations, overview, obs }) {
  const pill = el('masterNodePill');
  if (pill) {
    const ok = health?.ok === true;
    const status = health ? (ok ? 'READY' : 'DEGRADED') : null;
    pill.textContent = status || DASH;
    pill.className = `status-pill ${health ? (ok ? 'active' : 'degraded') : 'neutral'}`;
  }
  // O estado do self-deploy e o do readiness real; sem readiness, ausencia (nao "READY").
  setText(el('mnSelfDeployStatus'), operations?.readiness?.status || null);
  // uptime vem do envelope measured() de /observability/metrics (process.uptime), a unica
  // fonte real. /health nao expoe uptime -- ler dali daria undefined virando "—" sempre.
  setText(el('mnUptime'), formatUptime(measuredValue(obs?.system?.uptimeSeconds)));
  // "Recursos descobertos" e a contagem real do discovery, nao um numero de containers fixo.
  const discovered = overview?.metrics?.discoveredResources;
  setText(el('mnContainers'), Number.isFinite(Number(discovered)) ? formatNumber(discovered) : null);
  const critical = health?.checks ? Object.values(health.checks).filter((c) => c && c.critical) : [];
  setText(el('mnHealth'), critical.length ? `${critical.filter((c) => c.ok).length}/${critical.length} críticos ok` : null);
}

function renderPerformance({ speed, hotMemory, telemetry, overview }) {
  const score = measuredValue(speed?.overallScore);
  setText(el('perfScore'), score === null ? DASH : Number(score).toFixed(1));
  // Hot memory: o UNICO campo real de /performance/hot-memory hoje e cachedItemsCount (conta
  // itens de verdade). Os `levels` do endpoint ainda tem size/hitCount FABRICADOS (142, 89,
  // 64...) -- o auditor marca `performance: 9 sinais` justamente por isso. Nao exibo aquilo
  // como se fosse medido: mostro a contagem real e nada mais.
  const cached = hotMemory?.cachedItemsCount;
  setText(el('perfHotMemory'), Number.isFinite(Number(cached)) ? `${formatNumber(cached)} itens em cache` : null);
  const latency = measuredValue(speed?.avgLatencyMs) ?? telemetry?.avgLatencyMs ?? null;
  setText(el('perfLatency'), latency === null ? null : `${Math.round(Number(latency))} ms`);
  // telemetry usa totalTokens; `tokens` nao existe no contrato e daria undefined.
  const tokens = telemetry?.totalTokens ?? telemetry?.tokens ?? null;
  setText(el('perfTokens'), tokens === null ? null : formatNumber(tokens));
  const nodes = overview?.metrics?.graphEdges;
  setText(el('perfGraphNodes'), Number.isFinite(Number(nodes)) ? formatNumber(nodes) : null);
}

function renderProjects({ overview, programs }) {
  const projects = overview?.metrics?.projects;
  setText(el('projectCount'), Number.isFinite(Number(projects)) ? `${formatNumber(projects)} projetos` : null);
  const list = el('projectList');
  if (list) {
    const repos = overview?.recentRepositories || [];
    list.innerHTML = repos.length
      ? repos.map((r) => `<div class="health-item ACTIVE"><i></i><b>${escapeHtml(r.name || r.id)}</b><span>${escapeHtml(r.url || r.provider || 'repositório registrado')}</span></div>`).join('')
      : `<div class="empty-city">Nenhum repositório registrado${Number(projects) > 0 ? ` (${formatNumber(projects)} projetos sem repo vinculado)` : ''}.</div>`;
  }
  const programList = el('programList');
  if (programList) {
    const items = programs?.programs || [];
    programList.innerHTML = items.length
      ? items.slice(0, 8).map((p) => `<div class="mini-metric"><span>${escapeHtml(p.title || p.objective || p.id)}</span><b>${escapeHtml(p.status || DASH)}</b></div>`).join('')
      : '<div class="empty-city">Nenhum programa criado. Descreva um objetivo ao Avatar.</div>';
  }
}

function renderSwarm(swarm) {
  const agents = swarm?.agents || swarm?.specialists || [];
  setText(el('swarmCount'), agents.length ? `${agents.length} agentes` : null);
  const list = el('swarmList');
  if (!list) return;
  list.innerHTML = agents.length
    ? agents.map((a) => {
        const status = a.status || 'UNKNOWN';
        return `<div class="health-item ${escapeHtml(statusClass(status).toUpperCase())}"><i></i><b>${escapeHtml(a.name || a.role || a.id)}</b><span>${escapeHtml(status)}${a.lastEventAt ? ` · ${formatTime(a.lastEventAt)}` : ''}</span></div>`;
      }).join('')
    : '<div class="empty-city">Nenhum agente registrado no enxame.</div>';
}

function renderCapabilities(capabilities) {
  const items = capabilities?.capabilities || [];
  setText(el('capabilityCount'), items.length ? `${formatNumber(items.length)} capabilities` : null);
  const list = el('capabilityList');
  if (!list) return;
  list.innerHTML = items.length
    ? items.slice(0, 20).map((c) => {
        // health chega como envelope measured()/unknown(): sem execucao, e unknown -- e a
        // tela mostra "sem execucao" em vez de fingir saudavel.
        const health = c.health && c.health.state === 'measured' ? String(c.health.value) : 'sem execução';
        return `<div class="health-item ${escapeHtml(statusClass(health).toUpperCase())}"><i></i><b>${escapeHtml(c.id || c.name)}</b><span>${escapeHtml(health)} · ${Number(c.executions || c.usageCount || 0)} execuções</span></div>`;
      }).join('')
    : '<div class="empty-city">Nenhuma capability registrada.</div>';
}

function renderKnowledge(constitution) {
  // O endpoint le o diretorio docs/constitution de verdade. UNAVAILABLE => ausencia honesta.
  const count = constitution?.totalVolumes;
  const measured = count && count.state === 'measured' ? count.value : (Number.isFinite(Number(count)) ? count : null);
  setText(el('knowledgeCount'), measured === null ? null : `${formatNumber(measured)} volumes`);
  const summary = el('knowledgeSummary');
  if (summary) {
    summary.innerHTML = measured === null
      ? `<p class="empty-city">Índice da Constituição indisponível${constitution?.constitutionPath ? ` (${escapeHtml(constitution.constitutionPath)})` : ''}.</p>`
      : `<p>Índice esparso com ${formatNumber(measured)} volumes lidos do disco.</p>`;
  }
}

function renderEvents(events) {
  const out = el('terminalOutput'); const empty = el('terminalEmpty');
  const items = events?.events || [];
  if (!out) return;
  if (!items.length) { out.innerHTML = ''; if (empty) empty.hidden = false; return; }
  if (empty) empty.hidden = true;
  out.innerHTML = items.slice(-40).reverse()
    .map((e) => `<div><span class="ev-time">${formatTime(e.occurredAt || e.recordedAt)}</span> <span class="ev-kind">[${escapeHtml(String(e.type || e.name || 'EVENT').toUpperCase())}]</span> ${escapeHtml(e.summary || e.message || JSON.stringify(e.payload || {}).slice(0, 120))}</div>`)
    .join('');
}

function renderDag({ programs, missions, jobs }) {
  const tree = el('dagTree'); const empty = el('dagEmpty');
  if (!tree) return;
  const items = programs?.programs || [];
  if (!items.length) { tree.innerHTML = ''; if (empty) empty.hidden = false; return; }
  if (empty) empty.hidden = true;
  tree.innerHTML = items.slice(0, 4).map((p) => {
    const own = missions.filter((m) => m.programId === p.id);
    const missionRows = own.length
      ? own.map((m) => {
          const mjobs = jobs.filter((j) => j.missionId === m.id);
          const jobRows = mjobs.map((j) => `<div class="dag-l3">⚡ ${escapeHtml(j.type)} <span class="status-pill ${statusClass(j.status)}">${escapeHtml(j.status)}</span></div>`).join('');
          return `<div class="dag-l2">🎯 ${escapeHtml(m.title || m.objective || m.id)} <span class="status-pill ${statusClass(m.status)}">${escapeHtml(m.status)}</span></div>${jobRows}`;
        }).join('')
      : '<div class="dag-l2 dag-empty-inline">nenhuma missão vinculada</div>';
    return `<div class="dag-l1">📁 ${escapeHtml(p.title || p.objective || p.id)}</div>${missionRows}`;
  }).join('');
}

function renderDeployStages(readiness) {
  const box = el('deployPipelineStages'); const empty = el('deployStagesEmpty');
  if (!box) return;
  const stages = readiness?.stages || readiness?.components || [];
  if (!stages.length) { box.innerHTML = ''; if (empty) empty.hidden = false; return; }
  if (empty) empty.hidden = true;
  box.innerHTML = stages.map((s) => `<div class="step ${escapeHtml(String(s.status || 'PENDING'))}"><b>${escapeHtml(s.name || s.id)}</b>${escapeHtml(s.status || 'PENDING')}</div>`).join('');
}

function renderActiveModel({ telemetry, connection }) {
  // Qual modelo respondeu de fato. Sem chamada registrada, ausencia -- nao "GPT-4o".
  const model = telemetry?.lastModel || telemetry?.model || null;
  const provider = telemetry?.lastProvider || connection?.provider || null;
  setText(el('activeAiModel'), model ? (provider ? `${provider} / ${model}` : model) : (connection?.status === 'OFFLINE' ? 'provider OFFLINE' : null));
}

function renderBriefing(insights) {
  const box = el('dailyBriefContent');
  if (!box) return;
  const items = insights?.insights || [];
  box.innerHTML = items.length
    ? `<ul class="brief-list">${items.slice(0, 5).map((i) => `<li><b>${escapeHtml(i.type || 'insight')}</b> — ${escapeHtml(i.summary || '')}</li>`).join('')}</ul>`
    : '<p class="empty-city">Nenhum insight derivado ainda. O Evolution Engine gera insights a partir de execuções reais.</p>';
}

async function refresh() {
  if(state.refreshing)return; state.refreshing=true; document.getElementById('refreshBtn').textContent='…';
  try {
    const requests=[api('/overview'),api('/operations/state'),api('/missions'),api('/missions/avatar-state'),api('/city'),api('/runtime/jobs'),api('/ai/telemetry'),api('/performance/speed-score'),api('/performance/hot-memory'),api('/connectors')]; const [overviewR,operationsR,missionsR,avatarR,cityR,jobsR,telemetryR,speedR,hotMemoryR,connectorsR]=await Promise.allSettled(requests);
    const value=(result,fallback)=>result.status==='fulfilled'?result.value:fallback; const overview=value(overviewR,{metrics:{}}); const operations=value(operationsR,null); const missions=value(missionsR,{missions:[]}).missions || []; const avatar=value(avatarR,{}); const city=value(cityR,{nodes:[],edges:[]}); const jobs=value(jobsR,{jobs:[]}).jobs || []; const telemetry=value(telemetryR,{}); const speed=value(speedR,null); const hotMemory=value(hotMemoryR,null); const connectors=value(connectorsR,{connectors:[]});
    state.missions=missions; const active=missions.filter((item)=>!['SUCCEEDED','FAILED','CANCELLED'].includes(item.status)).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))[0] || missions.slice().sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))[0]; state.activeMission=active?await api(`/missions/${active.id}`).catch(()=>active):null;
    setAvatar(avatar); renderMission(state.activeMission); renderCity(city); renderOperations(operations); renderJobs(jobs); renderTelemetry(telemetry,overview); renderConsoleBar({operations,speed,hotMemory,mission:state.activeMission,jobs}); renderConnectors(connectors); ui.actor.textContent=String(overview?.tenant?.name || 'GRG').slice(0,3).toUpperCase(); ui.lastUpdate.textContent=`Atualizado ${new Date().toLocaleTimeString('pt-BR')}`;

    // Segundo lote: alimenta os paineis que antes tinham numero escrito no HTML. Vai
    // separado de proposito -- uma falha aqui nao pode derrubar o painel principal, e
    // cada slot sem dado fica com o marcador de ausencia em vez de valor inventado.
    const extra = await Promise.allSettled([
      fetch('/health').then((r) => r.json()).catch(() => null),
      api('/events'), api('/agents/swarm'), api('/capabilities'),
      // /uios/kos/manifest e a fonte HONESTA: le docs/constitution do disco e devolve
      // measured() ou UNAVAILABLE + unknown(). O /keos/constitution/index ainda afirma
      // "150 volumes" e "OPERATIONAL_GRAPH_INDEX" sem ler nada -- nao consumir dali.
      api('/uios/kos/manifest'), api('/executive/programs'),
      api('/governance/readiness-matrix'), api('/insights'), api('/connection'),
      api('/observability/metrics'),
    ]);
    const [healthR,eventsR,swarmR,capsR,constR,progR,readyR,insightsR,connR,obsR] = extra;
    const health=value(healthR,null), events=value(eventsR,{events:[]}), swarm=value(swarmR,{agents:[]}),
      caps=value(capsR,{capabilities:[]}), constitution=value(constR,null), programs=value(progR,{programs:[]}),
      readiness=value(readyR,null), insights=value(insightsR,{insights:[]}), connection=value(connR,null),
      obs=value(obsR,null);
    renderMasterNode({ health, operations, overview, obs });
    renderPerformance({ speed, hotMemory, telemetry, overview });
    renderProjects({ overview, programs });
    renderSwarm(swarm); renderCapabilities(caps); renderKnowledge(constitution);
    renderEvents(events); renderDag({ programs, missions, jobs });
    renderDeployStages(readiness);
    renderActiveModel({ telemetry, connection: connection?.value || connection });
    renderBriefing(insights);
  } finally { state.refreshing=false; document.getElementById('refreshBtn').textContent='↻'; }
}

const ttsSupported='speechSynthesis'in window;let ttsEnabled=ttsSupported&&localStorage.getItem('fenix_tts')==='1';
function updateTts(){ui.ttsToggle.disabled=!ttsSupported;ui.ttsToggle.classList.toggle('on',ttsEnabled);ui.ttsToggle.setAttribute('aria-pressed',String(ttsEnabled));ui.ttsToggle.textContent=!ttsSupported?'TTS indisponível':ttsEnabled?'◖ Voz ligada':'◖ Voz';}
function speak(text){if(!ttsEnabled||!ttsSupported)return;speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='pt-BR';utterance.rate=.98;utterance.onstart=()=>{ui.fenix.classList.add('speaking');state.speaking=true;};utterance.onend=utterance.onerror=()=>{ui.fenix.classList.remove('speaking');state.speaking=false;};speechSynthesis.speak(utterance);}
const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition; let recognition=null;
if(Recognition){recognition=new Recognition();recognition.lang='pt-BR';recognition.interimResults=true;recognition.continuous=false;recognition.onstart=()=>ui.micBtn.classList.add('listening');recognition.onend=()=>ui.micBtn.classList.remove('listening');recognition.onresult=(event)=>{const transcript=[...event.results].map((result)=>result[0].transcript).join('');ui.msg.value=transcript;if(event.results[event.results.length-1].isFinal)send(transcript);};recognition.onerror=()=>{ui.micBtn.classList.remove('listening');bubble('Não consegui acessar o microfone. Verifique a permissão do navegador.','system');};ui.voiceSupport.textContent=ttsSupported?'STT + TTS disponíveis':'STT disponível · TTS indisponível';}else{ui.micBtn.disabled=true;ui.voiceSupport.textContent=ttsSupported?'TTS disponível · STT indisponível':'Voz indisponível';}

async function send(message, mode='auto') {
  const value=String(message||'').trim();if(!value)return;bubble(value,'user');const typing=document.createElement('div');typing.className='bubble bot';typing.textContent='FÊNIX está planejando…';ui.chatlog.appendChild(typing);ui.chatlog.scrollTop=ui.chatlog.scrollHeight;
  try { const res=await api('/avatar/message',{method:'POST',body:JSON.stringify({message:value,mode})});typing.remove();if (typeof res.reply !== 'string' || !res.reply.trim()) throw new FenixApiError('Contrato de resposta do chat inválido',{requestId:res.requestId});bubble(res.reply,'bot');speak(res.reply);await refresh(); }
  catch(err){typing.remove();bubble(operatorError(err),'bot');}
}

document.getElementById('chat').addEventListener('submit',(event)=>{event.preventDefault();const value=ui.msg.value.trim();if(!value)return;ui.msg.value='';send(value);});
ui.msg.addEventListener('keydown',(event)=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();document.getElementById('chat').requestSubmit();}});
ui.msg.addEventListener('input',()=>{ui.msg.style.height='auto';ui.msg.style.height=`${Math.min(ui.msg.scrollHeight,90)}px`;});
document.querySelectorAll('[data-msg]').forEach((button)=>button.addEventListener('click',()=>send(button.dataset.msg,button.dataset.mode||'auto')));
ui.micBtn.addEventListener('click',()=>{if(!recognition)return;try{recognition.start();}catch{recognition.stop();}});
ui.ttsToggle.addEventListener('click',()=>{if(!ttsSupported)return;ttsEnabled=!ttsEnabled;localStorage.setItem('fenix_tts',ttsEnabled?'1':'0');updateTts();if(ttsEnabled)speak('Voz do FÊNIX ativada.');});
document.getElementById('refreshBtn').addEventListener('click',()=>refresh().catch(showFallback));
document.getElementById('logout').addEventListener('click',async()=>{try{await fetch('/api/logout',{method:'POST',headers:{authorization:`Bearer ${accessToken}`}});}finally{clearSessionAndRedirect();}});
document.getElementById('zoomIn').addEventListener('click',()=>{state.zoom=Math.min(1.35,state.zoom+.1);ui.cityMap.style.transform=`scale(${state.zoom})`;});document.getElementById('zoomOut').addEventListener('click',()=>{state.zoom=Math.max(.7,state.zoom-.1);ui.cityMap.style.transform=`scale(${state.zoom})`;});
document.getElementById('closeDialog').addEventListener('click',()=>ui.nodeDialog.close());ui.nodeDialog.addEventListener('click',(event)=>{if(event.target===ui.nodeDialog)ui.nodeDialog.close();});

if (ui.multimodalBtn && ui.multimodalDialog) {
  ui.multimodalBtn.addEventListener('click', () => ui.multimodalDialog.showModal());
  if (ui.closeMultimodal) ui.closeMultimodal.addEventListener('click', () => ui.multimodalDialog.close());
  if (ui.multimodalForm) {
    ui.multimodalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const file = ui.fileSelect.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await api('/multimodal/ingest', { method: 'POST', body: JSON.stringify({ filename: file.name, content: reader.result }) });
          ui.ingestResult.textContent = `Arquivo ${res.filename} ingerido com sucesso! Capsule: ${res.capsuleId || 'ok'}`;
          await refresh();
        } catch (err) {
          ui.ingestResult.textContent = `Falha na ingestão: ${err.message}`;
        }
      };
      reader.readAsText(file);
    });
  }
}

setInterval(()=>{document.getElementById('clock').textContent=new Date().toLocaleString('pt-BR',{weekday:'short',hour:'2-digit',minute:'2-digit',second:'2-digit'});},1000);setInterval(()=>{if(!document.hidden)refresh().catch((error)=>{if(error.status!==401)showFallback(error);});},5000);
updateTts();bubble('Olá. Eu sou o Avatar Mestre da GRG FÊNIX. Converse comigo ou descreva um objetivo para eu transformá-lo em uma missão governada.','bot');if(accessToken)refresh().catch((error)=>{if(error.status!==401)showFallback(error);});

