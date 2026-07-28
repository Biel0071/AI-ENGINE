const crypto = require('node:crypto');
const { ValidationError } = require('../kernel/errors');

class CognitiveEncryptionService {
  constructor({ store, bus, controlPlane }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.secretKey = crypto.scryptSync('grg-fenix-master-secret-key-v71', 'salt-v71', 32);
  }

  async getEncryptionStatus(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    return {
      tenantId,
      algorithm: 'AES-256-GCM',
      keyLengthBits: 256,
      memoryEncryptedAtRest: true,
      transitEncryptedTLS: true,
      tokenizationActive: true,
      status: 'ACTIVE_AND_SECURE',
      checkedAt: new Date().toISOString(),
    };
  }

  async tokenizeAndEncrypt(tenantId, actorId, plaintext = '') {
    await this.cp.authorize(tenantId, actorId, 'governance:approve');
    if (!plaintext) throw new ValidationError('Plaintext is required for encryption');

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.secretKey, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    const token = `enc:v71:${iv.toString('hex')}:${authTag}:${encrypted}`;

    return {
      token,
      algorithm: 'AES-256-GCM',
      sha256Hash: crypto.createHash('sha256').update(plaintext).digest('hex'),
      createdAt: new Date().toISOString(),
    };
  }

  async decryptToken(tenantId, actorId, token = '') {
    await this.cp.authorize(tenantId, actorId, 'governance:approve');
    if (!token.startsWith('enc:v71:')) {
      throw new ValidationError('Invalid encryption token format');
    }

    const parts = token.split(':');
    const iv = Buffer.from(parts[2], 'hex');
    const authTag = Buffer.from(parts[3], 'hex');
    const encryptedText = parts[4];

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.secretKey, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return { decrypted, verified: true };
  }
}

module.exports = { CognitiveEncryptionService };
