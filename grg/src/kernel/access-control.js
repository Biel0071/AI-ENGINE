// RBAC + ABAC. Papéis dão permissões base; atributos (tenant/owner) refinam.
const { ForbiddenError } = require('./errors');

const ROLE_PERMISSIONS = Object.freeze({
  master_admin: ['*'],
  admin: [
    'project:read', 'project:create', 'project:write', 'project:analyze', 'project:deploy',
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
    'fabric:read', 'fabric:enroll', 'registry:read', 'registry:write', 'event:read',
    'discovery:read', 'discovery:scan', 'knowledge:publish',
    'runtime:read', 'runtime:execute', 'runtime:admin',
    'capability:manage',
  ],
  subadmin: [
    'project:read', 'project:analyze', 'repo:read', 'capability:read',
    'memory:read', 'memory:write', 'member:read', 'ai:invoke', 'governance:read', 'graph:read', 'fabric:read', 'registry:read', 'event:read', 'discovery:read', 'runtime:read',
  ],
  employee: ['project:read', 'repo:read', 'capability:read', 'memory:read', 'graph:read'],
  viewer: ['project:read', 'runtime:read', 'memory:read', 'graph:read', 'capability:read', 'event:read', 'discovery:read'],
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

// LEVEL 1: um papel so pode alterar estado se tiver ao menos uma permissao de
// escrita/execucao. viewer e employee sao somente leitura por definicao.
const MUTATING_PERMISSION = /:(write|create|manage|execute|admin|invoke|deploy|generate|install|approve|enroll|scan|publish|connect|analyze)$/;
function canMutate(role) {
  const perms = permissionsFor(role);
  return perms.includes('*') || perms.some((permission) => MUTATING_PERMISSION.test(permission));
}

module.exports = { ROLE_PERMISSIONS, permissionsFor, hasPermission, requirePermission, canMutate };
