'use strict';
// FÊNIX Universal Hub (2026-11-11): o FÊNIX como ponto comum entre Claude Code, Codex,
// Antigravity, modelos locais e o próprio dono. Não é uma memória nova: o conhecimento vai para
// o MemoryEngine existente (com origem, confiança e versões); aqui ficam só o que faltava —
// identidade por ferramenta, mensagens no protocolo comum, travas de arquivo e contexto compacto.
const crypto = require('node:crypto');
const { uuid } = require('../kernel/ids');
const { lexicalScore } = require('../memory/embedding');
const { ValidationError, ForbiddenError, NotFoundError, ConflictError, RateLimitError } = require('../kernel/errors');

const PROVIDERS = ['CLAUDE_CODE', 'OPENAI_CODEX', 'ANTIGRAVITY', 'FENIX_AGENT', 'USER_MANUAL', 'OLLAMA_AGENT', 'OTHER_LLM'];
const SCOPES = ['memory:read', 'memory:write', 'messages:read', 'messages:write', 'locks:write', 'jobs:submit'];
const DEFAULT_SCOPES = ['memory:read', 'memory:write', 'messages:read', 'messages:write', 'locks:write'];
const MESSAGE_TYPES = ['IDEA', 'QUESTION', 'DISCOVERY', 'TASK_REQUEST', 'TASK_ACCEPTED', 'CODE_PROPOSAL', 'PATCH_READY',
  'REVIEW_REQUEST', 'REVIEW_RESULT', 'TEST_RESULT', 'BUG_REPORT', 'DECISION', 'KNOWLEDGE_UPDATE', 'MISSION_COMPLETED', 'BLOCKED'];
// Classes de conhecimento pedidas pelo dono; viram a tag `class:<nome>` na memória.
const KNOWLEDGE_CLASSES = ['permanent', 'project_context', 'architecture_decision', 'technical_discovery',
  'temporary_task', 'execution_evidence', 'unvalidated_suggestion'];
const TOKEN_PREFIX = 'fxc_';
const MAX_MESSAGES_PER_TENANT = 500;
const MAX_PAYLOAD_CHARS = 20_000;
const SEND_LIMIT_PER_MINUTE = 30; // proteção contra laço entre IAs
const PRESENCE_WRITE_EVERY_MS = 5 * 60 * 1000; // presença sem gravar o store a cada pedido

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
const nowIso = () => new Date().toISOString();
const clip = (value, max) => String(value ?? '').slice(0, max);

function publicClient(client) {
  if (!client) return null;
  const { tokenHash, ...rest } = client;
  return rest;
}

class UniversalHub {
  constructor({ store, bus = null, controlPlane, memory, clock = () => Date.now() }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.memory = memory;
    this.clock = clock;
    this.lastSeenWrite = new Map();
  }

  // Identidade de quem chama: a ferramenta (se houver) e o humano dono da conexão.
  static identity(cx) {
    if (cx?.aiClient) return { provider: cx.aiClient.provider, clientId: cx.aiClient.id, label: cx.aiClient.label, human: false };
    return { provider: 'USER_MANUAL', clientId: `user:${cx?.actorId || 'unknown'}`, label: cx?.actorId || 'usuário', human: true };
  }

  static requireScope(cx, scope) {
    if (!cx?.aiClient) return; // humano autenticado: as permissões normais do papel valem
    if (!cx.aiClient.scopes.includes(scope)) throw new ForbiddenError(`AI client lacks scope ${scope}`);
  }

