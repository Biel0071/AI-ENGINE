/**
 * FÊNIX OS — Core 19 Specialized Agent Definitions
 * Catalog of the 19 foundational agents with roles, capabilities, and system scopes.
 */

const FENIX_AGENTS = Object.freeze({
  ORCHESTRATOR: 'Orchestrator',
  DEVELOPER: 'Developer',
  FRONTEND: 'Frontend',
  BACKEND: 'Backend',
  DATABASE: 'Database',
  VISUAL: 'Visual',
  BROWSER: 'Browser',
  RESEARCH: 'Research',
  DEBUG: 'Debug',
  TESTING: 'Testing',
  SECURITY: 'Security',
  GIT: 'Git',
  GITHUB: 'GitHub',
  DEPLOYMENT: 'Deployment',
  AUTOMATION: 'Automation',
  COMPUTER: 'Computer',
  MEDIA: 'Media',
  PROMPT: 'Prompt',
  DOCUMENTATION: 'Documentation'
});

const AGENT_SPECIFICATIONS = Object.freeze({
  [FENIX_AGENTS.ORCHESTRATOR]: {
    name: 'Orchestrator Agent',
    domain: 'orchestration',
    description: 'Decompõe intenções do usuário em planos executáveis e delega para agentes especializados.',
    tools: ['task_planner', 'agent_delegator', 'memory_query', 'system_map_reader'],
    permissions: ['task:manage', 'agent:manage', 'context:read']
  },
  [FENIX_AGENTS.DEVELOPER]: {
    name: 'Developer Agent',
    domain: 'engineering',
    description: 'Implementação de software full-stack e integração contínua.',
    tools: ['filesystem', 'code_editor', 'terminal_safe', 'ast_parser'],
    permissions: ['fs:read', 'fs:write', 'terminal:safe']
  },
  [FENIX_AGENTS.FRONTEND]: {
    name: 'Frontend Agent',
    domain: 'frontend',
    description: 'Construção e refatoração de interfaces React, Next, Vue, componentes e tokens de design.',
    tools: ['filesystem', 'component_builder', 'css_parser', 'preview_inspector'],
    permissions: ['fs:project_only', 'preview:read']
  },
  [FENIX_AGENTS.BACKEND]: {
    name: 'Backend Agent',
    domain: 'backend',
    description: 'Construção de APIs determinísticas, rotas, controllers, services e middlewares.',
    tools: ['filesystem', 'api_builder', 'schema_validator', 'http_tester'],
    permissions: ['fs:project_only', 'terminal:safe']
  },
  [FENIX_AGENTS.DATABASE]: {
    name: 'Database Agent',
    domain: 'database',
    description: 'Modelagem de dados, migrations, queries otimizadas e integração com bancos SQL/NoSQL.',
    tools: ['schema_migration', 'sql_builder', 'db_introspect'],
    permissions: ['database:schema_read', 'database:schema_write']
  },
  [FENIX_AGENTS.VISUAL]: {
    name: 'Visual Agent',
    domain: 'visual_design',
    description: 'Análise de estética, consistência visual, paletas HSL, spacing, tipografia e visual match.',
    tools: ['dom_inspector', 'visual_diff', 'color_token_extractor', 'screenshot_analyzer'],
    permissions: ['preview:read', 'fs:read']
  },
  [FENIX_AGENTS.BROWSER]: {
    name: 'Browser Agent',
    domain: 'browser',
    description: 'Navegação automatizada em páginas web, inspeção de DOM, captura de layout e screenshots.',
    tools: ['web_navigator', 'dom_query', 'screenshot_capture', 'console_observer'],
    permissions: ['network:http_get', 'browser:control']
  },
  [FENIX_AGENTS.RESEARCH]: {
    name: 'Research Agent',
    domain: 'research',
    description: 'Investigação de estado da arte, documentações oficiais, padrões de arquitetura e pacotes.',
    tools: ['doc_search', 'package_analyzer', 'knowledge_graph_query'],
    permissions: ['network:read_docs', 'memory:read']
  },
  [FENIX_AGENTS.DEBUG]: {
    name: 'Debug Agent',
    domain: 'debugging',
    description: 'Diagnóstico de erros de compilação, falhas de runtime, análise de stack traces e auto-correção.',
    tools: ['error_diagnoser', 'stack_trace_parser', 'code_patcher'],
    permissions: ['fs:read', 'fs:write', 'logs:read']
  },
  [FENIX_AGENTS.TESTING]: {
    name: 'Testing Agent',
    domain: 'qa',
    description: 'Geração e execução de testes unitários, testes de integração, smoke tests e asserções.',
    tools: ['test_runner', 'coverage_calculator', 'assertion_generator'],
    permissions: ['fs:read', 'fs:write', 'terminal:safe']
  },
  [FENIX_AGENTS.SECURITY]: {
    name: 'Security Agent',
    domain: 'security',
    description: 'Auditoria Zero-Trust, validação de permissões, sanitização de inputs e proteção de segredos.',
    tools: ['secret_scanner', 'permission_auditor', 'vulnerability_checker'],
    permissions: ['security:audit', 'governance:enforce']
  },
  [FENIX_AGENTS.GIT]: {
    name: 'Git Agent',
    domain: 'vcs',
    description: 'Gestão de controle de versão local: commits semânticos, branches, merges e diffs.',
    tools: ['git_cli', 'diff_viewer', 'branch_manager'],
    permissions: ['vcs:local']
  },
  [FENIX_AGENTS.GITHUB]: {
    name: 'GitHub Agent',
    domain: 'github',
    description: 'Integração remota com GitHub: Pull Requests, Code Review, Issues e GitHub Actions.',
    tools: ['github_api', 'pr_creator', 'issue_tracker'],
    permissions: ['github:read', 'github:write']
  },
  [FENIX_AGENTS.DEPLOYMENT]: {
    name: 'Deployment Agent',
    domain: 'devops',
    description: 'Deploy em containers Docker, VPS, verificação de portas ativas, proxies e rollbacks.',
    tools: ['docker_cli', 'vps_ssh', 'port_checker', 'health_prober'],
    permissions: ['deploy:execute', 'network:vps']
  },
  [FENIX_AGENTS.AUTOMATION]: {
    name: 'Automation Agent',
    domain: 'automation',
    description: 'Construção de triggers reativos, workflows orientados a eventos e tarefas em segundo plano.',
    tools: ['workflow_builder', 'cron_scheduler', 'event_trigger'],
    permissions: ['task:manage', 'event:publish']
  },
  [FENIX_AGENTS.COMPUTER]: {
    name: 'Computer Agent',
    domain: 'system',
    description: 'Execução de comandos controlados no sistema operacional sob permissão explícita.',
    tools: ['os_exec', 'file_explorer', 'app_launcher'],
    permissions: ['os:controlled_exec']
  },
  [FENIX_AGENTS.MEDIA]: {
    name: 'Media Agent',
    domain: 'multimodal',
    description: 'Processamento de imagens, geração multimodal, OCR, áudio e integração com ComfyUI.',
    tools: ['image_processor', 'ocr_engine', 'comfyui_client', 'audio_transcriber'],
    permissions: ['media:process', 'ai:image_generation']
  },
  [FENIX_AGENTS.PROMPT]: {
    name: 'Prompt Agent',
    domain: 'prompt_engineering',
    description: 'Otimização e versionamento de instruções, templates estruturados e testes comparativos.',
    tools: ['prompt_optimizer', 'template_engine', 'prompt_benchmarker'],
    permissions: ['ai:prompt_eval']
  },
  [FENIX_AGENTS.DOCUMENTATION]: {
    name: 'Documentation Agent',
    domain: 'documentation',
    description: 'Geração de documentação viva, relatórios de arquitetura, diagramas Mermaid e changelogs.',
    tools: ['doc_generator', 'markdown_formatter', 'diagram_builder'],
    permissions: ['fs:read', 'fs:write']
  }
});

module.exports = {
  FENIX_AGENTS,
  AGENT_SPECIFICATIONS
};
