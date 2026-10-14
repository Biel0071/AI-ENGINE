const crypto = require('node:crypto');
class LocalIdentityProvider {
  issue(tenantId, serviceId) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
    const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });
    const fingerprint = crypto.createHash('sha256').update(publicPem).digest('hex');
    return { identity: `spiffe://grg.local/tenant/${tenantId}/service/${serviceId}`, publicKey: publicPem, fingerprint, credentialRef: `local-once:${crypto.randomUUID()}`, privateKey: privatePem, expiresAt: null, developmentOnly: true };
  }
}
class WorkloadIdentityProvider {
  constructor({ trustDomain = 'grg.internal', credentialRef = 'spiffe-workload-api' } = {}) { if (!/^[a-z0-9.-]+$/.test(trustDomain)) throw new Error('invalid SPIFFE trust domain'); this.trustDomain = trustDomain; this.credentialRef = credentialRef; this.productionSafe = true; }
  issue(tenantId, serviceId) { const identity = `spiffe://${this.trustDomain}/tenant/${encodeURIComponent(tenantId)}/service/${encodeURIComponent(serviceId)}`; return { identity, publicKey: null, fingerprint: crypto.createHash('sha256').update(identity).digest('hex'), credentialRef: this.credentialRef, privateKey: null, expiresAt: null, developmentOnly: false }; }
}
module.exports = { LocalIdentityProvider, WorkloadIdentityProvider };
