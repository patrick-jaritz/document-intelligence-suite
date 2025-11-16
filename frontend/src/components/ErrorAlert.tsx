/**
 * Standardized error display component
 */

import { AlertCircle, X, RefreshCw } from 'lucide-react';
import { AppError, ErrorType, formatErrorMessage } from '../utils/errors';

export interface ErrorAlertProps {
  error: Error | AppError | string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  showDetails?: boolean;
}

export function ErrorAlert({
  error,
  onRetry,
  onDismiss,
  className = '',
  showDetails = false,
}: ErrorAlertProps) {
  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : formatErrorMessage(error);
  const appError = error instanceof AppError ? error : null;
  const isRecoverable = appError?.isRecoverable() ?? true;

  // Determine severity color
  const getSeverityColor = (): string => {
    if (!appError) return 'red';
    
    switch (appError.type) {
      case ErrorType.VALIDATION_ERROR:
      case ErrorType.INVALID_INPUT:
        return 'yellow';
      case ErrorType.RATE_LIMIT_EXCEEDED:
        return 'orange';
      case ErrorType.NETWORK_ERROR:
      case ErrorType.TIMEOUT_ERROR:
        return 'blue';
      default:
        return 'red';
    }
  };

  const color = getSeverityColor();
  const bgColor = `bg-${color}-50`;
  const borderColor = `border-${color}-200`;
  const textColor = `text-${color}-800`;
  const iconColor = `text-${color}-600`;
  const buttonColor = `text-${color}-700 hover:text-${color}-900`;

  return (
    <div
      className={`rounded-lg border-2 ${borderColor} ${bgColor} p-4 ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
        
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${textColor} mb-1`}>
            {appError?.type.replace(/_/g, ' ') || 'Error'}
          </h3>
          <p className={`text-sm ${textColor}`}>{errorMessage}</p>
          
          {showDetails && appError?.technicalDetails && (
            <details className="mt-2">
              <summary className={`text-xs ${textColor} cursor-pointer hover:underline`}>
                Technical details
              </summary>
              <pre className={`mt-2 text-xs ${textColor} bg-white bg-opacity-50 p-2 rounded overflow-x-auto`}>
                {typeof appError.technicalDetails === 'string' 
                  ? appError.technicalDetails
                  : JSON.stringify(appError.technicalDetails, null, 2)}
              </pre>
            </details>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isRecoverable && onRetry && (
            <button
              onClick={onRetry}
              className={`${buttonColor} hover:bg-white hover:bg-opacity-30 p-1.5 rounded transition-colors`}
              title="Retry"
              aria-label="Retry action"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          
          {onDismiss && (
            <button
              onClick={onDismiss}
              className={`${buttonColor} hover:bg-white hover:bg-opacity-30 p-1.5 rounded transition-colors`}
              title="Dismiss"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Inline error message (smaller, simpler)
 */
export function ErrorMessage({ error, className = '' }: { error: string | Error | null; className?: string }) {
  if (!error) return null;
  
  const message = typeof error === 'string' ? error : formatErrorMessage(error);
  
  return (
    <div className={`flex items-center gap-2 text-sm text-red-600 ${className}`} role="alert">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
