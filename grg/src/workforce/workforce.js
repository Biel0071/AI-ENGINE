const { uuid, slugify } = require('../kernel/ids');
const { NotFoundError, ValidationError } = require('../kernel/errors');

// Workforce: cada loja/projeto vira uma "empresa virtual" com um DONO (IA supervisora) e
// FUNCIONÁRIOS especializados. Os funcionários são derivados das capabilities REAIS detectadas
// na análise do projeto (digital twin). Experiência de funcionários vira TEMPLATE que replica
// para lojas do mesmo nicho — evolução acumulada por nicho.

// Andares do prédio (departamentos) — alinhado à identidade visual GRG Serviços.
const FLOORS = [
  { floor: 5, dept: 'Diretoria', emoji: '👔' },
  { floor: 4, dept: 'Comercial', emoji: '🛒' },
  { floor: 3, dept: 'Operacional', emoji: '⚙️' },
  { floor: 2, dept: 'Financeiro', emoji: '💰' },
  { floor: 1, dept: 'Suporte', emoji: '💬' },
  { floor: 0, dept: 'Recepção', emoji: '🏛️' },
];

// capability detectada -> tipo de funcionário. role = chave interna estável (não quebra testes);
// title/department/floor = identidade visual dos 10 personagens da imagem GRG.
const CAPABILITY_ROLE = {
  'whatsapp-crm': { role: 'atendente', title: 'Agente de Atendimento', focus: 'atendimento e suporte', department: 'Suporte', floor: 1, emoji: '💬' },
  ecommerce: { role: 'vendedor', title: 'Agente de Vendas', focus: 'prospecção e negociação', department: 'Comercial', floor: 4, emoji: '🛒' },
  analytics: { role: 'analista', title: 'Analista de Dados', focus: 'BI e inteligência', department: 'Diretoria', floor: 5, emoji: '📊' },
  'ai-gateway': { role: 'assistente-ia', title: 'Agente de Automação', focus: 'automação e integrações', department: 'Operacional', floor: 3, emoji: '🤖' },
  'auth-rbac': { role: 'seguranca', title: 'Especialista de TI', focus: 'infraestrutura e segurança', department: 'Operacional', floor: 3, emoji: '🛡️' },
  'payments-pix': { role: 'financeiro', title: 'Analista Financeiro', focus: 'finanças e relatórios', department: 'Financeiro', floor: 2, emoji: '💰' },
  'payments-stripe': { role: 'financeiro-cartao', title: 'Analista Financeiro (assinaturas)', focus: 'assinaturas e cobrança', department: 'Financeiro', floor: 2, emoji: '💳' },
  dashboard: { role: 'gestor-dados', title: 'Coordenador de Equipe', focus: 'liderança e performance', department: 'Operacional', floor: 3, emoji: '📈' },
  realtime: { role: 'operacoes', title: 'Agente de Reuniões', focus: 'agendamento e colaboração', department: 'Diretoria', floor: 5, emoji: '🗓️' },
};

class WorkforceService {
  constructor({ store, bus, controlPlane, digitalTwin, evolution, llm = null }) {
    this.store = store; this.bus = bus; this.cp = controlPlane;
    this.digitalTwin = digitalTwin; this.evolution = evolution; this.llm = llm;
  }

  // Deriva o nicho do projeto (família ou capability dominante).
  nicheOf(repo, capabilities) {
    if (repo && repo.family) return repo.family;
    if (capabilities.includes('whatsapp-crm')) return 'atendimento-whatsapp';
    if (capabilities.includes('ecommerce')) return 'ecommerce';
    if (capabilities.includes('ai-gateway')) return 'ia';
    return capabilities[0] || 'geral';
  }

