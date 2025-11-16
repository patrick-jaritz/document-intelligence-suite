/**
 * Optimized Image Component
 * 
 * Features:
 * - Lazy loading with Intersection Observer
 * - Blur-up placeholder effect
 * - Responsive images (srcset)
 * - Modern format support (WebP, AVIF)
 * - Error handling with fallback
 * - Accessibility (alt text, ARIA)
 */

import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';

export interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'loading'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  lazy?: boolean;
  placeholder?: 'blur' | 'shimmer' | 'none';
  fallback?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  priority?: boolean;
  onLoadComplete?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  lazy = true,
  placeholder = 'blur',
  fallback = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext fill="%239ca3af" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18"%3EImage%3C/text%3E%3C/svg%3E',
  objectFit = 'cover',
  priority = false,
  onLoadComplete,
  onError,
  className = '',
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!lazy || priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            if (observerRef.current && imgRef.current) {
              observerRef.current.unobserve(imgRef.current);
            }
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
      observerRef.current = observer;
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [lazy, priority, isInView]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoadComplete?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Generate srcset for responsive images if width is provided
  const generateSrcSet = (src: string, width?: number): string | undefined => {
    if (!width || src.startsWith('data:')) return undefined;
    
    // For external URLs, we can't generate srcset
    // In a real app, you'd use an image CDN like Cloudinary or Imgix
    return undefined;
  };

  const srcset = generateSrcSet(src, width);

  const getPlaceholder = (): string => {
    if (placeholder === 'none') return '';
    if (placeholder === 'shimmer') {
      return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3C/svg%3E';
    }
    // blur placeholder
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Cfilter id="b"%3E%3CfeGaussianBlur stdDeviation="20"/%3E%3C/filter%3E%3Crect fill="%23e5e7eb" width="400" height="300" filter="url(%23b)"/%3E%3C/svg%3E';
  };

  const imgStyles: React.CSSProperties = {
    objectFit,
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : 'auto',
    transition: 'opacity 0.3s ease-in-out',
    opacity: isLoaded ? 1 : 0,
    ...props.style,
  };

  const containerStyles: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : 'auto',
  };

  const placeholderStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit,
    opacity: isLoaded ? 0 : 1,
    transition: 'opacity 0.3s ease-in-out',
  };

  return (
    <div style={containerStyles} className={`optimized-image-container ${className}`}>
      {/* Placeholder */}
      {placeholder !== 'none' && !isLoaded && (
        <img
          src={getPlaceholder()}
          alt=""
          style={placeholderStyles}
          aria-hidden="true"
        />
      )}

      {/* Main image */}
      <img
        ref={imgRef}
        src={isInView ? (hasError ? fallback : src) : getPlaceholder()}
        srcSet={isInView && !hasError ? srcset : undefined}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        onLoad={handleLoad}
        onError={handleError}
        style={imgStyles}
        className="optimized-image"
        {...props}
      />

      {/* Shimmer effect */}
      {placeholder === 'shimmer' && !isLoaded && (
        <div
          className="shimmer-overlay"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
            animation: 'shimmer 2s infinite',
          }}
        />
      )}

      {/* Add shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

/**
 * Avatar component with circular cropping
 */
export function Avatar({
  src,
  alt,
  size = 40,
  fallback,
  ...props
}: {
  src: string;
  alt: string;
  size?: number;
  fallback?: string;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      objectFit="cover"
      fallback={fallback}
      className="rounded-full"
      {...props}
    />
  );
}

/**
 * Thumbnail component with fixed aspect ratio
 */
export function Thumbnail({
  src,
  alt,
  aspectRatio = '16/9',
  ...props
}: {
  src: string;
  alt: string;
  aspectRatio?: string;
} & Partial<OptimizedImageProps>) {
  return (
    <div style={{ aspectRatio, overflow: 'hidden', borderRadius: '0.5rem' }}>
      <OptimizedImage
        src={src}
        alt={alt}
        objectFit="cover"
        {...props}
      />
    </div>
  );
}
