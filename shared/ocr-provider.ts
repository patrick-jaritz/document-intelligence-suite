/**
 * OCR Provider Abstraction Layer
 * 
 * This abstraction makes it easy to:
 * 1. Use multiple OCR providers
 * 2. Add Docling later as a premium provider
 * 3. Switch providers based on file type or user tier
 * 
 * Future: Add Docling by simply adding it to the providers object
 */

export type ProviderTier = 'free' | 'standard' | 'premium';

export interface OCRProvider {
  /** Provider identifier */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Pricing tier */
  tier: ProviderTier;
  
  /** Supported file formats */
  supportedFormats: string[];
  
  /** 
   * Extract text from file
   * @param file - File or Blob to process
   * @param options - Provider-specific options
   * @returns Extracted text
   */
  extract(file: File | Blob, options?: OCROptions): Promise<OCRResult>;
  
  /** Whether this provider requires API key */
  requiresApiKey: boolean;
  
  /** Estimated cost per page (USD) */
  costPerPage?: number;
  
  /** Additional metadata */
  metadata?: {
    description?: string;
    maxFileSize?: number; // in MB
    supportsTable?: boolean;
    supportsOCR?: boolean; // for scanned images
    averageSpeed?: 'fast' | 'medium' | 'slow';
  };
}

export interface OCROptions {
  language?: string;
  pageRange?: { start: number; end: number };
  enhanceImage?: boolean;
  detectTables?: boolean;
}

export interface OCRResult {
  text: string;
  pages?: Array<{
    page_number: number;
    text: string;
    confidence?: number;
  }>;
  metadata?: {
    pageCount?: number;
    confidence?: number;
    tables?: any[];
    language?: string;
  };
}

/**
 * OpenAI Vision Provider (GPT-4o-mini)
 * Excellent for most PDFs and images
 */
export const openAIVisionProvider: OCRProvider = {
  id: 'openai-vision',
  name: 'OpenAI Vision (GPT-4o-mini)',
  tier: 'standard',
  supportedFormats: ['pdf', 'png', 'jpg', 'jpeg', 'webp'],
  requiresApiKey: true,
  costPerPage: 0.00015,
  metadata: {
    description: 'Excellent accuracy, handles tables well',
    maxFileSize: 20,
    supportsTable: true,
    supportsOCR: true,
    averageSpeed: 'fast'
  },
  
  extract: async (file: File | Blob, options?: OCROptions): Promise<OCRResult> => {
    // Implementation will be in Supabase Edge Function
    // This is just the interface definition
    throw new Error('Implement in Edge Function');
  }
};

/**
 * Google Vision Provider
 * Great for complex layouts and multi-language
 */
