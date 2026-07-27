class OidcVerifier {
  constructor({ issuer, audience, jwksUri, algorithms = ['RS256', 'ES256'], jwtVerifyImpl = null, jwks = null }) {
    if (!issuer || !audience || !jwksUri) throw new Error('OIDC issuer, audience and JWKS URI are required');
    for (const value of [issuer, jwksUri]) if (new URL(value).protocol !== 'https:') throw new Error('OIDC endpoints must use HTTPS');
    this.issuer = issuer.replace(/\/$/, ''); this.audience = audience; this.jwksUri = jwksUri; this.algorithms = algorithms; this.jwtVerifyImpl = jwtVerifyImpl; this.jwks = jwks;
  }
  async verify(token) {
    if (!token) return null; let verify = this.jwtVerifyImpl; let jwks = this.jwks;
    if (!verify) { const jose = await import('jose'); verify = jose.jwtVerify; if (!jwks) { jwks = jose.createRemoteJWKSet(new URL(this.jwksUri)); this.jwks = jwks; } }
    const { payload, protectedHeader } = await verify(token, jwks, { issuer: this.issuer, audience: this.audience, algorithms: this.algorithms });
    if (!payload.sub || !protectedHeader?.alg || protectedHeader.alg === 'none') throw new Error('OIDC token requires subject and signed algorithm');
    return { userId: String(payload.preferred_username || payload.sub), tenantId: String(payload.tenant_id || payload.tenant || ''), roles: Array.isArray(payload.roles) ? payload.roles : [], claims: payload };
  }
}
module.exports = { OidcVerifier };
