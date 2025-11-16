/**
 * Accessible Input Component
 * 
 * An input field with proper labeling, error handling, and ARIA attributes.
 */

import { InputHTMLAttributes, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { generateA11yId } from '../utils/accessibility';

export interface AccessibleInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  hideLabel?: boolean;
}

export function AccessibleInput({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  hideLabel = false,
  id,
  className = '',
  ...props
}: AccessibleInputProps) {
  const inputId = id || generateA11yId('input');
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  
  const hasError = !!error;
  
  const inputClasses = `
    w-full px-3 py-2 border rounded-lg
    ${hasError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}
    ${leftIcon ? 'pl-10' : ''}
    ${rightIcon ? 'pr-10' : ''}
    focus:outline-none focus:ring-2 focus:border-transparent
    disabled:bg-gray-100 disabled:cursor-not-allowed
    ${className}
  `.trim();
  
  return (
    <div className="w-full">
      <label
        htmlFor={inputId}
        className={hideLabel ? 'sr-only' : 'block text-sm font-medium text-gray-700 mb-1'}
      >
        {label}
        {props.required && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
      
      {hint && !hasError && (
        <p id={hintId} className="text-sm text-gray-600 mb-2">
          {hint}
        </p>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
            {leftIcon}
          </div>
        )}
        
        <input
          id={inputId}
          className={inputClasses}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          aria-required={props.required}
          {...props}
        />
        
        {rightIcon && !hasError && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
            {rightIcon}
          </div>
        )}
        
        {hasError && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" aria-hidden="true">
            <AlertCircle className="w-5 h-5" />
          </div>
        )}
      </div>
      
      {hasError && (
        <p
          id={errorId}
          className="mt-1 text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
}
