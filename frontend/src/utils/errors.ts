/**
 * Standardized Error Handling Utilities
 * 
 * Provides consistent error types, messages, and handling across the application.
 */

import { logError, logWarning } from '../lib/rollbar';

/**
 * Application error types
 */
export enum ErrorType {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // Authentication/Authorization
  AUTH_ERROR = 'AUTH_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // File processing errors
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE = 'UNSUPPORTED_FILE_TYPE',
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  FILE_PROCESSING_ERROR = 'FILE_PROCESSING_ERROR',
  
  // Service errors
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // Data errors
  NOT_FOUND = 'NOT_FOUND',
  DATA_CORRUPTION = 'DATA_CORRUPTION',
  
  // Configuration errors
  CONFIG_ERROR = 'CONFIG_ERROR',
  MISSING_ENV_VAR = 'MISSING_ENV_VAR',
  
  // Generic
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly userMessage: string;
  public readonly technicalDetails?: unknown;
  public readonly recoverable: boolean;
  public readonly timestamp: Date;

  constructor(
    type: ErrorType,
    userMessage: string,
    technicalDetails?: unknown,
    recoverable: boolean = true
  ) {
    super(userMessage);
    this.name = 'AppError';
    this.type = type;
    this.userMessage = userMessage;
    this.technicalDetails = technicalDetails;
    this.recoverable = recoverable;
    this.timestamp = new Date();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return this.userMessage;
  }

  /**
   * Get technical details for logging
   */
  getTechnicalDetails(): unknown {
    return this.technicalDetails;
  }

  /**
   * Check if error is recoverable
   */
  isRecoverable(): boolean {
    return this.recoverable;
  }
}

/**
 * User-friendly error messages
 */
export const ERROR_MESSAGES: Record<ErrorType, string> = {
  // Network
  [ErrorType.NETWORK_ERROR]: 'Network connection failed. Please check your internet connection and try again.',
  [ErrorType.API_ERROR]: 'Unable to connect to the server. Please try again later.',
  [ErrorType.TIMEOUT_ERROR]: 'Request timed out. The server took too long to respond.',
  
  // Auth
  [ErrorType.AUTH_ERROR]: 'Authentication failed. Please check your credentials.',
  [ErrorType.PERMISSION_ERROR]: 'You don\'t have permission to perform this action.',
  
  // Validation
  [ErrorType.VALIDATION_ERROR]: 'Invalid input. Please check your data and try again.',
  [ErrorType.INVALID_INPUT]: 'The provided input is invalid. Please correct it and try again.',
  
  // File
  [ErrorType.FILE_TOO_LARGE]: 'File is too large. Please upload a smaller file.',
  [ErrorType.UNSUPPORTED_FILE_TYPE]: 'File type not supported. Please upload a supported file format.',
  [ErrorType.FILE_UPLOAD_ERROR]: 'Failed to upload file. Please try again.',
  [ErrorType.FILE_PROCESSING_ERROR]: 'Failed to process file. Please ensure the file is valid.',
  
  // Service
  [ErrorType.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable. Please try again later.',
  [ErrorType.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait a moment and try again.',
  [ErrorType.EXTERNAL_SERVICE_ERROR]: 'External service error. Please try again later.',
  
  // Data
  [ErrorType.NOT_FOUND]: 'The requested resource was not found.',
  [ErrorType.DATA_CORRUPTION]: 'Data corruption detected. Please contact support.',
  
  // Config
  [ErrorType.CONFIG_ERROR]: 'Configuration error. Please contact administrator.',
  [ErrorType.MISSING_ENV_VAR]: 'Missing required configuration. Please contact administrator.',
  
  // Generic
  [ErrorType.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
};

/**
 * Convert unknown error to AppError
 */
export function toAppError(error: unknown): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Standard Error
  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes('Network') || error.message.includes('fetch')) {
      return new AppError(ErrorType.NETWORK_ERROR, ERROR_MESSAGES[ErrorType.NETWORK_ERROR], error);
    }
    if (error.message.includes('timeout')) {
      return new AppError(ErrorType.TIMEOUT_ERROR, ERROR_MESSAGES[ErrorType.TIMEOUT_ERROR], error);
    }
    if (error.message.includes('rate limit')) {
      return new AppError(ErrorType.RATE_LIMIT_EXCEEDED, ERROR_MESSAGES[ErrorType.RATE_LIMIT_EXCEEDED], error);
    }
    if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      return new AppError(ErrorType.PERMISSION_ERROR, ERROR_MESSAGES[ErrorType.PERMISSION_ERROR], error);
    }

    // Generic error
    return new AppError(ErrorType.UNKNOWN_ERROR, error.message, error);
  }

  // String error
  if (typeof error === 'string') {
    return new AppError(ErrorType.UNKNOWN_ERROR, error);
  }

  // Unknown error type
  return new AppError(
    ErrorType.UNKNOWN_ERROR,
    ERROR_MESSAGES[ErrorType.UNKNOWN_ERROR],
    error
  );
}

