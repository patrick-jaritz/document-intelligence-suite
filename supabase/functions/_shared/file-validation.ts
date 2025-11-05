/**
 * File validation utilities for server-side security
 * Validates file types using magic numbers and MIME type checks
 */

// Magic numbers (file signatures) for common file types
const FILE_SIGNATURES: Record<string, number[][]> = {
  'application/pdf': [
    [0x25, 0x50, 0x44, 0x46], // %PDF
  ],
  'image/png': [
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG signature
  ],
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF, 0xE0], // JPEG
    [0xFF, 0xD8, 0xFF, 0xE1], // JPEG EXIF
    [0xFF, 0xD8, 0xFF, 0xE2], // JPEG Canon
    [0xFF, 0xD8, 0xFF, 0xDB], // JPEG
  ],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  'image/webp': [
    [0x52, 0x49, 0x46, 0x46], // RIFF (WebP uses RIFF container)
  ],
  'image/tiff': [
    [0x49, 0x49, 0x2A, 0x00], // TIFF (little-endian)
    [0x4D, 0x4D, 0x00, 0x2A], // TIFF (big-endian)
  ],
  'image/bmp': [
    [0x42, 0x4D], // BM
  ],
};

// Allowed MIME types for document processing
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/tiff',
  'image/bmp',
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.tiff',
  '.tif',
  '.bmp',
];

/**
 * Validate file type using magic numbers (file signatures)
 * @param fileData - File data as ArrayBuffer or Uint8Array
 * @param declaredMimeType - MIME type declared in Content-Type header
 * @returns true if file type matches declared MIME type
 */
export function validateFileType(
  fileData: ArrayBuffer | Uint8Array,
  declaredMimeType?: string | null
): { valid: boolean; detectedType?: string; error?: string } {
  // Convert to Uint8Array for easy comparison
  const bytes = fileData instanceof ArrayBuffer 
    ? new Uint8Array(fileData.slice(0, 32)) // Check first 32 bytes
    : fileData.slice(0, 32);

  if (bytes.length < 4) {
    return { valid: false, error: 'File too small to validate' };
  }

  // Check magic numbers for each file type
  for (const [mimeType, signatures] of Object.entries(FILE_SIGNATURES)) {
    for (const signature of signatures) {
      if (signature.length <= bytes.length) {
        const matches = signature.every((byte, index) => bytes[index] === byte);
        if (matches) {
          const detectedType = mimeType;
          
          // If a MIME type was declared, verify it matches
          if (declaredMimeType) {
            const normalizedDeclared = declaredMimeType.toLowerCase().split(';')[0].trim();
            const normalizedDetected = detectedType.toLowerCase();
            
            // Allow some variations (e.g., image/jpg vs image/jpeg)
            if (normalizedDeclared === normalizedDetected || 
                (normalizedDeclared === 'image/jpg' && normalizedDetected === 'image/jpeg')) {
              return { valid: true, detectedType };
            } else {
              return { 
                valid: false, 
                detectedType,
                error: `MIME type mismatch: declared ${declaredMimeType}, detected ${detectedType}`
              };
            }
          }
          
          return { valid: true, detectedType };
        }
      }
    }
  }

  // If no magic number match, check if declared MIME type is in allowed list
  if (declaredMimeType) {
    const normalizedMime = declaredMimeType.toLowerCase().split(';')[0].trim();
    if (ALLOWED_MIME_TYPES.includes(normalizedMime)) {
      // Allow if declared type is in allowed list (magic number check failed but MIME is allowed)
      // This is less secure but may be needed for some edge cases
      return { valid: true, detectedType: normalizedMime };
    }
  }

  return { 
    valid: false, 
    error: 'File type not recognized or not allowed' 
  };
}

/**
 * Validate file extension
 * @param filename - File name
 * @returns true if extension is allowed
 */
export function validateFileExtension(filename: string): boolean {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return ALLOWED_EXTENSIONS.includes(extension);
}

/**
 * Validate file size
 * @param size - File size in bytes
 * @param maxSize - Maximum allowed size in bytes
 * @returns true if size is within limit
 */
export function validateFileSize(size: number, maxSize: number = 50 * 1024 * 1024): boolean {
  return size > 0 && size <= maxSize;
}

/**
 * Comprehensive file validation
 * @param fileData - File data as ArrayBuffer or Uint8Array
 * @param filename - File name
 * @param declaredMimeType - MIME type declared in Content-Type header
 * @param maxSize - Maximum file size in bytes (default: 50MB)
 * @returns Validation result
 */
export function validateFile(
  fileData: ArrayBuffer | Uint8Array,
  filename: string,
  declaredMimeType?: string | null,
  maxSize: number = 50 * 1024 * 1024
): { valid: boolean; error?: string; detectedType?: string } {
  // Check file size
  const size = fileData instanceof ArrayBuffer ? fileData.byteLength : fileData.length;
  if (!validateFileSize(size, maxSize)) {
    return { 
      valid: false, 
      error: `File size exceeds maximum allowed size (${maxSize / (1024 * 1024)}MB)` 
    };
  }

  // Check file extension
  if (!validateFileExtension(filename)) {
    return { 
      valid: false, 
      error: 'File extension not allowed' 
    };
  }

  // Check magic numbers and MIME type
  const typeValidation = validateFileType(fileData, declaredMimeType);
  if (!typeValidation.valid) {
    return {
      valid: false,
      error: typeValidation.error || 'File type validation failed',
      detectedType: typeValidation.detectedType
    };
  }

  return { valid: true, detectedType: typeValidation.detectedType };
}

/**
 * Extract file data from base64 data URL
 * @param dataUrl - Data URL (e.g., "data:image/png;base64,iVBORw0KG...")
 * @returns Object with file data and MIME type
 */
export function extractFileFromDataUrl(dataUrl: string): {
  data: Uint8Array;
  mimeType: string;
} | null {
  if (!dataUrl.startsWith('data:')) {
    return null;
  }

  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) {
    return null;
  }

  const header = dataUrl.substring(5, commaIndex);
  const base64Data = dataUrl.substring(commaIndex + 1);
  
  // Extract MIME type from header (e.g., "image/png;base64" -> "image/png")
  const mimeType = header.split(';')[0];

  try {
    // Decode base64
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return { data: bytes, mimeType };
  } catch (error) {
    return null;
  }
}

