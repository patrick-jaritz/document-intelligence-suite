/**
 * Request Signing Utilities
 * 
 * Implements HMAC-SHA256 request signing for secure API communication.
 * Prevents tampering, replay attacks, and ensures message integrity.
 */

/**
 * Generate HMAC-SHA256 signature for request
 */
async function generateSignature(
  secret: string,
  method: string,
  path: string,
  timestamp: number,
  body: string = ''
): Promise<string> {
  // Create signing string: METHOD\nPATH\nTIMESTAMP\nBODY
  const message = `${method.toUpperCase()}\n${path}\n${timestamp}\n${body}`;
  
  // Convert secret to key
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  // Import key
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Sign message
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  
  // Convert to hex string
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify HMAC-SHA256 signature
 */
async function verifySignature(
  secret: string,
  signature: string,
  method: string,
  path: string,
  timestamp: number,
  body: string = ''
): Promise<boolean> {
  const expectedSignature = await generateSignature(secret, method, path, timestamp, body);
  
  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Check if timestamp is within acceptable window (5 minutes)
 */
function isTimestampValid(timestamp: number, windowMs: number = 5 * 60 * 1000): boolean {
  const now = Date.now();
  const diff = Math.abs(now - timestamp);
  return diff <= windowMs;
}

/**
 * Sign a request
 */
export async function signRequest(
  request: {
    method: string;
    url: string;
    body?: any;
  },
  secret?: string
): Promise<{
  timestamp: number;
  signature: string;
  headers: Record<string, string>;
}> {
  // Use signing secret from environment (optional feature)
  const signingSecret = secret || import.meta.env.VITE_REQUEST_SIGNING_SECRET;
  
  // If no secret configured, skip signing (feature disabled)
  if (!signingSecret) {
    return {
      timestamp: Date.now(),
      signature: '',
      headers: {},
    };
  }
  
  const timestamp = Date.now();
  const url = new URL(request.url);
  const path = url.pathname + url.search;
  const body = request.body ? JSON.stringify(request.body) : '';
  
  const signature = await generateSignature(
    signingSecret,
    request.method,
    path,
    timestamp,
    body
  );
  
  return {
    timestamp,
    signature,
    headers: {
      'X-Request-Timestamp': timestamp.toString(),
      'X-Request-Signature': signature,
    },
  };
}

/**
 * Verify a signed request
 */
export async function verifyRequest(
  request: {
    method: string;
    path: string;
    headers: Record<string, string>;
    body?: any;
  },
  secret?: string
): Promise<{
  valid: boolean;
  error?: string;
}> {
  // Use signing secret from environment
  const signingSecret = secret || process.env.REQUEST_SIGNING_SECRET;
  
  // If no secret configured, skip verification (feature disabled)
  if (!signingSecret) {
    return { valid: true };
  }
  
  const timestamp = parseInt(request.headers['x-request-timestamp'] || '0', 10);
  const signature = request.headers['x-request-signature'] || '';
  
  // Check if headers present
  if (!timestamp || !signature) {
    return {
      valid: false,
      error: 'Missing signature headers',
    };
  }
  
  // Check timestamp validity (prevent replay attacks)
  if (!isTimestampValid(timestamp)) {
    return {
      valid: false,
      error: 'Request timestamp expired',
    };
  }
  
  // Verify signature
  const body = request.body ? JSON.stringify(request.body) : '';
  const valid = await verifySignature(
    signingSecret,
    signature,
    request.method,
    request.path,
    timestamp,
    body
  );
  
  if (!valid) {
    return {
      valid: false,
      error: 'Invalid signature',
    };
  }
  
  return { valid: true };
}

/**
 * Middleware for signing fetch requests
 */
export async function signedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = options.method || 'GET';
  
  // Sign the request
  const { headers: signHeaders } = await signRequest({
    method,
    url,
    body: options.body,
  });
  
  // Merge with existing headers
  const headers = new Headers(options.headers);
  Object.entries(signHeaders).forEach(([key, value]) => {
    if (value) {
      headers.set(key, value);
    }
  });
  
  // Make signed request
  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Replay attack prevention using nonces
 */
class NonceStore {
  private nonces: Map<string, number> = new Map();
  private maxAge: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if nonce has been used
   */
  has(nonce: string): boolean {
    return this.nonces.has(nonce);
  }

  /**
   * Add nonce to store
   */
  add(nonce: string): void {
    this.nonces.set(nonce, Date.now());
    this.cleanup();
  }

  /**
   * Remove expired nonces
   */
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    this.nonces.forEach((timestamp, nonce) => {
      if (now - timestamp > this.maxAge) {
        toDelete.push(nonce);
      }
    });
    
    toDelete.forEach(nonce => this.nonces.delete(nonce));
  }

  /**
   * Clear all nonces
   */
  clear(): void {
    this.nonces.clear();
  }
}

export const nonceStore = new NonceStore();

/**
 * Check and record nonce (for replay attack prevention)
 */
export function checkAndRecordNonce(nonce: string): boolean {
  if (nonceStore.has(nonce)) {
    return false; // Replay attack detected
  }
  
  nonceStore.add(nonce);
  return true;
}

/**
 * Generate a unique nonce
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}
