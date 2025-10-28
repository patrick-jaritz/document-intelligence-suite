import React, { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { ragHelpers } from '../lib/supabase';

interface ConvertToMarkdownButtonProps {
  text: string;
  filename?: string;
  className?: string;
  onConvert?: (markdown: string) => void;
}

export function ConvertToMarkdownButton({ 
  text, 
  filename = 'document.txt', 
  className = '',
  onConvert 
}: ConvertToMarkdownButtonProps) {
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async () => {
    if (!text || text.trim().length === 0) {
      setError('No text to convert');
      return;
    }

    setIsConverting(true);
    setError(null);

    try {
      // For plain text, we don't need to base64 encode it
      // The markdown converter can handle plain text directly
      
      const result = await ragHelpers.convertToMarkdown(
        text, // Send as plain text, not base64
        'text/plain',
        filename,
        text.length,
        true, // convertTables
        true  // preserveFormatting
      );

      if (result.success && result.markdown) {
        onConvert?.(result.markdown);
      } else {
        throw new Error(result.error || 'Markdown conversion failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Conversion failed';
      setError(errorMessage);
      console.error('Markdown conversion error:', err);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className={className}>
      <button
        onClick={handleConvert}
        disabled={isConverting || !text || text.trim().length === 0}
        className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
      >
        {isConverting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Converting...
          </>
        ) : (
          <>
            <FileText className="w-4 h-4" />
            Convert to Markdown
          </>
        )}
      </button>
      
      {error && (
        <div className="mt-2 text-xs text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
