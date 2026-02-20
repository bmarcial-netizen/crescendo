export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, message, 'NOT_FOUND');
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, message, 'BAD_REQUEST');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
  }
}

export class InsufficientFundsError extends AppError {
  constructor(message = 'Insufficient funds') {
    super(422, message, 'INSUFFICIENT_FUNDS');
  }
}

export class RiskLimitError extends AppError {
  constructor(message: string) {
    super(422, message, 'RISK_LIMIT_EXCEEDED');
  }
}

export class CircuitBreakerError extends AppError {
  constructor(artistName: string) {
    super(423, `Trading halted for ${artistName}: circuit breaker tripped`, 'CIRCUIT_BREAKER');
  }
}

export class CooldownError extends AppError {
  constructor(expiresAt: Date) {
    super(429, `Trade cooldown active until ${expiresAt.toISOString()}`, 'COOLDOWN_ACTIVE');
  }
}