  // Contrata a força de trabalho de uma loja: cria o dono + funcionários por capability.
  // Reaproveita templates comprovados do mesmo nicho (funcionários já nascem com experiência).
  async hire(tenantId, actorId, projectId) {
    await this.cp.authorize(tenantId, actorId, 'project:read');
    const state = await this.store.read();
    const repo = state.repositories.find((r) => r.tenantId === tenantId && r.id === projectId);
    const proj = state.projects.find((p) => p.tenantId === tenantId && p.id === projectId);
    const subject = repo || proj;
    if (!subject) throw new NotFoundError(`Project/repo not found: ${projectId}`);

    const snapshot = state.snapshots.filter((s) => s.tenantId === tenantId && s.repoId === projectId).slice(-1)[0];
    const capabilities = snapshot ? snapshot.capabilities.map((c) => c.id) : (proj ? [...(proj.reusedModules || []), ...(proj.generatedModules || [])] : []);
    const niche = this.nicheOf(repo, capabilities);

    if (state.workforces.some((w) => w.tenantId === tenantId && w.projectId === projectId)) {
      throw new ValidationError(`Workforce already exists for ${projectId}`);
    }

    const workforceId = uuid();
    const owner = this.makeEmployee(tenantId, workforceId, 'dono', `Diretor Estratégico — ${subject.name}`, 'planejamento e decisões', niche, state.employeeTemplates, null,
      { department: 'Diretoria', floor: 5, emoji: '👔' });
    const staff = [];
    const seenRoles = new Set(['dono']);
    for (const cap of capabilities) {
      const def = CAPABILITY_ROLE[cap];
      if (!def || seenRoles.has(def.role)) continue;
      seenRoles.add(def.role);
      staff.push(this.makeEmployee(tenantId, workforceId, def.role, def.title, def.focus, niche, state.employeeTemplates, cap,
        { department: def.department, floor: def.floor, emoji: def.emoji }));
    }

    const workforce = { id: workforceId, tenantId, projectId, subjectName: subject.name, niche, ownerId: owner.id, createdAt: now() };

    await this.store.update((s) => {
      s.workforces.push(workforce);
      s.employees.push(owner, ...staff);
      s.memoryEvents.push({
        id: uuid(), tenantId, projectId, actorId, kind: 'workforce-hired',
        summary: `Contratada equipe de ${subject.name} (nicho ${niche}): dono + ${staff.length} funcionário(s) [${staff.map((e) => e.role).join(', ')}]`,
        evidence: [`workforce:${workforceId}`], confidence: 1, createdAt: now(),
      });
      s.graphEdges.push({ tenantId, source: `project:${projectId}`, target: `workforce:${workforceId}`, type: 'HAS_WORKFORCE', evidence: 'workforce' });
      return s;
    });
    await this.bus.emit('workforce.hired', { tenantId, projectId, workforceId, niche, staffCount: staff.length });
    return { workforce, owner, staff };
  }

  makeEmployee(tenantId, workforceId, role, title, focus, niche, templates, capability = null, place = {}) {
    // se há template comprovado do mesmo nicho+role, o funcionário nasce com a experiência dele
    const tpl = templates.find((t) => t.niche === niche && t.role === role);
    return {
      id: uuid(), tenantId, workforceId, role, title, focus, capability,
      department: place.department || 'Geral', floor: place.floor ?? 1, emoji: place.emoji || '🧑‍💼',
      level: tpl ? tpl.level : 1,           // 1..5 experiência
      tasksCompleted: 0,
      skills: tpl ? [...tpl.skills] : [focus],
      fromTemplate: tpl ? tpl.id : null,
      createdAt: now(),
    };
  }

  // Prédio da empresa: funcionários agrupados por andar/departamento (a visão isométrica).
  async building(tenantId, actorId, projectId) {
    await this.cp.authorize(tenantId, actorId, 'project:read');
    const wf = await this.getWorkforce(tenantId, actorId, projectId);
    if (!wf) return null;
    let health = null;
    try { const t = await this.digitalTwin.get(tenantId, actorId, projectId); health = t.model.health; } catch { /* sem twin */ }
    const floors = FLOORS.map((f) => ({
      ...f,
      employees: wf.employees.filter((e) => e.floor === f.floor).map((e) => ({
        id: e.id, role: e.role, title: e.title, emoji: e.emoji, level: e.level, focus: e.focus,
      })),
    }));
    return { projectId, company: wf.subjectName, niche: wf.niche, health, floors };
  }

