/**
 * Skip Link Component
 * 
 * Allows keyboard users to skip to main content,
 * improving navigation efficiency for screen reader users.
 */

import { useEffect, useRef } from 'react';

export function SkipLink() {
  const skipLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const handleFocus = () => {
      skipLinkRef.current?.classList.add('focused');
    };

    const handleBlur = () => {
      skipLinkRef.current?.classList.remove('focused');
    };

    const link = skipLinkRef.current;
    if (link) {
      link.addEventListener('focus', handleFocus);
      link.addEventListener('blur', handleBlur);
    }

    return () => {
      if (link) {
        link.removeEventListener('focus', handleFocus);
        link.removeEventListener('blur', handleBlur);
      }
    };
  }, []);

  const handleSkip = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      ref={skipLinkRef}
      href="#main-content"
      onClick={handleSkip}
      className="skip-link"
      style={{
        position: 'absolute',
        left: '-9999px',
        zIndex: 9999,
        padding: '1rem 1.5rem',
        background: '#1e3a8a',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '0 0 0.5rem 0',
        fontWeight: 600,
        fontSize: '1rem',
        transition: 'left 0.2s',
      }}
    >
      Skip to main content
    </a>
  );
}

// Add global styles for skip link
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .skip-link:focus,
    .skip-link.focused {
      left: 0 !important;
      top: 0;
    }
    
    /* Screen reader only class */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }
    
    /* Focus visible styles */
    *:focus-visible {
      outline: 3px solid #3b82f6;
      outline-offset: 2px;
    }
    
    /* Improved button focus */
    button:focus-visible,
    a:focus-visible {
      outline: 3px solid #3b82f6;
      outline-offset: 2px;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
    }
    
    /* Remove default focus for mouse users */
    *:focus:not(:focus-visible) {
      outline: none;
    }
  `;
  document.head.appendChild(style);
}
