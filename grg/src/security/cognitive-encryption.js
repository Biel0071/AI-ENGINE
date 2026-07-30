const crypto = require('node:crypto');
const { ValidationError } = require('../kernel/errors');

const { measured, unknown } = require('../kernel/measurement');

// A cripto aqui e REAL (AES-256-GCM via node:crypto). O que era falso era o RELATORIO de
// status: afirmava memoryEncryptedAtRest/transitEncryptedTLS/tokenizationActive como `true`
// e o veredito 'ACTIVE_AND_SECURE' sem verificar nada. Pior: dizia "at rest" enquanto a
// chave mestra era derivada de uma STRING FIXA no proprio codigo -- quem le o fonte decifra.
// Um selo de seguranca inventado e mais perigoso que a ausencia dele, porque encerra a
// investigacao. Agora cada campo e medido ou declarado desconhecido.
class CognitiveEncryptionService {
  constructor({ store, bus, controlPlane, env = process.env }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    // Chave por ambiente quando existe; senao a derivada, marcada como NAO gerenciada.
    const provided = String(env.FENIX_ENCRYPTION_KEY || '');
    this.keyIsManaged = provided.length >= 32;
    this.secretKey = this.keyIsManaged
      ? crypto.scryptSync(provided, 'fenix-encryption-v1', 32)
      : crypto.scryptSync('grg-fenix-master-secret-key-v71', 'salt-v71', 32);
    this.tlsTerminatedExternally = String(env.FENIX_PUBLIC_URL || '').startsWith('https://');
  }

  async getEncryptionStatus(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    // Prova de vida do algoritmo: cifra e decifra um canario AGORA. Sem isso, dizer
    // "AES-256-GCM ativo" seria so repetir uma string de configuracao.
    let selfTest;
    try {
      const probe = `probe:${crypto.randomBytes(8).toString('hex')}`;
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', this.secretKey, iv);
      const enc = cipher.update(probe, 'utf8', 'hex') + cipher.final('hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.secretKey, iv);
      decipher.setAuthTag(cipher.getAuthTag());
      const back = decipher.update(enc, 'hex', 'utf8') + decipher.final('utf8');
      selfTest = back === probe
        ? measured('PASSED', 'crypto:aes-256-gcm-roundtrip')
        : unknown('roundtrip devolveu texto diferente do canario');
    } catch (error) {
      selfTest = unknown(`roundtrip falhou: ${error.message}`);
    }
    const roundTripOk = selfTest.state === 'measured';
    // O veredito DERIVA do que foi medido. Chave nao gerenciada nunca produz "SECURE":
    // a cripto funciona, mas o segredo esta no repositorio.
    const status = !roundTripOk
      ? 'ERROR'
      : this.keyIsManaged
        ? 'ACTIVE_MANAGED_KEY'
        : 'ACTIVE_UNMANAGED_KEY';
    return {
      tenantId,
      algorithm: 'AES-256-GCM',
      keyLengthBits: this.secretKey.length * 8,
      selfTest,
      // Presenca de chave por ambiente e medivel; a qualidade dela nao.
      keyManagement: this.keyIsManaged
        ? measured('ENV_PROVIDED', 'env:FENIX_ENCRYPTION_KEY')
        : unknown('sem FENIX_ENCRYPTION_KEY: chave derivada de string fixa no codigo', {
            action: 'definir FENIX_ENCRYPTION_KEY (>=32 chars) e rotacionar os tokens existentes',
          }),
      // O que este processo NAO consegue verificar fica explicito, em vez de virar `true`.
      memoryEncryptedAtRest: unknown('cifragem em repouso e responsabilidade do storage; nao verificavel deste processo', {
        action: 'medir via probe no adapter de storage (Postgres/S3) ou politica de disco',
      }),
      transitEncryptedTLS: this.tlsTerminatedExternally
        ? measured('EXTERNAL_TLS_DECLARED', 'env:FENIX_PUBLIC_URL')
        : unknown('TLS e terminado no proxy externo; sem URL https configurada nao ha evidencia'),
      tokenizationActive: roundTripOk
        ? measured(true, 'crypto:aes-256-gcm-roundtrip')
        : unknown('roundtrip nao passou'),
      status,
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
    // GCM verifica o auth tag aqui: se o texto foi adulterado, final() LANCA. Portanto a
    // integridade nao e uma afirmacao nossa, e o resultado de uma operacao criptografica.
    // O envelope measured() registra de onde veio essa garantia.
    decrypted += decipher.final('utf8');

    return { decrypted, integrity: measured('AUTH_TAG_VERIFIED', 'crypto:aes-256-gcm-authtag') };
  }
}

module.exports = { CognitiveEncryptionService };