  async getWorkforce(tenantId, actorId, projectId) {
    await this.cp.authorize(tenantId, actorId, 'project:read');
    const state = await this.store.read();
    const wf = state.workforces.find((w) => w.tenantId === tenantId && w.projectId === projectId);
    if (!wf) return null;
    const employees = state.employees.filter((e) => e.workforceId === wf.id);
    return { ...wf, employees, owner: employees.find((e) => e.id === wf.ownerId) };
  }

  async listWorkforces(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'project:read');
    const state = await this.store.read();
    return state.workforces.filter((w) => w.tenantId === tenantId).map((w) => ({
      ...w, headcount: state.employees.filter((e) => e.workforceId === w.id).length,
    }));
  }

  // O DONO produz o relatório diário da loja: agrega insights REAIS (twin + evolução + memória).
  async dailyReport(tenantId, actorId, projectId, dateISO) {
    await this.cp.authorize(tenantId, actorId, 'memory:read');
    const wf = await this.getWorkforce(tenantId, actorId, projectId);
    if (!wf) throw new NotFoundError(`No workforce for ${projectId} — hire first`);

    let twin = null;
    try { twin = await this.digitalTwin.get(tenantId, actorId, projectId); } catch { /* projeto gerado sem twin */ }
    const state = await this.store.read();
    const insights = state.insights.filter((i) => i.tenantId === tenantId && (i.targets || []).includes(`repo:${projectId}`));
    const memory = state.memoryEvents.filter((m) => m.tenantId === tenantId && m.projectId === projectId).slice(-5);

    const findings = [];
    if (twin) {
      findings.push(`Saúde ${twin.model.health.score}/100 (ponto fraco: ${twin.model.health.weakest})`);
      twin.model.risks.forEach((r) => findings.push(`Risco: ${r}`));
    }
    insights.forEach((i) => findings.push(i.summary));
    const recommendations = [];
    if (twin && twin.model.health.weakest === 'quality') recommendations.push('Aumentar cobertura de testes');
    if (twin && twin.model.risks.some((r) => /segredo|auth/.test(r))) recommendations.push('Revisar exposição de segredos/segurança');
    if (!recommendations.length) recommendations.push('Manter operação; sem alertas críticos hoje');

    const report = {
      id: uuid(), tenantId, projectId, workforceId: wf.id,
      byEmployee: wf.ownerId, byRole: 'dono',
      date: (dateISO || now()).slice(0, 10),
      findings, recommendations,
      metrics: { insights: insights.length, risks: twin ? twin.model.risks.length : 0, health: twin ? twin.model.health.score : null },
      createdAt: now(),
    };

    await this.store.update((s) => {
      s.dailyReports.push(report);
      // dono ganha experiência ao entregar relatório
      const owner = s.employees.find((e) => e.id === wf.ownerId);
      if (owner) { owner.tasksCompleted += 1; owner.level = Math.min(5, 1 + Math.floor(owner.tasksCompleted / 3)); }
      return s;
    });
    // narração natural opcional (LLM), ancorada nos fatos
    let narration = `Relatório de ${wf.subjectName}: ${findings.length} observações, ${recommendations.length} recomendações.`;
    if (this.llm) {
      try {
        const res = await this.llm.chat({ messages: [
          { role: 'system', content: 'Você é o gerente IA de uma loja. Escreva um resumo curto (2-3 frases) do relatório diário, tom profissional, em português. Use SÓ os fatos dados.' },
          { role: 'user', content: `Loja: ${wf.subjectName}\nObservações: ${findings.join('; ')}\nRecomendações: ${recommendations.join('; ')}` },
        ], temperature: 0.4 });
        if (res.text && res.text.trim()) narration = res.text.trim();
      } catch { /* mantém narração determinística */ }
    }
    await this.bus.emit('daily-report.created', { tenantId, projectId, reportId: report.id });
    return { ...report, narration };
  }

  // Promove a experiência de um funcionário a TEMPLATE do nicho — replica para lojas iguais.
  async promoteToTemplate(tenantId, actorId, employeeId) {
    await this.cp.authorize(tenantId, actorId, 'memory:write');
    const state = await this.store.read();
    const emp = state.employees.find((e) => e.tenantId === tenantId && e.id === employeeId);
    if (!emp) throw new NotFoundError(`Employee not found: ${employeeId}`);
    const wf = state.workforces.find((w) => w.id === emp.workforceId);

    const template = {
      id: uuid(), niche: wf.niche, role: emp.role, title: emp.title,
      level: emp.level, skills: [...emp.skills],
      provenBy: [wf.projectId], createdAt: now(),
    };
    await this.store.update((s) => {
      const existing = s.employeeTemplates.find((t) => t.niche === template.niche && t.role === template.role);
      if (existing) {
        existing.level = Math.max(existing.level, template.level);
        existing.skills = [...new Set([...existing.skills, ...template.skills])];
        if (!existing.provenBy.includes(wf.projectId)) existing.provenBy.push(wf.projectId);
      } else {
        s.employeeTemplates.push(template);
      }
      s.memoryEvents.push({
        id: uuid(), tenantId, projectId: wf.projectId, actorId, kind: 'template-promoted',
        summary: `Funcionário ${emp.title} (nível ${emp.level}) virou template do nicho ${wf.niche}`,
        evidence: [`employee:${emp.id}`, `niche:${wf.niche}`], confidence: 0.9, createdAt: now(),
      });
      return s;
    });
    await this.bus.emit('template.promoted', { tenantId, niche: wf.niche, role: emp.role });
    return template;
  }

  // Reunião de equipe: os funcionários "conversam entre si" — cada um fala do seu ângulo sobre
  // os dados REAIS da loja (twin/insights). O dono abre e fecha. LLM narra cada fala (ancorada).
  async standup(tenantId, actorId, projectId) {
    await this.cp.authorize(tenantId, actorId, 'project:read');
    const wf = await this.getWorkforce(tenantId, actorId, projectId);
    if (!wf) throw new NotFoundError(`No workforce for ${projectId} — hire first`);

    let twin = null;
    try { twin = await this.digitalTwin.get(tenantId, actorId, projectId); } catch { /* sem twin */ }
    const health = twin ? twin.model.health : { score: null, weakest: null };
    const risks = twin ? twin.model.risks : [];
    const caps = twin ? twin.model.capabilities : [];

    // o que cada papel "vê" nos dados reais (contexto por função)
    const angle = (role) => {
      switch (role) {
        case 'dono': return `Saúde geral ${health.score ?? '—'}/100. ${risks.length} risco(s) aberto(s). Vamos alinhar o dia.`;
        case 'seguranca': return risks.find((r) => /segredo|auth|segur/i.test(r)) || 'Sem alertas de segurança críticos hoje.';
        case 'analista': return `Acompanhando métricas; ponto mais fraco é "${health.weakest || 'n/d'}".`;
        case 'atendente': return caps.includes('whatsapp-crm') ? 'Inbox de WhatsApp ativo; priorizando conversas em aberto.' : 'Sem canal de atendimento configurado.';
        case 'financeiro': return caps.some((c) => /payments/.test(c)) ? 'Pagamentos operando; conferindo recebíveis.' : 'Sem meio de pagamento ativo.';
        case 'vendedor': return caps.includes('ecommerce') ? 'Catálogo e checkout de pé; foco em conversão.' : 'Loja sem e-commerce ativo.';
        case 'assistente-ia': return caps.includes('ai-gateway') ? 'IA disponível para respostas e automações.' : 'IA não configurada.';
        case 'operacoes': return caps.includes('realtime') ? 'Tempo real estável; monitorando disponibilidade.' : 'Operação padrão.';
        default: return `Cuidando de ${role}.`;
      }
    };

    const speakers = [wf.owner, ...wf.employees.filter((e) => e.id !== wf.ownerId)];
    const turns = [];
    for (const emp of speakers) {
      let line = angle(emp.role);
      if (this.llm) {
        try {
          const res = await this.llm.chat({ messages: [
            { role: 'system', content: `Você é ${emp.title} da loja ${wf.subjectName}. Fale 1 frase curta em português, 1ª pessoa, tom de reunião de equipe. Use SÓ o fato dado.` },
            { role: 'user', content: `Fato: ${line}` },
          ], temperature: 0.5 });
          if (res.text && res.text.trim()) line = res.text.trim();
        } catch { /* mantém determinístico */ }
      }
      turns.push({ employeeId: emp.id, role: emp.role, title: emp.title, level: emp.level, text: line });
    }

    await this.store.update((s) => {
      s.memoryEvents.push({
        id: uuid(), tenantId, projectId, actorId, kind: 'team-standup',
        summary: `Reunião de equipe de ${wf.subjectName}: ${turns.length} participantes`,
        evidence: [`workforce:${wf.id}`], confidence: 0.7, createdAt: now(),
      });
      return s;
    });
    await this.bus.emit('standup.held', { tenantId, projectId, participants: turns.length });
    return { store: wf.subjectName, niche: wf.niche, health, turns };
  }

  // Conversar com UM funcionário específico (clicar no personagem e perguntar).
  async askEmployee(tenantId, actorId, projectId, role, question) {
    await this.cp.authorize(tenantId, actorId, 'project:read');
    const wf = await this.getWorkforce(tenantId, actorId, projectId);
    if (!wf) throw new NotFoundError(`No workforce for ${projectId}`);
    const emp = wf.employees.find((e) => e.role === role) || wf.owner;
    let twin = null;
    try { twin = await this.digitalTwin.get(tenantId, actorId, projectId); } catch { /* sem twin */ }
    const facts = twin ? { saude: twin.model.health, riscos: twin.model.risks, capabilities: twin.model.capabilities } : { nota: 'projeto ainda sem análise completa' };

    let answer = `Sou ${emp.title} de ${wf.subjectName}. ${emp.focus}.`;
    if (this.llm) {
      try {
        const res = await this.llm.chat({ messages: [
          { role: 'system', content: `Você é ${emp.title} (nível ${emp.level}) da loja ${wf.subjectName}, especialista em ${emp.focus}. Responda em português, curto, 1ª pessoa. Use SÓ os fatos dados; não invente números.` },
          { role: 'user', content: `Pergunta: "${question}"\nFatos reais da loja: ${JSON.stringify(facts).slice(0, 1500)}` },
        ], temperature: 0.4 });
        if (res.text && res.text.trim()) answer = res.text.trim();
      } catch { /* determinístico */ }
    }
    return { employee: { role: emp.role, title: emp.title, level: emp.level }, answer };
  }

  // Vista de "escritório": todas as lojas com seus donos, headcount e último relatório.
  async office(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'project:read');
    const state = await this.store.read();
    const wfs = state.workforces.filter((w) => w.tenantId === tenantId);
    return wfs.map((w) => {
      const employees = state.employees.filter((e) => e.workforceId === w.id);
      const owner = employees.find((e) => e.id === w.ownerId);
      const reports = state.dailyReports.filter((r) => r.workforceId === w.id);
      return {
        projectId: w.projectId, store: w.subjectName, niche: w.niche,
        owner: owner ? { title: owner.title, level: owner.level } : null,
        headcount: employees.length,
        roles: employees.map((e) => e.role),
        lastReport: reports.length ? reports[reports.length - 1].date : null,
        reportCount: reports.length,
      };
    });
  }
}

function now() { return new Date().toISOString(); }

module.exports = { WorkforceService, CAPABILITY_ROLE };