  // ── Conexões (só humanos administram) ─────────────────────────────────────────────
  async createClient(cx, { provider, label = null, scopes = DEFAULT_SCOPES, projectId = null, adapterVersion = null } = {}) {
    if (cx?.aiClient) throw new ForbiddenError('only a human can create AI client connections');
    await this.cp.authorize(cx.tenantId, cx.actorId, 'runtime:admin');
    const name = String(provider || '').toUpperCase();
    if (!PROVIDERS.includes(name)) throw new ValidationError(`provider must be one of ${PROVIDERS.join(', ')}`);
    const wanted = [...new Set((Array.isArray(scopes) ? scopes : DEFAULT_SCOPES).map(String))];
    const invalid = wanted.filter((scope) => !SCOPES.includes(scope));
    if (invalid.length) throw new ValidationError(`unknown scopes: ${invalid.join(', ')}`);
    const token = TOKEN_PREFIX + crypto.randomBytes(32).toString('base64url');
    const client = {
      id: `aic_${uuid()}`, tenantId: cx.tenantId, provider: name, label: clip(label || name, 80),
      ownerUserId: cx.actorId, scopes: wanted, projectId: projectId ? clip(projectId, 128) : null,
      adapterVersion: adapterVersion ? clip(adapterVersion, 40) : null,
      tokenHash: sha256(token), createdAt: nowIso(), createdBy: cx.actorId, lastSeenAt: null, revokedAt: null,
    };
    await this.store.update((state) => { state.aiClients.push(client); return state; });
    await this.bus?.emit?.('hub.client.created', { tenantId: cx.tenantId, clientId: client.id, provider: name });
    return { client: publicClient(client), token };
  }

  async revokeClient(cx, clientId) {
    if (cx?.aiClient) throw new ForbiddenError('only a human can revoke AI client connections');
    await this.cp.authorize(cx.tenantId, cx.actorId, 'runtime:admin');
    let found = null;
    await this.store.update((state) => {
      found = state.aiClients.find((item) => item.id === clientId && item.tenantId === cx.tenantId);
      if (found && !found.revokedAt) found.revokedAt = nowIso();
      return state;
    });
    if (!found) throw new NotFoundError('AI client not found');
    return publicClient(found);
  }

  async listClients(cx) {
    const state = await this.store.read();
    const locks = (state.hubLocks || []).filter((lock) => lock.tenantId === cx.tenantId && Date.parse(lock.expiresAt) > this.clock());
    return state.aiClients.filter((item) => item.tenantId === cx.tenantId).map((client) => ({
      ...publicClient(client),
      online: !client.revokedAt && Boolean(client.lastSeenAt) && this.clock() - Date.parse(client.lastSeenAt) < 15 * 60 * 1000,
      activeLocks: locks.filter((lock) => lock.ownerClientId === client.id).map((lock) => `${lock.projectId}:${lock.path}`),
    }));
  }

  // Chamado pela autenticação para tokens `fxc_`. Presença gravada no máximo a cada 5 min.
  async resolveToken(token) {
    if (!String(token || '').startsWith(TOKEN_PREFIX)) return null;
    const hash = sha256(token);
    const state = await this.store.read();
    const client = state.aiClients.find((item) => item.tokenHash === hash && !item.revokedAt);
    if (!client) return null;
    const last = this.lastSeenWrite.get(client.id) || 0;
    if (this.clock() - last > PRESENCE_WRITE_EVERY_MS) {
      this.lastSeenWrite.set(client.id, this.clock());
      this.store.update((s) => { const c = s.aiClients.find((item) => item.id === client.id); if (c) c.lastSeenAt = nowIso(); return s; }).catch(() => {});
    }
    return { id: client.id, provider: client.provider, label: client.label, scopes: client.scopes, tenantId: client.tenantId, ownerUserId: client.ownerUserId, projectId: client.projectId };
  }

  // ── Memória compartilhada (MemoryEngine existente) ────────────────────────────────
  async recordKnowledge(cx, input = {}) {
    UniversalHub.requireScope(cx, 'memory:write');
    const who = UniversalHub.identity(cx);
    const cls = String(input.class || input.knowledgeClass || '').toLowerCase();
    if (!KNOWLEDGE_CLASSES.includes(cls)) throw new ValidationError(`class must be one of ${KNOWLEDGE_CLASSES.join(', ')}`);
    const content = String(input.content || '').trim();
    if (!content) throw new ValidationError('content is required');
    const validation = cls === 'unvalidated_suggestion' ? 'unvalidated' : (cls === 'execution_evidence' ? 'evidence' : 'reported');
    const files = (Array.isArray(input.files) ? input.files : []).map((f) => clip(f, 300)).slice(0, 30);
    const memory = await this.memory.remember(cx.tenantId, cx.actorId, {
      kind: input.projectId ? 'project' : 'semantic',
      title: clip(input.title || `${cls} · ${who.provider}`, 300),
      content: files.length ? `${content}\n\nArquivos: ${files.join(', ')}` : content,
      projectId: input.projectId || null,
      confidence: input.confidence ?? (cls === 'unvalidated_suggestion' ? 0.3 : 0.7),
      tags: ['hub', `class:${cls}`, `provider:${who.provider.toLowerCase()}`, `validation:${validation}`, ...(input.tags || [])],
      provenance: { type: 'ai-hub', reference: `${who.provider}:${who.clientId}`, evidence: (input.evidence || []).map(String) },
    });
    await this.bus?.emit?.('hub.knowledge.recorded', { tenantId: cx.tenantId, memoryId: memory.id, class: cls, provider: who.provider, projectId: memory.projectId });
    return UniversalHub.knowledgeView(memory);
  }

