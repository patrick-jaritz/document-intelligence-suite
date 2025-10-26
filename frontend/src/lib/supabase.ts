import { createClient } from '@supabase/supabase-js';

// Resolve env with safe fallbacks to prevent blank page if Vite envs are missing
export const supabaseUrl: string =
  (import.meta as any)?.env?.VITE_SUPABASE_URL || 'https://joqnpibrfzqflyogrkht.supabase.co';
export const supabaseAnonKey: string =
  (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcW5waWJyZnpxZmx5b2dya2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0Mjg5NTIsImV4cCI6MjA3NjAwNDk1Mn0.pIFvi2XRo1xmK3oZ-XBVpR6WvBye65a3ACE6wuFsxQk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Helper function to call Supabase Edge Functions
export const callEdgeFunction = async (
  functionName: string,
  payload: any,
  options: { method?: string } = {}
) => {
  const { method = 'POST' } = options;
  const requestId = `${functionName}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const start = performance.now();

  // Use direct fetch instead of supabase.functions.invoke to have full control over headers
  const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`;
  
  // Validate configuration
  if (!supabaseAnonKey || supabaseAnonKey === 'undefined') {
    throw new Error('Supabase anon key is not configured');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'apikey': supabaseAnonKey,
    'X-Request-Id': requestId,
  };

  // Debug logging (only if localStorage.debug is set)
  const debugMode = typeof window !== 'undefined' && localStorage.getItem('debug') === 'true';
  
  if (debugMode) {
    console.group(`🔵 [${requestId}] Calling ${functionName}`);
    console.log('📍 URL:', functionUrl);
    console.log('📋 Method:', method);
    console.log('🔑 Headers:', {
      'Content-Type': headers['Content-Type'],
      'Authorization': `Bearer ${supabaseAnonKey.substring(0, 20)}...`,
      'apikey': `${supabaseAnonKey.substring(0, 20)}...`,
      'X-Request-Id': requestId,
    });
    console.log('📦 Payload:', JSON.stringify(payload).substring(0, 200) + '...');
  }
  
  try {
    const response = await fetch(functionUrl, {
      method,
      headers,
      body: JSON.stringify(payload),
    });

    const durationMs = Math.round(performance.now() - start);
    
    if (debugMode) {
      console.log(`⏱️  Response in ${durationMs}ms`);
      console.log('📊 Status:', response.status, response.statusText);
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      if (debugMode) {
        console.error('❌ Error:', errorMessage);
        console.groupEnd();
      }
      
      const err = new Error(
        `[${functionName}] (${durationMs}ms, reqId=${requestId}) ${errorMessage}`
      );
      (err as any).requestId = requestId;
      (err as any).durationMs = durationMs;
      (err as any).statusCode = response.status;
      (err as any).responseBody = errorText;
      throw err;
    }

    const data = await response.json();
    
    if (debugMode) {
      console.log('✅ Success:', data.success ? 'true' : 'false');
      console.groupEnd();
    }
    
    return data;
  } catch (error) {
    const durationMs = Math.round(performance.now() - start);
    if (error instanceof Error && !(error as any).requestId) {
      (error as any).requestId = requestId;
      (error as any).durationMs = durationMs;
    }
    throw error;
  }
};

// RAG-specific helper functions
export const ragHelpers = {
  // Generate embeddings for a document
  generateEmbeddings: async (text: string, filename: string, provider: string = 'openai') => {
    return callEdgeFunction('generate-embeddings', {
      text,
      filename,
      provider,
    });
  },

  // Query RAG system
  queryRAG: async (question: string, documentId: string, filename: string, provider: string = 'openai') => {
    return callEdgeFunction('rag-query', {
      question,
      documentId: null,  // Don't filter by documentId, only by filename
      filename,
      provider,
    });
  },

  // Process document with OCR
  processOCR: async (
    documentId: string,
    jobId: string,
    fileUrl: string,
    ocrProvider: string,
    fileDataUrl?: string,
    openaiVisionModel?: string
  ) => {
    return callEdgeFunction('process-pdf-ocr', {
      documentId,
      jobId,
      fileUrl,
      ocrProvider,
      fileDataUrl,
      openaiVisionModel,
    });
  },

  // Generate structured output
  generateStructuredOutput: async (jobId: string, extractedText: string, structureTemplate: any, llmProvider: string = 'openai') => {
    return callEdgeFunction('generate-structured-output', {
      jobId,
      extractedText,
      structureTemplate,
      llmProvider,
    });
  },

  // Convert document to Markdown
  convertToMarkdown: async (
    fileData?: string,
    contentType?: string,
    fileName?: string,
    fileSize?: number,
    convertTables?: boolean,
    preserveFormatting?: boolean
  ) => {
    return callEdgeFunction('markdown-converter', {
      fileData,
      contentType,
      fileName,
      fileSize,
      convertTables,
      preserveFormatting,
    });
  },

  // Process document with OCR + Markdown conversion (Data Extract pipeline)
  processOCRWithMarkdown: async (
    documentId: string,
    jobId: string,
    fileUrl: string,
    ocrProvider: string,
    fileDataUrl?: string,
    openaiVisionModel?: string,
    enableMarkdownConversion?: boolean,
    convertTables?: boolean,
    preserveFormatting?: boolean
  ) => {
    return callEdgeFunction('process-pdf-ocr-markdown', {
      documentId,
      jobId,
      fileUrl,
      ocrProvider,
      fileDataUrl,
      openaiVisionModel,
      enableMarkdownConversion: enableMarkdownConversion ?? true,
      convertTables: convertTables ?? true,
      preserveFormatting: preserveFormatting ?? true,
    });
  },

  // Process document with OCR + Markdown + Embeddings (RAG pipeline)
  processRAGWithMarkdown: async (
    documentId: string,
    jobId: string,
    fileUrl: string,
    ocrProvider: string,
    fileDataUrl?: string,
    openaiVisionModel?: string,
    enableMarkdownConversion?: boolean,
    convertTables?: boolean,
    preserveFormatting?: boolean,
    generateEmbeddings?: boolean,
    embeddingProvider?: string,
    chunkSize?: number,
    chunkOverlap?: number
  ) => {
    return callEdgeFunction('process-rag-markdown', {
      documentId,
      jobId,
      fileUrl,
      ocrProvider,
      fileDataUrl,
      openaiVisionModel,
      enableMarkdownConversion: enableMarkdownConversion ?? true,
      convertTables: convertTables ?? true,
      preserveFormatting: preserveFormatting ?? true,
      generateEmbeddings: generateEmbeddings ?? true,
      embeddingProvider: embeddingProvider ?? 'openai',
      chunkSize: chunkSize ?? 1000,
      chunkOverlap: chunkOverlap ?? 200,
    });
  },
};

export default supabase;