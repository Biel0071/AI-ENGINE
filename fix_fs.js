const fs = require('fs');
let content = fs.readFileSync('grg/public/unified-app.js', 'utf8');

// Find the start of loadFs
const start = content.indexOf('async function loadFs');
// Find the end by looking for the start of openFile
const end = content.indexOf('async function openFile');

if (start !== -1 && end !== -1) {
   const newLoadFs = `async function loadFs(path = '') {
    try {
      const data = await api('/dev/fs?path=' + encodeURIComponent(path));
      let html = '';
      if (path) {
         const parent = path.split('/').slice(0, -1).join('/');
         html += '<div class="row" style="cursor:pointer; color:var(--accent);" onclick="loadFs(\\'' + parent + '\\')"><i class="ph ph-arrow-u-up-left"></i> .. (Voltar)</div>';
      }
      const items = data.items || [];
      items.sort((a,b) => (b.isDirectory ? 1 : 0) - (a.isDirectory ? 1 : 0) || a.name.localeCompare(b.name));
      
      html += items.map(item => {
         const icon = item.isDirectory ? '<i class="ph-fill ph-folder" style="color:#eab308"></i>' : '<i class="ph ph-file-code" style="color:#38bdf8"></i>';
         return '<div class="row" style="padding-left:10px; cursor:pointer;" onclick="'+ (item.isDirectory ? 'loadFs(\\'' + item.path + '\\')' : 'openFile(\\'' + item.path + '\\')') +'">'+icon+' <span>'+item.name+'</span></div>';
      }).join('');
      
      if (document.getElementById('fsList')) document.getElementById('fsList').innerHTML = html || '<div class="row">Vazio</div>';
    } catch (error) {
      if (document.getElementById('fsList')) document.getElementById('fsList').innerHTML = '<div class="row" style="color:red">'+error.message+'</div>';
    }
  }

  `;
   
   content = content.substring(0, start) + newLoadFs + content.substring(end);
   fs.writeFileSync('grg/public/unified-app.js', content, 'utf8');
}
