/**
 * Content sanitization utilities
 * Prevents XSS attacks by sanitizing user-generated content
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHTML(html: string): string {
  if (typeof window === 'undefined') {
    // SSR fallback - basic HTML entity encoding
    return html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Use DOMPurify for client-side sanitization
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

/**
 * Sanitize plain text (removes all HTML)
 */
export function sanitizeText(text: string): string {
  if (typeof window === 'undefined') {
    return text;
  }

  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize for display in React (prevents XSS)
 * Use this for user-generated content displayed in components
 */
export function sanitizeForDisplay(content: string): string {
  // First sanitize HTML
  const sanitized = sanitizeHTML(content);
  
  // Additional safety: remove any remaining script tags
  return sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

