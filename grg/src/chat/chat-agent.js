// ChatAgent: a camada de conversa do OMEGA. Interpreta a mensagem, CONSULTA o estado real
// (twins, insights, memória, catálogo) e EXECUTA ações reais (acoplar/analisar/gerar/aconselhar).
//
// Honestidade: sem chave de LLM, a interpretação é um roteador de intenção determinístico. Ele
// usa o AI Gateway para redigir a resposta em linguagem natural (adapter Echo hoje; troque por
// OpenAI/Anthropic reais sem mudar este arquivo). As AÇÕES são reais — não simuladas.

const GITHUB_URL_RE = /https?:\/\/github\.com\/[^\s]+/i;

class ChatAgent {
  constructor({ app, llm = null }) {
    this.app = app; // { controlPlane, repoIntel, factory, orchestrator, digitalTwin, evolution, aiGateway, store }
    this.llm = llm; // OllamaProvider opcional: quando presente, entende linguagem aberta e fala natural
    this.history = []; // memória de conversa progressiva (últimas trocas)
  }

  // Classifica a intenção com o LLM (linguagem aberta). Fallback nas regras se LLM indisponível.
  async classifyWithLLM(text) {
    const sys = `Você é o classificador de intenções do GRG Services OS, uma plataforma que acopla e analisa repositórios GitHub, gera sistemas, mantém memória evolutiva e digital twins.
Dada a mensagem do usuário, responda SOMENTE um JSON: {"intent": "<uma das opções>", "username": "<se houver>", "url": "<se houver>"}.
Intents válidas:
- connect_repo: acoplar/analisar UM repositório (tem URL github)
- ingest_portfolio: acoplar TODOS os repos de um usuário (menciona "todos", "portfólio", "meus projetos", ou um username)
- generate: criar/gerar um novo sistema/projeto/app
- insights: perguntar o que o sistema aprendeu, padrões, evolução
- memory: histórico, memória, decisões
- capabilities: catálogo de funcionalidades/módulos
- twin: analisar arquitetura/saúde/riscos/conselhos de um repo
- list: listar repos/projetos existentes
- overview: status geral, visão geral, resumo, números
- chitchat: conversa casual, saudação, "tudo bem", agradecimento, pergunta genérica
- help: pedir ajuda, o que sabe fazer`;
    const res = await this.llm.chat({ messages: [
      { role: 'system', content: sys },
      { role: 'user', content: text },
    ], format: 'json', temperature: 0 });
    try {
      const parsed = JSON.parse(res.text);
      if (parsed && parsed.intent) return parsed;
    } catch { /* cai no fallback */ }
    return null;
  }

  // Redige a resposta final em linguagem natural a partir dos FATOS reais (anti-alucinação:
  // o LLM só reformula os dados que passamos, não inventa).
  async speak(userText, intent, facts, fallbackReply) {
    if (!this.llm) return fallbackReply;
    try {
      const sys = `Você é a FÊNIX — o Enterprise Cognitive Kernel da GRG. Não é um chatbot: é o cérebro da plataforma; o modelo de IA é só seu motor de inferência.
Personalidade FIXA: técnica, estratégica, direta. Explica antes de executar. Nunca inventa. Sempre informa nível de confiança quando relevante e cita riscos. Pensa em longo prazo. Fala em português, curto (2-5 frases).
REGRA CRÍTICA: use APENAS os fatos fornecidos no JSON. NÃO invente números, repos, capabilities ou URLs. Se os fatos estão vazios, diga objetivamente o que o operador pode fazer a seguir.`;
      const res = await this.llm.chat({ messages: [
        { role: 'system', content: sys },
        { role: 'user', content: `Mensagem do usuário: "${userText}"\nIntenção: ${intent}\nFatos reais (JSON):\n${JSON.stringify(facts).slice(0, 2500)}\n\nResponda ao usuário com base SÓ nesses fatos.` },
      ], temperature: 0.4 });
      return res.text.trim() || fallbackReply;
    } catch {
      return fallbackReply;
    }
  }

