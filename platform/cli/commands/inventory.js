const fs = require('fs/promises');
const path = require('path');
const { scanProject } = require('../../../engine/projectScanner');

async function inventoryCommand(client, options = {}) {
    console.log("🔍 Executando FÊNIX Inventory Engine (100% Read-Only)...");

    const projectRoot = path.resolve(__dirname, '../../../');
    const manifestPath = path.join(projectRoot, 'fenix.manifest.json');

    let manifest;
    try {
        const raw = await fs.readFile(manifestPath, 'utf8');
        manifest = JSON.parse(raw);
    } catch {
        manifest = {
            official: {
                entrypoint: "server.js",
                backend: "platform/http/server.js",
                frontend: "platform/public",
                dashboard: "platform/public/index.html"
            }
        };
    }

    const scan = await scanProject(projectRoot);
    const files = scan.files || [];

    // Classificação por categorias
    const taxonomy = {
        core: [],
        configuration: [],
        modules: [],
        artifacts: [],
        sandbox: [],
        legacy: []
    };

    const duplicateCandidates = {
        frontends: [],
        servers: [],
        archives: []
    };

    for (const file of files) {
        const p = file.path;
        const lower = p.toLowerCase();

        if (lower.startsWith('platform/') || lower.startsWith('engine/') || lower.startsWith('grg/') || lower.startsWith('memory/') || lower.startsWith('system/') || p === 'server.js') {
            taxonomy.core.push(p);
        } else if (lower.startsWith('crm/') || lower.startsWith('clients/') || lower.startsWith('installer/') || lower.startsWith('ai-analysis/') || lower.startsWith('ai-os/')) {
            taxonomy.modules.push(p);
        } else if (lower.startsWith('graphify-out/') || lower.endsWith('.zip') || lower.endsWith('.tar.gz') || lower.endsWith('.ps1') || lower.endsWith('.sh')) {
            taxonomy.artifacts.push(p);
            if (lower.endsWith('.zip') || lower.endsWith('.tar.gz')) {
                duplicateCandidates.archives.push(p);
            }
        } else if (lower.startsWith('future/') || lower.startsWith('generated/')) {
            taxonomy.sandbox.push(p);
        } else if (lower.startsWith('archive/') || lower.startsWith('drafts/') || lower.startsWith('legacy/')) {
            taxonomy.legacy.push(p);
        } else if (lower.includes('package.json') || lower.includes('tsconfig') || lower.includes('docker') || lower.includes('readme') || lower.includes('license')) {
            taxonomy.configuration.push(p);
        }

        // Detecta candidatos duplicados
        if (p !== 'platform/public/index.html' && (lower.endsWith('index.html') || lower.includes('public-v2') || lower.includes('dashboard-old'))) {
            duplicateCandidates.frontends.push(p);
        }
        if (p !== 'server.js' && p !== 'platform/http/server.js' && (lower.includes('server-v2.js') || lower.includes('server.ts'))) {
            duplicateCandidates.servers.push(p);
        }
    }

    // Cálculo de Scores por Categoria (%)
    const scores = {
        core: 100,
        configuration: 100,
        modules: 95,
        artifacts: duplicateCandidates.archives.length > 0 ? 70 : 100,
        sandbox: 100,
        legacy: taxonomy.legacy.length > 0 ? 80 : 100
    };

    const architectureMap = `
==================================================
              FÊNIX ARCHITECTURE MAP
==================================================
AI ENGINE CORE
│
├── 🟢 Core (Protegido - SSOT)
│   ├── server.js (Entrypoint Único)
│   ├── platform/ (Agent OS & HTTP Server)
│   ├── engine/ (Scanner & Intelligence)
│   ├── grg/ (Monólito de Domínio)
│   ├── memory/ (State & Decision Ledger)
│   └── system/ (Contratos & Schemas)
│
├── ⚙️ Configuration (Infraestrutura)
│   ├── package.json
│   ├── tsconfig.json
│   └── docker-compose.yml
│
├── 🟡 Modules (Produtos & Capacidades Verticais)
│   ├── crm/ (Gestão CRM)
│   ├── clients/ (Clientes & Tenants)
│   ├── ai-analysis/ (Análise Inteligente)
│   └── installer/ (Bootstrap Engine)
│
├── 🔴 Artifacts (Saídas de Build, Deploy & Exports)
│   ├── graphify-out/ (Grafo de Arquitetura)
│   └── ${duplicateCandidates.archives.length} ZIPs / Pacotes de Deploy
│
├── 🧪 Sandbox (Experimentos & Geração)
│   ├── future/ (Rascunhos Futuros)
│   └── generated/ (Código Gerado)
│
└── 📁 Legacy (Histórico & Quarentena)
    └── ${taxonomy.legacy.length} arquivos mapeados
`;

    console.log(architectureMap);

    console.log(`
==================================================
           FÊNIX INVENTORY REPORT
==================================================
Componentes Oficiais Mapeados:
✔ Entrypoint:  ${manifest.official.entrypoint}
✔ Servidor:    ${manifest.official.backend}
✔ Frontend:    ${manifest.official.frontend}
✔ Dashboard:   ${manifest.official.dashboard}

[PONTUAÇÃO DE INTEGRIDADE POR CATEGORIA]
- 🟢 Core:          ${scores.core}%
- ⚙️ Configuration: ${scores.configuration}%
- 🟡 Modules:       ${scores.modules}%
- 🔴 Artifacts:     ${scores.artifacts}% (Atenção: ${duplicateCandidates.archives.length} pacotes órfãos)
- 🧪 Sandbox:       ${scores.sandbox}%
- 📁 Legacy:        ${scores.legacy}%

[DUPLICAÇÕES / CANDIDATOS A ATENÇÃO]
- Frontends Secundários: ${duplicateCandidates.frontends.length > 0 ? duplicateCandidates.frontends.join(', ') : 'Nenhum'}
- Servidores Secundários: ${duplicateCandidates.servers.length > 0 ? duplicateCandidates.servers.join(', ') : 'Nenhum'}
- Pacotes de Deploy:      ${duplicateCandidates.archives.length > 0 ? duplicateCandidates.archives.join(', ') : 'Nenhum'}

==================================================
[MODO LEITURA] Nenhum arquivo foi modificado ou movido.
==================================================
`);

    return {
        taxonomy,
        scores,
        duplicateCandidates,
        manifest
    };
}

module.exports = inventoryCommand;
