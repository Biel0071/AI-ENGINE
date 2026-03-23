const leadsService = require('../crm/services/leadsService');

describe('Leads service', () => {
  test('creates and lists records', () => {
    const created = leadsService.createLeads({ name: 'Test Leads' });
    expect(created).toHaveProperty('id');

    const all = leadsService.listLeads();
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThan(0);
  });
});


