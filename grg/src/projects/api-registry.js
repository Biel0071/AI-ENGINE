'use strict';
/**
 * FÊNIX OS V8.3 — Universal API Registry
 * Maps all endpoints, methods, contracts, schemas, and live status across the ecosystem.
 */

const APIS = [
  // ─── FÊNIX OS Core APIs ───
  {
    endpoint: '/api/v2/conversation',
    method: 'POST',
    project: 'fenix-os',
    authentication: 'Bearer JWT / ActorId',
    request: { message: 'string (required)', contextType: 'string (optional)' },
    response: { ok: 'boolean', lane: 'FAST_LANE | JOB_LANE', response: 'string', tokens: 'number' },
    dependencies: ['ModelRouter', 'PromptEnhancer', 'JobQueueManager', 'FastLaneEngine'],
    consumer: 'CommandCenter UI, Telegram, API Clients',
    status: 'ONLINE',
    latencySlaMs: 300,
  },
  {
    endpoint: '/api/v2/models',
    method: 'GET',
    project: 'fenix-os',
    authentication: 'Bearer JWT',
    request: null,
    response: { ok: 'boolean', currentMode: 'string', availableModes: 'array', providers: 'object' },
    dependencies: ['ModelRouter'],
    consumer: 'CommandCenter UI, PromptEnhancer',
    status: 'ONLINE',
    latencySlaMs: 100,
  },
  {
    endpoint: '/api/v2/jobs',
    method: 'POST',
    project: 'fenix-os',
    authentication: 'Bearer JWT',
    request: { type: 'string', projectId: 'string', payload: 'object', priority: 'number' },
    response: { ok: 'boolean', jobId: 'number', status: 'QUEUED' },
    dependencies: ['BullMQ', 'Redis'],
    consumer: 'ConversationRouter, FastLaneEngine, Automation',
    status: 'ONLINE',
    latencySlaMs: 500,
  },
  {
    endpoint: '/api/v2/events/stream',
    method: 'GET',
    project: 'fenix-os',
    authentication: 'Bearer JWT / Query token',
    request: null,
    response: 'text/event-stream (SSE)',
    dependencies: ['FenixEventBus', 'Redis Pub/Sub'],
    consumer: 'AI City Canvas, Cockpit, Client Terminals',
    status: 'ONLINE',
    latencySlaMs: 50,
  },
  {
    endpoint: '/api/v2/projects',
    method: 'GET',
    project: 'fenix-os',
    authentication: 'Bearer JWT / Public in early mode',
    request: null,
    response: { ok: 'boolean', projects: 'array', count: 'number' },
    dependencies: ['ProjectRegistry'],
    consumer: 'CommandCenter UI, AI City Populator',
    status: 'ONLINE',
    latencySlaMs: 150,
  },

  // ─── ZapAI CRM APIs ───
  {
    endpoint: '/api/conversations',
    method: 'GET',
    project: 'zapai-crm',
    authentication: 'Bearer JWT',
    request: { limit: 'number', status: 'string' },
    response: { ok: 'boolean', conversations: 'array' },
    dependencies: ['SQLite/PostgreSQL', 'Baileys Sessions'],
    consumer: 'ZapAI Inbox, ChatListPanel',
    status: 'ONLINE',
    latencySlaMs: 200,
  },
  {
    endpoint: '/api/messages',
    method: 'POST',
    project: 'zapai-crm',
    authentication: 'Bearer JWT',
    request: { conversationId: 'string', text: 'string', mediaUrl: 'string' },
    response: { ok: 'boolean', messageId: 'string', status: 'SENT' },
    dependencies: ['Baileys WhatsApp Socket', 'EventEmitter'],
    consumer: 'ActiveChatPane, Automated Campaigns',
    status: 'ONLINE',
    latencySlaMs: 800,
  },
  {
    endpoint: '/api/quickReplies',
    method: 'GET',
    project: 'zapai-crm',
    authentication: 'Bearer JWT',
    request: null,
    response: { ok: 'boolean', quickReplies: 'array' },
    dependencies: ['Database Store'],
    consumer: 'QuickResponseModal, ActiveChatPane',
    status: 'ONLINE',
    latencySlaMs: 100,
  },
  {
    endpoint: '/api/campaignDispatch',
    method: 'POST',
    project: 'zapai-crm',
    authentication: 'Bearer JWT',
    request: { campaignId: 'string', contacts: 'array', template: 'string' },
    response: { ok: 'boolean', enqueued: 'number', estimatedDurationSec: 'number' },
    dependencies: ['BullMQ Message Queue', 'RateLimiter'],
    consumer: 'Campaigns UI',
    status: 'ONLINE',
    latencySlaMs: 400,
  },

  // ─── API Platform APIs ───
  {
    endpoint: '/v1/chat',
    method: 'POST',
    project: 'api-platform',
    authentication: 'x-api-key',
    request: { model: 'string', messages: 'array', temperature: 'number' },
    response: { id: 'string', choices: 'array', usage: 'object' },
    dependencies: ['Ollama / Qwen', 'OpenAI Provider', 'Redis Cache'],
    consumer: 'Fênix ModelRouter, Third-Party Clients',
    status: 'ONLINE',
    latencySlaMs: 1200,
  },
  {
    endpoint: '/admin/overview',
    method: 'GET',
    project: 'api-platform',
    authentication: 'Admin Token',
    request: null,
    response: { activeProviders: 'array', totalTokens: 'number', health: 'object' },
    dependencies: ['Prisma ORM', 'BullMQ'],
    consumer: 'API Platform Dashboard',
    status: 'ONLINE',
    latencySlaMs: 150,
  },
  {
    endpoint: '/admin/providers',
    method: 'GET',
    project: 'api-platform',
    authentication: 'Admin Token',
    request: null,
    response: { providers: 'array' },
    dependencies: ['ProviderConfigService'],
    consumer: 'ProvidersManager UI, Fênix AI Platform status',
    status: 'ONLINE',
    latencySlaMs: 150,
  },
];

function getAllApis(filterProject) {
  if (!filterProject) return APIS;
  const lower = filterProject.toLowerCase();
  return APIS.filter(a => a.project.toLowerCase() === lower || a.project.includes(lower));
}

function getApiByEndpoint(endpoint, method) {
  if (!endpoint) return null;
  return APIS.find(a => a.endpoint === endpoint && (!method || a.method.toUpperCase() === method.toUpperCase())) || null;
}

module.exports = { APIS, getAllApis, getApiByEndpoint };
