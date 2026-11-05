/**
 * FÊNIX OS — Prompt Expander & Reverse Engineering Engine
 * Expands user intentions and goals into comprehensive architectural blueprints and detailed Qwen Coder prompts.
 * Adheres to Fênix Senior Engineering Standards: Zero-Mock, Real Schemas, Full-Stack Real Capability, Automated Testing.
 */

const http = require('node:http');

class PromptExpanderEngine {
  constructor(options = {}) {
    this.apiPlatformUrl = options.apiPlatformUrl !== undefined ? options.apiPlatformUrl : (process.env.API_PLATFORM_URL || null);
    this.apiKey = options.apiKey || process.env.API_PLATFORM_KEY || null;
  }

  /**
   * Expande um objetivo de projeto em um Plano Mestre completo com Fila de Ações para o Qwen Coder.
   */
  async expandProjectPlan({ name, goal, repoName = null, category = 'fullstack' }) {
    const cleanName = String(name || 'Novo Projeto').trim();
    const cleanGoal = String(goal || '').trim();
    const cleanRepo = String(
      repoName ||
      cleanName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '') ||
      'novo-projeto'
    ).trim();

    // Tentar enriquecimento cognitivo via API Platform da VPS se disponível
    let aiEnrichment = null;
    try {
      aiEnrichment = await this.queryCognitiveEngine(cleanGoal);
    } catch (_) {
      // Degradação graciosa para decomposição determinística sênior
    }

    const domainSpec = this.reverseEngineerDomain(cleanName, cleanGoal, aiEnrichment);
    const steps = this.generateActionQueueSteps(cleanName, cleanRepo, domainSpec);

