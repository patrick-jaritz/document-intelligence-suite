/**
 * Input validation utilities
 * Prevents SSRF, injection attacks, and DoS
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

/**
 * Validate and sanitize URLs
 * Prevents SSRF attacks by blocking dangerous protocols and internal IPs
 */
export function validateUrl(url: string): ValidationResult {
  const trimmed = url.trim();

  // Check length
  if (trimmed.length === 0) {
    return { valid: false, error: 'URL cannot be empty' };
  }

  if (trimmed.length > 2048) {
    return { valid: false, error: 'URL too long (max 2048 characters)' };
  }

  // Reject dangerous protocols
  const dangerousProtocols = ['javascript:', 'file:', 'data:', 'vbscript:', 'about:'];
  const lowerUrl = trimmed.toLowerCase();
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return { valid: false, error: `Invalid URL protocol: ${protocol}` };
    }
  }

  // Must be http or https
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return { valid: false, error: 'URL must start with http:// or https://' };
  }

  try {
    const urlObj = new URL(trimmed);

    // Block internal IPs and localhost
    const hostname = urlObj.hostname.toLowerCase();
    const blockedHosts = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      '[::1]',
    ];

    if (blockedHosts.includes(hostname)) {
      return { valid: false, error: 'Internal URLs are not allowed' };
    }

    // Block private IP ranges
    if (
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') ||
      hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') ||
      hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') ||
      hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') ||
      hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') ||
      hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.')
    ) {
      return { valid: false, error: 'Private IP addresses are not allowed' };
    }

    // Block link-local addresses
    if (hostname.startsWith('169.254.')) {
      return { valid: false, error: 'Link-local addresses are not allowed' };
    }

    return { valid: true, sanitized: trimmed };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate input length
 */
export function validateLength(
  input: string,
  maxLength: number,
  fieldName: string = 'Input'
): ValidationResult {
  if (input.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} too long (max ${maxLength} characters)`,
    };
  }
  return { valid: true, sanitized: input };
}

/**
 * Validate text input (combines length and basic sanitization)
 */
export function validateTextInput(
  input: string,
  options: {
    maxLength?: number;
    fieldName?: string;
    allowEmpty?: boolean;
  } = {}
): ValidationResult {
  const { maxLength = 10000, fieldName = 'Input', allowEmpty = false } = options;

  const trimmed = input.trim();

  if (!allowEmpty && trimmed.length === 0) {
    return { valid: false, error: `${fieldName} cannot be empty` };
  }

  return validateLength(trimmed, maxLength, fieldName);
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): ValidationResult {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(uuid)) {
    return { valid: false, error: 'Invalid UUID format' };
  }

  return { valid: true, sanitized: uuid };
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): ValidationResult {
  // Remove path traversal attempts
  const sanitized = filename
    .replace(/\.\./g, '') // Remove ..
    .replace(/\//g, '') // Remove /
    .replace(/\\/g, '') // Remove \
    .trim();

  if (sanitized.length === 0) {
    return { valid: false, error: 'Invalid filename' };
  }

  if (sanitized.length > 255) {
    return { valid: false, error: 'Filename too long' };
  }

  // Block dangerous characters
  const dangerousChars = /[<>:"|?*\x00-\x1f]/;
  if (dangerousChars.test(sanitized)) {
    return { valid: false, error: 'Filename contains invalid characters' };
  }

  return { valid: true, sanitized };
}

/**
 * Validate JSON payload size
 */
export function validatePayloadSize(payload: string, maxSize: number = 10 * 1024 * 1024): ValidationResult {
  const size = new Blob([payload]).size;
  
  if (size > maxSize) {
    return {
      valid: false,
      error: `Payload too large (max ${maxSize / 1024 / 1024}MB)`,
    };
  }
  
  return { valid: true };
}

