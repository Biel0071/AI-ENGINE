class DomainError extends Error {
  constructor(message, code) {
    super(message);
    this.name = this.constructor.name;
    this.code = code || 'DOMAIN_ERROR';
  }
}
class NotFoundError extends DomainError {
  constructor(message) { super(message, 'NOT_FOUND'); }
}
class ConflictError extends DomainError {
  constructor(message) { super(message, 'CONFLICT'); }
}
class ForbiddenError extends DomainError {
  constructor(message) { super(message, 'FORBIDDEN'); }
}
class ValidationError extends DomainError {
  constructor(message) { super(message, 'VALIDATION'); }
}
class RateLimitError extends DomainError {
  constructor(message) { super(message, 'RATE_LIMITED'); }
}
// Uma dependência de execução (modelo local, memória) está indisponível agora. O JobEngine
// guarda o job como BLOCKED sem consumir tentativa e volta a tentar depois; não é falha do job.
class DependencyBlockedError extends DomainError {
  constructor(message, dependency) { super(message, 'DEPENDENCY_BLOCKED'); this.dependency = dependency || 'unknown'; }
}

const STATUS_BY_CODE = {
  NOT_FOUND: 404,
  CONFLICT: 409,
  FORBIDDEN: 403,
  VALIDATION: 400,
  RATE_LIMITED: 429,
  DEPENDENCY_BLOCKED: 503,
  DOMAIN_ERROR: 400,
};

function httpStatusFor(error) {
  if (error instanceof DomainError) return STATUS_BY_CODE[error.code] || 400;
  return 500;
}

module.exports = {
  DomainError, NotFoundError, ConflictError, ForbiddenError, ValidationError, RateLimitError, DependencyBlockedError, httpStatusFor,
};
