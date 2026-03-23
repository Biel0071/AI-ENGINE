jest.mock('../crm/repositories/systemSettingsRepository', () => ({
  getSetting: jest.fn(async () => null),
  setSetting: jest.fn(async () => ({ key: 'ai_agents_config_v1' })),
}));

const aiAgentService = require('../crm/ai-agents/services/aiAgentService');

describe('aiAgentService', () => {
  test('lists default agents and picks active one', async () => {
    const agents = await aiAgentService.listAgents();

    expect(Array.isArray(agents)).toBe(true);
    expect(agents.length).toBeGreaterThanOrEqual(4);

    const selected = aiAgentService.pickRandomAgentSync();
    expect(selected).toBeTruthy();
    expect(selected.active).not.toBe(false);
  });

  test('updates agent active status', async () => {
    const updated = await aiAgentService.setAgentActive('camila', false);

    expect(updated.key).toBe('camila');
    expect(updated.active).toBe(false);

    const selected = aiAgentService.pickRandomAgentSync();
    expect(selected.key).not.toBe('camila');

    await aiAgentService.setAgentActive('camila', true);
  });
});


