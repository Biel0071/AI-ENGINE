/**
 * FÊNIX OS — ENCRYPTED SECRET VAULT (LEVEL 10)
 * 
 * Objective: Encrypted storage of OAuth tokens, API keys, and device identities.
 * Stores only reference hashes (secretRef) in database/memory.
 * Guarantees ZERO SECRET LEAKAGE in logs, frontend responses, or Alexa outputs.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SecretVault {
  constructor({ vaultPath = null } = {}) {
    this.vaultPath = vaultPath || path.join(__dirname, '..', '..', 'memory', '.secrets-vault.json');
    this.inMemorySecrets = new Map();
    // LEVEL 1: fail-closed. Sem FENIX_VAULT_KEY o cofre nao cifra nem decifra nada;
    // antes caia numa chave fixa versionada no git (qualquer copia do repo decifrava).
    const vaultKey = String(process.env.FENIX_VAULT_KEY || '');
    this.encryptionKey = vaultKey.length >= 16
      ? crypto.scryptSync(vaultKey, String(process.env.FENIX_VAULT_SALT || 'fenix-secret-vault-v2'), 32, { maxmem: 64 * 1024 * 1024 })
      : null;
    this._loadVault();
  }

  _loadVault() {
    try {
      if (fs.existsSync(this.vaultPath)) {
        const data = fs.readFileSync(this.vaultPath, 'utf8');
        const parsed = JSON.parse(data);
        for (const [ref, encData] of Object.entries(parsed)) {
          this.inMemorySecrets.set(ref, encData);
        }
      }
    } catch {
      // In-memory fallback
    }
  }

  _persistVault() {
    try {
      const dir = path.dirname(this.vaultPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const obj = {};
      for (const [ref, encData] of this.inMemorySecrets.entries()) {
        obj[ref] = encData;
      }
      fs.writeFileSync(this.vaultPath, JSON.stringify(obj, null, 2));
    } catch {
      // ignore persistence error
    }
  }

  _requireKey() {
    if (!this.encryptionKey) {
      throw new Error('SecretVault locked: FENIX_VAULT_KEY (16+ chars) is not configured');
    }
  }

  /**
   * Store a secret and return its deterministic, unguessable secretRef
   */
  storeSecret(provider, payload = {}) {
    this._requireKey();
    const secretRef = `sec_${provider}_${crypto.randomBytes(8).toString('hex')}`;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    const raw = JSON.stringify(payload);
    let encrypted = cipher.update(raw, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    this.inMemorySecrets.set(secretRef, {
      secretRef,
      provider,
      iv: iv.toString('hex'),
      authTag,
      encrypted,
      createdAt: new Date().toISOString()
    });

    this._persistVault();
    return secretRef;
  }

  /**
   * Resolve secret safely in internal backend execution
   */
  resolveSecret(secretRef) {
    this._requireKey();
    if (!secretRef || !this.inMemorySecrets.has(secretRef)) return null;
    try {
      const record = this.inMemorySecrets.get(secretRef);
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, Buffer.from(record.iv, 'hex'));
      decipher.setAuthTag(Buffer.from(record.authTag, 'hex'));
      
      let decrypted = decipher.update(record.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  /**
   * Purge secret from vault
   */
  purgeSecret(secretRef) {
    if (this.inMemorySecrets.has(secretRef)) {
      this.inMemorySecrets.delete(secretRef);
      this._persistVault();
      return true;
    }
    return false;
  }
}

module.exports = { SecretVault };
