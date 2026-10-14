const fs=require('fs'),path=require('path');const root=path.join(__dirname,'candidate/public');
const edit=(name,fn)=>{const file=path.join(root,name);fs.writeFileSync(file,fn(fs.readFileSync(file,'utf8')));};
edit('index.html',s=>{
 s=s.replace(/<div class="v10-city-visual-stage">[\s\S]*?<img[^>]*>/,'<div class="v10-city-visual-stage">');
 s=s.replace(/(<div class="v10-status-badge"[^>]*>)[\s\S]*?(<\/div>)/g,'$1Não medido$2');
 s=s.replace(/(<span[^>]*id="(?:gaugeCpuVal|gaugeRamVal|gaugeDiskVal|gaugeNetVal)"[^>]*>)[^<]*/g,'$1—');
 s=s.replace(/(<div class="v10-events-list" id="v10EventsList">)[\s\S]*?(?=\n\s*<\/div>\n\s*<\/div>)/,'$1<p class="evolution-meta">Aguardando eventos do runtime.</p>');
 s=s.replace('Resumo diario','Padrões registrados');
 return s;
});
edit('unified-app.js',s=>{
 // The legacy refresher must not overwrite independently loaded operational views.
 s=s.replace('async function refreshAll() {','async function refreshAll() {\n  if (["memory","runtime","mcp","observability","operations","browser","knowledge"].includes(location.hash.slice(1))) return;');
 s=s.replace('    const entries = [...essentialEntries, ...(viewEntries[activeView] || defaultEntries)];',`    const selectedKeys = new Set(['projects','agents','jobs','missions','events','city','office','repositories']);
    const entries = [...essentialEntries.filter(([key]) => ['overview','v2agents'].includes(key)), ...(viewEntries[activeView] || defaultEntries.filter(([key])=>selectedKeys.has(key)))];`);
 s=s.replace('    state.data = data;','    state.data = { ...state.data, ...data };');
 // Missing legacy nodes must never prevent all later view renderers from running.
 s=s.replace(/function renderAll\(\) \{[\s\S]*?\n\}/,`function renderAll() {
  const renderers = {command:[renderCommand],city:[renderCity],ide:[],projects:[]};
  for(const render of renderers[location.hash.slice(1)||'command']||[]) {
    try { render(); } catch(error) { console.warn('[legacy renderer]',error.message); }
  }
}`);
 return s;
});
edit('project-hub-controller.js',s=>{
 const start=s.indexOf('  window.runProjectReader = async function('),end=s.indexOf('  window.runProjectReaderFor =',start);
 if(start<0||end<0)throw new Error('Reader anchor missing');
 return s.slice(0,start)+`  window.runProjectReader = async function(projectId) {
    const pid = projectId || currentProject?.id;
    const box = document.getElementById('fpScanProgressBox');
    const step = document.getElementById('fpProgressStepText');
    if(box) box.style.display='block';
    if(step) step.textContent='Consultando análise registrada…';
    try {
      if(!pid) throw new Error('Selecione um projeto.');
      const data=await safeFetchJson('/api/v2/mirror/projects');
      const project=(data.projects||[]).find(p=>p.id===pid||p.projectId===pid);
      if(!project) throw new Error('Projeto não encontrado no índice.');
      const values={fpStatProgFiles:project.metrics?.totalFiles,fpStatProgScreens:project.screensCount??project.screens?.length,fpStatProgComps:project.components?.length,fpStatProgApis:project.apis?.length,fpStatProgHealth:project.health?.status||project.status};
      Object.entries(values).forEach(([id,value])=>{const el=document.getElementById(id);if(el)el.textContent=value??'Não medido';});
      const fill=document.getElementById('fpProgressBarFill');if(fill)fill.style.width='0';
      const percentage=document.getElementById('fpProgressPercentage');if(percentage)percentage.textContent='Índice existente';
      if(step)step.textContent='Análise registrada carregada. Uma nova varredura está em desenvolvimento nesta tela.';
      return {ok:true,projectId:pid,source:'persisted-index'};
    }catch(error){if(step)step.textContent='Não foi possível consultar: '+error.message;return {ok:false,error:error.message};}
  };

`+s.slice(end);
});
