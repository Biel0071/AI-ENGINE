const fs = require('fs');
const path = require('path');

const rootMemPath = path.resolve(__dirname, '../../../ACTIVE_PROJECT_MEMORY.md');
const mirrorMemPath = path.resolve(__dirname, '../../memory/ACTIVE_PROJECT_MEMORY.md');

const memorySection = `- **FASE VISUAL RECOVERY, CIDADE 3D & FÊNIX LIFE INTEGRATION (04/11/2026 — Concluída & Certificada 100% PASS)**:
  - **Reconstrução Espacial & Escala Canônica de Z-Index**: Eliminada a sobreposição caótica de elementos no shell canônico (\`ai-engine/grg/public/index.html\` + \`unified.css\`). Definida escala hierárquica única (\`--fnx-z-canvas: 1\` a \`--fnx-z-toast: 9999\`) garantindo prioridade de renderização determinística entre Canvas 3D, labels, bottom dock, HUD espacial, inspetor de edifícios, mascote flutuante e modais imersivos.
  - **Dock Inferior Reconstruído Proporcional (4 Cards)**: Reorganizado \`#fenixModularBottomDock\` em 4 colunas proporcionais (\`minmax(280px, 320px) repeat(3, minmax(220px, 1fr))\`) com 236px de altura, eliminando o corte do Card 4 (Jobs) e o espaço desperdiçado:
    - Card 1: Minimap 3D integrado com 5 filtros de camadas (Cidade, Distritos, Edifícios, Pavimentos, Agentes) e controles 2D/3D.
    - Card 2: Agentes em Destaque com avatares, status, tarefas atuais, tempos de execução e tokens.
    - Card 3: Missões Ativas com barras de progresso reais, tags de projeto e custos operacionais.
    - Card 4: Jobs em Execução com monitoramento de filas BullMQ, latência de execução e tentativas.
  - **Inspetor de Edifícios 3D Sem Sobreposição**: Painel \`#spatialBuildingInspectorPanel\` reposicionado em \`bottom: calc(236px + 14px)\` com largura \`min(400px, 35vw)\`, cessando qualquer sobreposição ao dock inferior. Ao abrir, atribui \`.has-inspector-open\` ao \`#view-city\`, deslocando suavemente o HUD espacial (\`#fenixMiroSpatialHud\`) para a esquerda e prevenindo colisões visuais.
  - **Explorador Arquitetural 3D & Andares Dinâmicos**: Quatro visões contextuais completas (Visão Geral, Arquitetura, Andares & Agentes, Missões & Jobs). Controles 3D com rotação 360°, zoom in/out, explosão vertical (\`isExploded\`), isolamento de pavimento (\`isIsolated\`), corte estrutural, alternância de planta baixa (blueprint) e Visão Imersiva do Edifício. Accordion hierárquico com 8 pavimentos dinâmicos, métricas de saúde por departamento e inspeção profunda de agentes.
  - **Fênix Life — Companion Vivo & Plataforma de Voz 3D**:
    - *Modo Compacto*: Animação de respiração e flutuação física, rastreamento dinâmico dos olhos acompanhando o cursor do mouse, piscar de olhos natural em intervalos randômicos (3.5–6s), 10 estados visuais (\`IDLE\`, \`LISTENING\`, \`THINKING\`, \`SPEAKING\`, \`EXPLAINING\`, \`SUCCESS\`, \`WARNING\`, \`ERROR\`, \`MEETING\`, \`OFFLINE\`) com cápsula de status pulsante e 3 botões de ação rápida (Microfone, Chat Copilot, Modo Imersivo).
    - *Modo Imersivo Fullscreen (\`#fenixImmersiveMascotModal\`)*: Palco 3D WebGL via Three.js (\`fenixLife3DCanvas\`) com cabeça e visor holográfico robótico com reflexos obsidian, anéis de espectro de áudio reativos (\`fimSpectrumCanvas\`), morphing de 5 visemas em tempo real (\`closed\`, \`open-aa\`, \`open-oo\`, \`wide\`, \`teeth\`), legendas ao vivo palavra por palavra com destaque em ciano, diálogo por voz bidirecional (STT e TTS com fallbacks acessíveis), e Modal de Confirmação de Ação Crítica (\`#fenixCriticalSafetyModal\`) para comandos de risco (\`deploy\`, \`shutdown\`, \`destroy\`, \`deletar\`). Ação "Retornar à Cidade" restaura suavemente a perspectiva urbana.
  - **Backend de Voz Integrado (\`fenix-voice-personaplex\`)**: Criado \`ai-engine/grg/src/services/voice-personaplex-service.js\` e registrado no \`ServiceRegistry\`. Rotas REST ativas (\`GET /api/voice/health\`, \`POST /api/voice/chat\`, \`POST /api/voice/synthesize\`, \`GET /api/voice/sessions\`) e suporte a streaming WebSocket em \`/ws/voice\` e \`/api/voice/stream\`.
  - **Central de Defesa SOC Completa (\`#view-defense\`)**: Reconstruída a tela de segurança como um Centro de Operações de Segurança (SOC) operacional com 5 sub-abas (Visão Geral SOC, Ameaças & WAF, Políticas & RBAC, Integridade & SHA-256, Syslog de Segurança), 6 cápsulas de KPI honestas (\`—\`), botão de scan em tempo real e 100% de conformidade com a Regra II (Zero-Mock).
  - **Responsividade Real em 7 Viewports**: Adaptação estrutural comprovada sem o hack de \`transform: scale\`: 1920x1080 (Desktop Wide), 1600x900 (Desktop Padrão), 1366x768 (Laptop), 1024x768 (Tablet Landscape), 768x1024 (Tablet Portrait), 390x844 (Mobile iPhone), 360x800 (Mobile Android).
  - **8 Relatórios Oficiais Emitidos em \`docs/\` e \`ai-engine/docs/\`**:
    1. \`docs/FENIX_VISUAL_RECOVERY_REPORT.md\`
    2. \`docs/FENIX_LAYOUT_AUDIT.md\`
    3. \`docs/FENIX_RESPONSIVE_AUDIT.md\`
    4. \`docs/FENIX_CITY_3D_REPORT.md\`
    5. \`docs/FENIX_MASCOT_LIFE_REPORT.md\`
    6. \`docs/FENIX_VOICE_PLATFORM_REPORT.md\`
    7. \`docs/FENIX_REAL_DATA_AUDIT.md\`
    8. \`docs/FENIX_PLAYWRIGHT_ACCEPTANCE_REPORT.md\`
  - **Bateria de Testes Canônica e E2E 100% Aprovada (43/43 Verificações)**:
    - \`architecture-guard.test.js\`: 5/5 Aprovado (Zero shells paralelas)
    - \`frontend-honesty.test.js\`: 19/19 Aprovado (Zero métricas fabricadas)
    - \`frontend-runtime-safety.test.js\`: 5/5 Aprovado (Segurança de API e IDE)
    - \`fenix-visual-recovery-e2e.test.js\`: 14/14 Aprovado (7 viewports com screenshots, 4 cards dock, zero overlap inspector, 10 estados mascote, Fênix Life 3D, Gate de Segurança e Defesa SOC).`;

function updateMemoryFile(targetPath) {
  if (!fs.existsSync(targetPath)) return;
  let content = fs.readFileSync(targetPath, 'utf8');

  // Insert above the previous phase FASE CONSTRUÇÃO AUTÔNOMA DE SAAS COMERCIAL COMPLETO
  const marker = '- **FASE CONSTRUÇÃO AUTÔNOMA DE SAAS COMERCIAL COMPLETO';
  if (content.includes(marker) && !content.includes('FASE VISUAL RECOVERY, CIDADE 3D')) {
    content = content.replace(marker, `${memorySection}\n- **FASE CONSTRUÇÃO AUTÔNOMA DE SAAS COMERCIAL COMPLETO`);
    fs.writeFileSync(targetPath, content, 'utf8');
    console.log(`Updated ${targetPath}`);
  } else if (!content.includes('FASE VISUAL RECOVERY, CIDADE 3D')) {
    content += `\n\n${memorySection}\n`;
    fs.writeFileSync(targetPath, content, 'utf8');
    console.log(`Appended to ${targetPath}`);
  } else {
    console.log(`Already present in ${targetPath}`);
  }
}

updateMemoryFile(rootMemPath);
updateMemoryFile(mirrorMemPath);
console.log('Active project memory files updated successfully.');