export const googleVisionProvider: OCRProvider = {
  id: 'google-vision',
  name: 'Google Vision API',
  tier: 'standard',
  supportedFormats: ['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'bmp'],
  requiresApiKey: true,
  costPerPage: 0.0015,
  metadata: {
    description: 'Excellent for complex layouts and multi-language',
    maxFileSize: 20,
    supportsTable: true,
    supportsOCR: true,
    averageSpeed: 'medium'
  },
  
  extract: async (file: File | Blob, options?: OCROptions): Promise<OCRResult> => {
    throw new Error('Implement in Edge Function');
  }
};

/**
 * Mistral Pixtral Provider
 * Good alternative to OpenAI
 */
export const mistralPixtralProvider: OCRProvider = {
  id: 'mistral-pixtral',
  name: 'Mistral Pixtral',
  tier: 'standard',
  supportedFormats: ['pdf', 'png', 'jpg', 'jpeg'],
  requiresApiKey: true,
  costPerPage: 0.001,
  metadata: {
    description: 'Good alternative with competitive pricing',
    maxFileSize: 20,
    supportsTable: true,
    supportsOCR: true,
    averageSpeed: 'fast'
  },
  
  extract: async (file: File | Blob, options?: OCROptions): Promise<OCRResult> => {
    throw new Error('Implement in Edge Function');
  }
};

/**
 * Tesseract.js Provider (FREE - Client-side)
 * Good for simple documents, 100% free
 */
export const tesseractProvider: OCRProvider = {
  id: 'tesseract',
  name: 'Tesseract.js (Free)',
  tier: 'free',
  supportedFormats: ['png', 'jpg', 'jpeg', 'bmp'],
  requiresApiKey: false,
  costPerPage: 0,
  metadata: {
    description: 'Free client-side OCR, good for simple images',
    maxFileSize: 10,
    supportsTable: false,
    supportsOCR: true,
    averageSpeed: 'slow'
  },
  
  extract: async (file: File | Blob, options?: OCROptions): Promise<OCRResult> => {
    throw new Error('Implement in client-side code');
  }
};

/**
 * OCR.space Provider (FREE with limits)
 * 500 pages/day free tier
 */
export const ocrSpaceProvider: OCRProvider = {
  id: 'ocr-space',
  name: 'OCR.space (Free Tier)',
  tier: 'free',
  supportedFormats: ['pdf', 'png', 'jpg', 'jpeg', 'gif'],
  requiresApiKey: true,
  costPerPage: 0,
  metadata: {
    description: 'Free tier: 500 pages/day',
    maxFileSize: 1, // 1MB limit on free tier
    supportsTable: false,
    supportsOCR: true,
    averageSpeed: 'medium'
  },
  
  extract: async (file: File | Blob, options?: OCROptions): Promise<OCRResult> => {
    throw new Error('Implement in Edge Function');
  }
};

// ============================================================================
// FUTURE: Docling Provider (Premium Tier)
// Uncomment when ready to add Docling support
// ============================================================================

/*
export const doclingProvider: OCRProvider = {
  id: 'docling',
  name: 'Docling Advanced',
  tier: 'premium',
  supportedFormats: [
    'pdf', 'docx', 'pptx', 'xlsx', 
    'html', 'png', 'jpg', 'jpeg', 'tiff'
  ],
  requiresApiKey: false, // Uses Railway deployment
  costPerPage: 0.002, // Pass through Railway cost + margin
  metadata: {
    description: 'Advanced parsing for complex documents, tables, and layouts',
    maxFileSize: 50,
    supportsTable: true,
    supportsOCR: true,
    averageSpeed: 'medium'
  },
  
  extract: async (file: File | Blob, options?: OCROptions): Promise<OCRResult> => {
    // Call Docling service on Railway
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('https://your-docling-service.railway.app/extract', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    return {
      text: data.text,
      metadata: data.metadata
    };
  }
};
*/

// ============================================================================
// Provider Registry
// ============================================================================

/**
 * All available OCR providers
 * Add new providers here to make them available throughout the app
 */
export const ocrProviders: Record<string, OCRProvider> = {
  'openai-vision': openAIVisionProvider,
  'google-vision': googleVisionProvider,
  'mistral-pixtral': mistralPixtralProvider,
  'tesseract': tesseractProvider,
  'ocr-space': ocrSpaceProvider,
  // 'docling': doclingProvider, // Uncomment when Docling is ready
};

/**
 * Get providers by tier
 */
export function getProvidersByTier(tier: ProviderTier): OCRProvider[] {
  return Object.values(ocrProviders).filter(p => p.tier === tier);
}

/**
 * Get providers that support a specific format
 */
export function getProvidersByFormat(format: string): OCRProvider[] {
  return Object.values(ocrProviders).filter(
    p => p.supportedFormats.includes(format.toLowerCase())
  );
}

/**
 * Get recommended provider for a file
 */
export function getRecommendedProvider(
  file: File,
  userTier: ProviderTier = 'standard'
): OCRProvider {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  
  // Filter providers by user tier and file format
  const availableProviders = Object.values(ocrProviders).filter(
    p => p.supportedFormats.includes(extension) &&
         (userTier === 'premium' || p.tier !== 'premium') &&
         (userTier !== 'free' || p.tier === 'free')
  );
  
  if (availableProviders.length === 0) {
    throw new Error(`No provider available for ${extension} files`);
  }
  
  // Prefer OpenAI Vision for standard tier
  if (userTier === 'standard') {
    const openai = availableProviders.find(p => p.id === 'openai-vision');
    if (openai) return openai;
  }
  
  // For premium, prefer Docling if available
  if (userTier === 'premium') {
    const docling = availableProviders.find(p => p.id === 'docling');
    if (docling) return docling;
  }
  
  // Otherwise return first available
  return availableProviders[0];
}

/**
 * Validate if file can be processed by any provider
 */
export function canProcessFile(file: File, userTier: ProviderTier = 'standard'): boolean {
  try {
    getRecommendedProvider(file, userTier);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Check if provider is available (has API key if needed)
 */
export function isProviderAvailable(providerId: string, apiKeys: Record<string, string>): boolean {
  const provider = ocrProviders[providerId];
  if (!provider) return false;
  
  if (!provider.requiresApiKey) return true;
  
  // Map provider IDs to API key names
  const keyMapping: Record<string, string> = {
    'openai-vision': 'OPENAI_API_KEY',
    'google-vision': 'GOOGLE_VISION_API_KEY',
    'mistral-pixtral': 'MISTRAL_API_KEY',
    'ocr-space': 'OCR_SPACE_API_KEY'
  };
  
  const keyName = keyMapping[providerId];
  return !!(keyName && apiKeys[keyName]);
}

// ============================================================================
// TypeScript Type Exports
// ============================================================================

export type ProviderID = keyof typeof ocrProviders;

