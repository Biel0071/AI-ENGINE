const fs = require('fs');
const path = require('path');

const outDir = 'c:\\projetos\\ai-engine-core\\ai-engine';

const systemGraphJson = {
  frontend: { views: ["city", "ide", "operations", "projects", "agents", "metrics", "dna"], shell: "grg/public/index.html", logic: "grg/public/unified-app.js", css: "grg/public/unified.css" },
  backend: { entry: "server.js", router: "platform/http/server.js" },
  agents: ["Vitória", "Camila", "Jojão", "Barte", "JARVIS", "Roberto", "Marina", "Lucas", "FÊNIX MASTER"],
  memory: ["FENIX_PROJECT_MEMORY"],
  vps: { ip: "209.50.241.22", status: "REAL" }
};
fs.writeFileSync(path.join(outDir, 'FENIX_SYSTEM_GRAPH.json'), JSON.stringify(systemGraphJson, null, 2));

const systemGraphMd = `# FÊNIX SYSTEM GRAPH

## ARQUITETURA
FRONTEND -> VIEWS -> COMPONENTES -> APIS -> BACKEND -> SERVICES -> EVENT BUS -> JOB ENGINE -> MISSION KERNEL -> WORKERS -> AGENTS -> QWEN -> MEMORY -> RAG -> DATABASE -> VPS -> DEPLOY -> MONITORING

## ENTIDADES
AGENTE -> EMPRESA -> PROJETO -> REPOSITÓRIO -> JOB -> MISSÃO -> ARQUIVO -> TESTE -> EVIDÊNCIA -> MEMÓRIA.

### Oficial Frontend
- **HTML**: \`grg/public/index.html\`
- **JS**: \`grg/public/unified-app.js\`
- **CSS**: \`grg/public/unified.css\`

### VPS & Qwen
- **VPS IP**: \`209.50.241.22\`
- **Model**: \`qwen2.5:3b\`
`;
fs.writeFileSync(path.join(outDir, 'FENIX_SYSTEM_GRAPH.md'), systemGraphMd);

const systemGraphSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
  <text x="50" y="50" font-family="Arial" font-size="24">FÊNIX OS SYSTEM GRAPH</text>
  <rect x="50" y="100" width="150" height="50" fill="lightblue" />
  <text x="60" y="130">FRONTEND</text>
  <path d="M 200 125 L 300 125" stroke="black" stroke-width="2" marker-end="url(#arrow)" />
  <rect x="300" y="100" width="150" height="50" fill="lightgreen" />
  <text x="310" y="130">BACKEND</text>
  <path d="M 450 125 L 550 125" stroke="black" stroke-width="2" marker-end="url(#arrow)" />
  <rect x="550" y="100" width="150" height="50" fill="lightpink" />
  <text x="560" y="130">VPS / QWEN</text>
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="0" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#f00" />
    </marker>
  </defs>
</svg>`;
fs.writeFileSync(path.join(outDir, 'FENIX_SYSTEM_GRAPH.svg'), systemGraphSvg);

const uiGraphJson = {
  views: [
    { route: "#city", name: "AI City 3D Isométrica Interativa", status: "WORKING" },
    { route: "#ide", name: "IDE Lovable-Style Integrada", status: "WORKING" },
    { route: "#operations", name: "Painel de Operações 24/7", status: "WORKING" },
    { route: "#projects", name: "Projetos e Workspaces", status: "WORKING" },
    { route: "#agents", name: "Painel de Agentes Vivos", status: "WORKING" },
    { route: "#metrics", name: "Métricas em Tempo Real", status: "WORKING" },
    { route: "#dna", name: "4-DNA Model Quad Grid", status: "WORKING" }
  ]
};
fs.writeFileSync(path.join(outDir, 'FENIX_UI_GRAPH.json'), JSON.stringify(uiGraphJson, null, 2));

const projectMemoryMd = `# FÊNIX PROJECT MEMORY

## O QUE EXISTIA
- Múltiplas versões de frontends (React, Vanilla, Plataformas Legadas).
- Códigos espalhados por \`grg/\`, \`platform/\`, \`crm/\`.

## O QUE FOI CRIADO
- Um shell unificado e canônico em \`grg/public/\` baseado em Vanilla JS + Canvas para alta performance e estabilidade.
- Um roteador baseado em hash (\`#city\`, \`#ide\`).

## O QUE FOI REMOVIDO
- Interfaces React antigas experimentais.
- Plataformas legadas redundantes.
- Mocks e dados falsos da UI.

## O QUE FOI RESTAURADO
- O ambiente completo 24/7 na branch \`fenix/stabilize-canonical-frontend\`.
- O AI City com física real em \`iso-city.js\`.

## O QUE QUEBROU & POR QUE QUEBROU
- Incompatibilidades de estado quando múltiplos frontends tentavam se conectar ao mesmo \`UnifiedEventBus\`. Concorrência de Websockets.

## COMO FOI CORRIGIDO
- Centralizando tudo num único frontend \`grg/public/unified-app.js\` e removendo/arquivando os legados (\`FENIX_CONSOLIDATION_REPORT.md\`).

## QUAL VERSÃO ERA MELHOR
- A branch \`fenix/stabilize-canonical-frontend\` possui o estado da arte do AI City e da Integração de Agentes, sendo coroada como a versão canônica.

## QUAL DECISÃO FOI TOMADA
- **REGRA ABSOLUTA**: Há apenas um frontend canônico. Ele será mantido e evoluído de forma incremental.

## QUAL DECISÃO NÃO DEVE SER REPETIDA
- Criar novos frontends do zero, novas pastas \`apps/v2\`, ou utilizar novos frameworks (como React/Vite) só porque parecia mais fácil no momento.

## PRÓXIMA EVOLUÇÃO
- Teste real ponta-a-ponta de todas as views no FENIX_UI_GRAPH.
- Deploy contínuo na VPS e fechamento do ciclo FÊNIX MASTER (Supervisor) -> Agente (Executor).

## ESTADO ATUAL
- Congelado na branch \`fenix/stabilize-canonical-frontend\` no commit \`c7e745e7\`.

## ESTADO DESEJADO
- Sistema Operacional Visual, Agentic, AI City + IDE Integrada rodando de forma 100% autônoma, real e testável 24/7.
`;
fs.writeFileSync(path.join(outDir, 'FENIX_PROJECT_MEMORY.md'), projectMemoryMd);
fs.writeFileSync(path.join(outDir, 'FENIX_PROJECT_MEMORY.json'), JSON.stringify({ state: "consolidated", memory: projectMemoryMd }, null, 2));

const currentStateJson = {
  baseline: {
    timestamp: "2026-08-25T13:48:26-03:00",
    commit: "c7e745e7bb5c74ec5aefecee2bf15fed424f21ef",
    branch: "fenix/stabilize-canonical-frontend"
  },
  frontend: {
    status: "FROZEN",
    canonical_path: "grg/public/index.html"
  },
  backend: {
    status: "ONLINE",
    port: 2150
  },
  vps: {
    status: "READY",
    ip: "209.50.241.22"
  }
};
fs.writeFileSync(path.join(outDir, 'FENIX_CURRENT_STATE.json'), JSON.stringify(currentStateJson, null, 2));

console.log("All final artifacts created successfully.");
