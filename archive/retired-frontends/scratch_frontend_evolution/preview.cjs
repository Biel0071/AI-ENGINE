const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'candidate/public');
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')||url.pathname==='/health'||url.pathname==='/events'){
  if(req.method!=='GET'){res.writeHead(409,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Prévia de validação: alterações no servidor não são permitidas.'}));return;}
  const proxy=http.request({hostname:'209.50.241.22',port:3000,path:req.url,method:'GET',headers:{accept:req.headers.accept||'application/json'}},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});
  proxy.on('error',()=>{res.writeHead(502);res.end('{}');});res.on('close',()=>proxy.destroy());proxy.end();return;
 }
 const name=['/','/app'].includes(url.pathname)?'index.html':decodeURIComponent(url.pathname.slice(1));
 const file=path.resolve(root,name);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);res.end();return;}const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.woff2':'font/woff2'};res.writeHead(200,{'Content-Type':(mime[path.extname(file)]||'application/octet-stream')+'; charset=utf-8','Cache-Control':'no-store'});res.end(data);});
}).listen(4780,'127.0.0.1',()=>console.log('Validation preview http://127.0.0.1:4780'));

