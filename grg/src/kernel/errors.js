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

const STATUS_BY_CODE = {
  NOT_FOUND: 404,
  CONFLICT: 409,
  FORBIDDEN: 403,
  VALIDATION: 400,
  DOMAIN_ERROR: 400,
};

function httpStatusFor(error) {
  if (error instanceof DomainError) return STATUS_BY_CODE[error.code] || 400;
  return 500;
}

module.exports = {
  DomainError, NotFoundError, ConflictError, ForbiddenError, ValidationError, httpStatusFor,
};
