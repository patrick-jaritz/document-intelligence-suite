/**
 * Fetch wrapper with timeout and AbortController support
 */

export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number;
  signal?: AbortSignal;
}

/**
 * Fetch with automatic timeout and AbortController management
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeout = 30000, signal: externalSignal, ...fetchOptions } = options;

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Combine external signal with timeout signal
  let combinedSignal: AbortSignal | undefined;
  if (externalSignal) {
    // If external signal is provided, abort on either signal
    const abortHandler = () => controller.abort();
    externalSignal.addEventListener('abort', abortHandler);
    combinedSignal = controller.signal;
    
    // Clean up external signal listener
    const cleanup = () => {
      externalSignal.removeEventListener('abort', abortHandler);
      clearTimeout(timeoutId);
    };
    
    // Ensure cleanup happens
    controller.signal.addEventListener('abort', cleanup);
  } else {
    combinedSignal = controller.signal;
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: combinedSignal,
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      if (controller.signal.aborted && !externalSignal?.aborted) {
        throw new Error(`Request timed out after ${timeout}ms`);
      }
      throw new Error('Request was cancelled');
    }
    
    throw error;
  }
}

/**
 * Create a reusable AbortController that can be cancelled
 */
export class RequestController {
  private controller: AbortController;
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(timeout: number = 30000) {
    this.controller = new AbortController();
    
    if (timeout > 0) {
      this.timeoutId = setTimeout(() => {
        this.abort();
      }, timeout);
    }
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  abort(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.controller.abort();
  }

  isAborted(): boolean {
    return this.controller.signal.aborted;
  }
}

