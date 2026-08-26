const fs = require('fs');
let content = fs.readFileSync('grg/public/index.html', 'utf8');
content = content.replace(/VISTA ISOM.TRICA/g, 'VISTA ISOMÉTRICA');
content = content.replace(/GEST.O DE AGENTES/g, 'GESTÃO DE AGENTES');
content = content.replace(/GEST.O DE PROJETOS/g, 'GESTÃO DE PROJETOS');
content = content.replace(/MEM.RIA/g, 'MEMÓRIA');
fs.writeFileSync('grg/public/index.html', content, 'utf8');
