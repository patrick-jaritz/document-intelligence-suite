import { useState } from 'react';
import { Bug, CheckCircle, AlertTriangle, XCircle, Loader2, FileText, ExternalLink } from 'lucide-react';
import { supabaseUrl } from '../lib/supabase';

interface DiagnosticResult {
  success: boolean;
  diagnostics?: {
    timestamp: string;
    documentId: string | null;
    filename: string | null;
    document?: {
      exists: boolean;
      error?: string;
      data?: {
        id: string;
        filename: string;
        upload_date: string;
        embedding_provider: string;
        status: string;
      } | null;
    };
    chunks?: {
      total: number;
      error?: string;
      withEmbeddings: number;
      withoutEmbeddings: number;
      sample: Array<{
        id: string;
        chunk_index: number;
        filename: string;
        document_id: string;
        text_length: number;
        text_preview: string;
        has_embedding: boolean;
        embedding_type: string;
        embedding_length: number;
      }>;
    };
    allDocuments?: {
      count: number;
      error?: string;
      documents: Array<{
        id: string;
        filename: string;
        upload_date: string;
        embedding_provider: string;
      }>;
    };
    statistics?: {
      totalChunks: number;
      documentsWithChunks: number;
      byDocument: Array<{
        document_id: string;
        filename: string;
        chunk_count: number;
      }>;
    };
    recommendations?: string[];
  };
  error?: string;
}

interface RAGDiagnosticButtonProps {
  documentId?: string;
  filename?: string;
  documentType?: 'file' | 'url';
  className?: string;
}

export function RAGDiagnosticButton({ 
  documentId, 
  filename, 
  documentType = 'file',
  className = '' 
}: RAGDiagnosticButtonProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [showResults, setShowResults] = useState(false);

  const runDiagnostic = async () => {
    if (!documentId && !filename) {
      alert('Please select a document first to run diagnostics.');
      return;
    }

    setIsRunning(true);
    setResult(null);
    setShowResults(true);

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/rag-query-diagnostic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          documentId: documentId || null,
          filename: filename || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Diagnostic failed: ${response.statusText}`);
      }

      const diagnosticResult = await response.json();
      setResult(diagnosticResult);
    } catch (error) {
      console.error('Diagnostic error:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = () => {
    if (!result) return null;
    if (!result.success) return <XCircle className="w-5 h-5 text-red-500" />;
    if (result.diagnostics?.recommendations?.some(r => r.startsWith('❌'))) {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  return (
    <div className={className}>
      <button
        onClick={runDiagnostic}
        disabled={isRunning || (!documentId && !filename)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Run diagnostic check for this document"
      >
        {isRunning ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Bug className="w-4 h-4" />
        )}
        {isRunning ? 'Running...' : 'Diagnose'}
      </button>

      {showResults && result && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <h3 className="text-sm font-semibold text-gray-900">Diagnostic Results</h3>
            </div>
            <button
              onClick={() => setShowResults(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          {!result.success ? (
            <div className="text-sm text-red-600">
              <p className="font-medium">Error:</p>
              <p>{result.error}</p>
            </div>
          ) : result.diagnostics ? (
            <div className="space-y-4 text-sm">
              {/* Document Status */}
              {result.diagnostics.document && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Document Status
                  </h4>
                  {result.diagnostics.document.exists ? (
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <div className="flex items-center gap-2 text-green-700 mb-2">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-medium">Document Found</span>
                      </div>
                      {result.diagnostics.document.data && (
                        <div className="text-xs text-gray-600 space-y-1">
                          <p><strong>Filename:</strong> {result.diagnostics.document.data.filename}</p>
                          <p><strong>Upload Date:</strong> {new Date(result.diagnostics.document.data.upload_date).toLocaleString()}</p>
                          <p><strong>Provider:</strong> {result.diagnostics.document.data.embedding_provider}</p>
                          <p><strong>Status:</strong> {result.diagnostics.document.data.status}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <div className="flex items-center gap-2 text-red-700 mb-2">
                        <XCircle className="w-4 h-4" />
                        <span className="font-medium">Document Not Found</span>
                      </div>
                      <p className="text-xs text-red-600">
                        {result.diagnostics.document.error || 'Document may not have been uploaded or processed yet.'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Chunks Status */}
              {result.diagnostics.chunks && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Chunks Status
                  </h4>
                  <div className="bg-white border border-gray-200 rounded p-3">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <span className="text-xs text-gray-600">Total Chunks</span>
                        <p className="text-lg font-semibold text-gray-900">{result.diagnostics.chunks.total}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-600">With Embeddings</span>
                        <p className={`text-lg font-semibold ${result.diagnostics.chunks.withEmbeddings > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {result.diagnostics.chunks.withEmbeddings}
                        </p>
                      </div>
                      {result.diagnostics.chunks.withoutEmbeddings > 0 && (
                        <div className="col-span-2">
                          <span className="text-xs text-yellow-600">⚠️ Without Embeddings</span>
                          <p className="text-lg font-semibold text-yellow-600">{result.diagnostics.chunks.withoutEmbeddings}</p>
                        </div>
                      )}
                    </div>
                    {result.diagnostics.chunks.error && (
                      <p className="text-xs text-red-600">{result.diagnostics.chunks.error}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {result.diagnostics.recommendations && result.diagnostics.recommendations.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                  <div className="space-y-2">
                    {result.diagnostics.recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded text-xs ${
                          rec.startsWith('✅')
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : rec.startsWith('⚠️')
                            ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                      >
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample Chunks */}
              {result.diagnostics.chunks?.sample && result.diagnostics.chunks.sample.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Sample Chunks</h4>
                  <div className="space-y-2">
                    {result.diagnostics.chunks.sample.map((chunk, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded p-2 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">Chunk #{chunk.chunk_index}</span>
                          <span className={`px-2 py-0.5 rounded ${
                            chunk.has_embedding ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {chunk.has_embedding ? 'Has Embedding' : 'No Embedding'}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-1">
                          <strong>Text:</strong> {chunk.text_preview}
                        </p>
                        <div className="text-gray-500 text-xs">
                          Length: {chunk.text_length} chars | 
                          Embedding: {chunk.embedding_type} ({chunk.embedding_length} dims)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Documents */}
              {result.diagnostics.allDocuments && result.diagnostics.allDocuments.count > 0 && (
                <details className="cursor-pointer">
                  <summary className="font-medium text-gray-900 mb-2">
                    All Documents ({result.diagnostics.allDocuments.count})
                  </summary>
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {result.diagnostics.allDocuments.documents.map((doc, index) => (
                      <div key={index} className="text-xs bg-white border border-gray-200 rounded p-2">
                        <p className="font-medium">{doc.filename}</p>
                        <p className="text-gray-500">ID: {doc.id.substring(0, 8)}...</p>
                        <p className="text-gray-400 text-xs">
                          {new Date(doc.upload_date).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

