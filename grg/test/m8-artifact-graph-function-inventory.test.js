const test = require('node:test');
const assert = require('node:assert');
const { ArtifactGraph } = require('../src/repo-intel/artifact-graph');
const { FunctionInventory } = require('../src/repo-intel/function-inventory');

test('M8: ArtifactGraph — Builds & Navigates 13-Level Causal Software Graph', () => {
  const graph = new ArtifactGraph({ projectId: 'prj_zapai' });

  // 1. Add hierarchy: Project -> Module -> Page -> Component -> API -> DB
  const proj = graph.addNode('proj:zapai', 'project', { name: 'ZapAI' });
  const mod = graph.addNode('mod:crm', 'module', { name: 'CRM Module' });
  const page = graph.addNode('page:leads', 'page', { path: '/leads' });
  const comp = graph.addNode('comp:lead_card', 'component', { name: 'LeadCard' });
  const api = graph.addNode('api:post_leads', 'api', { route: 'POST /api/leads' });
  const db = graph.addNode('db:leads_table', 'database', { table: 'leads' });

  graph.addEdge(proj.id, mod.id, 'contains');
  graph.addEdge(mod.id, page.id, 'contains');
  graph.addEdge(page.id, comp.id, 'renders');
  graph.addEdge(comp.id, api.id, 'calls');
  graph.addEdge(api.id, db.id, 'persists_to');

  // Verify navigation
  const projChildren = graph.getChildren(proj.id);
  assert.strictEqual(projChildren.length, 1);
  assert.strictEqual(projChildren[0].id, mod.id);

  const compParents = graph.getParents(comp.id);
  assert.strictEqual(compParents[0].id, page.id);

  const json = graph.toJSON();
  assert.strictEqual(json.totalNodes, 6);
  assert.strictEqual(json.totalEdges, 5);
});

test('M8: FunctionInventory & FunctionTrace — Traces Full Stack for Any Feature', () => {
  const inventory = new FunctionInventory({ projectId: 'prj_zapai' });

  // Register Feature: WhatsApp Lead Creation
  inventory.registerFeature({
    id: 'feat_whatsapp_leads',
    name: 'Criação de Leads via WhatsApp',
    domain: 'crm',
    page: 'src/pages/LeadsPage.tsx',
    components: ['LeadsTable.tsx', 'LeadDetailDrawer.tsx'],
    services: ['leadService.ts', 'whatsappClient.ts'],
    apiRoutes: ['POST /api/leads', 'POST /webhook/whatsapp'],
    controllers: ['leadsController.ts', 'whatsappController.ts'],
    databaseTables: ['leads', 'messages', 'conversations'],
    schemas: ['leadSchema.ts']
  });

  const trace = inventory.traceFeature('feat_whatsapp_leads');
  assert.strictEqual(trace.featureName, 'Criação de Leads via WhatsApp');
  assert.strictEqual(trace.chain['1. View / Page'], 'src/pages/LeadsPage.tsx');
  assert.strictEqual(trace.chain['4. API Endpoints'].includes('POST /api/leads'), true);
  assert.strictEqual(trace.chain['6. Database Schemas/Tables'].includes('leads'), true);
});
