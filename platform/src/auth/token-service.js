'use strict';

const crypto = require('node:crypto');

const DEFAULT_SECRET = process.env.FENIX_AUTH_SECRET || 'fenix-control-plane-secret-key-2026';
const TOKEN_TTL_MS = Number(process.env.FENIX_TOKEN_TTL_MS || 24 * 60 * 60 * 1000); // 24h

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

function signHmac(data, secret = DEFAULT_SECRET) {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

class TokenService {
  constructor({ secret = DEFAULT_SECRET, ttlMs = TOKEN_TTL_MS } = {}) {
    this.secret = secret;
    this.ttlMs = ttlMs;
  }

  /**
   * Emite um token de sessão assinado contendo identidade e role do ator
   */
  generateSessionToken({ tenantId, userId, role = 'employee', name = null, customTtlMs = null }) {
    if (!tenantId || !userId) {
      throw new Error('tenantId and userId are required to issue a session token');
    }
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Date.now();
    const payload = {
      tenantId: String(tenantId).trim(),
      userId: String(userId).trim(),
      role: String(role).trim(),
      name: name ? String(name).trim() : undefined,
      iat: Math.floor(now / 1000),
      exp: Math.floor((now + (customTtlMs || this.ttlMs)) / 1000),
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signature = signHmac(`${encodedHeader}.${encodedPayload}`, this.secret);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Valida e decodifica o token de sessão HMAC-SHA256
   */
  verifySessionToken(token) {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Token is missing or invalid' };
    }
    const parts = token.trim().split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Malformed token structure' };
    }
    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSig = signHmac(`${encodedHeader}.${encodedPayload}`, this.secret);

    try {
      const isSignatureValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSig)
      );
      if (!isSignatureValid) {
        return { valid: false, error: 'Invalid token signature' };
      }
    } catch {
      return { valid: false, error: 'Signature verification error' };
    }

    try {
      const payload = JSON.parse(base64UrlDecode(encodedPayload));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        return { valid: false, error: 'Token has expired' };
      }
      return {
        valid: true,
        payload: {
          tenantId: payload.tenantId,
          userId: payload.userId,
          role: payload.role,
          name: payload.name,
        },
      };
    } catch (e) {
      return { valid: false, error: `Invalid payload encoding: ${e.message}` };
    }
  }

  /**
   * Gera uma API Key de serviço para integrações automáticas
   */
  generateApiKey(tenantId, userId, label = 'default') {
    const raw = crypto.randomBytes(24).toString('hex');
    const key = `fenix_live_${raw}`;
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    return {
      key,
      hash,
      tenantId,
      userId,
      label,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Extrai e autentica as credenciais a partir do request HTTP
   */
  async authenticateRequest(request, store = null) {
    const authHeader = request.headers['authorization'] || '';
    const apiKeyHeader = request.headers['x-api-key'] || '';
    const isProduction = process.env.AUTH_MODE === 'production' || process.env.NODE_ENV === 'production';

    // 1. Tenta Bearer Token
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const verified = this.verifySessionToken(token);
      if (verified.valid) {
        return {
          authenticated: true,
          tenantId: verified.payload.tenantId,
          actorId: verified.payload.userId,
          role: verified.payload.role,
          authMethod: 'bearer_token',
        };
      }
      throw new Error(`Authentication failed: ${verified.error}`);
    }

    // 2. Tenta API Key
    if (apiKeyHeader) {
      const key = String(apiKeyHeader).trim();
      const keyHash = crypto.createHash('sha256').update(key).digest('hex');
      if (store) {
        const state = await store.read();
        const found = (state.apiKeys || []).find((k) => k.hash === keyHash && k.status !== 'revoked');
        if (found) {
          return {
            authenticated: true,
            tenantId: found.tenantId,
            actorId: found.userId,
            role: found.role || 'admin',
            authMethod: 'api_key',
          };
        }
      }
      // Se não encontrou no store mas temos a chave mestra configurada
      if (process.env.FENIX_MASTER_API_KEY && key === process.env.FENIX_MASTER_API_KEY) {
        return {
          authenticated: true,
          tenantId: request.headers['x-tenant-id'] || 'master-tenant',
          actorId: 'master-admin',
          role: 'master_admin',
          authMethod: 'master_api_key',
        };
      }
      throw new Error('Authentication failed: Invalid API key');
    }

    // 3. Fallback de desenvolvimento local controlado
    const rawTenant = String(request.headers['x-tenant-id'] || '').trim();
    const rawUser = String(request.headers['x-user-id'] || '').trim();

    if (!isProduction && rawTenant && rawUser) {
      return {
        authenticated: true,
        tenantId: rawTenant,
        actorId: rawUser,
        role: null, // O ControlPlane resolverá a role pelo membership
        authMethod: 'local_simulated',
      };
    }

    throw new Error('Authentication required: Missing Authorization Bearer token or x-api-key');
  }
}

const defaultTokenService = new TokenService();

module.exports = {
  TokenService,
  defaultTokenService,
  base64UrlEncode,
  base64UrlDecode,
};
