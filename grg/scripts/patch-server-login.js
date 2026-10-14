const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/server.js');
let s = fs.readFileSync(file, 'utf8');

const target = `      // ---- Auth (público) ----
      if (req.method === 'POST' && url.pathname === '/api/login') {
        const b = await readJson(req);
        const sess = await app.auth.login(b.tenantId || 'grg', b.userId || b.user, b.password);
        // Cookie HttpOnly mantém a sessão no reload do browser; o Bearer
        // continua sendo retornado para clientes de API e executores.
        res.setHeader('set-cookie', \`fenix_session=\${encodeURIComponent(sess.token)}; HttpOnly; SameSite=Lax; Path=/\`);
        return sendJson(res, 200, sess);
      }`;

const replacement = `      // ---- Auth (público) ----
      if (req.method === 'POST' && url.pathname === '/api/login') {
        const b = await readJson(req);
        const rememberMe = Boolean(b.rememberMe ?? b.remember ?? true);
        const sess = await app.auth.login(b.tenantId || 'grg', b.userId || b.user, b.password, { rememberMe });
        // Cookie HttpOnly mantém a sessão no reload do browser; o Bearer
        // continua sendo retornado para clientes de API e executores.
        const maxAge = rememberMe ? 2592000 : 43200;
        res.setHeader('set-cookie', \`fenix_session=\${encodeURIComponent(sess.token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=\${maxAge}\`);
        return sendJson(res, 200, sess);
      }`;

// Normalize newlines for replacement
const sNorm = s.replace(/\r\n/g, '\n');
const targetNorm = target.replace(/\r\n/g, '\n');
const replacementNorm = replacement.replace(/\r\n/g, '\n');

if (!sNorm.includes(targetNorm)) {
  console.error('Target block not found in server.js');
  process.exit(1);
}

const updatedNorm = sNorm.replace(targetNorm, replacementNorm);
// Restore CRLF
const updated = updatedNorm.replace(/\n/g, '\r\n');
fs.writeFileSync(file, updated, 'utf8');
console.log('Successfully patched server.js /api/login');
