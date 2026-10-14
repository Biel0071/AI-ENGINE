
/* Consolidated operational views. Extends the existing controller and API contracts. */
(function () {
  'use strict';
  const labels = { command:'Início', city:'AI City', agents:'Agentes', operations:'Tarefas e Missões', ide:'IDE', projects:'Projetos', terminal:'Terminal e Desenvolvimento', memory:'Memória', knowledge:'Conhecimento e Skills', mcp:'Provedores e MCP', runtime:'Runtime', observability:'Observabilidade', project:'Project Mirror', browser:'QA Visual' };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const byId = id => document.getElementById(id);
  const resources = window.__FENIX_STATE__.resources = {};
  const inflight = new Map();
  async function read(url) {
    if (inflight.has(url)) return inflight.get(url);
    const task = (async()=>{
      const headers = {Accept:'application/json'};
      const token = localStorage.getItem('grg_token');
      if (token && token !== 'null') headers.Authorization = 'Bearer '+token;
      const response = await fetch(url,{credentials:'same-origin',headers,signal:AbortSignal.timeout(12000)});
      if (!response.ok) {const error=new Error(response.status===404?'Capacidade ainda não implementada':`Falha de comunicação (HTTP ${response.status})`);error.status=response.status;throw error;}
      const data=await response.json();
      if(data.ok===false) throw new Error(data.error?.message || data.message || 'O serviço não concluiu a consulta');
      resources[url]={data,updatedAt:new Date().toISOString()};return data;
    })().finally(()=>inflight.delete(url));
    inflight.set(url,task);return task;
  }
  function put(id,html){const el=byId(id);if(el)el.innerHTML=html;}
  function empty(message='Nenhum registro disponível.',dev=false){return `<div class="evolution-state"><strong>${dev?'Em desenvolvimento':'Sem dados disponíveis'}</strong>${escape(message)}</div>`;}
  function rows(items){return items.length?items.map(([name,value,status])=>`<tr><td>${escape(name)}</td><td>${escape(value ?? '—')}</td><td><span class="evolution-badge">${escape(status ?? '')}</span></td></tr>`).join(''):`<tr><td colspan="3">${empty()}</td></tr>`;}
  function metrics(items){return items.map(([key,value])=>`<div><small>${escape(key)}</small><div><strong>${escape(value ?? '—')}</strong></div></div>`).join('');}
  function list(data,key){const value=data?.[key] ?? data;return Array.isArray(value)?value:[];}
  function stamp(url){return `<p class="evolution-meta">Fonte: ${escape(url)} · atualizado às ${new Date().toLocaleTimeString('pt-BR')}</p>`;}
  async function load(view,ids,fn){
    ids.forEach(id=>{const el=byId(id);if(el){el.setAttribute('aria-busy','true');const content='<span role="status">Carregando dados…</span>';el.innerHTML=el.tagName==='TBODY'?`<tr><td colspan="3">${content}</td></tr>`:content;}});
    try{await fn();}catch(error){ids.forEach(id=>{const el=byId(id);if(!el)return;const content=`<div class="evolution-state" role="status"><strong>${error.status===404?'Em desenvolvimento':'Não foi possível carregar'}</strong>${escape(error.message)}<br><button data-retry-view="${view}">Tentar novamente</button></div>`;el.innerHTML=el.tagName==='TBODY'?`<tr><td colspan="3">${content}</td></tr>`:content;});}
    finally{ids.forEach(id=>byId(id)?.setAttribute('aria-busy','false'));}
  }
  const loaders={
    memory:()=>load('memory',['memoryMetrics','memoryBrief'],async()=>{
      const data=await read('/api/v2/graph/stats');
      put('memoryMetrics',metrics([['Nós',data.totalNodes],['Relações',data.totalEdges],...Object.entries(data.nodeTypes||{})])+stamp('/api/v2/graph/stats'));
      const patterns=await read('/api/v2/patterns');
      put('memoryBrief',list(patterns,'patterns').slice(0,20).map(p=>`<details class="evolution-row"><summary>${escape(p.name||p.title||p.id||'Padrão registrado')}</summary><p>${escape(p.description||p.content||'Sem descrição registrada.')}</p></details>`).join('')||empty('O grafo está disponível. Ainda não há padrões registrados para apresentar.'));
    }),
    runtime:()=>load('runtime',['healthList','runtimeServices','workerList'],async()=>{
      const data=await read('/api/v2/runtime/full-status');
      put('healthList',rows(Object.entries(data.infrastructure||{}).map(([k,v])=>[k,v.container||v.error||'Infraestrutura',v.status])));
      put('runtimeServices',rows(Object.entries(data.services||{}).map(([k,v])=>[k,v.error||`${v.port?'Porta '+v.port+' · ':''}${v.latency!=null?v.latency+' ms':'Latência não medida'}`,v.status||v.pm2?.status||'Não medido'])));
      const workers=data.workers;
      put('workerList',rows(Array.isArray(workers)?workers.map(w=>[w.name||w.id,w.activeJobs??w.role,w.status]):Object.entries(workers||{}).map(([k,v])=>[k,typeof v==='object'?v.activeJobs??v.role: v,v?.status])));
    }),
    mcp:()=>load('mcp',['connectorList','routerState','toolList'],async()=>{
      const result=await Promise.allSettled([read('/api/connectors'),read('/api/v2/ai-platform/status'),read('/api/capabilities')]);
      const a=result[0],b=result[1],c=result[2];
      put('connectorList',a.status==='fulfilled'?rows(list(a.value,'connectors').map(x=>[x.name||x.id,x.provider||x.type,x.status||x.state||'Não medido'])):`<tr><td>${empty(a.reason.message,a.reason.status===404)}</td></tr>`);
      put('routerState',b.status==='fulfilled'?rows([['Plataforma de IA',b.value.provider||b.value.model||b.value.message||'Conectividade consultada',b.value.status||'Não medido']]):`<tr><td>${empty(b.reason.message,b.reason.status===404)}</td></tr>`);
      put('toolList',c.status==='fulfilled'?rows(list(c.value,'capabilities').slice(0,40).map(x=>[x.name||x.id,x.description||x.type,x.status||'Registrada'])):`<tr><td>${empty(c.reason.message,c.reason.status===404)}</td></tr>`);
    }),
    observability:()=>load('observability',['observabilityMetrics','seriesGrid'],async()=>{
      const data=await read('/api/events?limit=60'); const events=list(data,'events');
      put('observabilityMetrics',metrics([['Eventos na consulta',events.length],['Fontes',new Set(events.map(e=>e.stream||e.type)).size]])+stamp('/api/events?limit=60'));
      put('seriesGrid',events.slice().reverse().map(e=>`<details class="evolution-row"><summary><span>${escape(e.type||e.event||e.stream||'Evento')}</span><small>${escape(e.timestamp||e.occurredAt||'Horário não informado')}</small></summary><pre>${escape(JSON.stringify(e.payload||e.data||e,null,2))}</pre></details>`).join('')||empty('Nenhum evento recebido. A lista será atualizada quando o sistema publicar atividade.'));
    }),
    browser:()=>load('browser',['qaSummary','qaGallery'],async()=>{
      const data=await read('/api/v2/visual-qa/dashboard');
      const results=list(data,'results');
      put('qaSummary',`<strong>Última evidência registrada</strong><p>${escape(data.timestamp||'Data não informada')} · ${results.length} verificações</p><p class="evolution-meta">Relatório histórico. Não certifica automaticamente a versão atual.</p>`);
      put('qaGallery',results.map(r=>{const errors=(r.consoleErrors?.length||0)+(r.networkErrors?.length||0);return `<details class="evolution-row"><summary>${escape(r.screen||r.name)} <span>${errors?'Com ocorrências':escape(r.status||'Não verificado')}</span></summary><pre>${escape(JSON.stringify(r,null,2))}</pre></details>`;}).join('')||empty('Execute uma validação isolada para produzir evidências.'));
    }),
    operations:()=>load('operations',['missionList','jobList'],async()=>{
      const data=await read('/api/v2/jobs');
      const jobs=list(data,'jobs');
      window.__FENIX_STATE__.jobs.list=jobs;
      put('jobList',`<div class="evolution-toolbar"><input aria-label="Buscar tarefas" placeholder="Buscar por tarefa, projeto ou agente" data-job-search><select aria-label="Filtrar status" data-job-status><option value="">Todos os estados</option>${[...new Set(jobs.map(j=>j.status).filter(Boolean))].map(s=>`<option>${escape(s)}</option>`).join('')}</select></div><div id="evolutionJobs"></div>`);
      renderJobs();
      try{const missions=await read('/api/missions');put('missionList',rows(list(missions,'missions').map(m=>[m.objective||m.name||m.id,m.id,m.status])));}catch(e){put('missionList',`<tr><td>${empty(e.message,e.status===404)}</td></tr>`);}
    })
  };
  function renderJobs(){
    const query=document.querySelector('[data-job-search]')?.value.toLowerCase()||'';
    const status=document.querySelector('[data-job-status]')?.value||'';
    const jobs=(window.__FENIX_STATE__.jobs.list||[]).filter(j=>(!status||j.status===status)&&JSON.stringify(j).toLowerCase().includes(query));
    put('evolutionJobs',jobs.slice(0,30).map(j=>`<details class="evolution-row"><summary><span>${escape(j.title||j.objective||j.name||'Tarefa #'+j.id)}</span><span class="evolution-badge">${escape(j.status||'Não medido')}</span></summary><p>Projeto: ${escape(j.projectId||'Não informado')} · Agente: ${escape(j.agentId||j.agentName||'Não informado')}</p><pre>${escape(JSON.stringify(j.result||j.output||j,null,2))}</pre></details>`).join('')||empty('Nenhuma tarefa corresponde aos filtros.'));
    if(jobs.length>30)byId('evolutionJobs').insertAdjacentHTML('beforeend',`<p class="evolution-meta">30 de ${jobs.length} resultados. Refine a busca para localizar uma tarefa.</p>`);
  }
  function initialize(){
    window.FENIX=window.FENIX||{};window.FENIX.state=window.state||window.__FENIX_STATE__;window.FENIX.state.resources=resources;
    window.loadMemoryView=loaders.memory;window.loadRuntimeView=loaders.runtime;window.loadMcpView=loaders.mcp;window.loadObservabilityView=loaders.observability;window.loadVisualQaDashboard=loaders.browser;window.renderOperationsView=loaders.operations;
    const original=window.showView;
    window.showView=function(route,push=true){
      route=String(route||'command').replace(/^#\/?/,'').split(/[/?]/)[0];if(!labels[route])route='command';
      if(typeof original==='function')original(route,push);
      document.querySelectorAll('.view').forEach(v=>{const active=v.id==='view-'+route;v.classList.toggle('active',active);v.style.setProperty('display',active?(route==='command'?'grid':'flex'):'none','important');});
      document.body.dataset.view=route;document.body.classList.remove('menu-open');
      byId('view-'+route)?.scrollTo(0,0);
      document.querySelectorAll('#v10SidebarMenu [data-view]').forEach(button=>{const active=button.dataset.view===route;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
      if(push&&location.hash!=='#'+route)history.pushState(null,'','#'+route);
      if(byId('v10BcView'))byId('v10BcView').textContent=labels[route];
      if(loaders[route])loaders[route]();
    };
    document.addEventListener('click',event=>{
      const nav=event.target.closest('#v10SidebarMenu [data-view]');
      if(nav){event.preventDefault();event.stopImmediatePropagation();window.showView(nav.dataset.view);return;}
      const toggle=event.target.closest('#sidebarCollapseBtn');
      if(toggle){event.preventDefault();event.stopImmediatePropagation();document.body.classList.toggle(innerWidth<=900?'menu-open':'sidebar-collapsed');toggle.setAttribute('aria-expanded',String(!document.body.classList.contains('sidebar-collapsed')));return;}
      const retry=event.target.closest('[data-retry-view]');if(retry)loaders[retry.dataset.retryView]?.();
    },true);
    document.addEventListener('input',e=>{if(e.target.matches('[data-job-search]'))renderJobs();});
    document.addEventListener('change',e=>{if(e.target.matches('[data-job-status]'))renderJobs();});
    window.addEventListener('popstate',()=>window.showView(location.hash.slice(1),false));
    const rail=document.querySelector('#view-command .orch-right-column');
    if(rail){const details=document.createElement('details');details.className='evolution-context';details.open=innerWidth>1250;details.innerHTML='<summary>Assistente e estado do sistema</summary>';rail.before(details);details.append(rail);}
    document.querySelectorAll('#view-memory h1').forEach(e=>e.textContent='Memória');
    document.querySelectorAll('#view-observability h1').forEach(e=>e.textContent='Observabilidade');
    document.querySelectorAll('#view-mcp h1').forEach(e=>e.textContent='Provedores e MCP');
    ['autonomousCycleBtn','tickBtn','qaRerunBtn'].forEach(id=>{const el=byId(id);if(el){el.disabled=true;el.title='Em desenvolvimento — execução segura ainda não integrada nesta tela';el.textContent+=' · Em desenvolvimento';}});
    installCityInspector();
    window.showView(location.hash.slice(1)||'command',false);
  }
  function installCityInspector(){
    const dialog=document.createElement('dialog');dialog.className='evolution-dialog';dialog.id='evolutionCityInspector';dialog.setAttribute('aria-labelledby','evolutionInspectorTitle');document.body.append(dialog);
    let selection=null;
    async function inspect(kind,id){
      if(!id)return;selection={kind,id};dialog.innerHTML='<p role="status">Carregando contexto real…</p><button data-close-inspector>Fechar</button>';if(!dialog.open)dialog.showModal();
      try{
        const url='/api/v2/living-city/'+kind+'/'+encodeURIComponent(id);const data=await read(url);const entity=data[kind];if(!entity)throw new Error('Este elemento ainda não está associado ao runtime.');
        const jobs=await read('/api/v2/jobs');
        const projectId=entity.projectId||entity.project||entity.metadata?.project||null;
        selection={kind,id,projectId,entity};
        const related=list(jobs,'jobs').filter(j=>kind==='agent'?(j.agentId===id||j.assignedAgentId===id):projectId&&j.projectId===projectId);
        dialog.innerHTML=`<header><div><small>${kind==='agent'?'AGENTE':'EDIFÍCIO'} · RUNTIME</small><h2 id="evolutionInspectorTitle">${escape(entity.name||id)}</h2></div><button data-close-inspector aria-label="Fechar inspeção">Fechar</button></header><p><span class="evolution-badge">${escape(entity.state||entity.health||entity.status||'Não medido')}</span> ${escape(entity.location||entity.district||'')}</p><p>${escape(entity.currentGoal||entity.description||'Nenhuma atividade atual informada.')}</p><h3>Trabalho associado</h3>${related.slice(0,8).map(j=>`<details class="evolution-row"><summary>${escape(j.title||j.objective||j.id)} · ${escape(j.status)}</summary><pre>${escape(JSON.stringify(j.result||j.output||j,null,2))}</pre></details>`).join('')||empty('Nenhuma tarefa associada foi retornada pelo runtime.')}<h3>Criar ou melhorar</h3><label>Objetivo<textarea id="evolutionObjective" placeholder="Descreva o resultado que deseja neste contexto"></textarea></label><p class="evolution-meta">O comando será preparado no workspace para revisão e envio pelo pipeline existente.</p><footer><button data-context-command>Preparar comando</button>${projectId?'<button data-open-workspace>Abrir projeto</button>':''}<button data-open-tasks>Ver tarefas</button></footer>${stamp(url)}`;
      }catch(e){dialog.innerHTML=`<h2 id="evolutionInspectorTitle">Contexto indisponível</h2>${empty(e.message,true)}<button data-close-inspector>Fechar</button>`;}
    }
    window.fenixOpenAgent=id=>inspect('agent',id);window.fenixOpenBuilding=id=>inspect('building',id);window.inspectAgentDetail=window.fenixOpenAgent;
    document.addEventListener('fenix:city:select',e=>{const d=e.detail||{};const object=d.object||d; if(object.type==='agent')inspect('agent',object.id);else if(object.type==='building')inspect('building',object.id);});
    dialog.addEventListener('click',e=>{
      if(e.target.closest('[data-close-inspector]'))dialog.close();
      if(e.target.closest('[data-open-tasks]')){dialog.close();window.showView('operations');}
      if(e.target.closest('[data-open-workspace]')){dialog.close();window.showView('projects');window.openProjectWorkspace?.(selection.projectId);}
      if(e.target.closest('[data-context-command]')){
        const objective=byId('evolutionObjective').value.trim();if(!objective){byId('evolutionObjective').focus();return;}
        const context=`${objective}\n\nContexto: ${selection.kind} ${selection.id}${selection.projectId?' · projeto '+selection.projectId:''}`;
        dialog.close();window.showView('ide');const input=byId('chatInput')||byId('promptInput')||byId('masterPrompt');if(input){input.value=context;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();}
      }
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
