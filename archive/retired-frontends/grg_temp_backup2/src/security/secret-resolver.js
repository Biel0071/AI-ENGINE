/**
 * FÊNIX OS — Unified Secret Resolver
 * Resolves credentials deterministically from Docker secrets, file paths, and environment variables.
 * Guarantees zero secret leakage in logs, frontend, or error messages.
 */

const fs = require('node:fs');
const path = require('node:path');

function readSecretFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8').trim();
      if (content && content !== 'dummy' && content.length > 0) {
        return content;
      }
    }
  } catch {
    // Secret file unreadable or permission denied
  }
  return null;
}

function resolveSecret(secretName, env = process.env) {
  // 1. Check standard Docker Secret location (/run/secrets/<secretName>)
  const dockerSecretPath = path.join('/run/secrets', secretName);
  const fromDockerSecret = readSecretFile(dockerSecretPath);
  if (fromDockerSecret) return fromDockerSecret;

  // 2. Check custom secret file path via environment variable (<SECRET_NAME>_FILE)
  const envFileVar = `${secretName.toUpperCase()}_FILE`;
  if (env[envFileVar]) {
    const fromEnvFile = readSecretFile(env[envFileVar]);
    if (fromEnvFile) return fromEnvFile;
  }

  // 3. Check direct environment variable mappings
  const envMappings = {
    ai_provider_key: ['GRG_AIPLATFORM_KEY', 'AI_PROVIDER_KEY', 'FENIX_AI_KEY'],
    postgres_password: ['POSTGRES_PASSWORD', 'PGPASSWORD'],
    redis_password: ['REDIS_PASSWORD'],
    metrics_token: ['FENIX_METRICS_TOKEN', 'METRICS_TOKEN'],
    keycloak_admin_password: ['KEYCLOAK_ADMIN_PASSWORD', 'KC_BOOTSTRAP_ADMIN_PASSWORD'],
    minio_access_key: ['MINIO_ACCESS_KEY', 'MINIO_ROOT_USER'],
    minio_secret_key: ['MINIO_SECRET_KEY', 'MINIO_ROOT_PASSWORD']
  };

  const candidates = envMappings[secretName] || [secretName.toUpperCase()];
  for (const varName of candidates) {
    if (env[varName] && String(env[varName]).trim().length > 0) {
      return String(env[varName]).trim();
    }
  }

  // 4. Local fallback for development / testing if configured in project .secrets
  const localSecretPath = path.join(__dirname, '..', '..', '.secrets', secretName);
  const fromLocalSecret = readSecretFile(localSecretPath);
  if (fromLocalSecret) return fromLocalSecret;

  return null;
}

function resolveAIProviderKey(env = process.env) {
  return resolveSecret('ai_provider_key', env);
}

function resolveAIPlatformUrl(env = process.env) {
  return env.GRG_AIPLATFORM_URL || process.env.GRG_AIPLATFORM_URL || 'http://209.50.241.215';
}

function resolveAIPlatformModel(env = process.env) {
  return env.GRG_AIPLATFORM_MODEL || process.env.GRG_AIPLATFORM_MODEL || 'qwen2.5:3b';
}

module.exports = {
  resolveSecret,
  resolveAIProviderKey,
  resolveAIPlatformUrl,
  resolveAIPlatformModel
};
