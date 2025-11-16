/**
 * Request Verification Middleware for Edge Functions
 * 
 * Verifies HMAC signatures on incoming requests to prevent tampering.
 * Use this middleware in Edge Functions that need extra security.
 */

/**
 * Generate HMAC-SHA256 signature
 */
async function generateSignature(
  secret: string,
  method: string,
  path: string,
  timestamp: number,
  body: string = ''
): Promise<string> {
  const message = `${method.toUpperCase()}\n${path}\n${timestamp}\n${body}`;
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify request signature
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
  
  // Constant-time comparison
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
 * Check timestamp validity
 */
function isTimestampValid(timestamp: number, windowMs: number = 5 * 60 * 1000): boolean {
  const now = Date.now();
  const diff = Math.abs(now - timestamp);
  return diff <= windowMs;
}

/**
 * Verify request middleware
 */
export async function verifyRequest(req: Request): Promise<{
  valid: boolean;
  error?: string;
  errorCode?: number;
}> {
  // Get signing secret from environment
  const signingSecret = Deno.env.get('REQUEST_SIGNING_SECRET');
  
  // If no secret configured, skip verification (optional feature)
  if (!signingSecret) {
    return { valid: true };
  }
  
  // Get signature headers
  const timestamp = parseInt(req.headers.get('x-request-timestamp') || '0', 10);
  const signature = req.headers.get('x-request-signature') || '';
  
  // Check if headers present
  if (!timestamp || !signature) {
    return {
      valid: false,
      error: 'Missing signature headers',
      errorCode: 401,
    };
  }
  
  // Check timestamp validity (prevent replay attacks)
  if (!isTimestampValid(timestamp)) {
    return {
      valid: false,
      error: 'Request timestamp expired',
      errorCode: 401,
    };
  }
  
  // Get request details
  const url = new URL(req.url);
  const path = url.pathname + url.search;
  const method = req.method;
  
  // Get body if present
  let body = '';
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      const clonedReq = req.clone();
      body = await clonedReq.text();
    } catch (error) {
      // If body can't be read, use empty string
      body = '';
    }
  }
  
  // Verify signature
  const valid = await verifySignature(
    signingSecret,
    signature,
    method,
    path,
    timestamp,
    body
  );
  
  if (!valid) {
    return {
      valid: false,
      error: 'Invalid signature',
      errorCode: 401,
    };
  }
  
  return { valid: true };
}

/**
 * Wrapper to add verification to Edge Function handler
 */
export function withVerification(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    // Verify request
    const verification = await verifyRequest(req);
    
    if (!verification.valid) {
      return new Response(
        JSON.stringify({
          error: verification.error || 'Unauthorized',
          code: 'INVALID_SIGNATURE',
        }),
        {
          status: verification.errorCode || 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    // Call original handler
    return handler(req);
  };
}