/**
 * Handle error with logging and user feedback
 */
export function handleError(
  error: unknown,
  context?: string
): AppError {
  const appError = toAppError(error);

  // Log to console in development
  if (import.meta.env.DEV) {
    console.error(`[${context || 'Error'}]`, {
      type: appError.type,
      message: appError.message,
      userMessage: appError.userMessage,
      details: appError.technicalDetails,
      timestamp: appError.timestamp,
      stack: appError.stack,
    });
  }

  // Log to Rollbar in production
  logError(appError, {
    context,
    errorType: appError.type,
    recoverable: appError.recoverable,
    technicalDetails: appError.technicalDetails,
  });

  return appError;
}

/**
 * Create a network error
 */
export function createNetworkError(details?: unknown): AppError {
  return new AppError(
    ErrorType.NETWORK_ERROR,
    ERROR_MESSAGES[ErrorType.NETWORK_ERROR],
    details
  );
}

/**
 * Create a validation error
 */
export function createValidationError(message: string, details?: unknown): AppError {
  return new AppError(
    ErrorType.VALIDATION_ERROR,
    message || ERROR_MESSAGES[ErrorType.VALIDATION_ERROR],
    details
  );
}

/**
 * Create a file error
 */
export function createFileError(type: ErrorType, details?: unknown): AppError {
  if (![ErrorType.FILE_TOO_LARGE, ErrorType.UNSUPPORTED_FILE_TYPE, ErrorType.FILE_UPLOAD_ERROR, ErrorType.FILE_PROCESSING_ERROR].includes(type)) {
    type = ErrorType.FILE_PROCESSING_ERROR;
  }
  return new AppError(type, ERROR_MESSAGES[type], details);
}

/**
 * Create a rate limit error
 */
export function createRateLimitError(details?: unknown): AppError {
  return new AppError(
    ErrorType.RATE_LIMIT_EXCEEDED,
    ERROR_MESSAGES[ErrorType.RATE_LIMIT_EXCEEDED],
    details,
    true // Recoverable - user can retry
  );
}

/**
 * Create a service unavailable error
 */
export function createServiceError(serviceName: string, details?: unknown): AppError {
  return new AppError(
    ErrorType.SERVICE_UNAVAILABLE,
    `${serviceName} is temporarily unavailable. Please try again later.`,
    details
  );
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  const appError = toAppError(error);
  return [
    ErrorType.NETWORK_ERROR,
    ErrorType.TIMEOUT_ERROR,
    ErrorType.SERVICE_UNAVAILABLE,
    ErrorType.RATE_LIMIT_EXCEEDED,
  ].includes(appError.type);
}

/**
 * Get retry delay for error (in milliseconds)
 */
export function getRetryDelay(error: unknown, attemptNumber: number): number {
  const appError = toAppError(error);
  
  // Rate limit: wait longer
  if (appError.type === ErrorType.RATE_LIMIT_EXCEEDED) {
    return Math.min(1000 * Math.pow(2, attemptNumber), 60000); // Max 1 minute
  }
  
  // Network/timeout: exponential backoff
  if (appError.type === ErrorType.NETWORK_ERROR || appError.type === ErrorType.TIMEOUT_ERROR) {
    return Math.min(500 * Math.pow(2, attemptNumber), 30000); // Max 30 seconds
  }
  
  // Default: short delay
  return Math.min(1000 * attemptNumber, 10000); // Max 10 seconds
}

/**
 * Format error for display
 */
export function formatErrorMessage(error: unknown): string {
  const appError = toAppError(error);
  return appError.getUserMessage();
}

/**
 * Log warning (non-error issues)
 */
export function logWarningMessage(message: string, context?: string, details?: unknown) {
  if (import.meta.env.DEV) {
    console.warn(`[${context || 'Warning'}]`, message, details);
  }
  logWarning(message, { context, details });
}