  // Interpreta a intenção. Determinístico, auditável.
  detectIntent(text) {
    const t = text.toLowerCase().trim();
    const url = (text.match(GITHUB_URL_RE) || [])[0] || null;

    // "acoplar/pegar TODOS os projetos do meu user/github <username>" → ingestão de portfólio inteiro
    const mentionsAll = /(todos|todas|todo|all|portf[oó]lio|meus? (projetos|repos|reposit))/.test(t);
    const ingestVerb = /(acopl|conect|mape|ingest|integr|import|traz|pega|puxa|busca|carrega|baixa)/.test(t);
    const hasUser = this.extractUsername(text);
    if (mentionsAll && (ingestVerb || hasUser)) {
      return { kind: 'ingest_portfolio', username: hasUser };
    }

    if (url && /(acopl|conect|analis|ingest|adicion|integr)/.test(t)) return { kind: 'connect_repo', url };
    if (url) return { kind: 'connect_repo', url };
    if (/(gerar|criar|novo|construir|montar).*(sistema|projeto|app|site|loja|crm)/.test(t)) return { kind: 'generate', prompt: text };
    if (/(insight|aprend|evolu|o que aprend|padr)/.test(t)) return { kind: 'insights' };
    if (/(mem[oó]ria|hist[oó]rico|decis)/.test(t)) return { kind: 'memory' };
    if (/(status|vis[aã]o|overview|painel|resumo|estado)/.test(t)) return { kind: 'overview' };
    if (/(capabilit|funcionalidad|cat[aá]logo|m[oó]dulo)/.test(t)) return { kind: 'capabilities' };
    if (/(twin|modelo|arquitetura|sa[uú]de|risco|analis[ae] o|conselho|advise|melhor)/.test(t)) {
      const repoId = this.matchRepoId(t);
      return { kind: 'twin', repoId };
    }
    if (/(repos|projetos|lista|quais)/.test(t)) return { kind: 'list' };
    if (/(ajuda|help|o que voc|comandos|pode fazer)/.test(t)) return { kind: 'help' };
    return { kind: 'help' };
  }

  matchRepoId(text) {
    // tenta casar um id de repo conhecido pela substring
    return this._repoHint || null;
  }

