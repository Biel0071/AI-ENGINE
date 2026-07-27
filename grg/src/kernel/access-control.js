// RBAC + ABAC. Papéis dão permissões base; atributos (tenant/owner) refinam.
const { ForbiddenError } = require('./errors');

const ROLE_PERMISSIONS = Object.freeze({
  master_admin: ['*'],
  admin: [
    'project:read', 'project:create', 'project:analyze', 'project:deploy',
    'repo:connect', 'repo:read',
    'capability:read', 'capability:write',
    'memory:read', 'memory:write',
    'member:read', 'member:manage',
    'ai:invoke',
    'factory:generate',
    'whitelabel:manage', 'design:manage', 'build:create',
    'marketplace:install', 'billing:read',
    'governance:approve', 'governance:read', 'audit:read', 'security:manage',
    'graph:read', 'graph:write',
  ],
  subadmin: [
    'project:read', 'project:analyze', 'repo:read', 'capability:read',
    'memory:read', 'memory:write', 'member:read', 'ai:invoke', 'governance:read', 'graph:read',
  ],
  employee: ['project:read', 'repo:read', 'capability:read', 'memory:read', 'graph:read'],
});

function permissionsFor(role) {
  return ROLE_PERMISSIONS[role] || [];
}

function hasPermission(role, permission) {
  const perms = permissionsFor(role);
  return perms.includes('*') || perms.includes(permission);
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

module.exports = { ROLE_PERMISSIONS, permissionsFor, hasPermission, requirePermission };