  static knowledgeView(memory) {
    const tag = (prefix) => (memory.tags || []).find((t) => t.startsWith(prefix))?.slice(prefix.length) || null;
    return {
      id: memory.id, title: memory.title, content: memory.content, projectId: memory.projectId,
      class: tag('class:'), author: memory.provenance?.reference || memory.createdBy, provider: (tag('provider:') || '').toUpperCase() || null,
      validation: tag('validation:'), confidence: memory.confidence, version: memory.version,
      evidence: memory.provenance?.evidence || [], createdAt: memory.createdAt, updatedAt: memory.updatedAt,
    };
  }

  // Busca: com texto usa o ranking do MemoryEngine; sem texto lista as mais recentes.
  async searchKnowledge(cx, { q = '', projectId = null, knowledgeClass = null, provider = null, limit = 10 } = {}) {
    UniversalHub.requireScope(cx, 'memory:read');
    const max = Math.min(50, Math.max(1, Number(limit) || 10));
    const tags = ['hub', ...(knowledgeClass ? [`class:${String(knowledgeClass).toLowerCase()}`] : []), ...(provider ? [`provider:${String(provider).toLowerCase()}`] : [])];
    let memories;
    if (String(q).trim()) {
      const res = await this.memory.query(cx.tenantId, cx.actorId, String(q), { projectId: projectId || undefined, tags, limit: max });
      // O ranking do MemoryEngine soma 0,1 x confiança: toda memória teria nota > 0. Só entra
      // o que de fato combina com o texto pedido.
      memories = res.results.map((item) => item.memory || item)
        .filter((m) => lexicalScore(String(q), `${m.title} ${m.content}`) > 0);
    } else {
      await this.cp.authorize(cx.tenantId, cx.actorId, 'memory:read');
      const state = await this.store.read();
      memories = state.memories.filter((m) => m.tenantId === cx.tenantId && m.status === 'ACTIVE'
        && tags.every((t) => (m.tags || []).includes(t)) && (!projectId || m.projectId === projectId))
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, max);
    }
    return memories.map(UniversalHub.knowledgeView);
  }

  // ── Mensagens no protocolo comum ──────────────────────────────────────────────────
  async sendMessage(cx, input = {}) {
    UniversalHub.requireScope(cx, 'messages:write');
    const who = UniversalHub.identity(cx);
    const type = String(input.message_type || input.type || '').toUpperCase();
    if (!MESSAGE_TYPES.includes(type)) throw new ValidationError(`message_type must be one of ${MESSAGE_TYPES.join(', ')}`);
    const receiver = String(input.receiver || 'FENIX').toUpperCase();
    const payloadText = JSON.stringify(input.payload ?? null);
    if (payloadText.length > MAX_PAYLOAD_CHARS) throw new ValidationError(`payload larger than ${MAX_PAYLOAD_CHARS} characters`);
    const now = this.clock();
    const dedupeKey = sha256(`${who.clientId}|${type}|${receiver}|${input.project_id || ''}|${payloadText}`);
    let message = null;
    let duplicate = false;
    await this.store.update((state) => {
      const mine = state.hubMessages.filter((m) => m.tenantId === cx.tenantId && m.sender.clientId === who.clientId);
      const recentSame = mine.find((m) => m.dedupeKey === dedupeKey && now - Date.parse(m.timestamp) < 10 * 60 * 1000);
      if (recentSame) { message = recentSame; duplicate = true; return state; }
      if (mine.filter((m) => now - Date.parse(m.timestamp) < 60 * 1000).length >= SEND_LIMIT_PER_MINUTE) {
        throw new RateLimitError('message rate limit: too many messages from this client in the last minute');
      }
      const id = uuid();
      message = {
        message_id: id, tenantId: cx.tenantId,
        sender: { provider: who.provider, clientId: who.clientId, label: who.label },
        receiver, project_id: input.project_id ? clip(input.project_id, 128) : null,
        session_id: input.session_id ? clip(input.session_id, 128) : null,
        message_type: type, timestamp: new Date(now).toISOString(),
        context_reference: input.context_reference ? clip(input.context_reference, 500) : null,
        payload: input.payload ?? null,
        requested_action: input.requested_action ? clip(input.requested_action, 500) : null,
        permission_scope: input.permission_scope ? clip(input.permission_scope, 80) : null,
        correlation_id: input.correlation_id ? clip(input.correlation_id, 128) : id,
        dedupeKey,
      };
      state.hubMessages.push(message);
      const tenantMessages = state.hubMessages.filter((m) => m.tenantId === cx.tenantId);
      if (tenantMessages.length > MAX_MESSAGES_PER_TENANT) {
        const drop = new Set(tenantMessages.slice(0, tenantMessages.length - MAX_MESSAGES_PER_TENANT).map((m) => m.message_id));
        state.hubMessages = state.hubMessages.filter((m) => !drop.has(m.message_id));
      }
      return state;
    });
    if (!duplicate) await this.bus?.emit?.('hub.message', { tenantId: cx.tenantId, messageId: message.message_id, type, receiver, sender: who.provider, projectId: message.project_id });
    return { ...UniversalHub.messageView(message), duplicate };
  }

  static messageView(message) {
    const { dedupeKey, tenantId, ...rest } = message;
    return rest;
  }

  // Caixa de entrada: mensagens para o provedor, para a conexão, para ALL; humanos veem tudo.
  async inbox(cx, { projectId = null, since = null, type = null, correlationId = null, limit = 50 } = {}) {
    UniversalHub.requireScope(cx, 'messages:read');
    const who = UniversalHub.identity(cx);
    const state = await this.store.read();
    const max = Math.min(200, Math.max(1, Number(limit) || 50));
    return state.hubMessages.filter((m) => m.tenantId === cx.tenantId
      && (who.human || ['ALL', 'FENIX', who.provider, who.clientId.toUpperCase()].includes(m.receiver) || m.sender.clientId === who.clientId)
      && (!projectId || m.project_id === projectId)
      && (!since || Date.parse(m.timestamp) > Date.parse(since))
      && (!type || m.message_type === String(type).toUpperCase())
      && (!correlationId || m.correlation_id === correlationId))
      .slice(-max).map(UniversalHub.messageView);
  }

  // ── Travas de arquivo (ninguém sobrescreve em silêncio) ───────────────────────────
  async acquireLock(cx, { projectId, path, ttlSeconds = 900, reason = null } = {}) {
    UniversalHub.requireScope(cx, 'locks:write');
    const who = UniversalHub.identity(cx);
    if (!projectId || !path) throw new ValidationError('projectId and path are required');
    const ttl = Math.min(3600, Math.max(30, Number(ttlSeconds) || 900));
    const now = this.clock();
    let lock = null;
    let conflict = null;
    await this.store.update((state) => {
      state.hubLocks = state.hubLocks.filter((l) => Date.parse(l.expiresAt) > now);
      const existing = state.hubLocks.find((l) => l.tenantId === cx.tenantId && l.projectId === projectId && l.path === path);
      if (existing && existing.ownerClientId !== who.clientId) { conflict = existing; return state; }
      if (existing) {
        existing.expiresAt = new Date(now + ttl * 1000).toISOString();
        lock = existing;
      } else {
        lock = { id: uuid(), tenantId: cx.tenantId, projectId: clip(projectId, 128), path: clip(path, 500),
          ownerClientId: who.clientId, ownerProvider: who.provider, reason: reason ? clip(reason, 300) : null,
          acquiredAt: new Date(now).toISOString(), expiresAt: new Date(now + ttl * 1000).toISOString() };
        state.hubLocks.push(lock);
      }
      return state;
    });
    if (conflict) {
      const error = new ConflictError(`file locked by ${conflict.ownerProvider} until ${conflict.expiresAt}`);
      error.holder = { provider: conflict.ownerProvider, clientId: conflict.ownerClientId, expiresAt: conflict.expiresAt, reason: conflict.reason };
      throw error;
    }
    await this.bus?.emit?.('hub.lock.acquired', { tenantId: cx.tenantId, projectId, path, provider: who.provider });
    return lock;
  }

  async releaseLock(cx, { projectId, path } = {}) {
    UniversalHub.requireScope(cx, 'locks:write');
    const who = UniversalHub.identity(cx);
    let released = false;
    await this.store.update((state) => {
      const before = state.hubLocks.length;
      state.hubLocks = state.hubLocks.filter((l) => !(l.tenantId === cx.tenantId && l.projectId === projectId && l.path === path
        && (l.ownerClientId === who.clientId || who.human)));
      released = state.hubLocks.length < before;
      return state;
    });
    return { released };
  }

  async listLocks(cx, { projectId = null } = {}) {
    const state = await this.store.read();
    const now = this.clock();
    return state.hubLocks.filter((l) => l.tenantId === cx.tenantId && Date.parse(l.expiresAt) > now && (!projectId || l.projectId === projectId));
  }

  // ── Contexto compacto ao entrar num projeto ───────────────────────────────────────
  async context(cx, { projectId = null, depth = 'compact' } = {}) {
    UniversalHub.requireScope(cx, 'memory:read');
    const deep = depth === 'deep';
    const n = deep ? 15 : 5;
    const state = await this.store.read();
    const scoped = (items) => (items || []).filter((item) => item.tenantId === cx.tenantId && (!projectId || !item.projectId || item.projectId === projectId));
    const byNewest = (a, b) => String(b.createdAt || b.timestamp).localeCompare(String(a.createdAt || a.timestamp));
    const hubMemories = scoped(state.memories).filter((m) => m.status === 'ACTIVE' && (m.tags || []).includes('hub')).sort(byNewest);
    const ofClass = (cls) => hubMemories.filter((m) => m.tags.includes(`class:${cls}`)).slice(0, n).map((m) => {
      const v = UniversalHub.knowledgeView(m);
      return { id: v.id, title: v.title, author: v.author, validation: v.validation, createdAt: v.createdAt, ...(deep ? { content: v.content } : { summary: clip(v.content, 240) }) };
    });
    const jobs = scoped(state.runtimeJobs).sort(byNewest);
    const missions = scoped(state.missions).sort(byNewest);
    return {
      projectId, depth, generatedAt: nowIso(),
      decisions: ofClass('architecture_decision'),
      discoveries: ofClass('technical_discovery'),
      openSuggestions: ofClass('unvalidated_suggestion'),
      recentEvidence: ofClass('execution_evidence'),
      inbox: (await this.inbox(cx, { projectId, limit: n })).slice(-n).map((m) => ({ id: m.message_id, type: m.message_type, from: m.sender.provider, receiver: m.receiver, at: m.timestamp, action: m.requested_action })),
      locks: (await this.listLocks(cx, { projectId })).map((l) => ({ path: l.path, owner: l.ownerProvider, expiresAt: l.expiresAt })),
      presence: (await this.listClients(cx)).filter((c) => !c.revokedAt).map((c) => ({ provider: c.provider, label: c.label, online: c.online, lastSeenAt: c.lastSeenAt })),
      runtime: {
        jobs: { total: jobs.length, running: jobs.filter((j) => j.status === 'RUNNING').length, failed: jobs.filter((j) => ['FAILED', 'DEAD_LETTER'].includes(j.status)).length,
          recent: jobs.slice(0, n).map((j) => ({ id: j.id, type: j.type, status: j.status, at: j.createdAt })) },
        missions: { total: missions.length, recent: missions.slice(0, n).map((m) => ({ id: m.id, title: clip(m.title, 120), status: m.status, at: m.createdAt })) },
      },
    };
  }
}

module.exports = { UniversalHub, PROVIDERS, SCOPES, DEFAULT_SCOPES, MESSAGE_TYPES, KNOWLEDGE_CLASSES, TOKEN_PREFIX };