/**
 * FÊNIX OS — CONNECTION BROWSER SESSION (LEVEL 10)
 * 
 * Objective: Manage stateful OAuth browser authorization sessions.
 * Generates cryptographic state and PKCE S256 code challenge.
 * Dispatches browser launch to the Windows Device Agent.
 */

const crypto = require('crypto');

class ConnectionBrowserSession {
  constructor({
    id = null,
    provider,
    userId = 'grg-admin',
    deviceId = 'GRG-WINDOWS-01',
    scopes = [],
    callbackUrl = 'http://127.0.0.1:4400/api/v2/connections/oauth/callback',
    ttlMs = 600000 // 10 minutes
  }) {
    this.id = id || `sess_${provider}_${crypto.randomBytes(6).toString('hex')}`;
    this.provider = provider;
    this.userId = userId;
    this.deviceId = deviceId;
    this.scopes = scopes;
    this.callbackUrl = callbackUrl;
    this.createdAt = new Date().toISOString();
    this.expiresAt = Date.now() + ttlMs;
    this.status = 'WAITING_USER'; // 'WAITING_USER' | 'COMPLETED' | 'EXPIRED' | 'REVOKED'
    this.correlationId = `corr_conn_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // PKCE & OAuth Security
    this.state = crypto.randomBytes(24).toString('hex');
    this.codeVerifier = crypto.randomBytes(32).toString('base64url');
    this.codeChallenge = crypto.createHash('sha256').update(this.codeVerifier).digest('base64url');
  }

  isExpired() {
    return Date.now() > this.expiresAt;
  }
}

module.exports = { ConnectionBrowserSession };
