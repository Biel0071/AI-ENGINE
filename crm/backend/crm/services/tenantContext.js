function resolveTenantIdFromRequest(req) {
  const headerTenant = req.headers['x-tenant-id'] || req.headers['x-company-id'];
  const queryTenant = req.query?.tenantId || req.query?.companyId;
  const bodyTenant = req.body?.tenantId || req.body?.companyId;

  return String(headerTenant || queryTenant || bodyTenant || process.env.DEFAULT_COMPANY_ID || 'default').trim();
}

function tenantContextMiddleware(req, _res, next) {
  req.tenantId = resolveTenantIdFromRequest(req);
  req.companyId = req.tenantId;
  next();
}

function getCompanyId(req, fallback) {
  return String(req?.tenantId || req?.companyId || fallback || process.env.DEFAULT_COMPANY_ID || 'default').trim();
}

module.exports = {
  getCompanyId,
  resolveTenantIdFromRequest,
  tenantContextMiddleware,
};
