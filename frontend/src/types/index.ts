/**
 * Shared TypeScript type definitions
 */

// OCR Provider types
export type OCRProvider = 
  | 'google-vision' 
  | 'openai-vision' 
  | 'mistral' 
  | 'ocr-space' 
  | 'tesseract' 
  | 'paddleocr' 
  | 'dots-ocr' 
  | 'deepseek-ocr';

// LLM Provider types
export type LLMProvider = 
  | 'openai' 
  | 'anthropic' 
  | 'mistral' 
  | 'kimi';

// Processing status
export type ProcessingStatus = 
  | 'idle' 
  | 'uploading' 
  | 'ocr_processing' 
  | 'llm_processing' 
  | 'complete' 
  | 'error';

// Document types
export interface Document {
  id: string;
  filename: string;
  status: 'processing' | 'ready' | 'failed';
  type: 'file' | 'url';
  markdownEnabled?: boolean;
  chunksCreated?: number;
  embeddingsGenerated?: boolean;
}

// RAG types
export interface RAGSource {
  text: string;
  score: number;
  filename: string;
  chunkIndex?: number;
  metadata?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: RAGSource[];
}

// GitHub Repository Analysis types
export interface RepositoryAnalysis {
  metadata: {
    name: string;
    fullName: string;
    description: string;
    language: string;
    stars?: number;
    forks?: number;
    watchers?: number;
    openIssues?: number;
    license: string;
    topics: string[];
    createdAt: string;
    updatedAt: string;
    size?: number;
    defaultBranch: string;
  };
  technicalAnalysis: {
    techStack: string[];
    architecture: string;
    codeQuality: string;
    documentation: string;
    testing: string;
    security: string;
    performance: string;
  };
  useCases: {
    primary: string[];
    secondary: string[];
    integrations: string[];
    industries: string[];
    targetAudience: string[];
    businessModels: string[];
    marketOpportunities: string[];
    competitiveAdvantages: string[];
    scalingPotential: string;
    monetizationStrategies: string[];
    partnershipOpportunities: string[];
    investmentPotential: string;
    exitStrategies: string[];
  };
  recommendations: {
    strengths: string[];
    improvements: string[];
    risks: string[];
    adoptionPotential: string;
  };
  summary: {
    executive: string;
    technical: string;
    business: string;
    tlDr: string;
  };
}

// API Response types
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// File upload types
export interface FileUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// Rate limit types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  current: number;
}

// Theme types
export type Theme = 'light' | 'dark' | 'auto';

// Export format types
export type ExportFormat = 'json' | 'markdown' | 'csv' | 'pdf';
