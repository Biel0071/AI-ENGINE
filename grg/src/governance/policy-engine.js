const RULES = Object.freeze({
  'deployment.production': { risk: 'critical', approvalRequired: true, separateApprover: true, permission: 'project:deploy' },
  'deployment.rollback': { risk: 'high', approvalRequired: true, separateApprover: true, permission: 'project:deploy' },
  'budget.increase': { risk: 'high', approvalRequired: true, separateApprover: true, permission: 'security:manage' },
  'infrastructure.change': { risk: 'critical', approvalRequired: true, separateApprover: true, permission: 'security:manage' },
  'version.rollback.production': { risk: 'critical', approvalRequired: true, separateApprover: true, permission: 'security:manage' },
  'version.rollback.nonproduction': { risk: 'high', approvalRequired: false, separateApprover: false, permission: 'security:manage' },
  'factory.generate': { risk: 'medium', approvalRequired: false, separateApprover: false, permission: 'factory:generate' },
});

class PolicyEngine {
  evaluate(action) {
    return { action, ...(RULES[action] || {
      risk: 'medium', approvalRequired: true, separateApprover: true, permission: 'governance:approve',
    }) };
  }
}

module.exports = { PolicyEngine, RULES };
