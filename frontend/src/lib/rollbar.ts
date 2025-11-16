import Rollbar from 'rollbar';

// Check if Rollbar is configured
const isRollbarConfigured = (): boolean => {
  const token = import.meta.env.VITE_ROLLBAR_ACCESS_TOKEN;
  return !!(token && token !== 'undefined' && token !== '');
};

// Initialize Rollbar only if configured
export const rollbar = isRollbarConfigured()
  ? new Rollbar({
      accessToken: import.meta.env.VITE_ROLLBAR_ACCESS_TOKEN || '',
      environment: import.meta.env.VITE_ENVIRONMENT || 'development',
      enabled: import.meta.env.VITE_ENVIRONMENT === 'production',
      captureUncaught: true,
      captureUnhandledRejections: true,
      payload: {
        client: {
          javascript: {
            code_version: import.meta.env.VITE_APP_VERSION || '1.0.0',
            source_map_enabled: true,
          },
        },
      },
      // Only log errors in production
      logLevel: import.meta.env.VITE_ENVIRONMENT === 'production' ? 'error' : 'debug',
    })
  : null;

/**
 * Log an error to Rollbar (production only)
 */
export const logError = (error: Error | string, additionalData?: Record<string, unknown>) => {
  if (rollbar && import.meta.env.VITE_ENVIRONMENT === 'production') {
    if (typeof error === 'string') {
      rollbar.error(error, additionalData);
    } else {
      rollbar.error(error, additionalData);
    }
  } else {
    // In development, just log to console
    console.error('Error:', error, additionalData);
  }
};

/**
 * Log a warning to Rollbar
 */
export const logWarning = (message: string, additionalData?: Record<string, unknown>) => {
  if (rollbar && import.meta.env.VITE_ENVIRONMENT === 'production') {
    rollbar.warning(message, additionalData);
  } else {
    console.warn('Warning:', message, additionalData);
  }
};

/**
 * Log info message to Rollbar
 */
export const logInfo = (message: string, additionalData?: Record<string, unknown>) => {
  if (rollbar && import.meta.env.VITE_ENVIRONMENT === 'production') {
    rollbar.info(message, additionalData);
  } else {
    console.info('Info:', message, additionalData);
  }
};

/**
 * Set user context for error tracking
 */
export const setUser = (userId: string, username?: string, email?: string) => {
  if (rollbar) {
    rollbar.configure({
      payload: {
        person: {
          id: userId,
          username,
          email,
        },
      },
    });
  }
};

/**
 * Clear user context
 */
export const clearUser = () => {
  if (rollbar) {
    rollbar.configure({
      payload: {
        person: undefined,
      },
    });
  }
};

export default rollbar;