    return {
      projectName: cleanName,
      repositoryName: cleanRepo,
      goal: cleanGoal,
      category,
      domainSpec,
      totalPhases: 5,
      totalSteps: steps.length,
      steps,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Análise de domínio e engenharia reversa de arquitetura.
   */
  reverseEngineerDomain(name, goal, aiEnrichment) {
    const lower = `${name} ${goal}`.toLowerCase();

    let domainType = 'GENERAL_SAAS';
    if (/agendamento|consulta|cl[íi]nica|m[ée]dic/i.test(lower)) domainType = 'HEALTHCARE_APPOINTMENTS';
    else if (/delivery|pedido|restaurante|comida|lanche/i.test(lower)) domainType = 'FOOD_DELIVERY';
    else if (/ecommerce|loja|venda|produto|carrinho|checkout/i.test(lower)) domainType = 'ECOMMERCE_COMMERCE';
    else if (/chat|mensageria|whatsapp|suporte|atendimento/i.test(lower)) domainType = 'MESSAGING_CRM';
    else if (/finance|banco|pagamento|fatura|pix|conta/i.test(lower)) domainType = 'FINTECH_PAYMENTS';
    else if (/tarefa|kanban|projeto|gest[ãa]o|scrum|quadro/i.test(lower)) domainType = 'TASK_PROJECT_MANAGEMENT';

    const techStack = {
      runtime: 'Node.js (LTS) Vanilla / Fastify / Express',
      database: 'SQLite 3 (zero setup) / PostgreSQL 16',
      frontend: 'Vanilla HTML5 + Modern CSS Design Tokens + Native ES Modules',
      testing: 'Node.js Test Runner (node:test) + Supertest / Fetch',
      ciCd: 'GitHub Actions workflow (.github/workflows/ci.yml)'
    };

    return {
      domainType,
      techStack,
      aiAnalysis: aiEnrichment?.summary || `Sistema arquitetado segundo padrões Sênior Fênix OS com persistência relacional, Zero-Mock e suíte de testes automatizados.`,
      entities: this.extractEntities(domainType, goal)
    };
  }

  extractEntities(domainType, goal) {
    const defaultEntities = ['Users', 'Settings', 'AuditLog'];
    switch (domainType) {
      case 'HEALTHCARE_APPOINTMENTS':
        return ['Doctor', 'Patient', 'Appointment', 'Specialty', 'ScheduleSlot', ...defaultEntities];
      case 'FOOD_DELIVERY':
        return ['Restaurant', 'MenuItem', 'Category', 'Order', 'OrderItem', 'DeliveryAddress', ...defaultEntities];
      case 'ECOMMERCE_COMMERCE':
        return ['Product', 'Category', 'Cart', 'Order', 'OrderItem', 'Customer', ...defaultEntities];
      case 'MESSAGING_CRM':
        return ['Contact', 'Conversation', 'Message', 'Channel', 'Ticket', ...defaultEntities];
      case 'TASK_PROJECT_MANAGEMENT':
        return ['Workspace', 'Board', 'Column', 'Task', 'Comment', 'Label', ...defaultEntities];
      default:
        return ['Item', 'Category', 'Event', 'Transaction', ...defaultEntities];
    }
  }

  /**
   * Constrói as etapas estruturadas da Action Queue com prompts minuciosos para o Qwen Coder.
   */
  generateActionQueueSteps(projectName, repoName, domainSpec) {
    const steps = [];

    // FASE 1: Inicialização do Repositório GitHub
    steps.push({
      id: `step_repo_${Date.now()}_1`,
      phase: 1,
      phaseName: 'Repositório GitHub',
      type: 'REPO_INIT',
      title: `Criar / Vincular Repositório GitHub: Biel0071/${repoName}`,
      sensitive: true, // Requer aprovação no modo Padrão
      status: 'PENDING',
      targetRepo: repoName,
      filesTargeted: ['.gitignore', 'README.md', 'package.json'],
      acceptanceCriteria: [
        `Repositório acessível em github.com/Biel0071/${repoName}`,
        'Branch main inicializada'
      ],
      prompt: `Crie a estrutura inicial e inicialize o repositório GitHub para o projeto "${projectName}".
Repositório alvo: Biel0071/${repoName}
Stack: ${domainSpec.techStack.runtime}
Crie o arquivo README.md com a visão geral do sistema, arquitetura, entidades (${domainSpec.entities.join(', ')}) e instruções de execução.
Gere o package.json limpo com scripts de start e test usando node:test.
Adicione um .gitignore completo para Node.js.`
    });

    // FASE 2: Scaffolding de Arquitetura & Backend
    steps.push({
      id: `step_scaffold_${Date.now()}_2`,
      phase: 2,
      phaseName: 'Arquitetura & Scaffolding',
      type: 'SCAFFOLD',
      title: 'Scaffold Estrutural & Configurações de Ambiente',
      sensitive: false,
      status: 'PENDING',
      targetRepo: repoName,
      filesTargeted: ['src/app.js', 'src/server.js', 'src/config.js', '.env.example'],
      acceptanceCriteria: [
        'Servidor HTTP inicializa na porta configurável',
        'Health check /health responde 200 OK com telemetria honesta'
      ],
      prompt: `Implemente o scaffolding completo do servidor para "${projectName}".
Requisitos arquiteturais:
1. Servidor HTTP nativo Node.js ou Fastify escutando na porta process.env.PORT || 3000.
2. Endpoint GET /health retornando status: "healthy", timestamp e métricas reais de processo (uptime, memória).
3. Gerenciamento de variáveis de ambiente com src/config.js e .env.example.
4. Middleware de logs estruturados e tratamento centralizado de erros (uncaughtException, unhandledRejection).
Sem mocks. Código limpo, modular e pronto para produção.`
    });

    // FASE 3: Banco de Dados & Contratos de API
    steps.push({
      id: `step_backend_${Date.now()}_3`,
      phase: 3,
      phaseName: 'Backend & Contratos de API',
      type: 'BACKEND',
      title: `Modelagem de Banco e Rotas REST (${domainSpec.entities.slice(0, 3).join(', ')})`,
      sensitive: false,
      status: 'PENDING',
      targetRepo: repoName,
      filesTargeted: ['src/db/schema.sql', 'src/db/database.js', 'src/routes/api.js', 'src/controllers/resource-controller.js'],
      acceptanceCriteria: [
        `Tabelas SQL criadas: ${domainSpec.entities.join(', ')}`,
        'Endpoints CRUD com validação de payload e retorno JSON com status HTTP corretos'
      ],
      prompt: `Implemente a camada de persistência e endpoints de API REST para "${projectName}".
Entidades do sistema: ${domainSpec.entities.join(', ')}.
1. Crie o schema SQL relacional em src/db/schema.sql com chaves primárias, estrangeiras e timestamps created_at/updated_at.
2. Crie a conexão com SQLite/PostgreSQL com suporte a transações e migrations automáticas.
3. Crie as rotas REST completas com validação de payload:
   - GET /api/v1/${domainSpec.entities[0].toLowerCase()}s (listagem com paginação e busca)
   - POST /api/v1/${domainSpec.entities[0].toLowerCase()}s (criação com validação)
   - GET /api/v1/${domainSpec.entities[0].toLowerCase()}s/:id (detalhe)
   - PUT/PATCH /api/v1/${domainSpec.entities[0].toLowerCase()}s/:id (atualização)
   - DELETE /api/v1/${domainSpec.entities[0].toLowerCase()}s/:id (remoção lógica/física)
Retorne sempre payloads JSON limpos com tratamento de erros honesto (400 para dados inválidos, 404 para não encontrado, 500 para erro interno).`
    });

    // FASE 4: Frontend Canônico & Componentes Reativos
    steps.push({
      id: `step_frontend_${Date.now()}_4`,
      phase: 4,
      phaseName: 'Frontend UI & Componentes Reativos',
      type: 'FRONTEND',
      title: 'Interface do Usuário (Vanilla Moderno, Design Tokens, Zero-Mock)',
      sensitive: false,
      status: 'PENDING',
      targetRepo: repoName,
      filesTargeted: ['public/index.html', 'public/style.css', 'public/app.js'],
      acceptanceCriteria: [
        'Interface responsiva (Desktop / Mobile) com design dark moderno',
        'Consumo real da API via fetch com tratamento de loading, sucesso e erro',
        'Zero telemetria inventada: exibe "—" antes dos dados chegarem'
      ],
      prompt: `Crie a interface web completa para o sistema "${projectName}".
Regras Fênix OS:
1. HTML semântico moderno (public/index.html) com tags acessíveis e placeholders honestos ("—" para dados dinâmicos).
2. CSS moderno em public/style.css usando variáveis/design tokens (tema escuro elegante: background #080C14, cards #0E1524, acentos neon ciano #00D9FF e verde #10B981).
3. JavaScript vanilla modular (public/app.js) que consome os endpoints criados na Fase 3.
4. Renderização reativa de listas, formulários modais de cadastro, feedback visual de carregamento e mensagens de erro honestas.`
    });

    // FASE 5: Suíte de Testes Automatizados & PR Final
    steps.push({
      id: `step_tests_${Date.now()}_5`,
      phase: 5,
      phaseName: 'Testes Automatizados & Merge',
      type: 'TESTS',
      title: 'Testes Automatizados de API & Pull Request',
      sensitive: true, // Merge é sensível no modo padrão
      status: 'PENDING',
      targetRepo: repoName,
      filesTargeted: ['test/api.test.js', 'test/health.test.js', '.github/workflows/ci.yml'],
      acceptanceCriteria: [
        'Testes de integração de endpoints 100% passando com node:test',
        'Workflow de CI do GitHub Actions configurado',
        'Pull Request aberto no GitHub para consolidação'
      ],
      prompt: `Implemente a suíte completa de testes automatizados e o workflow de CI para "${projectName}".
1. Crie test/health.test.js e test/api.test.js usando o módulo nativo node:test e node:assert.
2. Teste o fluxo completo de criação, busca e listagem das entidades.
3. Teste caminhos de falha (payload vazio, ID inexistente).
4. Crie .github/workflows/ci.yml rodando npm test em cada push/PR.
Garanta que todos os testes executem sem dependências externas complexas e finalizem com código de saída 0.`
    });

    return steps;
  }

  /**
   * Consulta a API Platform da VPS caso disponível para enriquecimento de contexto.
   */
  async queryCognitiveEngine(prompt) {
    if (!this.apiPlatformUrl) return null;
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        prompt: `Atue como um arquiteto sênior full stack. Analise este objetivo de software e resuma os principais componentes técnicos necessários em 3 linhas: "${prompt}"`,
        model: 'qwen2.5:3b'
      });

      const parsedUrl = new URL(`${this.apiPlatformUrl}/api/v2/api-platform/test-chat`);
      const req = http.request(
        parsedUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          },
          agent: false,
          timeout: 2000
        },
        (res) => {
          let data = '';
          res.on('data', (c) => { data += c; });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve({ summary: parsed.response || parsed.text || '' });
            } catch (e) {
              reject(e);
            }
          });
        }
      );

      req.on('error', (err) => {
        req.destroy();
        reject(err);
      });
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('API Platform timeout'));
      });
      req.write(payload);
      req.end();
    });
  }
}

module.exports = { PromptExpanderEngine };
