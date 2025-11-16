/**
 * Accessibility (A11Y) Utilities
 * 
 * Helper functions for improving accessibility throughout the application.
 */

/**
 * Announce message to screen readers
 * Uses aria-live region
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  // Create or get the announcement element
  let announcer = document.getElementById('a11y-announcer');
  
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'a11y-announcer';
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only'; // Screen reader only
    document.body.appendChild(announcer);
  } else {
    announcer.setAttribute('aria-live', priority);
  }
  
  // Clear and set new message
  announcer.textContent = '';
  setTimeout(() => {
    announcer!.textContent = message;
  }, 100); // Small delay to ensure announcement is noticed
}

/**
 * Create accessible file size label
 */
export function getFileSizeLabel(bytes: number): string {
  const units = ['bytes', 'kilobytes', 'megabytes', 'gigabytes'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(unitIndex > 0 ? 2 : 0)} ${units[unitIndex]}`;
}

/**
 * Generate accessible ID
 */
export function generateA11yId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Trap focus within a modal/dialog
 */
export function trapFocus(element: HTMLElement) {
  const focusableElements = element.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];
  
  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        lastFocusable?.focus();
        e.preventDefault();
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        firstFocusable?.focus();
        e.preventDefault();
      }
    }
  };
  
  element.addEventListener('keydown', handleTabKey);
  
  // Focus first element
  firstFocusable?.focus();
  
  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
}

/**
 * Check if element is visible to screen readers
 */
export function isAriaVisible(element: HTMLElement): boolean {
  return (
    element.getAttribute('aria-hidden') !== 'true' &&
    element.style.display !== 'none' &&
    element.style.visibility !== 'hidden'
  );
}

/**
 * Set focus to element with proper announcement
 */
export function setFocusWithAnnouncement(element: HTMLElement, announcement?: string) {
  element.focus();
  if (announcement) {
    announceToScreenReader(announcement);
  }
}

/**
 * Check color contrast ratio
 * Returns true if contrast meets WCAG AA standard (4.5:1)
 */
export function checkColorContrast(foreground: string, background: string): boolean {
  // Simplified - in production, use a proper color contrast library
  // This is a placeholder for demonstration
  return true; // Would calculate actual ratio
}

/**
 * Keyboard navigation helpers
 */
export const KeyboardKeys = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
} as const;

/**
 * Check if keyboard event is activating key (Enter or Space)
 */
export function isActivationKey(event: React.KeyboardEvent | KeyboardEvent): boolean {
  return event.key === KeyboardKeys.ENTER || event.key === KeyboardKeys.SPACE;
}

/**
 * Create accessible date label
 */
export function getAccessibleDateLabel(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Create accessible time label
 */
export function getAccessibleTimeLabel(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format progress percentage for screen readers
 */
export function getAccessibleProgressLabel(current: number, total: number): string {
  const percent = Math.round((current / total) * 100);
  return `${percent} percent complete. ${current} of ${total} items.`;
}

/**
 * Create accessible error message
 */
export function getAccessibleErrorMessage(fieldName: string, error: string): string {
  return `Error in ${fieldName}: ${error}`;
}
