/**
 * Input validation utilities
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate GitHub repository URL
 */
export function validateGitHubUrl(url: string): ValidationResult {
  if (!url || !url.trim()) {
    return { isValid: false, error: 'GitHub URL is required' };
  }

  const trimmedUrl = url.trim();
  
  // Check if it's a valid GitHub URL
  const githubPattern = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/i;
  
  if (!githubPattern.test(trimmedUrl)) {
    return { 
      isValid: false, 
      error: 'Invalid GitHub URL format. Expected: https://github.com/owner/repo' 
    };
  }

  return { isValid: true };
}

/**
 * Validate web URL for crawler
 */
export function validateWebUrl(url: string): ValidationResult {
  if (!url || !url.trim()) {
    return { isValid: false, error: 'URL is required' };
  }

  const trimmedUrl = url.trim();

  // Check if it's a valid URL
  try {
    const urlObj = new URL(trimmedUrl);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { 
        isValid: false, 
        error: 'Only HTTP and HTTPS URLs are allowed' 
      };
    }

    return { isValid: true };
  } catch {
    return { 
      isValid: false, 
      error: 'Invalid URL format' 
    };
  }
}

/**
 * Validate RAG query
 */
export function validateRagQuery(query: string): ValidationResult {
  if (!query || !query.trim()) {
    return { isValid: false, error: 'Query is required' };
  }

  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 3) {
    return { 
      isValid: false, 
      error: 'Query must be at least 3 characters long' 
    };
  }

  if (trimmedQuery.length > 500) {
    return { 
      isValid: false, 
      error: 'Query must not exceed 500 characters' 
    };
  }

  return { isValid: true };
}

/**
 * Validate email address
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || !email.trim()) {
    return { isValid: false, error: 'Email is required' };
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailPattern.test(email.trim())) {
    return { 
      isValid: false, 
      error: 'Invalid email format' 
    };
  }

  return { isValid: true };
}

/**
 * Validate file size
 */
export function validateFileSize(file: File, maxSizeMB: number = 10): ValidationResult {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  if (file.size > maxSizeBytes) {
    return { 
      isValid: false, 
      error: `File size must not exceed ${maxSizeMB}MB` 
    };
  }

  return { isValid: true };
}

/**
 * Validate file type
 */
export function validateFileType(file: File, allowedTypes: string[]): ValidationResult {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  if (!fileExtension || !allowedTypes.includes(fileExtension)) {
    return { 
      isValid: false, 
      error: `File type must be one of: ${allowedTypes.join(', ')}` 
    };
  }

  return { isValid: true };
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate numeric range
 */
export function validateRange(value: number, min: number, max: number, label: string = 'Value'): ValidationResult {
  if (isNaN(value)) {
    return { isValid: false, error: `${label} must be a number` };
  }

  if (value < min || value > max) {
    return { 
      isValid: false, 
      error: `${label} must be between ${min} and ${max}` 
    };
  }

  return { isValid: true };
}
