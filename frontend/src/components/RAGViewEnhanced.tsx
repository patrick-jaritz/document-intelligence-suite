import { useState, useRef } from 'react';
import { Upload, FileText, MessageCircle, Send, Loader2, AlertCircle, Globe, Settings, CheckCircle } from 'lucide-react';
import { supabase, supabaseUrl, ragHelpers } from '../lib/supabase';
import { sanitizeForDisplay } from '../utils/sanitize';
import { ConvertToMarkdownButton } from './ConvertToMarkdownButton';
import { SourceViewer } from './SourceViewer';

interface Document {
  id: string;
  filename: string;
  status: 'processing' | 'ready' | 'failed';
  type: 'file' | 'url';
  markdownEnabled?: boolean;
  chunksCreated?: number;
  embeddingsGenerated?: boolean;
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
}

export function RAGViewEnhanced() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string>('all');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [ocrProvider, setOcrProvider] = useState<'google-vision' | 'ocr-space' | 'openai-vision' | 'mistral-vision' | 'tesseract' | 'paddleocr' | 'dots-ocr' | 'deepseek-ocr' | 'easyocr'>('google-vision');
  const [crawlerProvider, setCrawlerProvider] = useState<'default' | 'crawl4ai'>('crawl4ai');
  const [ragProvider, setRagProvider] = useState<'openai' | 'anthropic' | 'mistral' | 'gemini'>('openai');
  const [ragModel, setRagModel] = useState('gpt-4o-mini');
  const [debugMode, setDebugMode] = useState(false);
  
  // Enhanced RAG options
  const [enableMarkdownConversion, setEnableMarkdownConversion] = useState(true);
  const [convertTables, setConvertTables] = useState(true);
  const [preserveFormatting, setPreserveFormatting] = useState(true);
  const [generateEmbeddings, setGenerateEmbeddings] = useState(true);
  const [embeddingProvider, setEmbeddingProvider] = useState<'openai' | 'mistral' | 'anthropic'>('openai');
  const [chunkSize, setChunkSize] = useState(1000);
  const [chunkOverlap, setChunkOverlap] = useState(200);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const documentId = crypto.randomUUID();

    // Add document to list
    const newDoc: Document = {
      id: documentId,
      filename: file.name,
      status: 'processing',
      type: 'file',
      markdownEnabled: enableMarkdownConversion
    };
    setDocuments(prev => [...prev, newDoc]);

    try {
      // Convert file to base64 data URL
      const fileDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      console.log('🔄 Starting enhanced RAG processing with Markdown conversion...');
      console.log('Enhanced RAG Request details:', {
        documentId,
        ocrProvider,
        enableMarkdownConversion,
        convertTables,
        preserveFormatting,
        generateEmbeddings,
        embeddingProvider,
        chunkSize,
        chunkOverlap,
        fileType: file.type,
        fileSize: file.size
      });

      // Use the new integrated RAG + Markdown pipeline
      const ragMarkdownResult = await ragHelpers.processRAGWithMarkdown(
        documentId,
        `job_${Date.now()}`,
        'data-url',
        ocrProvider,
        fileDataUrl,
        'gpt-4o-mini',
        enableMarkdownConversion,
        convertTables,
        preserveFormatting,
        generateEmbeddings,
        embeddingProvider,
        chunkSize,
        chunkOverlap
      );

      if (!ragMarkdownResult.success) {
        throw new Error(ragMarkdownResult.error || 'Enhanced RAG processing failed');
      }

      console.log('✅ Enhanced RAG processing completed:', {
        processingTime: ragMarkdownResult.processingTime,
        extractedTextLength: ragMarkdownResult.extractedText?.length || 0,
        markdownTextLength: ragMarkdownResult.markdownText?.length || 0,
        chunksCreated: ragMarkdownResult.chunksCreated,
        embeddingsGenerated: ragMarkdownResult.embeddingsGenerated,
        markdownConversion: ragMarkdownResult.metadata?.markdownConversion,
        ragProcessing: ragMarkdownResult.metadata?.ragProcessing
      });

      // Update document status
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? { 
              ...doc, 
              status: 'ready',
              chunksCreated: ragMarkdownResult.chunksCreated,
              embeddingsGenerated: ragMarkdownResult.embeddingsGenerated
            }
          : doc
      ));

      // Add success message
      setMessages(prev => [...prev, {
        id: `success-${Date.now()}`,
        role: 'assistant',
        content: `✅ Document "${file.name}" processed successfully!\n\n**Processing Summary:**\n- OCR Text: ${ragMarkdownResult.extractedText?.length || 0} characters\n- Markdown Text: ${ragMarkdownResult.markdownText?.length || 0} characters\n- Chunks Created: ${ragMarkdownResult.chunksCreated}\n- Embeddings Generated: ${ragMarkdownResult.embeddingsGenerated ? 'Yes' : 'No'}\n- Processing Time: ${ragMarkdownResult.processingTime}ms\n\n${enableMarkdownConversion ? '📝 Markdown conversion enabled for better LLM processing' : '⚠️ Markdown conversion disabled'}`
      }]);

    } catch (error) {
      console.error('❌ Enhanced RAG processing failed:', error);
      
      // Update document status to failed
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? { ...doc, status: 'failed' }
          : doc
      ));

      // Add error message
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `❌ Failed to process document "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or check the console for more details.`
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUrlUpload = async () => {
    if (!urlInput.trim()) return;

    setIsProcessing(true);
    const documentId = crypto.randomUUID();

    const newDoc: Document = {
      id: documentId,
      filename: urlInput,
      status: 'processing',
      type: 'url'
    };
    setDocuments(prev => [...prev, newDoc]);

    try {
      console.log('🌐 Processing URL with enhanced crawler...');
      
      const urlResult = await ragHelpers.processURL(
        documentId,
        `job_${Date.now()}`,
        urlInput,
        crawlerProvider
      );

      if (!urlResult.success) {
        throw new Error(urlResult.error || 'URL processing failed');
      }

      console.log('✅ URL processing completed:', urlResult);

      setDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? { ...doc, status: 'ready' }
          : doc
      ));

      setMessages(prev => [...prev, {
        id: `success-${Date.now()}`,
        role: 'assistant',
        content: `✅ URL "${urlInput}" processed successfully!\n\n**Content Summary:**\n- Title: ${urlResult.title || 'N/A'}\n- Word Count: ${urlResult.metadata?.wordCount || 'N/A'}\n- Processing Time: ${urlResult.metadata?.processingTime || 'N/A'}ms\n- Provider: ${urlResult.metadata?.provider || 'N/A'}`
      }]);

    } catch (error) {
      console.error('❌ URL processing failed:', error);
      
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? { ...doc, status: 'failed' }
          : doc
      ));

      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `❌ Failed to process URL "${urlInput}": ${error instanceof Error ? error.message : 'Unknown error'}`
      }]);
    } finally {
      setIsProcessing(false);
      setUrlInput('');
    }
  };

  const handleQuery = async () => {
    if (!inputMessage.trim()) return;

    try {
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: inputMessage
      };

      setMessages(prev => [...prev, userMessage]);
      setInputMessage('');
      setIsQuerying(true);
      const selectedDoc = documents?.find(doc => doc.id === selectedDocument);
      const filename = selectedDocument === 'all' ? undefined : selectedDoc?.filename;
      const documentId = selectedDocument === 'all' ? undefined : selectedDocument;
      
      console.log('🔍 Querying RAG system with enhanced processing...');
      console.log('📋 Query parameters:', {
        question: inputMessage,
        filename,
        documentId,
        provider: ragProvider,
        selectedDocument
      });
      
      const ragResult = await ragHelpers.queryRAG(
        inputMessage,
        documentId, // Pass the documentId instead of undefined
        filename,
        ragProvider
      );

      console.log('📊 RAG Result received:', {
        hasAnswer: !!ragResult.answer,
        hasError: !!ragResult.error,
        hasSources: !!ragResult.sources,
        answerLength: ragResult.answer?.length || 0,
        sourcesCount: ragResult.sources?.length || 0,
        retrievedChunks: ragResult.retrievedChunks,
        model: ragResult.model,
        provider: ragResult.provider,
        fullResult: ragResult
      });

      // The rag-query Edge Function returns data directly, not wrapped in success/error
      if (ragResult.error) {
        console.error('❌ RAG query returned error:', ragResult.error);
        throw new Error(ragResult.error || 'RAG query failed');
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: ragResult.answer || 'No answer generated',
        sources: ragResult.sources || []
      };

      console.log('✅ RAG query successful, adding message to chat');
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('❌ RAG query failed:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
        fullError: error
      });
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `❌ Query failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or check if documents are properly processed.`
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-blue-600" />
          Enhanced RAG Q&A with Markdown Processing
        </h2>
        <p className="text-gray-600">
          Upload documents or URLs and ask questions. Enhanced with Markdown conversion for better LLM processing. Select your OCR provider above.
        </p>
      </div>

      {/* Enhanced Settings Panel */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Enhanced Processing Options</h3>
        </div>
        
        {/* OCR Provider - Standalone, always visible at top */}
        <div className="mb-4 bg-white p-4 rounded-lg border-2 border-blue-300 shadow-md">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-blue-600 text-xl">📄</span>
            OCR Provider
          </h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select OCR Provider for Document Processing</label>
            <select
              value={ocrProvider}
              onChange={(e) => setOcrProvider(e.target.value as any)}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
            >
              <option value="google-vision">Google Vision API (Recommended for PDFs)</option>
              <option value="openai-vision">OpenAI Vision API (Images only)</option>
              <option value="mistral-vision">Mistral Vision API</option>
              <option value="tesseract">Tesseract (Browser-based)</option>
              <option value="ocr-space">OCR.space (Free tier limited)</option>
              <option value="paddleocr">PaddleOCR (Requires service)</option>
              <option value="dots-ocr">dots.ocr (Requires service)</option>
              <option value="deepseek-ocr">DeepSeek-OCR (Requires service)</option>
              <option value="easyocr">EasyOCR (Requires service)</option>
            </select>
            <p className="text-xs text-gray-600 mt-2 font-medium">
              {ocrProvider === 'openai-vision' 
                ? '⚠️ OpenAI Vision only supports images (PNG, JPG, WebP, GIF). For PDFs, use Google Vision or another provider.'
                : ocrProvider === 'dots-ocr' || ocrProvider === 'paddleocr' || ocrProvider === 'deepseek-ocr' || ocrProvider === 'easyocr' 
                ? '⚠️ Self-hosted service - ensure service is deployed'
                : '✅ API-based provider - ready to use'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Markdown Conversion Settings */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Markdown Conversion</h4>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={enableMarkdownConversion}
                onChange={(e) => setEnableMarkdownConversion(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Enable Markdown conversion</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={convertTables}
                onChange={(e) => setConvertTables(e.target.checked)}
                disabled={!enableMarkdownConversion}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 disabled:opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Convert tables to Markdown</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preserveFormatting}
                onChange={(e) => setPreserveFormatting(e.target.checked)}
                disabled={!enableMarkdownConversion}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 disabled:opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Preserve formatting</span>
            </label>
          </div>

          {/* Embedding Settings */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Embedding Generation</h4>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={generateEmbeddings}
                onChange={(e) => setGenerateEmbeddings(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">Generate embeddings</span>
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Embedding Provider</label>
              <select
                value={embeddingProvider}
                onChange={(e) => setEmbeddingProvider(e.target.value as any)}
                disabled={!generateEmbeddings}
                className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="openai">OpenAI</option>
                <option value="mistral">Mistral</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>
          </div>

          {/* Chunking Settings */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Text Chunking</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chunk Size</label>
              <input
                type="number"
                value={chunkSize}
                onChange={(e) => setChunkSize(parseInt(e.target.value))}
                disabled={!generateEmbeddings}
                className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                min="100"
                max="2000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chunk Overlap</label>
              <input
                type="number"
                value={chunkOverlap}
                onChange={(e) => setChunkOverlap(parseInt(e.target.value))}
                disabled={!generateEmbeddings}
                className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                min="0"
                max="500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="mb-6">
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setUploadMode('file')}
            className={`px-4 py-2 rounded-lg font-medium ${
              uploadMode === 'file'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Upload File
          </button>
          <button
            onClick={() => setUploadMode('url')}
            className={`px-4 py-2 rounded-lg font-medium ${
              uploadMode === 'url'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Globe className="w-4 h-4 inline mr-2" />
            Add URL
          </button>
        </div>

        {uploadMode === 'file' ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Click to upload a document</p>
            <p className="text-xs text-gray-500 mb-4">
              Supports PDF, images (PNG, JPG, WebP), and text files (TXT, MD)
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Choose File'
              )}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Enter URL to crawl..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleUrlUpload}
              disabled={isProcessing || !urlInput.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Add URL'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Documents List */}
      {documents.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Processed Documents</h3>
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`p-3 rounded-lg border ${
                  doc.status === 'ready'
                    ? 'border-green-200 bg-green-50'
                    : doc.status === 'processing'
                    ? 'border-yellow-200 bg-yellow-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {doc.status === 'ready' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : doc.status === 'processing' ? (
                      <Loader2 className="w-5 h-5 text-yellow-600 animate-spin" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-medium text-gray-900">{doc.filename}</span>
                    {doc.markdownEnabled && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        Markdown
                      </span>
                    )}
                    {doc.chunksCreated && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        {doc.chunksCreated} chunks
                      </span>
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    doc.status === 'ready'
                      ? 'text-green-600'
                      : doc.status === 'processing'
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}>
                    {doc.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Interface */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Ask Questions</h3>
          <select
            value={selectedDocument}
            onChange={(e) => setSelectedDocument(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Documents</option>
            {documents
              .filter(doc => doc.status === 'ready')
              .map(doc => (
                <option key={doc.id} value={doc.id}>
                  {doc.filename}
                </option>
              ))}
          </select>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-100 ml-8'
                  : 'bg-gray-100 mr-8'
              }`}
            >
              <div 
                className="whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ 
                  __html: sanitizeForDisplay(message.content) 
                }}
              />
              {message.sources && message.sources.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <SourceViewer 
                    sources={message.sources.map((source) => ({
                      text: source.text || '',
                      score: source.score || 0,
                      similarity: source.score || 0,
                      filename: source.filename || 'Unknown',
                      metadata: {
                        filename: source.filename,
                      }
                    }))}
                  />
                </div>
              )}
              {message.role === 'assistant' && (
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <ConvertToMarkdownButton 
                    text={message.content}
                    filename={`rag-response-${message.id}.txt`}
                    onConvert={(markdown) => {
                      const blob = new Blob([markdown], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `rag-response-${message.id}.md`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleQuery()}
            placeholder="Ask a question about your documents..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleQuery}
            disabled={isQuerying || !inputMessage.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isQuerying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Debug Mode Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="debugMode"
          checked={debugMode}
          onChange={(e) => setDebugMode(e.target.checked)}
          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
        />
        <label htmlFor="debugMode" className="text-sm text-gray-700">
          Enable debug mode for detailed logging
        </label>
      </div>
    </div>
  );
}
