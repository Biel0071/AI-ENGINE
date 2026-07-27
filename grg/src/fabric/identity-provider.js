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
module.exports = { LocalIdentityProvider };
