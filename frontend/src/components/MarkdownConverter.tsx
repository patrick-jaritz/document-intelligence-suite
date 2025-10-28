import React, { useState, useCallback } from 'react';
import { ragHelpers } from '../lib/supabase';

interface MarkdownConverterProps {
  onConvert?: (result: any) => void;
}

interface ConversionResult {
  success: boolean;
  markdown?: string;
  metadata?: {
    originalFormat: string;
    fileName?: string;
    fileSize?: number;
    processingTime: number;
    wordCount: number;
    characterCount: number;
    tablesDetected: number;
    imagesDetected: number;
    linksDetected: number;
    conversionMethod: string;
  };
  error?: string;
  requestId?: string;
}

export const MarkdownConverter: React.FC<MarkdownConverterProps> = ({ onConvert }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState({
    convertTables: true,
    preserveFormatting: true,
  });

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  }, []);

  const convertToMarkdown = useCallback(async () => {
    if (!file) {
      setError('Please select a file to convert');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      // Call the markdown converter
      const response = await ragHelpers.convertToMarkdown(
        base64,
        file.type,
        file.name,
        file.size,
        options.convertTables,
        options.preserveFormatting
      );

      setResult(response);
      onConvert?.(response);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Conversion failed';
      
      // Check if this is a PDF parsing error and provide helpful guidance
      const isPdfError = file.type === 'application/pdf' && 
        (errorMessage.includes('PDF text extraction failed') || 
         errorMessage.includes('raw binary data') ||
         errorMessage.includes('cannot be parsed'));
      
      if (isPdfError) {
        setError(
          `PDF conversion failed: ${errorMessage}\n\n` +
          `💡 **Suggestion**: The Markdown converter works best with OCR-extracted text, not raw PDF files. ` +
          `Try this workflow:\n` +
          `1. First use an OCR provider (Google Vision, OpenAI Vision, DeepSeek-OCR)\n` +
          `2. Then use the Markdown converter on the OCR output\n` +
          `3. Or use the RAG processing mode which does OCR + Markdown conversion automatically`
        );
      } else {
        setError(errorMessage);
      }
      
      console.error('Markdown conversion error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [file, options, onConvert]);

  const downloadMarkdown = useCallback(() => {
    if (!result?.markdown) return;

    const blob = new Blob([result.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name?.replace(/\.[^/.]+$/, '') || 'converted'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [result, file]);

  const copyToClipboard = useCallback(async () => {
    if (!result?.markdown) return;

    try {
      await navigator.clipboard.writeText(result.markdown);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }, [result]);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Convert Anything to Markdown
        </h2>
        <p className="text-gray-600">
          Convert PDFs, HTML files, and text documents to Markdown format optimized for LLM processing.
        </p>
      </div>

      {/* File Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select File
        </label>
        <input
          type="file"
          accept=".pdf,.html,.htm,.txt"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {file && (
          <div className="mt-2 text-sm text-gray-600">
            <strong>Selected:</strong> {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </div>
        )}
      </div>

      {/* Options */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Conversion Options</h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={options.convertTables}
              onChange={(e) => setOptions(prev => ({ ...prev, convertTables: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Convert tables to Markdown format</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={options.preserveFormatting}
              onChange={(e) => setOptions(prev => ({ ...prev, preserveFormatting: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Preserve original formatting</span>
          </label>
        </div>
      </div>

      {/* Convert Button */}
      <div className="mb-6">
        <button
          onClick={convertToMarkdown}
          disabled={!file || isProcessing}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Converting to Markdown...
            </div>
          ) : (
            'Convert to Markdown'
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Conversion Error</h3>
              <div className="mt-2 text-sm text-red-700 whitespace-pre-line">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Metadata */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Conversion Results</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Original Format:</span>
                <span className="ml-2 text-gray-600">{result.metadata?.originalFormat}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Processing Time:</span>
                <span className="ml-2 text-gray-600">{result.metadata?.processingTime}ms</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Word Count:</span>
                <span className="ml-2 text-gray-600">{result.metadata?.wordCount}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Character Count:</span>
                <span className="ml-2 text-gray-600">{result.metadata?.characterCount}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Tables Detected:</span>
                <span className="ml-2 text-gray-600">{result.metadata?.tablesDetected}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Images Found:</span>
                <span className="ml-2 text-gray-600">{result.metadata?.imagesDetected}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Links Found:</span>
                <span className="ml-2 text-gray-600">{result.metadata?.linksDetected}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Conversion Method:</span>
                <span className="ml-2 text-gray-600">{result.metadata?.conversionMethod}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={downloadMarkdown}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Download Markdown
            </button>
            <button
              onClick={copyToClipboard}
              className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              Copy to Clipboard
            </button>
          </div>

          {/* Markdown Preview */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Markdown Preview</h3>
            <div className="border border-gray-300 rounded-md p-4 bg-gray-50 max-h-96 overflow-y-auto">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                {result.markdown}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Benefits Section */}
      <div className="mt-8 bg-blue-50 p-6 rounded-md">
        <h3 className="text-lg font-medium text-blue-900 mb-3">Why Convert to Markdown?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div className="space-y-2">
            <div className="flex items-center">
              <svg className="h-4 w-4 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>LLM-Optimized Format</span>
            </div>
            <div className="flex items-center">
              <svg className="h-4 w-4 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Clean, Structured Text</span>
            </div>
            <div className="flex items-center">
              <svg className="h-4 w-4 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Preserves Document Structure</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center">
              <svg className="h-4 w-4 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Easy to Search and Index</span>
            </div>
            <div className="flex items-center">
              <svg className="h-4 w-4 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Git-Friendly Format</span>
            </div>
            <div className="flex items-center">
              <svg className="h-4 w-4 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Cross-Platform Compatible</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarkdownConverter;
