const acebot = require('../crm/ai/acebot');

describe('AI Development Engine smoke', () => {
  test('runs architectural workflow with core agents', async () => {
    const result = await acebot.runWorkflow({
      execute: ['architectAgent', 'modulePlannerAgent', 'uiAnalyzerAgent'],
    });

    expect(result).toBeTruthy();
    expect(result.orchestrator).toBe('acebot');
    expect(Array.isArray(result.execute)).toBe(true);
    expect(result.results).toBeTruthy();
    expect(result.results.architectAgent).toBeTruthy();
  });
});


