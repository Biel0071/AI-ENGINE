(() => {
  'use strict';
  const initialize = () => {
  const area = document.querySelector('#view-city .fenix-city-canvas-area');
  const engine = window.fenixWorld3D;
  if (!area || !engine) return;
  const make = (tag, className, text) => { const element=document.createElement(tag); element.className=className; if (text !== undefined) element.textContent=String(text); return element; };
  const chrome=make('div','fw3-ui'); area.append(chrome);
  const top=make('div','fw3-top');
  const identity=make('div','fw3-identity'); identity.append(make('span','fw3-eyebrow','FÊNIX OS · MUNDO OPERACIONAL'),make('strong','','Cidade viva'),make('span','fw3-sync','Conectando…'));
  const nav=make('div','fw3-nav');
  const back=make('button','fw3-back','← Voltar ao mundo'); back.type='button'; back.hidden=true; back.addEventListener('click',()=>engine.back());
  const list=make('button','fw3-list','Projetos'); list.type='button'; list.addEventListener('click',()=>window.showView?.('projects'));
  const refresh=make('button','fw3-refresh','↻'); refresh.type='button'; refresh.setAttribute('aria-label','Atualizar dados do mundo'); refresh.addEventListener('click',()=>engine.refresh());
  nav.append(back,list,refresh); top.append(identity,nav); chrome.append(top);
  const pulse=make('div','fw3-pulse'); chrome.append(pulse);
  const context=make('aside','fw3-context'); context.hidden=true; context.setAttribute('aria-label','Detalhes da seleção'); chrome.append(context);
  const routeSelect=make('select','fw3-route'); routeSelect.setAttribute('aria-label','Ir para bairro');
  const routes=[['ALL','Mundo completo'],['command-center','Fênix HQ'],['dev-district','Dev Workshop'],['project-district','Projetos'],['ai-district','Mission Kernel'],['creative-district','Design Lab'],['data-center','Memory Vault'],['observatory','Observatório']];
  for (const [id,name] of routes) { const option=document.createElement('option'); option.value=id; option.textContent=name; routeSelect.append(option); }
  routeSelect.addEventListener('change',()=>window.fenixPanToDistrict?.(routeSelect.value));
  document.querySelector('#view-city .fenix-module-title-area')?.append(routeSelect);

  function jobState(job) { return String(job?.status || '').toUpperCase(); }
  function navigateProject(id) { if (typeof window.openProjectWorkspace==='function') window.openProjectWorkspace(id); else window.showView?.('projects'); }
  function action(parent,label,callback,primary=false) { const button=make('button',primary?'fw3-action primary':'fw3-action',label); button.type='button'; button.addEventListener('click',callback); parent.append(button); }
  function row(parent,label,value) { const item=make('div','fw3-detail-row'); item.append(make('span','',label),make('strong','',value ?? '—')); parent.append(item); }
  function render() {
    const data=window.FENIX?.cityWorld?.snapshot;
    const error=window.FENIX?.cityWorld?.error;
    const measuredAt=window.FENIX?.cityWorld?.measuredAt;
    const selected=engine.state.selected;
    const time=measuredAt && !Number.isNaN(new Date(measuredAt).getTime()) ? new Date(measuredAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : '—';
    const age=measuredAt ? Date.now()-new Date(measuredAt).getTime() : Infinity;
    const live=window.FENIX?.live?.status==='ONLINE';
    const sync=identity.querySelector('.fw3-sync');
    sync.dataset.state=error?'error':age>90000?'stale':live?'live':'measured';
    sync.textContent=error?`Atualização falhou · leitura ${time}`:data?`${live?'● Canal conectado':'◌ Leitura da API'} · ${time}${age>90000?' · dados antigos':''}`:'Carregando telemetria…';
    pulse.replaceChildren();
    if (data) {
      const metrics=[['PROJETOS',data.metrics?.projectsCount ?? data.projects?.length],['AGENTES',data.metrics?.registeredAgents ?? data.agents?.length],['JOBS ATIVOS',data.metrics?.runningJobs],['MÁQUINAS',data.machines?.length],['FALHAS',data.metrics?.failedJobs]];
      for (const [label,value] of metrics) { const card=make('div','fw3-pulse-item'); card.append(make('small','',label),make('strong','',value ?? '—')); pulse.append(card); }
    } else pulse.append(make('span','fw3-pulse-empty',error?'Telemetria indisponível. Use Atualizar.':'Conectando ao Project Kernel…'));
    back.hidden=!selected;
    back.textContent=engine.state.level==='interior'?'← Voltar ao prédio':'← Voltar ao mundo';
    context.replaceChildren(); context.hidden=!selected;
    if (!selected) return;
    const close=make('button','fw3-context-close','×'); close.type='button'; close.setAttribute('aria-label','Fechar detalhes'); close.addEventListener('click',()=>engine.back());
    const kicker=make('span','fw3-context-kicker',selected.kind==='district'?'BAIRRO':selected.kind==='project'?'PROJETO · PROJECT KERNEL':selected.kind==='machine'?'MÁQUINA · RUNTIME':'AGENTE · RUNTIME');
    context.append(close,kicker);
    if (!data && selected.kind!=='district') { context.append(make('h2','','Restaurando seleção'),make('p','','Aguardando a leitura do Project Kernel para mostrar os dados e ações.')); return; }
    const actions=make('div','fw3-actions');
    if (selected.kind==='district') {
      const district=engine.state.labels.find(item=>item.kind==='district' && item.id===selected.id);
      context.append(make('h2','',district?.element.querySelector('strong')?.textContent || selected.id),make('p','','Explore os espaços e a atividade real deste bairro.'));
      const agents=(data?.agents||[]).filter(agent=>{
        const role=String(agent.role||agent.name||'').toLowerCase();
        const key=String(agent.district||'').toLowerCase();
        return key===selected.id || (selected.id==='dev-district' && /developer|backend|architect/.test(role));
      });
      row(context,'Agentes associados',agents.length);
      if (selected.id==='project-district') row(context,'Projetos registrados',data?.projects?.length ?? '—');
      action(actions,'Ver agentes',()=>window.showView?.('agents'));
      action(actions,'Ver operações',()=>window.showView?.('operations'));
    } else if (selected.kind==='project') {
      const project=data?.projects?.find(item=>item.id===selected.id);
      const jobs=(data?.recentJobs||[]).filter(job=>job.projectId===selected.id);
      context.append(make('h2','',project?.name || selected.id),make('p','',project?.workspace?'Workspace conectado ao Project Kernel.':'Workspace indisponível nesta leitura.'));
      row(context,'Projeto',selected.id); row(context,'Jobs em execução',jobs.filter(job=>jobState(job)==='RUNNING').length);
      row(context,'Falhas recentes',jobs.filter(job=>['FAILED','DEAD_LETTER'].includes(jobState(job))).length);
      if (engine.state.level!=='interior') action(actions,'Entrar no espaço 3D',()=>engine.enterProject(selected.id));
      action(actions,'Abrir projeto ↗',()=>navigateProject(selected.id),true);
      action(actions,'Abrir IDE ↗',()=>window.fenixCityWorkflow?.openIde(selected.id));
      action(actions,'Ver jobs',()=>window.showView?.('operations'));
      for (const job of jobs.slice(0, 3)) action(actions,`${job.status || '—'} · ${String(job.title || job.id).slice(0, 34)}`,()=>window.fenixCityWorkflow?.openJob(job.id));
    } else if (selected.kind==='building') {
      const buildings=data?.buildings || {};
      const building=Array.isArray(buildings)?buildings.find(item=>item.id===selected.id):buildings[selected.id];
      const agents=(data?.agents||[]).filter(agent=>agent.buildingId===selected.id);
      context.append(make('h2','',building?.name || selected.id),make('p','',building?.function || building?.description || 'Espaço registrado no estado do mundo Fênix.'));
      row(context,'Estado',building?.status || '—'); row(context,'Agentes associados',agents.length);
      row(context,'Andares',building?.floors ?? '—');
      action(actions,'Entrar no espaço',()=>engine.enterBuilding(selected.id),true);
      action(actions,'Ver operações',()=>window.showView?.('operations'));
    } else if (selected.kind==='machine') {
      const machine=data?.machines?.find(item=>item.id===selected.id);
      const workers=(data?.workers||[]);
      context.append(make('h2','',machine?.name || selected.id),make('p','',machine?.kind==='worker'?'Processo acompanhado pelo heartbeat do JobEngine.':'Máquina conectada ao runtime Fênix.'));
      row(context,'Estado',machine?.status || '—');
      if (machine?.kind==='worker') {
        row(context,'Último heartbeat',machine.lastHeartbeat ? new Date(machine.lastHeartbeat).toLocaleString('pt-BR') : '—');
        row(context,'Jobs concluídos',machine.processed ?? '—'); row(context,'Falhas',machine.failed ?? '—');
        row(context,'Job atual',machine.currentJob || 'Nenhum');
      } else {
        row(context,'Host',machine?.hostname || '—');
        row(context,'Memória livre',Number.isFinite(machine?.memoryFreeBytes)?`${(machine.memoryFreeBytes/1073741824).toFixed(1)} GB`:'—');
        row(context,'Workers ativos',workers.filter(item=>item.status==='ONLINE').length);
      }
      action(actions,'Ver operações',()=>window.showView?.('operations'),true);
      const currentJob=machine?.currentJob || (machine?.kind==='runtime' ? workers.find(item=>item.currentJob)?.currentJob : null);
      if (currentJob) action(actions,'Acompanhar job',()=>window.fenixCityWorkflow?.openJob(currentJob));
    } else {
      const agent=data?.agents?.find(item=>item.id===selected.id);
      context.append(make('h2','',agent?.name||selected.id),make('p','',agent?.role||'Função não informada'));
      row(context,'Estado',agent?.status||'—'); row(context,'Modelo',agent?.model||'Não informado');
      row(context,'Job atual',agent?.currentJob?.name||'Nenhum job ativo');
      const currentProject=agent?.projectId || (data?.projects||[]).find(item=>item.id===window.__fenixState?.currentProject)?.id || null;
      action(actions,'Conversar com agente',()=>window.fenixCityWorkflow?.openChat(selected.id,currentProject),true);
      action(actions,'Criar tarefa',()=>window.fenixCityWorkflow?.openTask(selected.id,currentProject));
      if (agent?.currentJob?.id) action(actions,'Acompanhar job',()=>window.fenixCityWorkflow?.openJob(agent.currentJob.id));
      action(actions,'Abrir perfil ↗',()=>{ if (typeof window.fenixInspectAgent==='function') window.fenixInspectAgent(selected.id); else window.showView?.('agents'); },true);
      action(actions,'Ver tarefas',()=>window.showView?.('operations'));
    }
    context.append(actions);
  }
  window.addEventListener('fenix:city-world',render);
  window.addEventListener('fenix:world-selection',render);
  document.addEventListener('fenix-live',event=>{ if (event.detail?.type==='status') render(); });
  setInterval(()=>{ if (document.getElementById('view-city')?.classList.contains('active')) render(); },30000);
  render();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
