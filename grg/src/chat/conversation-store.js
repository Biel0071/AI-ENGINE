// ConversationStore: historico de conversa persistido + contexto relevante recuperado.
//
// Por que existe: o ChatAgent respondia sem memoria entre requisicoes. Fechar a aba perdia
// tudo. Para chat de VOZ isso e pior que em texto -- o usuario nao ve o que disse, entao nao
// tem como repetir o contexto manualmente.
//
// Nao reimplementa busca vetorial: compoe o MemoryEngine que ja existe (embedding + qdrant +
// fallback lexical). Um segundo caminho de embedding divergiria do primeiro na dimensao do
// vetor e na normalizacao, e a colecao do qdrant e a mesma.
//
// Sumarizacao: qwen2.5:1.5b tem contexto curto. Ao passar do teto, as mensagens antigas viram
// UM resumo e saem do prompt -- sem isso o modelo comeca a truncar silenciosamente e a
// conversa "esquece" o inicio sem avisar ninguem.
const crypto = require('node:crypto');

const MAX_TURNS_IN_PROMPT = 12;      // 6 idas e voltas cabem em ~2k tokens
const SUMMARY_TRIGGER_TURNS = 20;    // acima disso, condensa o excedente
const RELEVANT_MEMORY_LIMIT = 3;

function nowIso() { return new Date().toISOString(); }

class ConversationStore {
  constructor({ store, memory = null, llm = null, events = null } = {}) {
    if (!store) throw new Error('ConversationStore requires a store');
    this.store = store;
    this.memory = memory;
    this.llm = llm;
    this.events = events;
  }

