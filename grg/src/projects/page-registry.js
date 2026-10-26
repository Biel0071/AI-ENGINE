'use strict';
/**
 * FÊNIX OS — Universal Page & Screen Registry (v9.0)
 * Maps all frontend views, routes, components, wireframes, and navigation transition graphs
 * across all connected systems in GRG Space (fenix-os, zapai-crm, api-platform).
 */

const STAGES = Object.freeze({
  AUTH: { id: 'AUTH', label: '1. Entrada & Autenticação', color: '#6366f1', order: 1 },
  DASHBOARD: { id: 'DASHBOARD', label: '2. Dashboards & Visão Geral', color: '#38bdf8', order: 2 },
  OPERATIONS: { id: 'OPERATIONS', label: '3. Módulos Centrais & Operação', color: '#10b981', order: 3 },
  BUILDER: { id: 'BUILDER', label: '4. Construtores Visuais & IDE', color: '#f59e0b', order: 4 },
  GOVERNANCE: { id: 'GOVERNANCE', label: '5. Governança, Filas & Logs', color: '#ec4899', order: 5 }
});

const PAGES = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. ZAPAI CRM (SISTEMA ACOPLADO — WHATSAPP MARKETING & SALES AUTOMATION)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'zapai-login',
    project: 'zapai-crm',
    projectName: 'ZapAI CRM',
    projectColor: '#10b981',
    route: '/login',
    title: 'Portal de Acesso & Autenticação',
    component: 'Login',
    file: 'frontend-official/src/pages/Login.tsx',
    stage: 'AUTH',
    layoutType: 'auth',
    wireframe: {
      header: 'ZapAI CRM Enterprise',
      fields: ['E-mail corporativo', 'Senha de acesso', 'Token 2FA'],
      actions: ['Entrar no Sistema', 'Recuperar Senha', 'Acesso SSO Google']
    },
    navigationEdges: [
      { targetId: 'zapai-dashboard', label: 'Login Sucesso', action: 'auth_success', type: 'NAVIGATIONAL' }
    ],
    screenshot: '/screenshots/zapai/login.png',
    apiDependencies: ['/api/auth/login', '/api/auth/verify-2fa'],
    actions: ['login', 'sso_auth', 'recover_password'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'zapai-dashboard',
    project: 'zapai-crm',
    projectName: 'ZapAI CRM',
    projectColor: '#10b981',
    route: '/dashboard',
    title: 'Dashboard Operacional & KPIs',
    component: 'Dashboard',
    file: 'frontend-official/src/pages/Dashboard.tsx',
    stage: 'DASHBOARD',
    layoutType: 'dashboard',
    wireframe: {
      header: 'Painel Geral de Atendimento e Vendas',
      kpis: [
        { label: 'Conversas Ativas', value: '1.428', change: '+12%' },
        { label: 'Leads Qualificados', value: '384', change: '+8%' },
        { label: 'Taxa de Resposta', value: '98.2%', change: '+1.4%' }
      ],
      widgets: ['Gráfico de Volume Horário', 'Funil de Vendas Kanban', 'Atendentes Conectados']
    },
    navigationEdges: [
      { targetId: 'zapai-inbox', label: 'Acessar Inbox', action: 'view_chats', type: 'NAVIGATIONAL' },
      { targetId: 'zapai-contacts', label: 'Gestão de Leads', action: 'view_leads', type: 'NAVIGATIONAL' },
      { targetId: 'zapai-analytics', label: 'Ver Relatórios', action: 'view_analytics', type: 'NAVIGATIONAL' },
      { targetId: 'zapai-campaigns', label: 'Disparo Rápido', action: 'new_broadcast', type: 'NAVIGATIONAL' }
    ],
    screenshot: '/screenshots/zapai/dashboard.png',
    apiDependencies: ['/api/analytics', '/api/metrics', '/api/messages'],
    actions: ['view_kpis', 'filter_dates', 'export_reports'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'zapai-inbox',
    project: 'zapai-crm',
    projectName: 'ZapAI CRM',
    projectColor: '#10b981',
    route: '/inbox',
    title: 'Inbox Omnichannel & Chat Ao Vivo',
    component: 'Inbox',
    file: 'frontend-official/src/pages/Inbox.tsx',
    subComponents: ['ActiveChatPane', 'ChatListPanel', 'ConversationRow', 'FlowExecutionBanner', 'MessageRow', 'QuickResponseModal'],
    stage: 'OPERATIONS',
    layoutType: 'inbox',
    wireframe: {
      header: 'Central Omnichannel (WhatsApp Baileys + Webchat)',
      sidebar: ['Todos os Chats (14)', 'Aguardando Atendente (3)', 'Finalizados (1.210)'],
      mainType: 'chat',
      widgets: ['Histórico de Mensagens', 'Audio Player & Anexos', 'Input com Respostas Rápidas']
    },
    navigationEdges: [
      { targetId: 'zapai-contacts', label: 'Ver Dados do Lead', action: 'open_lead_drawer', type: 'NAVIGATIONAL' },
      { targetId: 'zapai-connections', label: 'Status da Linha', action: 'check_line_status', type: 'NAVIGATIONAL' }
    ],
    screenshot: '/screenshots/zapai/inbox.png',
    apiDependencies: ['/api/conversations', '/api/messages', '/api/quickReplies', '/api/whatsapp'],
    actions: ['send_message', 'quick_reply', 'assign_agent', 'filter_tags', 'search_chats'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'zapai-contacts',
    project: 'zapai-crm',
    projectName: 'ZapAI CRM',
    projectColor: '#10b981',
    route: '/contacts',
    title: 'Gestão de Contatos & Segmentação',
    component: 'Contacts',
    file: 'frontend-official/src/pages/Contacts.tsx',
    stage: 'OPERATIONS',
    layoutType: 'table',
    wireframe: {
      header: 'Base de Contatos & Tags de Segmentação',
      filters: ['Filtrar por Tag', 'Filtrar por Origem', 'Busca por Telefone'],
      mainType: 'table',
      columns: ['Nome', 'Telefone', 'Etiqueta', 'Status WhatsApp', 'Última Interação']
    },
    navigationEdges: [
      { targetId: 'zapai-campaigns', label: 'Disparar para Selecionados', action: 'bulk_campaign', type: 'NAVIGATIONAL' },
      { targetId: 'zapai-inbox', label: 'Iniciar Conversa', action: 'start_chat', type: 'NAVIGATIONAL' }
    ],
    screenshot: '/screenshots/zapai/contacts.png',
    apiDependencies: ['/api/contacts', '/api/leads'],
    actions: ['create_contact', 'import_csv', 'tag_contact', 'delete_contact'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'zapai-campaigns',
    project: 'zapai-crm',
    projectName: 'ZapAI CRM',
    projectColor: '#10b981',
    route: '/campaigns',
    title: 'Disparo de Campanhas em Massa',
    component: 'Campaigns',
    file: 'frontend-official/src/pages/Campaigns.tsx',
    stage: 'OPERATIONS',
    layoutType: 'builder',
    wireframe: {
      header: 'Gerenciador de Broadcast e Disparo em Massa',
      steps: ['1. Escolha da Lista', '2. Template de Mensagem', '3. Intervalo Anti-Ban', '4. Disparo'],
      widgets: ['Progresso do Disparo (4.500/5.000 enviados)', 'Taxa de Entrega 99.4%']
    },
    navigationEdges: [
      { targetId: 'zapai-queue', label: 'Monitorar Fila', action: 'view_dispatch_queue', type: 'NAVIGATIONAL' },
      { targetId: 'zapai-connections', label: 'Instâncias Emissoras', action: 'view_senders', type: 'NAVIGATIONAL' }
    ],
    screenshot: '/screenshots/zapai/campaigns.png',
    apiDependencies: ['/api/campaignDispatch', '/api/whatsapp'],
    actions: ['create_campaign', 'schedule_broadcast', 'pause_campaign'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'zapai-connections',
    project: 'zapai-crm',
    projectName: 'ZapAI CRM',
    projectColor: '#10b981',
    route: '/connections',
    title: 'Conexões WhatsApp (Instâncias Baileys)',
    component: 'Connections',
    file: 'frontend-official/src/pages/Connections.tsx',
    stage: 'GOVERNANCE',
    layoutType: 'grid',
    wireframe: {
      header: 'Instâncias Conectadas ao Cluster Baileys',
      cards: [
        { name: 'Linha Vendas Principal', number: '+55 11 98822-1001', status: 'CONECTADO', battery: '95%' },
        { name: 'Linha Suporte 24h', number: '+55 11 97711-2002', status: 'CONECTADO', battery: '100%' }
      ]
    },
    navigationEdges: [
      { targetId: 'zapai-inbox', label: 'Mensagens Recebidas', action: 'receive_stream', type: 'NAVIGATIONAL' }
    ],
    screenshot: '/screenshots/zapai/connections.png',
    apiDependencies: ['/api/sessions', '/api/whatsapp'],
    actions: ['scan_qr', 'restart_session', 'delete_instance'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'zapai-flows',
    project: 'zapai-crm',
    projectName: 'ZapAI CRM',
    projectColor: '#10b981',
    route: '/flows',
    title: 'Construtor Visual de Fluxos & Chatbots',
    component: 'Flows',
    file: 'frontend-official/src/pages/Flows.tsx',
    stage: 'BUILDER',
    layoutType: 'builder',
    wireframe: {
      header: 'Visual Flow Canvas (Drag & Drop Bot Node Builder)',
      nodes: ['Início (Mensagem Recebida)', 'Condição (Palavra-chave)', 'Menu de Opções', 'Delegação IA'],
      actions: ['Adicionar Nó', 'Testar Fluxo no Simulador', 'Publicar Versão']
    },
    navigationEdges: [
      { targetId: 'zapai-ai', label: 'Configurar Prompt do Bot', action: 'configure_ai', type: 'NAVIGATIONAL' },
      { targetId: 'ap-workflows', label: 'Acoplar Pipeline API Platform', action: 'link_platform_chain', type: 'CROSS_PROJECT' }
    ],
    screenshot: '/screenshots/zapai/flows.png',
    apiDependencies: ['/api/automation', '/api/flows'],
    actions: ['create_flow', 'publish_flow', 'test_flow'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'zapai-analytics',
    project: 'zapai-crm',
    projectName: 'ZapAI CRM',
    projectColor: '#10b981',
    route: '/analytics',
    title: 'Métricas, Funil & Relatórios',
    component: 'Analytics',
    file: 'frontend-official/src/pages/Analytics.tsx',
    stage: 'DASHBOARD',
    layoutType: 'analytics',
    wireframe: {
      header: 'Relatório Analítico de Produtividade e Vendas',
      charts: ['Tempo Médio de Atendimento (TMA: 2m 14s)', 'Conversão por Atendente', 'Horários de Pico'],
      actions: ['Exportar CSV', 'Exportar PDF Executivo']
    },
    navigationEdges: [
      { targetId: 'zapai-dashboard', label: 'Retornar ao Painel', action: 'nav_back', type: 'NAVIGATIONAL' }
    ],
    screenshot: '/screenshots/zapai/analytics.png',
    apiDependencies: ['/api/analytics'],
    actions: ['view_charts', 'download_pdf'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'zapai-ai',
    project: 'zapai-crm',
    projectName: 'ZapAI CRM',
    projectColor: '#10b981',
    route: '/ai',
    title: 'Configurações de Agentes de IA',
    component: 'AI',
    file: 'frontend-official/src/pages/AI.tsx',
    stage: 'BUILDER',
    layoutType: 'editor',
    wireframe: {
      header: 'Definição de Persona, Prompts de Vendas & RAG',
      fields: ['System Prompt', 'Modelo LLM (Gemini 2.5 / Qwen 2.5)', 'Temperatura: 0.3'],
      widgets: ['Simulador Interativo de Conversa com a IA']
    },
    navigationEdges: [
      { targetId: 'zapai-flows', label: 'Vincular ao Fluxo', action: 'bind_flow', type: 'NAVIGATIONAL' },
      { targetId: 'ap-providers', label: 'Conectar Provedor LLM', action: 'delegate_llm', type: 'CROSS_PROJECT' }
    ],
    screenshot: '/screenshots/zapai/ai.png',
    apiDependencies: ['/api/ai', '/api/aiConfig'],
    actions: ['configure_prompt', 'test_ai_agent'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'zapai-settings',
    project: 'zapai-crm',
    projectName: 'ZapAI CRM',
    projectColor: '#10b981',
    route: '/settings',
    title: 'Configurações Gerais & Segurança',
    component: 'Settings',
    file: 'frontend-official/src/pages/Settings.tsx',
    stage: 'GOVERNANCE',
    layoutType: 'settings',
    wireframe: {
      header: 'Configurações do Tenant, Webhooks e Permissões',
      sections: ['Dados da Empresa', 'Webhooks de Entrada/Saída', 'Usuários e Funções RBAC']
    },
    navigationEdges: [
      { targetId: 'zapai-connections', label: 'Gerenciar WhatsApp', action: 'goto_connections', type: 'NAVIGATIONAL' }
    ],
    screenshot: '/screenshots/zapai/settings.png',
    apiDependencies: ['/api/system'],
    actions: ['save_settings', 'toggle_dark_mode'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'zapai-queue',
    project: 'zapai-crm',
    projectName: 'ZapAI CRM',
    projectColor: '#10b981',
    route: '/queue',
    title: 'Fila de Mensagens & Workers BullMQ',
    component: 'Queue',
    file: 'frontend-official/src/pages/Queue.tsx',
    stage: 'GOVERNANCE',
    layoutType: 'console',
    wireframe: {
      header: 'Monitor da Fila Redis / BullMQ de Mensagens',
      counters: ['Na Fila: 0', 'Processando: 12', 'Concluídas: 48.910', 'Falhas: 2'],
      actions: ['Pausar Fila', 'Reprocessar Falhas', 'Limpar Concluídas']
    },
    navigationEdges: [
      { targetId: 'zapai-operations', label: 'Monitor do Cluster', action: 'view_cluster', type: 'NAVIGATIONAL' }
    ],
    screenshot: '/screenshots/zapai/queue.png',
    apiDependencies: ['/api/operations', '/api/metrics'],
    actions: ['clear_queue', 'retry_failed'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'zapai-operations',
    project: 'zapai-crm',
    projectName: 'ZapAI CRM',
    projectColor: '#10b981',
    route: '/operations',
    title: 'Operações & Monitoramento do Cluster',
    component: 'Operations',
    file: 'frontend-official/src/pages/Operations.tsx',
    stage: 'GOVERNANCE',
    layoutType: 'dashboard',
    wireframe: {
      header: 'Saúde do Servidor, Memória Node.js & Latência Redis',
      meters: ['Uptime: 99.98%', 'Heap: 412 MB / 2 GB', 'Event Loop Delay: 1.8ms']
    },
    navigationEdges: [
      { targetId: 'zapai-admin-hub', label: 'Painel Master', action: 'goto_master_hub', type: 'NAVIGATIONAL' }
    ],
    screenshot: '/screenshots/zapai/operations.png',
    apiDependencies: ['/api/operations'],
    actions: ['restart_workers'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'zapai-admin-hub',
    project: 'zapai-crm',
    projectName: 'ZapAI CRM',
    projectColor: '#10b981',
    route: '/admin-hub',
    title: 'Hub de Administração Master Multi-Tenant',
    component: 'AdminHub',
    file: 'frontend-official/src/pages/AdminHub.tsx',
    stage: 'GOVERNANCE',
    layoutType: 'grid',
    wireframe: {
      header: 'Gestão de Múltiplas Empresas e Cobrança SaaS',
      tables: ['Lista de Tenants', 'Consumo de Mensagens', 'Limites de Instâncias']
    },
    navigationEdges: [
      { targetId: 'fenix-projects', label: 'Vincular ao Fênix OS', action: 'link_to_fenix', type: 'CROSS_PROJECT' }
    ],
    screenshot: '/screenshots/zapai/admin-hub.png',
    apiDependencies: ['/api/adminMaster', '/api/cluster'],
    actions: ['manage_tenants', 'view_cluster_status'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. API PLATFORM (SISTEMA ACOPLADO — GATEWAY, PROVIDERS & MULTIMODAL AI)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ap-overview',
    project: 'api-platform',
    projectName: 'API Platform',
    projectColor: '#f59e0b',
    route: '/',
    title: 'API Platform Overview & Cluster',
    component: 'OverviewGrid',
    file: 'apps/dashboard/public/index.html',
    stage: 'DASHBOARD',
    layoutType: 'dashboard',
    wireframe: {
      header: 'Fastify + Prisma + BullMQ AI Gateway Hub (:3001)',
      kpis: [
        { label: 'Requisições / Min', value: '4.820' },
        { label: 'Provedores Ativos', value: '6 Online' },
        { label: 'Latência Média P95', value: '184ms' }
      ],
      widgets: ['Mapa de Endpoints REST/gRPC', 'Status dos Modelos Locais Ollama']
    },
    navigationEdges: [
      { targetId: 'ap-providers', label: 'Roteamento de IA', action: 'manage_providers', type: 'NAVIGATIONAL' },
      { targetId: 'ap-keys', label: 'Gerenciar Tokens API', action: 'manage_keys', type: 'NAVIGATIONAL' },
      { targetId: 'ap-workflows', label: 'Ver Pipelines IA', action: 'view_workflows', type: 'NAVIGATIONAL' },
      { targetId: 'ap-observability', label: 'Telemetria em Tempo Real', action: 'view_telemetry', type: 'NAVIGATIONAL' }
    ],
    screenshot: '/screenshots/api-platform/overview.png',
    apiDependencies: ['/admin/overview', '/health'],
    actions: ['view_metrics', 'view_active_providers'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'ap-providers',
    project: 'api-platform',
    projectName: 'API Platform',
    projectColor: '#f59e0b',
    route: '/providers',
    title: 'AI Providers & Intelligent Routing',
    component: 'ProvidersManager',
    file: 'apps/dashboard/public/app.js',
    stage: 'OPERATIONS',
    layoutType: 'grid',
    wireframe: {
      header: 'Catálogo de Modelos (Gemini, Claude, DeepSeek, Qwen)',
      cards: [
        { provider: 'Google Gemini Pro / Flash', status: 'ONLINE', latency: '210ms' },
        { provider: 'Anthropic Claude 3.5 Sonnet', status: 'ONLINE', latency: '340ms' },
        { provider: 'Ollama Local (Qwen 2.5 3B)', status: 'LOCAL HOST', latency: '38ms' }
      ]
    },
    navigationEdges: [
      { targetId: 'ap-workflows', label: 'Encadear em Workflow', action: 'chain_in_workflow', type: 'NAVIGATIONAL' },
      { targetId: 'fenix-mcp', label: 'Conectar ao Fênix MCP Hub', action: 'bind_fenix_mcp', type: 'CROSS_PROJECT' }
    ],
    screenshot: '/screenshots/api-platform/providers.png',
    apiDependencies: ['/admin/providers'],
    actions: ['toggle_provider', 'set_default_model', 'test_provider'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'ap-keys',
    project: 'api-platform',
    projectName: 'API Platform',
    projectColor: '#f59e0b',
    route: '/keys',
    title: 'API Key Management & Rate Limits',
    component: 'KeyManager',
    file: 'apps/dashboard/public/app.js',
    stage: 'GOVERNANCE',
    layoutType: 'table',
    wireframe: {
      header: 'Chaves de Autenticação para Microsserviços e Clientes',
      tableRows: ['pk_live_sec_fenix_master (Admin)', 'pk_live_sec_zapai_gateway (CRM)', 'pk_live_sec_analytics_ro (Audit)'],
      actions: ['Criar Nova Chave', 'Revogar Chave', 'Configurar Rate Limit (req/min)']
    },
    navigationEdges: [
      { targetId: 'ap-overview', label: 'Retornar ao Dashboard', action: 'nav_back', type: 'NAVIGATIONAL' }
    ],
    screenshot: '/screenshots/api-platform/keys.png',
    apiDependencies: ['/admin/keys'],
    actions: ['create_key', 'revoke_key', 'set_rate_limit'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'ap-workflows',
    project: 'api-platform',
    projectName: 'API Platform',
    projectColor: '#f59e0b',
    route: '/workflows',
    title: 'Multi-Step AI Workflows & DAG Pipelines',
    component: 'WorkflowBuilder',
    file: 'apps/dashboard/public/app.js',
    stage: 'BUILDER',
    layoutType: 'builder',
    wireframe: {
      header: 'Encadeamento de Modelos, RAG e Funções de Código',
      pipeline: ['Prompt Input ➔ Enriquecimento RAG ➔ Inferência LLM ➔ Validação de Esquema ➔ Retorno JSON'],
      actions: ['Executar Simulação', 'Visualizar DAG', 'Deploy Endpoint']
    },
    navigationEdges: [
      { targetId: 'ap-observability', label: 'Inspecionar Tracing', action: 'inspect_trace', type: 'NAVIGATIONAL' },
      { targetId: 'ap-images', label: 'Módulo Visual Text2Img', action: 'open_image_lab', type: 'NAVIGATIONAL' }
    ],
    screenshot: '/screenshots/api-platform/workflows.png',
    apiDependencies: ['/admin/workflows'],
    actions: ['create_workflow', 'execute_chain'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'ap-observability',
    project: 'api-platform',
    projectName: 'API Platform',
    projectColor: '#f59e0b',
    route: '/observability',
    title: 'Telemetria & Tokens em Tempo Real',
    component: 'ObservabilityDashboard',
    file: 'apps/dashboard/public/app.js',
    stage: 'GOVERNANCE',
    layoutType: 'analytics',
    wireframe: {
      header: 'Métricas de Tokens, Custo por Provedor & Logs HTTP',
      counters: ['Tokens Consumidos: 1.84M', 'Custo Estimado: $4.12', 'Cache Hit Ratio: 78.4%'],
      liveStream: 'Log de Requisições HTTP em Tempo Real (Fastify SSE)'
    },
    navigationEdges: [
      { targetId: 'fenix-observability', label: 'Federar com Fênix Cockpit', action: 'federate_telemetry', type: 'CROSS_PROJECT' }
    ],
    screenshot: '/screenshots/api-platform/observability.png',
    apiDependencies: ['/admin/observability'],
    actions: ['filter_logs', 'stream_metrics'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'ap-images',
    project: 'api-platform',
    projectName: 'API Platform',
    projectColor: '#f59e0b',
    route: '/images',
    title: 'Geração e Processamento de Imagens',
    component: 'ImageLab',
    file: 'apps/dashboard/public/app.js',
    stage: 'BUILDER',
    layoutType: 'editor',
    wireframe: {
      header: 'Estúdio Multimodal de Imagens (SDXL / Flux / DALL-E 3)',
      fields: ['Prompt de Imagem', 'Resolução (1024x1024)', 'Negative Prompt', 'Seed'],
      gallery: ['Preview de Ativos Recentes Gerados pela IA']
    },
    navigationEdges: [
      { targetId: 'ap-workflows', label: 'Vincular ao Workflow', action: 'chain_image_step', type: 'NAVIGATIONAL' }
    ],
    screenshot: '/screenshots/api-platform/images.png',
    apiDependencies: ['/admin/images', '/v3/text2img'],
    actions: ['generate_image', 'view_gallery'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. FÊNIX OS (SISTEMA OPERACIONAL CANÔNICO — 14 VIEWS INTEGRADAS)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'fenix-command-center',
    project: 'fenix-os',
    projectName: 'Fênix OS',
    projectColor: '#00d9ff',
    route: '/app#command',
    title: 'Central de Comando & Fast Lane',
    component: 'CommandCenter',
    file: 'grg/public/command-center.js',
    stage: 'DASHBOARD',
    layoutType: 'dashboard',
    wireframe: {
      header: 'Orquestração Suprema do Sistema, Chat Fast Lane & Swarm',
      kpis: [{ label: 'Agentes Online', value: '39' }, { label: 'Missões Ativas', value: '4' }, { label: 'CPU Cluster', value: '8%' }],
      widgets: ['Chat Conversacional em Linguagem Natural', 'Heatmap de Atividade dos Agentes', 'Linha do Tempo de Decisões']
    },
    navigationEdges: [
      { targetId: 'fenix-ai-city', label: 'Cidade 3D Viva', action: 'nav_city', type: 'NAVIGATIONAL' },
      { targetId: 'fenix-operations', label: 'Fila de Missões', action: 'nav_ops', type: 'NAVIGATIONAL' },
      { targetId: 'fenix-visual-ide', label: 'Visual IDE Studio', action: 'nav_ide', type: 'NAVIGATIONAL' },
      { targetId: 'fenix-projects', label: 'Explorador de Projetos', action: 'nav_projects', type: 'NAVIGATIONAL' }
    ],
    screenshot: '/screenshots/v11_phase4_command.png',
    apiDependencies: ['/api/v2/conversation', '/api/v2/models', '/api/v2/queue'],
    actions: ['send_prompt', 'switch_model', 'enqueue_job'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'fenix-ai-city',
    project: 'fenix-os',
    projectName: 'Fênix OS',
    projectColor: '#00d9ff',
    route: '/app#city',
    title: 'AI Living City 3D & Workstations',
    component: 'IsometricCity',
    file: 'grg/public/iso-city.js',
    stage: 'OPERATIONS',
    layoutType: 'spatial',
    wireframe: {
      header: 'Cenário Urbano 3D Isométrico com Escritório ZAI',
      canvas: 'Edifícios corporativos, vias urbanas e 39 avatares com crachás',
      interior: 'Workstations curvas com monitores duplos (código à esquerda e ondas de telemetria à direita)'
    },
    navigationEdges: [
      { targetId: 'fenix-agents', label: 'Inspecionar Agentes', action: 'inspect_agent', type: 'NAVIGATIONAL' },
      { targetId: 'fenix-visual-ide', label: 'Abrir Código do Prédio', action: 'open_building_code', type: 'NAVIGATIONAL' },
      { targetId: 'fenix-command-center', label: 'Voltar ao Comando', action: 'nav_command', type: 'NAVIGATIONAL' }
    ],
    screenshot: '/screenshots/v11_phase4_city.png',
    apiDependencies: ['/api/v2/events/stream', '/api/v2/living-city/agents', '/api/v2/living-city/state'],
    actions: ['zoom', 'inspect_building', 'track_agent'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'fenix-agents',
    project: 'fenix-os',
    projectName: 'Fênix OS',
    projectColor: '#00d9ff',
    route: '/app#agents',
    title: 'Workforce de Agentes & Swarms',
    component: 'AgentsView',
    file: 'grg/public/command-center.js',
    stage: 'OPERATIONS',
    layoutType: 'grid',
    wireframe: {
      header: 'Catálogo de 15 Cérebros Especializados (CEO, Arquitetura, UX, QA)',
      grid: ['Orion (Lead Architect)', 'Camila (QA & Verification)', 'Victor (Security)', 'Lucas (Infra)']
    },
    navigationEdges: [
      { targetId: 'fenix-operations', label: 'Delegar Missão', action: 'delegate_mission', type: 'NAVIGATIONAL' },
      { targetId: 'fenix-ai-city', label: 'Localizar na Cidade 3D', action: 'focus_city', type: 'NAVIGATIONAL' }
    ],
    screenshot: '/screenshots/v11_phase4_agents.png',
    apiDependencies: ['/api/v2/living-city/agents', '/api/agents/roles'],
    actions: ['inspect_agent', 'tune_skills', 'reassign_role'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'fenix-operations',
    project: 'fenix-os',
    projectName: 'Fênix OS',
    projectColor: '#00d9ff',
    route: '/app#operations',
    title: 'Tarefas, Fila BullMQ & Missões',
    component: 'OperationsView',
    file: 'grg/public/operations-live.js',
    stage: 'OPERATIONS',
    layoutType: 'table',
    wireframe: {
      header: 'Fila Operacional BullMQ, Missões Autônomas & Quality Gate',
      table: ['ID Missão', 'Objetivo de Engenharia', 'Agente Atribuído', 'Status', 'Evidência Factual']
    },
    navigationEdges: [
      { targetId: 'fenix-visual-ide', label: 'Ver Arquivos Criados', action: 'view_created_files', type: 'NAVIGATIONAL' },
      { targetId: 'fenix-command-center', label: 'Emitir Novo Comando', action: 'nav_command', type: 'NAVIGATIONAL' }
    ],
    screenshot: '/screenshots/v11_phase4_operations.png',
    apiDependencies: ['/api/missions', '/api/v2/jobs'],
    actions: ['approve_mission', 'cancel_job', 'inspect_logs'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'fenix-visual-ide',
    project: 'fenix-os',
    projectName: 'Fênix OS',
    projectColor: '#00d9ff',
    route: '/app#ide',
    title: 'Visual IDE Studio Lovable Split View',
    component: 'VisualIDE',
    file: 'grg/public/project-ide-live.js',
    stage: 'BUILDER',
    layoutType: 'editor',
    wireframe: {
      header: 'Lovable Studio Header (Run, Build, Git, Split View 50/50, Device Viewport Switcher)',
      leftPane: 'Árvore de Arquivos do Workspace + Monaco Code Editor com Realce de Sintaxe',
      rightPane: 'Moldura de Dispositivo (Desktop / Tablet / Mobile) com Live Interactive Webview & Hot-Reload'
    },
    navigationEdges: [
      { targetId: 'fenix-browser', label: 'Certificar Telas no QA', action: 'certify_screens', type: 'NAVIGATIONAL' },
      { targetId: 'zapai-flows', label: 'Editar Fluxos ZapAI', action: 'edit_crm_flows', type: 'CROSS_PROJECT' },
      { targetId: 'fenix-projects', label: 'Trocar de Workspace', action: 'switch_workspace', type: 'NAVIGATIONAL' }
    ],
    screenshot: '/screenshots/v11_phase4_ide.png',
    apiDependencies: ['/api/v2/projects/:id/files', '/api/project-mirror', '/api/fenix/projects/:id/git/commit'],
    actions: ['edit_code', 'save_file', 'switch_viewport', 'git_commit_push'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'fenix-projects',
    project: 'fenix-os',
    projectName: 'Fênix OS',
    projectColor: '#00d9ff',
    route: '/app#projects',
    title: 'Universal Project Registry & Hub',
    component: 'ProjectsView',
    file: 'grg/public/project-hub-live.js',
    stage: 'DASHBOARD',
    layoutType: 'grid',
    wireframe: {
      header: 'Registro de 43 Sistemas, Repositórios GitHub e Workspaces',
      cards: [
        { name: 'ZapAI CRM (ZAPAI-FINAL)', stack: 'React, Node, Baileys, Tailwind', status: 'ACOPLADO' },
        { name: 'API Platform', stack: 'Fastify, Prisma, BullMQ, Redis', status: 'ACOPLADO' },
        { name: 'MF Atacadista', stack: 'E-Commerce Next.js, Postgres', status: 'CONECTADO' }
      ]
    },
    navigationEdges: [
      { targetId: 'fenix-visual-ide', label: 'Abrir Projeto na IDE', action: 'open_in_ide', type: 'NAVIGATIONAL' },
      { targetId: 'zapai-dashboard', label: 'Abrir Portal ZapAI', action: 'open_zapai', type: 'CROSS_PROJECT' },
      { targetId: 'ap-overview', label: 'Abrir API Platform', action: 'open_api_platform', type: 'CROSS_PROJECT' }
    ],
    screenshot: '/screenshots/v11_phase4_projects.png',
    apiDependencies: ['/api/v2/projects', '/api/v2/projects-registry'],
    actions: ['select_project', 'scan_project', 'view_metrics'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'fenix-memory',
    project: 'fenix-os',
    projectName: 'Fênix OS',
    projectColor: '#00d9ff',
    route: '/app#memory',
    title: 'Memória Viva & Constelação 3D WebGL',
    component: 'MemoryView',
    file: 'grg/public/memory-live.js',
    stage: 'OPERATIONS',
    layoutType: 'spatial',
    wireframe: {
      header: 'Graph Brain (2.828 Entidades • 1.299 Ligações Ativas)',
      canvas: 'Constelação 3D esférica com nós autoiluminados, partículas viajando em curvas de Bézier',
      hud: 'Painel flutuante de física MCP com sliders de Repulsão, Distância e Glow Bloom'
    },
    navigationEdges: [
      { targetId: 'fenix-knowledge', label: 'Consultar RAG & Ontologia', action: 'view_rag', type: 'NAVIGATIONAL' },
      { targetId: 'fenix-flowgraph', label: 'Ver Mapa de Fluxo', action: 'view_flowgraph', type: 'NAVIGATIONAL' }
    ],
    screenshot: '/screenshots/v11_phase4_memory.png',
    apiDependencies: ['/api/v2/graph/data', '/api/fenix/memory/graph'],
    actions: ['explore_nodes', 'tune_physics', 'search_memory'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'fenix-knowledge',
    project: 'fenix-os',
    projectName: 'Fênix OS',
    projectColor: '#00d9ff',
    route: '/app#knowledge',
    title: 'Base de Conhecimento RAG & DNA',
    component: 'KnowledgeView',
    file: 'grg/public/unified-app.js',
    stage: 'OPERATIONS',
    layoutType: 'dashboard',
    wireframe: {
      header: 'Observatório & Sistema de Autoconhecimento RAG V14',
      grid: ['11 KPIs de Linhagem (Projects, Screens, Components, APIs, Services, Tests, Gaps)', 'Catálogo Semântico']
    },
    navigationEdges: [
      { targetId: 'fenix-flowgraph', label: 'Abrir Flow Graph', action: 'open_flow', type: 'NAVIGATIONAL' }
    ],
    screenshot: '/screenshots/v11_phase4_knowledge.png',
    apiDependencies: ['/api/v2/observatory/summary', '/api/knowledge'],
    actions: ['inspect_gap', 'sync_rag', 'search_dna'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'fenix-flowgraph',
    project: 'fenix-os',
    projectName: 'Fênix OS',
    projectColor: '#00d9ff',
    route: '/app#flowgraph',
    title: 'Stitch / Miro Spatial Screen Flow',
    component: 'FlowGraphView',
    file: 'grg/public/fenix-flow-graph.js',
    stage: 'BUILDER',
    layoutType: 'spatial',
    wireframe: {
      header: 'Spatial Canvas Miro / Stitch de Telas dos Sistemas Acoplados',
      ribbon: 'Filtro por Sistema (Todos, ZapAI, API Platform, Fênix) + Switcher Stitch / Miro',
      canvas: 'Cartões com mini-UI previews fiéis, pins de conexão e curvas de Bézier interativas'
    },
    navigationEdges: [
      { targetId: 'fenix-command-center', label: 'Voltar ao Comando', action: 'goto_command', type: 'NAVIGATIONAL' }
    ],
    screenshot: '/screenshots/v11_phase4_flowgraph.png',
    apiDependencies: ['/api/v2/pages', '/api/v2/projects'],
    actions: ['zoom_pan', 'drag_nodes', 'filter_project', 'inspect_hd_preview'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'fenix-mcp',
    project: 'fenix-os',
    projectName: 'Fênix OS',
    projectColor: '#00d9ff',
    route: '/app#mcp',
    title: 'Hub de Provedores & Servidores MCP',
    component: 'McpView',
    file: 'grg/public/unified-app.js',
    stage: 'GOVERNANCE',
    layoutType: 'grid',
    wireframe: {
      header: 'Model Context Protocol Registry & Federação de Ferramentas',
      servers: ['Firebase MCP', 'Gopls Go MCP', 'Chrome DevTools MCP', 'Filesystem MCP', 'Memory MCP']
    },
    navigationEdges: [
      { targetId: 'ap-providers', label: 'Provedores API Platform', action: 'link_providers', type: 'CROSS_PROJECT' }
    ],
    screenshot: '/screenshots/v11_phase4_mcp.png',
    apiDependencies: ['/api/mcp/servers', '/api/mcp/tools'],
    actions: ['call_tool', 'inspect_schema'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'fenix-browser',
    project: 'fenix-os',
    projectName: 'Fênix OS',
    projectColor: '#00d9ff',
    route: '/app#browser',
    title: 'Browser QA & Certificação Visual',
    component: 'BrowserQaView',
    file: 'grg/public/unified-app.js',
    stage: 'GOVERNANCE',
    layoutType: 'dashboard',
    wireframe: {
      header: 'Validação Visual Automatizada Playwright & Headless Browser',
      gallery: ['Capturas de Auditoria Visual das Telas', 'Relatório de Diferenças e Integridade']
    },
    navigationEdges: [
      { targetId: 'fenix-visual-ide', label: 'Corrigir na IDE', action: 'fix_in_ide', type: 'NAVIGATIONAL' }
    ],
    screenshot: '/screenshots/v11_phase4_browser.png',
    apiDependencies: ['/api/v2/visual-qa/screenshots', '/api/v2/browser/sessions'],
    actions: ['run_audit', 'refresh_screenshots'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'fenix-observability',
    project: 'fenix-os',
    projectName: 'Fênix OS',
    projectColor: '#00d9ff',
    route: '/app#observability',
    title: 'Cockpit de Telemetria & Métricas',
    component: 'ObservabilityView',
    file: 'grg/public/observatory-client.js',
    stage: 'GOVERNANCE',
    layoutType: 'analytics',
    wireframe: {
      header: 'Cockpit de Telemetria do Cluster PM2, CPU, RAM e I/O de Rede',
      meters: ['CPU: 8%', 'RAM: 86%', 'Disco: 97%', 'Rede: 116.3 Mbps']
    },
    navigationEdges: [
      { targetId: 'ap-observability', label: 'Telemetria API Platform', action: 'link_ap_telemetry', type: 'CROSS_PROJECT' }
    ],
    screenshot: '/screenshots/v11_phase4_observability.png',
    apiDependencies: ['/api/v2/observatory/summary'],
    actions: ['collect_sample', 'stream_metrics'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'fenix-terminal',
    project: 'fenix-os',
    projectName: 'Fênix OS',
    projectColor: '#00d9ff',
    route: '/app#terminal',
    title: 'Terminal Operacional Host (XTerm.js)',
    component: 'TerminalView',
    file: 'grg/public/unified-app.js',
    stage: 'BUILDER',
    layoutType: 'console',
    wireframe: {
      header: 'Shell Interativa PTY Conectada ao Host Linux / VPS',
      terminal: 'Prompt de Comando Bash com suporte ANSI e autocompletion'
    },
    navigationEdges: [
      { targetId: 'fenix-visual-ide', label: 'Editor de Código', action: 'open_editor', type: 'NAVIGATIONAL' }
    ],
    screenshot: '/screenshots/v11_phase4_terminal.png',
    apiDependencies: ['/api/terminal/session'],
    actions: ['exec_command', 'clear_terminal'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'fenix-runtime',
    project: 'fenix-os',
    projectName: 'Fênix OS',
    projectColor: '#00d9ff',
    route: '/app#runtime',
    title: 'Runtime & PM2 Process Manager',
    component: 'RuntimeCockpit',
    file: 'grg/public/runtime-cockpit.js',
    stage: 'GOVERNANCE',
    layoutType: 'table',
    wireframe: {
      header: 'Gestão de Processos PM2 (#5 fenix-backend, #6 fenix-frontend, Docker Containers)',
      table: ['App Name', 'PID', 'Uptime', 'CPU %', 'Memory MB', 'Restart Count']
    },
    navigationEdges: [
      { targetId: 'fenix-command-center', label: 'Retornar ao Comando', action: 'nav_command', type: 'NAVIGATIONAL' }
    ],
    screenshot: '/screenshots/v11_phase4_runtime.png',
    apiDependencies: ['/api/runtime/status'],
    actions: ['restart_process', 'reload_cluster'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  },
  {
    id: 'fenix-marketplace',
    project: 'fenix-os',
    projectName: 'Fênix OS',
    projectColor: '#00d9ff',
    route: '/app#marketplace',
    title: 'Marketplace de Capacidades & Skills',
    component: 'MarketplaceView',
    file: 'grg/public/marketplace-live.js',
    stage: 'BUILDER',
    layoutType: 'grid',
    wireframe: {
      header: 'Catálogo de Plugins, Skills Autônomas e Conectores de Terceiros',
      grid: ['GitHub Sync Engine', 'Baileys WhatsApp Connector', 'Playwright Visual Certifier', 'Ollama Local Runner']
    },
    navigationEdges: [
      { targetId: 'fenix-projects', label: 'Vincular a Projeto', action: 'bind_to_project', type: 'NAVIGATIONAL' }
    ],
    screenshot: '/screenshots/v11_phase4_marketplace.png',
    apiDependencies: ['/api/skills/registry', '/api/plugins'],
    actions: ['install_skill', 'enable_plugin'],
    status: 'ONLINE',
    lastValidated: '2026-10-26T12:00:00Z'
  }
];

function getAllPages(filterProject) {
  if (!filterProject || filterProject === 'ALL' || filterProject === 'all') return PAGES;
  const lower = filterProject.toLowerCase();
  return PAGES.filter(p => p.project.toLowerCase() === lower || p.project.includes(lower));
}

function getPageById(id) {
  if (!id) return null;
  return PAGES.find(p => p.id === id || p.id.toLowerCase() === id.toLowerCase() || p.route === id) || null;
}

function getPagesByAction(action) {
  if (!action) return [];
  return PAGES.filter(p => (p.actions || []).includes(action));
}

function getCrossProjectConnections() {
  const edges = [];
  PAGES.forEach(page => {
    (page.navigationEdges || []).forEach(edge => {
      if (edge.type === 'CROSS_PROJECT') {
        edges.push({
          sourceId: page.id,
          sourceProject: page.project,
          targetId: edge.targetId,
          label: edge.label,
          action: edge.action
        });
      }
    });
  });
  return edges;
}

function getScreensGraph(filterProject) {
  const pages = getAllPages(filterProject);
  const pageIds = new Set(pages.map(p => p.id));
  const edges = [];

  pages.forEach(p => {
    (p.navigationEdges || []).forEach(e => {
      // Include edge if both source and target exist, or if showing all projects
      if (pageIds.has(e.targetId) || (!filterProject || filterProject === 'ALL')) {
        edges.push({
          source: p.id,
          target: e.targetId,
          label: e.label || 'Navega',
          action: e.action || '',
          type: e.type || 'NAVIGATIONAL',
          sourceProject: p.project,
          crossProject: e.type === 'CROSS_PROJECT'
        });
      }
    });
  });

  const projects = [...new Set(PAGES.map(p => p.project))].map(prjId => {
    const prjPages = PAGES.filter(p => p.project === prjId);
    return {
      id: prjId,
      name: prjPages[0]?.projectName || prjId,
      color: prjPages[0]?.projectColor || '#38bdf8',
      count: prjPages.length
    };
  });

  return {
    nodes: pages,
    edges,
    stages: STAGES,
    projects,
    totalScreens: pages.length,
    totalEdges: edges.length
  };
}

module.exports = {
  STAGES,
  PAGES,
  getAllPages,
  getPageById,
  getPagesByAction,
  getCrossProjectConnections,
  getScreensGraph
};
