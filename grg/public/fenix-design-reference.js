(function attachDesignReference(root) {
  'use strict';

  const PROFILE_VERSION = '2.1';
  const allowedSurfaces = new Set(['web', 'app']);
  const allowedDirections = new Set(['brand-preserving', 'hig-adaptive', 'data-dense', 'touch-first']);
  const allowedViewports = new Set([375, 768, 1280, 1920]);
  function normalizePreferences(value = {}) {
    const surface = allowedSurfaces.has(value.surface) ? value.surface : 'web';
    const visualDirection = allowedDirections.has(value.visualDirection) ? value.visualDirection : 'brand-preserving';
    const referenceSources = [...new Set(Array.isArray(value.referenceSources) ? value.referenceSources.filter((id) => allowedSources.has(id)) : [])];
    const requestedViewports = Array.isArray(value.targetViewports) ? value.targetViewports : [...allowedViewports];
    const targetViewports = [...allowedViewports].filter((width) => requestedViewports.includes(width));
    const designGoal = typeof value.designGoal === 'string'
      ? value.designGoal.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500)
      : '';
    return { surface, visualDirection, referenceSources, targetViewports, designGoal };
  }
  const cache = new Map();
  const referenceCatalog = Object.freeze([
    Object.freeze({
      id: 'lovable-editor', name: 'Lovable · editor e preview', sourceType: 'OFFICIAL_PRODUCT_SOURCE',
      url: 'https://docs.lovable.dev/features/projects/editor', integration: 'MANUAL_READ_ONLY',
      observed: 'A captura autenticada mostra workspace, New/Search/Connectors/Projects, Recentes, Preview/Files/Code/estrutura, seletor de rota (/admin/dashboard), viewport desktop, Ask Lovable, Share e Publish. A documentação oficial atual descreve o chat ligado ao preview vivo e uma toolbar com modos de selecionar elementos, editar texto inline, desenhar anotações e comentar: https://docs.lovable.dev/features/preview-toolbar. A captura foi somente leitura.',
      applied: 'Project Hub seleciona projeto/workspace; Screen DNA/IDE oferece código, preview e seleção de elemento. Uma anotação explícita do operador é salva na memória autenticada do projeto com origem, rota e seletor, reaparece na lista da tela e vira nó OPERATOR_NOTE no Flow Graph. Isso registra contexto sem editar código. Edição inline, threads de comentário e preview isolado por draft continuam ausentes. Mudanças seguem plano read-only, draft persistido, diff e confirmação com hash-base; não há publicação com histórico/rollback ponta a ponta.'
    }),
    Object.freeze({
      id: 'miro-dashboard', name: 'Miro · home, busca e quadros', sourceType: 'OFFICIAL_PRODUCT_SOURCE',
      url: 'https://help.miro.com/hc/en-us/articles/360017571294-Home-page', integration: 'MANUAL_READ_ONLY',
      observed: 'A captura autenticada mostra home com criar quadro vazio/templates, Recentes em lista com colunas Nome/Usuários online/Espaço/Última abertura e alternância grade/lista. A documentação atual do Intelligent Canvas descreve Sidekicks que entendem o quadro inteiro, fazem perguntas de esclarecimento, planejam etapas e editam objetos no lugar, além de chat redimensionável sobre o canvas: https://help.miro.com/hc/en-us/articles/39972686949266-Intelligent-Canvas-2-0-overview.',
      applied: 'Project Hub tem busca, recentes e favoritos locais, lista/grade e metadados do projeto; Screen DNA salva ordem de telas no navegador por projeto. O chat do Fênix usa memória e contexto do projeto, mas não interpreta o Flow Graph inteiro como quadro editável nem altera nós no canvas; colaboração, presença e templates compartilhados permanecem ausentes.'
    }),
    Object.freeze({
      id: 'google-stitch-canvas', name: 'Google Stitch · canvas de design', sourceType: 'OFFICIAL_PRODUCT_SOURCE',
      url: 'https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/', integration: 'MANUAL_READ_ONLY',
      observed: 'A captura autenticada mostra My Projects/Shared with me, busca, projetos agrupados por período, prompt para iniciar design, anexo, escolha App/Web, direção Balanced e cartões de inspiração. A fonte oficial descreve canvas com contexto multimodal, agente de design, DESIGN.md, protótipos clicáveis e comandos de voz.',
      applied: 'Project Hub seleciona projeto; REA recebe URL, texto e captura; perfil guarda superfície/direção/viewports; DESIGN.md entra por prévia e importação confirmada de campos permitidos, com hash e proveniência; observações da captura alimentam contexto delimitado de chat/IDE e Flow Graph. Shared with me, canvas livre, protótipos navegáveis e voz no canvas continuam ausentes.'
    })
  ]);
  const allowedSources = new Set(referenceCatalog.map((source) => source.id));
  const capabilityMap = Object.freeze([
    Object.freeze({ product: 'Stitch', capability: 'Contexto de projeto e orientação por objetivo', status: 'PARTIAL', fenix: 'Memória visual universal/do projeto, entrada de URL/conteúdo/captura e observações limitadas no contexto do chat e Plan/IDE; sem provider visual, a análise informa indisponibilidade. Observações exigem validação.', evidence: 'public/fenix-design-reference.js · public/project-hub-live.js · src/design/project-reference-context.js · src/api/intent-routes.js · src/intent/reference-image-analysis.js', action: 'intelligence', actionLabel: 'Abrir contexto do projeto' }),
    Object.freeze({ product: 'Stitch', capability: 'Canvas com telas conectadas e protótipo navegável', status: 'PARTIAL', fenix: 'Flow Graph recebe telas reais da absorção com proveniência e ligação ao arquivo apenas quando coincide com a evidência REA; protótipo clicável ainda ausente', evidence: 'public/project-hub-live.js · src/absorption/project-absorption-engine.js · public/fenix-flow-graph.js', action: 'screens', actionLabel: 'Abrir Screen DNA' }),
    Object.freeze({ product: 'Stitch', capability: 'DESIGN.md, crítica por voz e exportação para ferramentas', status: 'PARTIAL', fenix: 'Project Hub gera DESIGN.md rastreável com diff/confirmar e importa campos permitidos de arquivo existente após prévia/confirmar; crítica por voz e integração de exportação ainda não existem', evidence: 'public/fenix-design-document.js · public/fenix-design-reference.js · public/project-hub-live.js · public/project-ide-live.js' }),
    Object.freeze({ product: 'Miro', capability: 'Home de trabalho e busca de projetos/telas', status: 'PARTIAL', fenix: 'Project Hub autentica projeto/workspace e busca; portfólio de telas tem filtros', evidence: 'public/project-hub-live.js', action: 'projects', actionLabel: 'Abrir Project Hub' }),
    Object.freeze({ product: 'Miro', capability: 'Quadros visuais editáveis, favoritos e grade/lista persistente', status: 'PARTIAL', fenix: 'Project Hub mantém recentes/favoritos localmente; Screen DNA salva a ordem das telas e o Flow Graph permite mover cartões, atualizar suas arestas e salvar a disposição por contexto/projeto neste navegador. O grafo canônico continua vindo do REA/runtime; não há quadro livre compartilhado nem sincronização de layout no servidor.', evidence: 'public/project-hub-live.js · public/project-hub-live.css · public/fenix-flow-graph.js' }),
    Object.freeze({ product: 'Miro', capability: 'Modelos reutilizáveis, comentários e colaboração em tempo real', status: 'BACKLOG', fenix: 'Sem camada de quadros colaborativos ou comentários', evidence: 'Auditoria funcional em 22/10/2026' }),
    Object.freeze({ product: 'Miro', capability: 'Sidekick contextual que entende e edita o canvas', status: 'PARTIAL', fenix: 'A memória e os planos do projeto entram no contexto do Fênix; o Flow Graph ainda não é lido como um quadro inteiro editável, não modifica nós no próprio canvas e não oferece perguntas de esclarecimento guiadas por esse canvas.', evidence: 'https://help.miro.com/hc/en-us/articles/39972686949266-Intelligent-Canvas-2-0-overview · src/api/universal-system-routes.js · public/fenix-flow-graph.js · public/project-ide-live.js' }),
    Object.freeze({ product: 'Lovable', capability: 'Árvore do projeto, código e prévia em contexto', status: 'PARTIAL', fenix: 'Project Hub mostra arquivos; IDE abre o arquivo citado pelo REA e Screen DNA, além do workspace e Live Browser', evidence: 'public/project-hub-live.js · public/project-ide-live.js', action: 'ide', actionLabel: 'Abrir IDE e prévia' }),
    Object.freeze({ product: 'Lovable', capability: 'Seleção, edição inline, anotações e comentários no preview', status: 'PARTIAL', fenix: 'Screen DNA/IDE seleciona elemento do preview e salva anotação do operador na memória autenticada do projeto; o Flow Graph apresenta a observação com proveniência OPERATOR_NOTE. Não altera o código. Edição inline e threads de comentários não existem.', evidence: 'https://docs.lovable.dev/features/preview-toolbar · public/fenix-visual-ide.js · public/fenix-project-screen-annotations.js · public/fenix-flow-graph.js · test/rea-project-workflow-ui.test.js' }),
    Object.freeze({ product: 'Lovable', capability: 'Chat de planejamento separado de implementação', status: 'PARTIAL', fenix: 'IDE oferece plano read-only por arquivo e por projeto inteiro; plano de projeto usa perfil, referências e evidência REA persistida, pode ser salvo na memória e ligado no Flow Graph, sem criar job. Implementação continua em draft/diff persistido e confirmação explícita; a jornada Playwright local passou com provider de fixture.', evidence: 'public/project-ide-live.js · public/fenix-flow-graph.js · src/api/conversation-routes.js · src/api/universal-system-routes.js · test/rea-project-workflow-ui.test.js' }),
    Object.freeze({ product: 'Lovable', capability: 'Rascunhos isolados, histórico visual, publicar e reverter', status: 'PARTIAL', fenix: 'Drafts ficam no store por até 30 minutos, isolados por tenant, usuário e projeto; sobrevivem ao reinício e podem ser listados e reabertos com diff. Aplicar exige confirmação e hash-base válido. Seleção contextual no preview é suportada em iframe acessível; preview isolado por draft, histórico visual completo e publicação com rollback ponta a ponta ainda faltam.', evidence: 'src/api/project-workspace-routes.js · src/kernel/store.js · public/project-ide-live.js · public/fenix-visual-ide.js · test/project-workspace-drafts.test.js' })
  ]);
  const profile = Object.freeze({
    version: PROFILE_VERSION,
    title: 'GRG SPACE · fluxo de design por projeto',
    provenance: [
      'Capturas fornecidas pelo operador e fontes oficiais vinculadas no catálogo abaixo; a observação visual não implica integração com as APIs externas.',
      'Apple HIG: hierarquia, consistência, estados, acessibilidade e adaptação.'
    ],
    referenceCatalog,
    capabilityMap,
    workflow: [
      'Selecionar projeto e contexto antes de propor mudanças.',
      'Capturar objetivo, usuários, rotas/telas, funcionalidades existentes, referências, restrições e critérios de aceite.',
      'Mapear componentes, ações, estados e dados por rota usando evidência REA; separar observação de inferência.',
      'Organizar telas, componentes, rotas, assets/logos e relações no espaço do projeto.',
      'Revisar preview e dimensões responsivas antes de aceitar uma alteração.',
      'Exibir diff, origem, resultado de teste e estado real de cada ação.'
    ],
    controls: { compact: 32, standard: 40, touch: 44, spacing: [4, 8, 12, 16, 24] },
    controlNote: 'Alvos do design system em CSS px; não são medidas extraídas das referências.',
    intake: [
      'Projeto/workspace, branch e ambiente (local, integrado ou VPS).',
      'Objetivo, público, tarefa principal e critérios de aceite.',
      'Rotas/telas atuais, funcionalidades e estados existentes (loading, vazio, erro, sucesso, offline).',
      'Referências visuais/URLs/capturas, assets e logos com origem/licença quando disponível.',
      'Viewports desejados, acessibilidade, desempenho, permissões e restrições de deploy.'
    ],
    interactionRules: [
      'Ação primária tem verbo e resultado explícitos; gravação/deploy mostra preview ou diff e pede confirmação.',
      'Ação secundária abre contexto, navega ou filtra sem competir com a ação primária.',
      'Botão só aparece habilitado se houver ação implementada; loading bloqueia duplicação e erro oferece recuperação.',
      'Controles de ícone têm nome acessível e dica; alvos touch usam no mínimo 44 CSS px.'
    ],
    deliverables: ['Mapa de telas e rotas', 'Inventário de funcionalidades e estados', 'Tokens e componentes', 'Fluxo e dependências no Flow Graph', 'Preview, diff, testes e evidências rastreáveis'],
    safety: 'Leitura e análise podem executar; gravações e ações externas exigem preview e confirmação.'
  });

  function token() {
    return root.fenixGetAuthToken?.() || localStorage.getItem('grg_token') || localStorage.getItem('fenix_token') || '';
  }

  async function request(url, options = {}) {
    if (typeof root.FENIX?.api === 'function') return root.FENIX.api(url, options);
    const auth = token();
    const response = await fetch(url, {
      credentials: 'same-origin', signal: AbortSignal.timeout(12000), ...options,
      headers: { ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...(options.headers || {}) }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  }

  async function read(projectId, options = {}) {
    const id = String(projectId || '').trim();
    if (!id) return null;
    if (!options.refresh && cache.has(id)) return cache.get(id);
    try {
      const result = await request(`/api/memory/project/${encodeURIComponent(id)}`);
      const entry = (result.results || []).map((item) => item.memory || item)
        .find((memory) => memory.stableKey === `design-reference-profile:${id}` && memory.status !== 'ARCHIVED');
      if (!entry) { cache.set(id, null); return null; }
      const saved = JSON.parse(entry.content);
      const value = { ...saved, memoryId: entry.id, updatedAt: entry.updatedAt || entry.createdAt };
      cache.set(id, value);
      return value;
    } catch (error) {
      const value = { error: String(error.message || 'Memória indisponível') };
      cache.set(id, value);
      return value;
    }
  }

  async function readGlobal(options = {}) {
    const key = '__global_design_reference__';
    if (!options.refresh && cache.has(key)) return cache.get(key);
    try {
      const query = new URLSearchParams({ q: 'GRG SPACE visual design context', kind: 'global', limit: '10' });
      const result = await request(`/api/memory/search?${query}`);
      const entry = (result.results || []).map((item) => item.memory || item)
        .find((memory) => memory.stableKey === 'design-reference-profile:global' && memory.status !== 'ARCHIVED');
      if (!entry) { cache.set(key, null); return null; }
      const saved = JSON.parse(entry.content);
      const value = saved.title === profile.title
        ? { ...saved, memoryId: entry.id, updatedAt: entry.updatedAt || entry.createdAt }
        : null;
      cache.set(key, value);
      return value;
    } catch (error) {
      const value = { error: String(error.message || 'Memória universal indisponível') };
      cache.set(key, value);
      return value;
    }
  }

  async function apply(project, preferences = {}) {
    const id = String(project?.id || '').trim();
    if (!id) throw new Error('Selecione um projeto registrado.');
    const savedProfile = { ...profile, projectId: id, projectName: String(project.name || id), appliedAt: new Date().toISOString(), preferences: normalizePreferences(preferences) };
    const memory = await request('/api/memory/write', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'project', classification: 'internal', confidence: 0.9,
        projectId: id, stableKey: `design-reference-profile:${id}`,
        title: profile.title, content: JSON.stringify(savedProfile),
        tags: ['design-system', 'project-workflow', 'visual-qa'],
        provenance: { type: 'user-selected-design-reference', reference: 'observed-reference-interfaces-and-user-screenshots', evidence: profile.provenance }
      })
    });
    let universalMemorySaved = false;
    let universalMemoryError = null;
    try {
      await request('/api/memory/write', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'global', classification: 'internal', confidence: 0.9,
          stableKey: 'design-reference-profile:global',
          title: 'GRG SPACE · memória visual universal',
          content: JSON.stringify(profile),
          tags: ['grg-space-visual-context', 'design-system', 'accessibility'],
          provenance: { type: 'user-selected-design-reference', reference: 'observed-reference-interfaces-and-user-screenshots', evidence: profile.provenance }
        })
      });
      universalMemorySaved = true;
    } catch (error) { universalMemoryError = String(error.message || 'Memória universal indisponível'); }
    const value = { ...savedProfile, memoryId: memory.id, updatedAt: memory.updatedAt, universalMemorySaved, universalMemoryError };
    cache.set(id, value);
    return value;
  }

  async function importDocument(project, parsed, source = {}) {
    const id = String(project?.id || '').trim();
    if (!id) throw new Error('Selecione um projeto registrado.');
    if (parsed?.status !== 'IMPORTED_UNVERIFIED' || !/^[a-f0-9]{64}$/i.test(String(source.sha256 || ''))) {
      throw new Error('Revise um DESIGN.md reconhecido e sua origem antes de importar.');
    }
    const saved = await read(id, { refresh: true });
    const importedAt = new Date().toISOString();
    const value = {
      ...(saved && !saved.error ? saved : profile),
      projectId: id,
      projectName: String(project.name || id),
      preferences: normalizePreferences(parsed.preferences),
      importedDocument: {
        path: String(source.path || 'DESIGN.md').slice(0, 240),
        sha256: String(source.sha256).toLowerCase(),
        importedAt,
        status: parsed.status,
        reaEvidenceId: String(parsed.evidence?.evidenceId || '').slice(0, 120),
        reaSubjectSha256: String(parsed.evidence?.subjectSha256 || '').slice(0, 64)
      }
    };
    const memory = await request('/api/memory/write', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'project', classification: 'internal', confidence: 0.75,
        projectId: id, stableKey: `design-reference-profile:${id}`,
        title: profile.title, content: JSON.stringify(value),
        tags: ['design-system', 'design-document-import', 'project-workflow'],
        provenance: {
          type: 'operator-confirmed-project-document-import', reference: String(source.path || 'DESIGN.md').slice(0, 240),
          evidence: [String(source.sha256).toLowerCase(), ...(parsed.evidence?.evidenceId ? [parsed.evidence.evidenceId] : [])],
          projectId: id, status: parsed.status
        }
      })
    });
    const result = { ...value, memoryId: memory.id, updatedAt: memory.updatedAt };
    cache.set(id, result);
    return result;
  }

  root.FenixDesignReference = Object.freeze({ profile, read, readGlobal, apply, importDocument, normalizePreferences, clear(projectId) { cache.delete(String(projectId || '')); cache.delete('__global_design_reference__'); } });
})(window);
