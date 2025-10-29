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
  
  // Always log RAG queries for debugging
  if (functionName === 'rag-query') {
    console.group(`🔍 [RAG-${requestId}] RAG Query Debug`);
    console.log('📍 URL:', functionUrl);
    console.log('📋 Payload:', payload);
    console.log('🔑 Headers:', headers);
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
    
    // Always log RAG query responses
    if (functionName === 'rag-query') {
      console.log(`⏱️  RAG Response in ${durationMs}ms`);
      console.log('📊 RAG Status:', response.status, response.statusText);
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
      
      // Always log RAG query errors
      if (functionName === 'rag-query') {
        console.error('❌ RAG Error:', errorMessage);
        console.error('❌ RAG Error Text:', errorText);
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
    
    // Always log RAG query success
    if (functionName === 'rag-query') {
      console.log('✅ RAG Success:', {
        hasAnswer: !!data.answer,
        hasError: !!data.error,
        hasSources: !!data.sources,
        answerLength: data.answer?.length || 0,
        sourcesCount: data.sources?.length || 0,
        retrievedChunks: data.retrievedChunks,
        model: data.model,
        provider: data.provider,
        warning: data.warning
      });
      
      // Log diagnostic/debug information if present
      if (data.debug) {
        console.group('🔍 RAG Diagnostic Information');
        console.log('📋 Requested Document ID:', data.debug.requestedDocumentId);
        console.log('📋 Requested Filename:', data.debug.requestedFilename);
        console.log('📊 Retrieved Chunks:', data.debug.retrievedChunks);
        console.log('📋 Actual Document IDs in Results:', data.debug.actualDocumentIds);
        console.log('📋 Actual Filenames in Results:', data.debug.actualFilenames);
        console.log('✅ Document ID Match:', data.debug.documentIdMatch);
        
        // Check if there's a mismatch
        if (data.debug.requestedDocumentId && data.debug.actualDocumentIds && 
            data.debug.actualDocumentIds.length > 0) {
          const requestedId = data.debug.requestedDocumentId;
          const actualIds = data.debug.actualDocumentIds;
          const matches = actualIds.every((id: string) => id === requestedId);
          
          if (!matches) {
            console.error('🚨 DOCUMENT ID MISMATCH DETECTED!');
            console.error('   Requested:', requestedId);
            console.error('   Got:', actualIds);
            console.error('   This means chunks from wrong documents were returned!');
          }
        }
        console.groupEnd();
      }
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
    console.log('🔍 ragHelpers.queryRAG called with:', {
      question: question?.substring(0, 100) + '...',
      documentId,
      filename,
      provider
    });
    
    try {
      const result = await callEdgeFunction('rag-query', {
        question,
        documentId,  // Pass the documentId for filtering
        filename,
        provider,
      });
      
      console.log('✅ ragHelpers.queryRAG result:', {
        hasAnswer: !!result.answer,
        hasError: !!result.error,
        hasSources: !!result.sources,
        answerLength: result.answer?.length || 0,
        sourcesCount: result.sources?.length || 0,
        retrievedChunks: result.retrievedChunks,
        model: result.model,
        provider: result.provider
      });
      
      return result;
    } catch (error) {
      console.error('❌ ragHelpers.queryRAG error:', error);
      throw error;
    }
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

  // Process URL with crawler
  processURL: async (
    documentId: string,
    jobId: string,
    url: string,
    crawler: string = 'crawl4ai'
  ) => {
    return callEdgeFunction('process-url', {
      documentId,
      jobId,
      url,
      crawler,
    });
  },
};

export default supabase;