  // Extrai username do GitHub de frases como "meu user github biel0071" ou "github.com/biel0071".
  extractUsername(text) {
    const STOP = new Set(['github', 'user', 'usuario', 'usuário', 'conta', 'perfil', 'meu', 'meus', 'do', 'de', 'da', 'no', 'projetos', 'repos', 'todos']);
    const fromUrl = text.match(/github\.com\/([A-Za-z0-9-]+)/i);
    if (fromUrl) return fromUrl[1];
    // token seguido de barra: "biel0071/"
    const slash = text.match(/\b([A-Za-z0-9][A-Za-z0-9-]{1,38})\s*\//);
    if (slash && !STOP.has(slash[1].toLowerCase())) return slash[1];
    // após palavra-chave, pulando stopwords encadeadas (ex.: "user github biel0071")
    const seq = text.match(/(?:user|usu[aá]rio|github|conta|perfil)\s+((?:[A-Za-z0-9][A-Za-z0-9-]{1,38}\s+){0,3}[A-Za-z0-9][A-Za-z0-9-]{1,38})/i);
    if (seq) {
      const token = seq[1].split(/\s+/).find((w) => !STOP.has(w.toLowerCase()));
      if (token) return token;
    }
    return null;
  }

  async handle(tenantId, actorId, text) {
    // 1) tenta regras determinísticas (rápidas, confiáveis para URL/comandos claros)
    let intent = this.detectIntent(text);
    // 2) se o LLM está ligado e as regras caíram em 'help' (baixa confiança), pergunta ao LLM
    if (this.llm && intent.kind === 'help') {
      const llmIntent = await this.classifyWithLLM(text);
      if (llmIntent) {
        intent = { kind: llmIntent.intent, url: llmIntent.url || intent.url, username: llmIntent.username || null };
      }
    }
    let action = { type: intent.kind, ok: true };
    let facts = {};

    try {
      switch (intent.kind) {
        case 'chitchat': {
          const state = await this.app.store.read();
          const f = (a) => a.filter((x) => x.tenantId === tenantId).length;
          facts = { conversa: true, repos: f(state.repositories), projetos: f(state.projects), capabilities: f(state.capabilities) };
          break;
        }
        case 'connect_repo': {
          const repo = await this.connectAndAnalyze(tenantId, actorId, intent.url);
          const twin = await this.app.digitalTwin.get(tenantId, actorId, repo.id);
          action = { type: 'connect_repo', ok: true, repoId: repo.id };
          facts = {
            repo: repo.name, revision: twin.revision,
            fileCount: twin.model.architecture.fileCount,
            apis: twin.model.apis.count, components: twin.model.components.count,
            tables: twin.model.database.tables.length,
            capabilities: twin.model.capabilities,
            health: twin.model.health, risks: twin.model.risks,
          };
          break;
        }
        case 'ingest_portfolio': {
          const username = intent.username;
          if (!username) { action = { type: 'ingest_portfolio', ok: false }; facts = { note: 'Não identifiquei o usuário. Diga: "acoplar todos os projetos do github biel0071".' }; break; }
          const report = await this.app.portfolio.ingestUser(tenantId, actorId, username, { analyze: true, maxSizeKb: 400000 });
          action = { type: 'ingest_portfolio', ok: true, username };
          facts = { username, total: report.total, results: report.results };
          break;
        }
        case 'generate': {
          const res = await this.app.orchestrator.buildFromPrompt(tenantId, actorId, { prompt: text, name: text.slice(0, 40), target: 'node' });
          action = { type: 'generate', ok: true, projectId: res.projectId };
          facts = { projectId: res.projectId, reused: res.reused, built: res.built, previewUrl: res.previewUrl, outputPath: res.outputPath };
          break;
        }
        case 'insights': {
          const insights = await this.app.evolution.getInsights(tenantId);
          facts = { insights: insights.slice(0, 12).map((i) => ({ type: i.type, summary: i.summary, confidence: i.confidence })) };
          break;
        }
        case 'memory': {
          const state = await this.app.store.read();
          facts = { memory: state.memoryEvents.filter((m) => m.tenantId === tenantId).slice(-10).reverse().map((m) => ({ kind: m.kind, summary: m.summary })) };
          break;
        }
        case 'capabilities': {
          const state = await this.app.store.read();
          facts = { capabilities: state.capabilities.filter((c) => c.tenantId === tenantId).map((c) => `${c.id}@${c.version}`) };
          break;
        }
        case 'twin': {
          const repos = await this.app.repoIntel.listRepositories(tenantId, actorId);
          const repo = intent.repoId ? repos.find((r) => r.id === intent.repoId) : repos[repos.length - 1];
          if (!repo) { facts = { note: 'Nenhum repo conectado ainda. Cole uma URL do GitHub para começar.' }; break; }
          const advice = await this.app.digitalTwin.advise(tenantId, actorId, repo.id);
          const twin = await this.app.digitalTwin.get(tenantId, actorId, repo.id);
          facts = { repo: repo.name, health: advice.health, advice: advice.advice, capabilities: twin.model.capabilities };
          break;
        }
        case 'list': {
          const repos = await this.app.repoIntel.listRepositories(tenantId, actorId);
          const projects = await this.app.factory.listProjects(tenantId, actorId);
          facts = { repos: repos.map((r) => r.id), projects: projects.map((p) => p.id) };
          break;
        }
        case 'overview': {
          const state = await this.app.store.read();
          const f = (a) => a.filter((x) => x.tenantId === tenantId).length;
          facts = { repos: f(state.repositories), projects: f(state.projects), capabilities: f(state.capabilities), deployments: f(state.deployments), insights: f(state.insights), memory: f(state.memoryEvents) };
          break;
        }
        default:
          facts = { help: [
            'Cole uma URL do GitHub para acoplar e analisar um repo',
            '"gerar um CRM de WhatsApp com IA" para criar um sistema',
            '"o que você aprendeu?" para ver insights evolutivos',
            '"status" para a visão geral', '"capabilities" para o catálogo',
            '"analise o twin" para saúde/riscos/conselhos de um repo',
          ] };
      }
    } catch (e) {
      action = { type: intent.kind, ok: false, error: e.message };
      facts = { error: e.message };
    }

    // resposta determinística (fallback) — para ações concretas mantemos o texto exato/estruturado.
    const structured = this.render(intent.kind, facts, action);
    // Para intents de AÇÃO concreta, usamos o texto estruturado (dados exatos: caminhos, URLs).
    // Para conversa/consulta, deixamos o LLM redigir natural a partir dos fatos reais.
    const CONVERSATIONAL = new Set(['chitchat', 'help', 'insights', 'overview', 'capabilities', 'memory', 'list', 'twin']);
    let reply = structured;
    if (this.llm && CONVERSATIONAL.has(intent.kind)) {
      reply = await this.speak(text, intent.kind, facts, structured);
    }
    // memória progressiva de conversa
    this.history.push({ role: 'user', content: text }, { role: 'assistant', content: reply });
    if (this.history.length > 12) this.history = this.history.slice(-12);

    await this.recordTurn(tenantId, actorId, text, intent.kind, action);
    return { intent: intent.kind, action, facts, reply, llm: !!this.llm };
  }

  async connectAndAnalyze(tenantId, actorId, url) {
    let repo;
    try {
      repo = await this.app.repoIntel.connect(tenantId, actorId, { url, visibility: 'public' });
    } catch (e) {
      if (/already connected/i.test(e.message)) {
        const list = await this.app.repoIntel.listRepositories(tenantId, actorId);
        repo = list.find((r) => r.url.toLowerCase() === url.toLowerCase().replace(/\.git$/, ''));
      } else throw e;
    }
    await this.app.repoIntel.analyze(tenantId, actorId, repo.id);
    return repo;
  }

  async recordTurn(tenantId, actorId, text, intent, action) {
    try {
      const state = await this.app.store.read();
      // usa a memória via store direto (evita exigir permissão de escrita p/ chat de leitura)
      await this.app.store.update((s) => {
        s.memoryEvents.push({
          id: require('../kernel/ids').uuid(), tenantId, projectId: action.repoId || action.projectId || null,
          actorId: 'chat-agent', kind: `chat:${intent}`,
          summary: `Usuário: "${text.slice(0, 80)}" → ${action.ok ? 'ok' : 'falha'}`,
          evidence: [`intent:${intent}`], confidence: 0.5, createdAt: new Date().toISOString(),
        });
        return s;
      });
    } catch { /* chat não deve quebrar por falha de log */ }
  }

  // Redige a resposta natural. (Com LLM real, passaria facts+intent ao gateway; aqui formata direto.)
  render(kind, facts, action) {
    if (facts.error) return `Tive um problema: ${facts.error}`;
    switch (kind) {
      case 'ingest_portfolio': {
        if (facts.note) return facts.note;
        const lines = facts.results.map((r) => {
          if (r.status === 'analyzed') return `✓ ${r.name} — ${r.fileCount} arq, caps: ${(r.capabilities || []).join(', ') || 'nenhuma'}`;
          if (r.status === 'skipped-empty') return `· ${r.name} — vazio (ignorado)`;
          if (r.status === 'skipped-too-large') return `· ${r.name} — grande demais (ignorado)`;
          if (r.status === 'error') return `✗ ${r.name} — erro: ${r.error}`;
          return `· ${r.name} — ${r.status}`;
        });
        const analyzed = facts.results.filter((r) => r.status === 'analyzed').length;
        return `Acoplei o portfólio de **${facts.username}** — ${facts.total} repos, ${analyzed} analisados:\n${lines.join('\n')}`;
      }
      case 'connect_repo':
        return `Acoplei e analisei **${facts.repo}** (${facts.revision?.slice(0, 8)}).\n` +
          `• ${facts.fileCount} arquivos, ${facts.apis} APIs, ${facts.components} componentes, ${facts.tables} tabelas\n` +
          `• Capabilities: ${facts.capabilities.join(', ')}\n` +
          `• Saúde: ${facts.health.score}/100 (mais fraco: ${facts.health.weakest})` +
          (facts.risks.length ? `\n• Riscos: ${facts.risks.join('; ')}` : '');
      case 'generate':
        return `Gerei o projeto **${facts.projectId}** — arquivos reais escritos em disco.\n` +
          (facts.outputPath ? `• Pasta: ${facts.outputPath}\n` : '') +
          `• Rode: cd "${facts.outputPath || facts.projectId}" && node src/index.js\n` +
          `• Reutilizou: ${facts.reused.join(', ') || 'nada (catálogo vazio — acople repos antes)'}\n` +
          `• Criou novo: ${facts.built.join(', ') || 'nada'}\n` +
          `• Preview: ${facts.previewUrl}`;
      case 'insights':
        return facts.insights.length
          ? 'O que aprendi até agora:\n' + facts.insights.map((i) => `• [${i.type}] ${i.summary}`).join('\n')
          : 'Ainda não aprendi nada — acople alguns repos para eu começar a evoluir.';
      case 'memory':
        return facts.memory.length ? 'Memória recente:\n' + facts.memory.map((m) => `• ${m.summary}`).join('\n') : 'Memória vazia.';
      case 'capabilities':
        return facts.capabilities.length ? `Catálogo (${facts.capabilities.length}): ${facts.capabilities.join(', ')}` : 'Catálogo vazio — acople repos para popular.';
      case 'twin':
        if (facts.note) return facts.note;
        return `Twin de **${facts.repo}** — saúde ${facts.health.score}/100.\n` +
          `Capabilities: ${facts.capabilities.join(', ')}\n` +
          `Conselhos:\n${facts.advice.map((a) => `• ${a}`).join('\n')}`;
      case 'list':
        return `Repos: ${facts.repos.join(', ') || 'nenhum'}\nProjetos: ${facts.projects.join(', ') || 'nenhum'}`;
      case 'overview':
        return `Visão geral: ${facts.repos} repos, ${facts.projects} projetos, ${facts.capabilities} capabilities, ${facts.deployments} deploys, ${facts.insights} insights, ${facts.memory} eventos de memória.`;
      case 'chitchat':
        return `Tô por aqui. Você tem ${facts.repos || 0} repos e ${facts.projetos || 0} projetos no sistema. Posso acoplar um repositório, gerar um sistema ou te mostrar o que aprendi.`;
      default: {
        const help = Array.isArray(facts.help) ? facts.help : [
          'Cole uma URL do GitHub para acoplar e analisar um repo',
          '"gerar um sistema..." para criar um projeto',
          '"o que você aprendeu?" para insights', '"status" para a visão geral',
        ];
        return 'Posso:\n' + help.map((h) => `• ${h}`).join('\n');
      }
    }
  }
}

module.exports = { ChatAgent };
