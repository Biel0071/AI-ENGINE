const fs = require('fs');

const docPath = '/opt/fenix-os/FENIX_FRONTEND_BROWSER_CERTIFICATION.md';
let content = fs.readFileSync(docPath, 'utf8');

const targetSection = `### 5. Terminal & Automação (\`#terminal\`)
- **Arquivos modificados:** \`/opt/fenix-os/public/index.html\`
- **Integração Real:**
  - Telemetria de host no banner inicial via \`/api/v2/reality/summary\` (Kernel, Docker, PM2).
  - Terminal interativo executando comandos no host via \`POST /api/v2/terminal/exec\` (\`uptime\` testado: 78 days, load average 18.04).
  - Leitor e editor de arquivos reais em \`/opt/fenix-os/grg/src/server.js\` (126.700 bytes) via \`/api/v2/projects/fenix-os/file\`.
  - Handlers honestos (Regra 3) para botões sem API no backend (\`POST /api/v2/git/clone\`, \`POST /api/v2/ai/edit\`, \`POST /api/v2/projects/move\`, \`POST /api/v2/pipeline/delegate\`).
- **Screenshot:** \`/tmp/fenix_v2_shots/view-terminal-certified.png\` (205 KB).`;

const updatedSection = `### 5. Terminal & Automação (\`#terminal\`)
- **Arquivos modificados:** \`/opt/fenix-os/public/index.html\`, \`/opt/fenix-os/public/unified-app.js\`
- **Integração Real:**
  - Telemetria de host no banner inicial via \`/api/v2/reality/summary\` (Kernel AlmaLinux 9, Docker 9 containers, PM2 6 daemons).
  - Terminal interativo executando comandos no host via \`POST /api/v2/terminal/exec\` (\`uptime\` testado e validado em Playwright: 78 days, load average 11.67, 10.11, 10.95).
  - Resolução de conflito de concorrência: remoção do listener legado em \`unified-app.js\` que invocava \`/dev/terminal\` e limpava prematuramente o input, substituindo pelo binding canônico seguro em \`index.html\` com timeout de 30s adaptado para a alta carga da VPS.
  - Leitor e editor de arquivos reais em \`/opt/fenix-os/grg/src/server.js\` (126.700 bytes) via \`/api/v2/projects/fenix-os/file\`.
  - Handlers honestos (Regra 3) para botões sem API no backend (\`POST /api/v2/git/clone\`, \`POST /api/v2/ai/edit\`, \`POST /api/v2/projects/move\`, \`POST /api/v2/pipeline/delegate\`).
- **Screenshot:** \`/tmp/fenix_v2_shots/view-terminal-certified.png\` (204 KB).`;

if (content.includes("### 5. Terminal & Automação (`#terminal`)")) {
  content = content.replace(targetSection, updatedSection);
  fs.writeFileSync(docPath, content, 'utf8');
  console.log('Updated FENIX_FRONTEND_BROWSER_CERTIFICATION.md successfully');
} else {
  console.log('Target section not found');
}