  async open(tenantId, actorId, { title = null, conversationId = null } = {}) {
    const id = conversationId || `conv_${crypto.randomUUID()}`;
    let created = null;
    await this.store.update((state) => {
      state.conversations = state.conversations || [];
      const existing = state.conversations.find((c) => c.id === id && c.tenantId === tenantId);
      if (existing) { created = existing; return state; }
      created = {
        id, tenantId, actorId,
        title: title || null,
        summary: null,
        summarizedThrough: 0,
        status: 'ACTIVE',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      state.conversations.push(created);
      return state;
    });
    return created;
  }

  // source: 'text' | 'voice' -- a origem e medida, nunca assumida. Uma mensagem interrompida
  // e gravada igual, com interrupted:true: e conteudo real que o usuario viu na tela.
  async append(tenantId, actorId, conversationId, { role, content, source = 'text', tokens = null, interrupted = false, model = null } = {}) {
    if (!role) throw new Error('message requires role');
    const message = {
      id: `msg_${crypto.randomUUID()}`,
      tenantId, conversationId, actorId,
      role,
      content: String(content == null ? '' : content),
      source: source === 'voice' ? 'voice' : 'text',
      tokens: Number.isFinite(tokens) ? tokens : null,
      model: model || null,
      interrupted: Boolean(interrupted),
      createdAt: nowIso(),
    };
    await this.store.update((state) => {
      state.messages = state.messages || [];
      state.messages.push(message);
      const conversation = (state.conversations || []).find((c) => c.id === conversationId && c.tenantId === tenantId);
      if (conversation) {
        conversation.updatedAt = message.createdAt;
        if (!conversation.title && role === 'user' && message.content) {
          conversation.title = message.content.slice(0, 80);
        }
      }
      return state;
    });

    // Indexa no MemoryEngine para recuperacao futura. Falha aqui nao pode derrubar o chat:
    // a mensagem JA esta persistida, e perder o indice degrada a busca, nao a conversa.
    // kind/classification em minusculo e provenance obrigatoria: contrato do MemoryEngine
    // (validateInput lanca ValidationError sem isso). 'episodic' e o kind correto para um
    // turno de conversa -- um evento datado, nao conhecimento consolidado.
    if (this.memory && message.content && role !== 'system') {
      try {
        await this.memory.remember(tenantId, actorId, {
          kind: 'episodic',
          classification: 'internal',
          title: `${role}: ${message.content.slice(0, 60)}`,
          content: message.content,
          tags: ['chat', message.source],
          provenance: { type: 'chat', reference: `${conversationId}/${message.id}` },
        });
      } catch { /* indice degradado, conversa intacta */ }
    }
    return message;
  }

  async history(tenantId, conversationId, { limit = 200 } = {}) {
    const state = await this.store.read();
    return (state.messages || [])
      .filter((m) => m.tenantId === tenantId && m.conversationId === conversationId)
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
      .slice(-limit);
  }

  async list(tenantId, { limit = 50 } = {}) {
    const state = await this.store.read();
    return (state.conversations || [])
      .filter((c) => c.tenantId === tenantId)
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      .slice(0, limit);
  }

  // Monta o prompt real enviado ao modelo: system + resumo (se houver) + contexto relevante
  // recuperado + as ultimas N trocas. Devolve tambem o que foi usado, para o painel poder
  // mostrar de onde veio o contexto em vez de o usuario ter que confiar.
  async buildPrompt(tenantId, actorId, conversationId, userText, { system = null } = {}) {
    const [state, turns] = await Promise.all([
      this.store.read(),
      this.history(tenantId, conversationId, { limit: SUMMARY_TRIGGER_TURNS * 2 }),
    ]);
    const conversation = (state.conversations || []).find((c) => c.id === conversationId && c.tenantId === tenantId) || null;

    // MemoryEngine.query(tenantId, actorId, texto, options) -> {results:[{memory, score}]}.
    // Faz busca hibrida: lexical + vetorial (qdrant) + confianca. Nao ha um recall separado, e
    // duplicar essa combinacao aqui daria pontuacao diferente do resto do sistema.
    const recentContents = new Set(turns.slice(-MAX_TURNS_IN_PROMPT).map((t) => t.content));
    let relevant = [];
    if (this.memory && userText) {
      try {
        const found = await this.memory.query(tenantId, actorId, String(userText), { kind: 'episodic', tags: ['chat'], limit: RELEVANT_MEMORY_LIMIT * 3 });
        relevant = (found?.results || [])
          .map((row) => row.memory)
          .filter((m) => m && m.content)
          // Nao reinjetar o que ja esta nas ultimas trocas: duplicar gasta o contexto curto.
          .filter((m) => !recentContents.has(m.content))
          .slice(0, RELEVANT_MEMORY_LIMIT);
      } catch { relevant = []; }
    }

    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    if (conversation?.summary) {
      messages.push({ role: 'system', content: `Resumo da conversa anterior: ${conversation.summary}` });
    }
    if (relevant.length) {
      messages.push({
        role: 'system',
        content: `Contexto recuperado da memoria:\n${relevant.map((r) => `- ${String(r.content).slice(0, 300)}`).join('\n')}`,
      });
    }
    for (const turn of turns.slice(-MAX_TURNS_IN_PROMPT)) {
      if (turn.role === 'user' || turn.role === 'assistant') {
        messages.push({ role: turn.role, content: turn.content });
      }
    }
    if (userText) messages.push({ role: 'user', content: String(userText) });

    return {
      messages,
      usedSummary: Boolean(conversation?.summary),
      usedMemories: relevant.length,
      turnsIncluded: Math.min(turns.length, MAX_TURNS_IN_PROMPT),
      turnsTotal: turns.length,
    };
  }

  // Condensa o excedente num resumo unico. Sem llm nao ha resumo: devolve unsummarized com o
  // motivo, em vez de fabricar um resumo truncando texto (que perderia justamente o sentido).
  async summarizeIfNeeded(tenantId, actorId, conversationId) {
    const turns = await this.history(tenantId, conversationId, { limit: 500 });
    if (turns.length <= SUMMARY_TRIGGER_TURNS) {
      return { summarized: false, reason: 'abaixo do limite', turns: turns.length };
    }
    if (!this.llm || typeof this.llm.chat !== 'function') {
      return { summarized: false, reason: 'sem llm para resumir', turns: turns.length };
    }
    const excess = turns.slice(0, turns.length - MAX_TURNS_IN_PROMPT);
    const transcript = excess.map((t) => `${t.role}: ${t.content}`).join('\n').slice(0, 6000);
    let summary;
    try {
      const out = await this.llm.chat({
        messages: [
          { role: 'system', content: 'Resuma a conversa em portugues, em no maximo 5 frases. Preserve decisoes, nomes e numeros. Nao invente nada.' },
          { role: 'user', content: transcript },
        ],
        temperature: 0.2,
      });
      summary = (out?.text || '').trim();
    } catch (error) {
      return { summarized: false, reason: `llm falhou: ${error.message}`, turns: turns.length };
    }
    if (!summary) return { summarized: false, reason: 'llm devolveu vazio', turns: turns.length };

    await this.store.update((state) => {
      const conversation = (state.conversations || []).find((c) => c.id === conversationId && c.tenantId === tenantId);
      if (conversation) {
        conversation.summary = summary;
        conversation.summarizedThrough = excess.length;
        conversation.updatedAt = nowIso();
      }
      return state;
    });
    return { summarized: true, summary, condensed: excess.length, turns: turns.length };
  }

  // Preferencias por usuario (modo de voz, TTS, velocidade, sensibilidade do VAD).
  // No banco, nao so no localStorage: o usuario troca de aparelho e espera o mesmo setup.
  async preferences(tenantId, actorId) {
    const state = await this.store.read();
    const row = (state.chatPreferences || []).find((p) => p.tenantId === tenantId && p.actorId === actorId);
    return row || {
      tenantId, actorId,
      inputMode: 'text',
      ttsEnabled: false,
      ttsVoice: null,
      ttsRate: 1,
      vadSensitivity: 0.5,
      updatedAt: null,
    };
  }

  async savePreferences(tenantId, actorId, patch = {}) {
    const allowed = ['inputMode', 'ttsEnabled', 'ttsVoice', 'ttsRate', 'vadSensitivity'];
    const modes = ['text', 'record', 'push', 'continuous'];
    let saved = null;
    await this.store.update((state) => {
      state.chatPreferences = state.chatPreferences || [];
      let row = state.chatPreferences.find((p) => p.tenantId === tenantId && p.actorId === actorId);
      if (!row) {
        row = { tenantId, actorId, inputMode: 'text', ttsEnabled: false, ttsVoice: null, ttsRate: 1, vadSensitivity: 0.5 };
        state.chatPreferences.push(row);
      }
      for (const key of allowed) {
        if (patch[key] === undefined) continue;
        if (key === 'inputMode' && !modes.includes(patch[key])) continue;
        if (key === 'ttsRate') { row.ttsRate = Math.min(2, Math.max(0.5, Number(patch[key]) || 1)); continue; }
        if (key === 'vadSensitivity') { row.vadSensitivity = Math.min(1, Math.max(0, Number(patch[key]))); continue; }
        if (key === 'ttsEnabled') { row.ttsEnabled = Boolean(patch[key]); continue; }
        row[key] = patch[key];
      }
      row.updatedAt = nowIso();
      saved = row;
      return state;
    });
    return saved;
  }
}

module.exports = { ConversationStore, MAX_TURNS_IN_PROMPT, SUMMARY_TRIGGER_TURNS };
