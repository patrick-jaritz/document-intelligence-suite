import React from 'react';
import { CheckCircle, Zap, FileText, Table, Layout, Sparkles } from 'lucide-react';

interface EnhancementIndicatorProps {
  enableMarkdownConversion: boolean;
  convertTables: boolean;
  preserveFormatting: boolean;
  generateEmbeddings: boolean;
  embeddingProvider: string;
  chunkSize: number;
  chunkOverlap: number;
}

export function EnhancementIndicator({
  enableMarkdownConversion,
  convertTables,
  preserveFormatting,
  generateEmbeddings,
  embeddingProvider,
  chunkSize,
  chunkOverlap
}: EnhancementIndicatorProps) {
  const activeEnhancements = [
    enableMarkdownConversion && 'Markdown',
    convertTables && 'Tables',
    preserveFormatting && 'Formatting',
    generateEmbeddings && 'Embeddings'
  ].filter(Boolean);

  const enhancementCount = activeEnhancements.length;

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-purple-900">
              🚀 LLM Enhanced Mode Active
            </h3>
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
              {enhancementCount} enhancements
            </span>
          </div>
          
          <p className="text-sm text-gray-700 mb-3">
            Your documents are being processed with advanced AI enhancements for better accuracy and context understanding.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {enableMarkdownConversion && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-gray-700">
                  <strong>Markdown Conversion:</strong> Better structure
                </span>
              </div>
            )}
            
            {convertTables && (
              <div className="flex items-center gap-2 text-sm">
                <Table className="w-4 h-4 text-blue-600" />
                <span className="text-gray-700">
                  <strong>Table Processing:</strong> Structured data
                </span>
              </div>
            )}
            
            {preserveFormatting && (
              <div className="flex items-center gap-2 text-sm">
                <Layout className="w-4 h-4 text-indigo-600" />
                <span className="text-gray-700">
                  <strong>Format Preservation:</strong> Original layout
                </span>
              </div>
            )}
            
            {generateEmbeddings && (
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-yellow-600" />
                <span className="text-gray-700">
                  <strong>Vector Embeddings:</strong> {embeddingProvider.toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-purple-200">
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>Chunk Size: {chunkSize}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>•</span>
                <span>Overlap: {chunkOverlap}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>•</span>
                <span className="text-purple-700 font-medium">Optimized for LLMs</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
