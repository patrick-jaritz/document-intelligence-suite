/**
 * Prompt Preview Component
 * Shows live preview in multiple formats
 */

import { useState } from 'react';
import { FileText, Code, FileJson, Copy, Check } from 'lucide-react';
import { StructuredPrompt, PromptFormat } from '../../types/prompt';
import { generatePreview, estimateTokens } from '../../utils/promptFormatters';

interface PromptPreviewProps {
  prompt: StructuredPrompt;
}

export function PromptPreview({ prompt }: PromptPreviewProps) {
  const [format, setFormat] = useState<PromptFormat>('markdown');
  const [copied, setCopied] = useState(false);

  const preview = generatePreview(prompt, format);
  const tokenCount = estimateTokens(preview);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(preview);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatButtons: Array<{ format: PromptFormat; label: string; icon: any }> = [
    { format: 'markdown', label: 'Markdown', icon: FileText },
    { format: 'json', label: 'JSON', icon: FileJson },
    { format: 'plain', label: 'Plain Text', icon: Code },
  ];

  return (
    <div className="prompt-preview border rounded-lg overflow-hidden">
      {/* Format Selector */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
        <div className="flex gap-2">
          {formatButtons.map(({ format: fmt, label, icon: Icon }) => (
            <button
              key={fmt}
              onClick={() => setFormat(fmt)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                format === fmt
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            ~{tokenCount.toLocaleString()} tokens
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm bg-white border hover:bg-gray-50 transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <>
                <Check size={16} className="text-green-600" />
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="p-4 bg-white">
        {format === 'json' ? (
          <pre className="text-sm font-mono overflow-x-auto bg-gray-50 p-4 rounded border">
            {preview}
          </pre>
        ) : format === 'markdown' ? (
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-sm">{preview}</div>
          </div>
        ) : (
          <pre className="text-sm font-mono whitespace-pre-wrap overflow-x-auto bg-gray-50 p-4 rounded border">
            {preview}
          </pre>
        )}
      </div>

      {/* Empty State */}
      {!prompt.title && !prompt.role && !prompt.task && (
        <div className="p-8 text-center text-gray-500">
          <FileText size={48} className="mx-auto mb-3 opacity-50" />
          <p>Preview will appear here as you build your prompt</p>
        </div>
      )}
    </div>
  );
}

