const ROLE_PERMISSIONS = Object.freeze({
  master_admin: ['*'],
  admin: ['project:read', 'project:create', 'project:analyze', 'project:deploy', 'memory:read', 'memory:write', 'member:read', 'member:manage'],
  subadmin: ['project:read', 'project:analyze', 'memory:read', 'memory:write', 'member:read'],
  employee: ['project:read', 'memory:read'],
});

class ForbiddenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

function hasPermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes('*') || permissions.includes(permission);
}

function requirePermission(membership, permission) {
  if (!membership || membership.status !== 'active') {
    throw new ForbiddenError('Active tenant membership is required');
  }
  if (!hasPermission(membership.role, permission)) {
    throw new ForbiddenError(`Role ${membership.role} cannot perform ${permission}`);
  }
  return membership;
}

module.exports = { ForbiddenError, ROLE_PERMISSIONS, hasPermission, requirePermission };
