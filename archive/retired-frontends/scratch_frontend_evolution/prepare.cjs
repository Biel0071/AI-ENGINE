const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, 'candidate/public');
function edit(name, fn) { const p=path.join(root,name); fs.writeFileSync(p,fn(fs.readFileSync(p,'utf8'))); }
edit('index.html', html => {
  html=html.slice(0,html.indexOf('</html>')+7);
  const start=html.indexOf('                  <span class="v10-bc-root"',html.indexOf('id="v10TelemetryStatus"'));
  const end=html.indexOf('</div>',start);
  if(start>=0) html=html.slice(0,start)+html.slice(end);
  const labels={command:'Início',city:'AI City',agents:'Agentes',operations:'Tarefas e Missões',ide:'IDE',terminal:'Terminal e Desenvolvimento',projects:'Projetos',memory:'Memória',knowledge:'Conhecimento e Skills',mcp:'Provedores e MCP',runtime:'Runtime',observability:'Observabilidade',project:'Project Mirror',browser:'QA Visual'};
  html=html.replace(/(<button[^>]*data-view="([^"]+)"[^>]*>)([\s\S]*?)(<\/button>)/g,(all,open,id,content,close)=>labels[id]?open.replace(/title="[^"]*"/,`title="${labels[id]}"`)+content.replace(/<span>[^<]*<\/span>/,`<span>${labels[id]}</span>`)+close:all);
  html=html.replace(/window\.__fenixState.activeWorkspace = null;/g,'// Preserve the selected project while navigating.');
  html=html.replace("fetch('/api/v2/ai-platform/status').then(r => r.json()).catch(() => ({ status: 'CONNECTED' }))","fetch('/api/v2/ai-platform/status').then(r => r.json()).catch(() => ({ status: 'UNAVAILABLE' }))");
  html=html.replace('REALITY SCORE: 98% (VERIFIED REAL)','Ver evidências do sistema');
  html=html.replace(/● 100% HEALTHY/g,'Estado a verificar').replace(/● ZERO DRIFT BASELINE/g,'Evidências disponíveis');
  html=html.replace(/Seu ecossistema está online e pronto para evoluir\./g,'Projetos, agentes e execução em um só lugar.');
  html=html.replace(/<link rel="stylesheet" href="\/fenix-window-overrides.css[^>]*>/,'');
  html=html.replace('</head>','<link rel="stylesheet" href="/fenix-window-overrides.css?v=evolution-20260917">\n</head>');
  // Source order is deliberate: the consolidated stylesheet must follow inline legacy styles.
  html=html.replace('</body>','<link rel="stylesheet" href="/fenix-window-overrides.css?v=evolution-20260917">\n</body>');
  html=html.replace('<script src="fenix-core-controller.js">','<script src="/fenix-core-controller.js?v=evolution-20260917">');
  return html;
});
edit('unified-app.js',s=>s.replace("$('statusDot').style.background", "if ($('statusDot')) $('statusDot').style.background").replace("$('statusDot').style.boxShadow", "if ($('statusDot')) $('statusDot').style.boxShadow"));
console.log('Prepared active frontend without replacing local working files.');
