const { SystemModule } = require('../kernel/module');
const { STATE_MACHINE } = require('../kernel/states');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * FenixVault v2.0
 * Cofre Real nativo via AES-256-GCM.
 * As chaves são gravadas em disco protegidas por uma chave mestre atrelada ao hardware.
 */
class FenixVault extends SystemModule {
  constructor() {
    super('fenix_vault', '2.0.0');
    this.status = STATE_MACHINE.BOOT;
    this.vaultDir = path.join(process.env.APPDATA || os.homedir(), 'FenixOS');
    this.vaultFile = path.join(this.vaultDir, 'vault.enc');
    this.masterKey = this._generateMachineMasterKey();
    this.secrets = new Map();
  }

  _generateMachineMasterKey() {
    // Em produção, isso deve ser derivado do hardware (ex: CPU ID + MAC Address).
    // Aqui usamos o hostname + username hmaczado para simplificar a prova arquitetural sem depêndencias nativas extras.
    const hmac = crypto.createHmac('sha256', 'fenixos-v2-super-secret-salt');
    hmac.update(os.hostname() + os.userInfo().username);
    return hmac.digest();
  }

  async start() {
    this.status = STATE_MACHINE.READY;
    console.log('[FenixVault] Conectando ao armazenamento seguro (AES-256-GCM)...');
    
    if (!fs.existsSync(this.vaultDir)) {
      fs.mkdirSync(this.vaultDir, { recursive: true });
    }
    
    this._loadFromDisk();
    
    this.status = STATE_MACHINE.ONLINE;
    this.startTime = Date.now();
  }

  _loadFromDisk() {
    if (!fs.existsSync(this.vaultFile)) return;
    try {
      const data = fs.readFileSync(this.vaultFile, 'utf8');
      const lines = data.split('\n').filter(l => l.trim().length > 0);
      for (const line of lines) {
        const parsed = JSON.parse(line);
        const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, Buffer.from(parsed.iv, 'hex'));
        decipher.setAuthTag(Buffer.from(parsed.authTag, 'hex'));
        let decrypted = decipher.update(parsed.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        this.secrets.set(parsed.key, decrypted);
      }
    } catch(e) {
      console.error('[FenixVault] Falha ao descriptografar o cofre:', e.message);
    }
  }

  _saveToDisk() {
    let output = '';
    for (const [key, secret] of this.secrets.entries()) {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
      let encrypted = cipher.update(secret, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');
      
      output += JSON.stringify({ key, iv: iv.toString('hex'), authTag, encrypted }) + '\n';
    }
    fs.writeFileSync(this.vaultFile, output, 'utf8');
  }

  async store(key, secret) {
    if (this.status !== STATE_MACHINE.ONLINE) throw new Error('Vault is not ONLINE');
    this.secrets.set(key, secret);
    this._saveToDisk();
    console.log(`[FenixVault] Chave salva com segurança: ${key}`);
  }

  async retrieve(key) {
    if (this.status !== STATE_MACHINE.ONLINE) throw new Error('Vault is not ONLINE');
    return this.secrets.get(key) || null;
  }

  async rotate(key, newSecret) {
    await this.store(key, newSecret);
  }

  async listKeys() {
    return Array.from(this.secrets.keys());
  }

  async health() {
    return {
      ok: this.status === STATE_MACHINE.ONLINE,
      status: this.status,
      details: {
        storedSecretsCount: this.secrets.size
      }
    };
  }
}

module.exports = { FenixVault };
