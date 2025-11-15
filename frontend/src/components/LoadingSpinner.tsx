import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

export function LoadingSpinner({ size = 'md', message, className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} text-blue-600 animate-spin`} />
      {message && (
        <p className="text-sm text-gray-600 animate-pulse">{message}</p>
      )}
    </div>
  );
}

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: React.ReactNode;
  loadingText?: string;
}

export function LoadingButton({ 
  loading = false, 
  children, 
  loadingText,
  disabled,
  className = '',
  ...props 
}: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`relative ${className}`}
    >
      {loading && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2">
          <Loader2 className="w-4 h-4 animate-spin" />
        </span>
      )}
      <span className={loading ? 'opacity-0' : ''}>
        {children}
      </span>
      {loading && loadingText && (
        <span className="absolute inset-0 flex items-center justify-center">
          {loadingText}
        </span>
      )}
    </button>
  );
}

interface SkeletonProps {
  className?: string;
  count?: number;
}

export function Skeleton({ className = '', count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-gray-200 rounded ${className}`}
        />
      ))}
    </>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
      <Skeleton className="h-6 w-1/3" />
      <SkeletonText lines={3} />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

interface LoadingOverlayProps {
  message?: string;
  progress?: number;
}

export function LoadingOverlay({ message, progress }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4">
        <LoadingSpinner size="lg" />
        {message && (
          <p className="mt-4 text-center text-gray-700 font-medium">{message}</p>
        )}
        {progress !== undefined && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-sm text-gray-600 mt-2">
              {Math.round(progress)}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
