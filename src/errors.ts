/**
 * Typed error hierarchy. Routes throw these; the global error handler
 * converts them into the HTTP response. Anything that is not an AppError
 * becomes a 500.
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('validation_error', message, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('not_found', `${resource} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('unauthorized', message, 401);
  }
}

export class LLMProviderError extends AppError {
  constructor(provider: string, message: string, details?: Record<string, unknown>) {
    super('llm_provider_error', `[${provider}] ${message}`, 502, details);
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string) {
    super('configuration_error', message, 500);
  }
}
