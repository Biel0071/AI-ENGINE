const test = require('node:test');
const assert = require('node:assert');
const { MultiProjectWorkspaceManager } = require('../src/workspace/multi-project-workspace-manager');
const { UnifiedEventBus } = require('../src/core/UnifiedEventBus');

test('M9: MultiProjectWorkspaceManager — Isolation & Cross-Project Knowledge', async () => {
  const bus = new UnifiedEventBus();
  await bus.start();

  const wm = new MultiProjectWorkspaceManager({ eventBus: bus });
  await wm.start();

  // 1. Register Project 1 (ZAPAI)
  const p1 = wm.registerProject({
    projectId: 'prj_zapai',
    name: 'ZapAI Multi-Tenant',
    rootPath: 'c:/projetos/ZAPAI-FINAL',
    stack: ['Node', 'React', 'Prisma']
  });

  // 2. Register Project 2 (Lovable SaaS)
  const p2 = wm.registerProject({
    projectId: 'prj_lovable',
    name: 'Lovable CRM',
    rootPath: 'c:/projetos/lovable-crm',
    stack: ['Next.js', 'Tailwind', 'Supabase']
  });

  assert.strictEqual(wm.listProjects().length, 2);

  // Check strict DNA isolation
  p1.genomeBuilder.compile({ projectDna: { stack: ['Node', 'Prisma'] } });
  p2.genomeBuilder.compile({ projectDna: { stack: ['Next.js', 'Supabase'] } });

  assert.strictEqual(p1.genomeBuilder.getLatest().projectDna.stack.includes('Prisma'), true);
  assert.strictEqual(p2.genomeBuilder.getLatest().projectDna.stack.includes('Prisma'), false);

  // 3. Test Cross-Project Knowledge Sharing
  wm.shareKnowledge('whatsapp_auth', {
    projectId: 'prj_zapai',
    snippet: 'Use Baileys with multi-file auth state and reconnect loop.'
  });

  const queryResults = wm.queryCrossProjectKnowledge('whatsapp_auth');
  assert.strictEqual(queryResults.length, 1);
  assert.strictEqual(queryResults[0].projectId, 'prj_zapai');
  assert.strictEqual(queryResults[0].snippet.includes('Baileys'), true);

  await wm.stop();
  await bus.stop();
});
