import { useState, useRef, useMemo, useEffect } from 'react';
import { Upload, FileText, MessageCircle, Send, Loader2, AlertCircle, Globe } from 'lucide-react';
import { supabase, supabaseUrl } from '../lib/supabase';
import { useDebounce } from '../utils/debounce';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { requestCache } from '../utils/requestCache';
import { sanitizeForDisplay } from '../utils/sanitize';
import { validateTextInput } from '../utils/inputValidation';
import { ChatMessageSkeleton } from './SkeletonLoader';
import { SourceViewer } from './SourceViewer';
import { RAGDebugPanel } from './RAGDebugPanel';

interface Document {
  id: string;
  filename: string;
  status: 'processing' | 'ready' | 'failed';
  type: 'file' | 'url';
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    text: string;
    score: number;
    filename: string;
  }>;
  debugInfo?: {
    queryTime?: number;
    retrievedChunks?: number;
    totalChunks?: number;
    model?: string;
    provider?: string;
  };
}

export function RAGView() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string>('all');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [ocrProvider, setOcrProvider] = useState<'google-vision' | 'ocr-space' | 'openai-vision' | 'mistral-vision' | 'tesseract' | 'paddleocr' | 'dots-ocr' | 'deepseek-ocr'>('openai-vision');
  const [crawlerProvider, setCrawlerProvider] = useState<'default' | 'crawl4ai'>('crawl4ai');
  const [ragProvider, setRagProvider] = useState<'openai' | 'anthropic' | 'mistral' | 'gemini' | 'pageindex-vision'>('openai');
  const [ragModel, setRagModel] = useState('gpt-4o-mini');
  const [debugMode, setDebugMode] = useState(false);

  // Enhanced error logging helper
  const logError = (context: string, error: unknown, additionalInfo?: Record<string, any>) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Always log errors, but use different detail levels
    if (debugMode) {
      console.group(`❌ ${context}`);
      console.error('Error:', errorMessage);
      if (errorStack) {
        console.error('Stack:', errorStack);
      }
      if (additionalInfo) {
        console.error('Additional Info:', additionalInfo);
      }
      console.groupEnd();
    } else {
      console.error(`❌ ${context}:`, errorMessage);
      if (additionalInfo) {
        console.error('Details:', additionalInfo);
      }
    }
  };

  // Global error handler for unhandled promise rejections
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logError('Unhandled Promise Rejection', event.reason, {
        type: 'unhandledRejection',
        promise: event.promise
      });
    };

    const handleError = (event: ErrorEvent) => {
      logError('Global Error', event.error, {
        type: 'error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    // Generate a proper UUID for documentId
    const documentId = crypto.randomUUID();

    // Add document to list
    const newDoc: Document = {
      id: documentId,
      filename: file.name,
      status: 'processing',
      type: 'file'
    };
    setDocuments(prev => [...prev, newDoc]);

    try {
      // Step 1: Convert file to base64 data URL for direct processing
      const fileDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      // Step 2: Process with OCR using base64 data
      console.log('🔄 Starting OCR processing...');
      console.log('OCR Request details:', {
        documentId,
        ocrProvider,
        fileDataUrlLength: fileDataUrl?.length || 0,
        supabaseUrl,
        hasApiKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
        fileType: file.type,
        fileSize: file.size
      });

      if (debugMode) {
        console.log('🔍 Debug Mode: Full request details', {
          url: `${supabaseUrl}/functions/v1/process-pdf-ocr`,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20)}...`,
            'apikey': `${import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20)}...`
          },
          body: {
            documentId,
            jobId: `job_${Date.now()}`,
            fileUrl: 'data-url',
            fileDataUrl: fileDataUrl?.substring(0, 100) + '...',
            ocrProvider
          }
        });
      }

      let ocrResponse;
      try {
        ocrResponse = await fetch(`${supabaseUrl}/functions/v1/process-pdf-ocr`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            documentId: documentId,
            jobId: `job_${Date.now()}`,
            fileUrl: 'data-url', // Indicate we're using data URL
            fileDataUrl: fileDataUrl, // Pass the base64 data directly
            ocrProvider: ocrProvider // Use selected OCR provider
          }),
        });
      } catch (fetchError) {
        console.error('❌ OCR Request Failed:', fetchError);
        console.error('Request details:', {
          url: `${supabaseUrl}/functions/v1/process-pdf-ocr`,
          method: 'POST',
          hasApiKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
          documentId,
          ocrProvider,
          fileDataUrlLength: fileDataUrl?.length || 0
        });
        throw new Error(`OCR request failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
      }

      console.log('OCR Response status:', ocrResponse.status);
      console.log('OCR Response headers:', Object.fromEntries(ocrResponse.headers.entries()));

      if (!ocrResponse.ok) {
        let errorDetails;
        try {
          const errorText = await ocrResponse.text();
          console.error('❌ OCR Error Response:', errorText);
          
          // Try to parse as JSON for structured error
          try {
            const errorJson = JSON.parse(errorText);
            errorDetails = errorJson;
            console.error('❌ OCR Error Details:', errorJson);
          } catch {
            errorDetails = { message: errorText };
          }
        } catch (readError) {
          console.error('❌ Failed to read error response:', readError);
          errorDetails = { message: 'Failed to read error response' };
        }

        const errorMessage = errorDetails?.error || errorDetails?.message || `HTTP ${ocrResponse.status}: ${ocrResponse.statusText}`;
        console.error('❌ OCR Processing Failed:', {
          status: ocrResponse.status,
          statusText: ocrResponse.statusText,
          error: errorMessage,
          requestId: errorDetails?.requestId,
          documentId,
          ocrProvider
        });
        
        throw new Error(`OCR failed: ${errorMessage}`);
      }

      const ocrResult = await ocrResponse.json();
      console.log('✅ OCR completed:', ocrResult.extractedText?.length, 'characters');

      // Step 3: Create document record first
      console.log('🔄 Creating document record...');
      const { error: docError } = await supabase
        .from('rag_documents')
        .insert({
          id: documentId,
          filename: file.name,
          upload_date: new Date().toISOString(),
          embedding_provider: ragProvider,
          metadata: {
            fileSize: file.size,
            fileType: file.type,
            ocrProvider: ocrProvider
          }
        });

      if (docError) throw docError;

      // Step 4: Generate embeddings
      console.log('🔄 Generating embeddings...');
      const embeddingResponse = await fetch(`${supabaseUrl}/functions/v1/generate-embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          text: ocrResult.extractedText,
          documentId: documentId,
          filename: file.name,
          provider: ragProvider
        }),
      });

      if (!embeddingResponse.ok) {
        throw new Error(`Embedding generation failed: ${embeddingResponse.statusText}`);
      }

      const embeddingResult = await embeddingResponse.json();
      console.log('✅ Embeddings generated:', embeddingResult.chunkCount, 'chunks');

      // Update document status
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === documentId 
            ? { ...doc, status: 'ready' as const }
            : doc
        )
      );

      // Show success message
      setMessages(prev => [...prev, {
        id: `success_${Date.now()}`,
        role: 'assistant',
        content: `✅ Document "${file.name}" has been processed and is ready for questions! Found ${embeddingResult.chunkCount} text chunks.`
      }]);

    } catch (error) {
      logError('Document Processing Failed', error, {
        documentId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        ocrProvider,
        supabaseUrl,
        hasApiKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
      });
      
      // Update document status
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === documentId 
            ? { ...doc, status: 'failed' as const }
            : doc
        )
      );

      setMessages(prev => [...prev, {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: `❌ Failed to process "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`
      }]);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUrlUpload = async () => {
    if (!urlInput.trim()) return;

    setIsProcessing(true);
    const documentId = crypto.randomUUID();

    // Add document to list
    const newDoc: Document = {
      id: documentId,
      filename: urlInput,
      status: 'processing',
      type: 'url'
    };
    setDocuments(prev => [...prev, newDoc]);

    try {
      // Step 1: Process URL
      console.log('🔄 Processing URL...');
      const urlResponse = await fetch(`${supabaseUrl}/functions/v1/process-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          documentId: documentId,
          jobId: `job_${Date.now()}`,
          url: urlInput,
          crawler: crawlerProvider // Use selected crawler provider
        }),
      });

      if (!urlResponse.ok) {
        throw new Error(`URL processing failed: ${urlResponse.statusText}`);
      }

      const urlResult = await urlResponse.json();
      console.log('✅ URL processed:', urlResult.extractedText?.length, 'characters');

      // Step 2: Generate embeddings
      console.log('🔄 Generating embeddings...');
      const embeddingResponse = await fetch(`${supabaseUrl}/functions/v1/generate-embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          text: urlResult.extractedText,
          documentId: documentId,
          filename: urlInput,
          provider: ragProvider
        }),
      });

      if (!embeddingResponse.ok) {
        throw new Error(`Embedding generation failed: ${embeddingResponse.statusText}`);
      }

      const embeddingResult = await embeddingResponse.json();
      console.log('✅ Embeddings generated:', embeddingResult.chunkCount, 'chunks');

      // Update document status
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === documentId 
            ? { ...doc, status: 'ready' as const }
            : doc
        )
      );

      // Show success message
      setMessages(prev => [...prev, {
        id: `success_${Date.now()}`,
        role: 'assistant',
        content: `✅ URL "${urlInput}" has been processed and is ready for questions! Found ${embeddingResult.chunkCount} text chunks.`
      }]);

      // Clear URL input
      setUrlInput('');

    } catch (error) {
      logError('URL Processing Failed', error, {
        documentId,
        url: urlInput,
        crawlerProvider,
        supabaseUrl,
        hasApiKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
      });
      
      // Update document status
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === documentId 
            ? { ...doc, status: 'failed' as const }
            : doc
        )
      );

      setMessages(prev => [...prev, {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: `❌ Failed to process "${urlInput}": ${error instanceof Error ? error.message : 'Unknown error'}`
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // AbortController for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isQuerying) return;

    // SECURITY: Validate input length
    const validation = validateTextInput(inputMessage, {
      maxLength: 10000,
      fieldName: 'Message',
      allowEmpty: false,
    });

    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const question = validation.sanitized || inputMessage.trim();
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: question
    };

    // Optimistic update: immediately show user message
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsQuerying(true);

    // Create new AbortController for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Track query start time
    const queryStartTime = Date.now();

    try {
      // Check if using PageIndex Vision RAG
      const isVisionRAG = ragProvider === 'pageindex-vision';
      const endpoint = isVisionRAG ? 'vision-rag-query' : 'rag-query';
      
      const selectedDoc = documents?.find(doc => doc.id === selectedDocument);
      const documentId = selectedDocument === 'all' ? null : selectedDocument;
      const filename = selectedDocument === 'all' ? null : selectedDoc?.filename;

      if (isVisionRAG && !documentId) {
        throw new Error('PageIndex Vision RAG requires a specific document to be selected');
      }

      const requestBody = isVisionRAG
        ? {
            question,
            documentId: documentId!,
            filename: filename || 'document',
            vlmModel: ragModel || 'gpt-4o'
          }
        : {
            question,
            documentId,
            filename,
            provider: ragProvider,
            model: ragModel,
            topK: 5
          };

      console.log(`🔍 ${isVisionRAG ? 'Vision RAG' : 'Vector RAG'} Query:`, requestBody);

      // Create cache key for this query
      const cacheKey = `${endpoint}:${JSON.stringify(requestBody)}`;
      
      // Use request cache (with 5 minute TTL for RAG queries)
      const result = await requestCache.get(
        cacheKey,
        async () => {
          const response = await fetchWithTimeout(
            `${supabaseUrl}/functions/v1/${endpoint}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify(requestBody),
              timeout: 60000, // 60 second timeout
              signal: controller.signal,
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Query failed: ${response.statusText} - ${errorText}`);
          }

          return await response.json();
        },
        5 * 60 * 1000 // 5 minute cache
      );
      
      // Handle Vision RAG response format (different from Vector RAG)
      const answer = result.answer || result.error || 'No answer generated';
      const sources = isVisionRAG && result.sources
        ? result.sources.map((src: any) => ({
            text: src.title || src.summary || '',
            score: 1.0, // Vision RAG doesn't use similarity scores
            filename: `${src.pageRange || 'Unknown pages'}`,
            metadata: {
              pageRange: src.pageRange,
              page_number: src.pageNumber,
            }
          }))
        : (result.sources || []).map((src: any) => ({
            text: src.text || '',
            score: src.score || src.similarity || 0,
            filename: src.filename || 'Unknown',
            chunkIndex: src.chunkIndex || src.chunk_index,
            metadata: {
              filename: src.filename,
              chunk_index: src.chunkIndex || src.chunk_index,
              page_number: src.metadata?.page_number,
              source_url: src.metadata?.source_url,
              ...src.metadata,
            }
          }));
      
      // Calculate query time
      const queryTime = Date.now() - queryStartTime;

      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: answer,
        sources: sources,
        debugInfo: {
          queryTime,
          retrievedChunks: result.retrievedChunks || sources.length,
          totalChunks: undefined, // Would need to fetch from API
          model: ragModel,
          provider: ragProvider,
        }
      };

      // Add reasoning if available (Vision RAG feature)
      if (isVisionRAG && result.reasoning) {
        assistantMessage.content += `\n\n💭 **Reasoning Process:**\n${result.reasoning}`;
      }

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      // Don't show error if request was cancelled
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request cancelled');
        return;
      }

      console.error('❌ Query failed:', error);
      
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: `❌ Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsQuerying(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Document Upload */}
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Upload Content
          </h2>
          
          {/* Upload Mode Toggle */}
          <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setUploadMode('file')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                uploadMode === 'file'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              File
            </button>
            <button
              onClick={() => setUploadMode('url')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                uploadMode === 'url'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Globe className="w-4 h-4 inline mr-2" />
              URL
            </button>
          </div>

          {/* Provider Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Provider Settings</h3>
            
            {/* OCR Provider Selection (for file uploads) */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">OCR Provider</label>
              <select
                value={ocrProvider}
                onChange={(e) => setOcrProvider(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="openai-vision">OpenAI Vision API (Recommended)</option>
                <option value="google-vision">Google Vision API</option>
                <option value="mistral-vision">Mistral Vision API</option>
                <option value="tesseract">Tesseract (Browser-based)</option>
                <option value="ocr-space">OCR.space (Free tier limited)</option>
                <option value="paddleocr">PaddleOCR (Requires service)</option>
                <option value="dots-ocr">dots.ocr (Requires service)</option>
                <option value="deepseek-ocr">DeepSeek-OCR (Requires service)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {ocrProvider === 'dots-ocr' || ocrProvider === 'paddleocr' || ocrProvider === 'deepseek-ocr' 
                  ? '⚠️ Self-hosted service - ensure service is deployed'
                  : '✅ API-based provider - ready to use'}
              </p>
            </div>

            {/* Crawler Provider Selection (for URL uploads) */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Web Crawler</label>
              <select
                value={crawlerProvider}
                onChange={(e) => setCrawlerProvider(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="default">Default Crawler</option>
                <option value="crawl4ai">crawl4ai (Advanced)</option>
              </select>
            </div>

            {/* RAG Provider Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">RAG Provider</label>
              <select
                value={ragProvider}
                onChange={(e) => {
                  setRagProvider(e.target.value as any);
                  // Update model based on provider
                  if (e.target.value === 'openai') setRagModel('gpt-4o-mini');
                  else if (e.target.value === 'anthropic') setRagModel('claude-3-haiku-20240307');
                  else if (e.target.value === 'mistral') setRagModel('mistral-small-latest');
                  else if (e.target.value === 'gemini') setRagModel('gemini-1.5-flash');
                  else if (e.target.value === 'pageindex-vision') setRagModel('gpt-4o');
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <optgroup label="Vector-Based RAG">
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="mistral">Mistral</option>
                  <option value="gemini">Google Gemini</option>
                </optgroup>
                <optgroup label="Vision-Based RAG">
                  <option value="pageindex-vision">PageIndex Vision RAG ⭐</option>
                </optgroup>
              </select>
              {ragProvider === 'pageindex-vision' && (
                <p className="text-xs text-blue-600 mt-1">
                  🎯 Vision-based retrieval - ideal for complex documents with figures & diagrams
                </p>
              )}
            </div>

            {/* Debug Mode Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4 text-gray-600" />
                <label className="text-xs font-medium text-gray-700">Developer Debug Mode</label>
              </div>
              <button
                onClick={() => setDebugMode(!debugMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  debugMode ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    debugMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* RAG Model Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">RAG Model</label>
              <select
                value={ragModel}
                onChange={(e) => setRagModel(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={ragProvider === 'pageindex-vision'}
              >
                {ragProvider === 'openai' && (
                  <>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </>
                )}
                {ragProvider === 'anthropic' && (
                  <>
                    <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                    <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                    <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                  </>
                )}
                {ragProvider === 'mistral' && (
                  <>
                    <option value="mistral-small-latest">Mistral Small</option>
                    <option value="mistral-medium-latest">Mistral Medium</option>
                    <option value="mistral-large-latest">Mistral Large</option>
                  </>
                )}
                {ragProvider === 'gemini' && (
                  <>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    <option value="gemini-1.0-pro">Gemini 1.0 Pro</option>
                  </>
                )}
                {ragProvider === 'pageindex-vision' && (
                  <>
                    <option value="gpt-4o">GPT-4o (Vision)</option>
                    <option value="gpt-4.1">GPT-4.1 (Vision) - Premium</option>
                  </>
                )}
              </select>
              {ragProvider === 'pageindex-vision' && (
                <p className="text-xs text-gray-500 mt-1">
                  Vision models automatically selected for document reasoning
                </p>
              )}
            </div>
          </div>

          {/* File Upload */}
          {uploadMode === 'file' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <FileText className="w-5 h-5" />
                    Choose a document
                  </div>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center">
                Supports PDF, DOC, DOCX, TXT files
              </p>
            </div>
          )}

          {/* URL Upload */}
          {uploadMode === 'url' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/article"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isProcessing}
                />
                <button
                  onClick={handleUrlUpload}
                  disabled={!urlInput.trim() || isProcessing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Globe className="w-4 h-4" />
                  )}
                  Process
                </button>
              </div>

              <p className="text-xs text-gray-500">
                Enter a URL to extract and process web content. Supports HTML, JSON, and text pages.
              </p>
            </div>
          )}
        </div>

        {/* Document List */}
        {documents.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents</h3>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedDocument('all')}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedDocument === 'all'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900">All Documents</div>
                <div className="text-sm text-gray-500">Search across all uploaded documents</div>
              </button>
              
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDocument(doc.id)}
                  disabled={doc.status !== 'ready'}
                  className={`w-full text-left p-3 rounded-lg border transition-colors disabled:opacity-50 ${
                    selectedDocument === doc.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {doc.type === 'url' ? (
                      <Globe className="w-4 h-4 text-green-500" />
                    ) : (
                      <FileText className="w-4 h-4 text-gray-500" />
                    )}
                    <div className="font-medium text-gray-900 truncate">{doc.filename}</div>
                    {doc.status === 'processing' && (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    )}
                    {doc.status === 'failed' && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {doc.status === 'processing' && 'Processing...'}
                    {doc.status === 'ready' && 'Ready for questions'}
                    {doc.status === 'failed' && 'Processing failed'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: Chat Interface */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[600px] flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              Chat with Documents
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {selectedDocument === 'all' ? 'Searching all documents' : `Searching: ${documents?.find(doc => doc.id === selectedDocument)?.filename || selectedDocument}`}
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !isQuerying ? (
              <div className="text-center text-gray-500 mt-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Upload a document and start asking questions!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div 
                      className="whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ 
                        __html: sanitizeForDisplay(message.content) 
                      }}
                    />
                    
                    {/* Enhanced Sources Visualization */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <SourceViewer 
                          sources={message.sources.map((source) => ({
                            text: source.text || '',
                            score: source.score || 0,
                            similarity: source.score || 0,
                            filename: source.filename || 'Unknown',
                            chunkIndex: source.chunkIndex,
                            metadata: source.metadata || {
                              filename: source.filename,
                            }
                          }))}
                          query={undefined}
                          enableVisualizations={true}
                        />
                      </div>
                    )}

                    {/* Debug Panel */}
                    {debugMode && message.debugInfo && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <RAGDebugPanel
                          sources={message.sources || []}
                          query={undefined}
                          queryTime={message.debugInfo.queryTime}
                          retrievedChunks={message.debugInfo.retrievedChunks}
                          totalChunks={message.debugInfo.totalChunks}
                          model={message.debugInfo.model}
                          provider={message.debugInfo.provider}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            
            {isQuerying && <ChatMessageSkeleton />}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question about your documents..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isQuerying}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isQuerying}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Debug Mode Toggle */}
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={debugMode}
                  onChange={(e) => setDebugMode(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-medium text-gray-700">Debug Mode (Enhanced Error Logging)</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}