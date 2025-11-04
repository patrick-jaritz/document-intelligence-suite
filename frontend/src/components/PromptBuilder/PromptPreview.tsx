/**
 * Prompt Preview Component
 * Shows live preview in multiple formats
 */

import { useState } from 'react';
import { FileText, Code, FileJson, Copy, Check } from 'lucide-react';
import { StructuredPrompt, PromptFormat } from '../../types/prompt';
import { generatePreview, estimateTokens } from '../../utils/promptFormatters';
import { PromptBuilderTheme } from '../../utils/promptBuilderThemes';
import { PROMPT_BUILDER_THEMES } from '../../utils/promptBuilderThemes';

interface PromptPreviewProps {
  prompt: StructuredPrompt;
  theme?: PromptBuilderTheme;
}

export function PromptPreview({ prompt, theme = 'default' }: PromptPreviewProps) {
  const [format, setFormat] = useState<PromptFormat>('markdown');
  const [copied, setCopied] = useState(false);
  const themeConfig = PROMPT_BUILDER_THEMES[theme];

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
    <div className={`prompt-preview border ${themeConfig.colors.border} rounded-lg overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md ${themeConfig.colors.card}`}>
      {/* Format Selector */}
      <div className={`flex items-center justify-between p-3 ${themeConfig.colors.previewBg} border-b ${themeConfig.colors.border} transition-colors`}>
        <div className="flex gap-2">
          {formatButtons.map(({ format: fmt, label, icon: Icon }) => (
            <button
              key={fmt}
              onClick={() => setFormat(fmt)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                format === fmt
                  ? `${themeConfig.colors.buttonPrimary} text-white shadow-sm`
                  : `${themeConfig.colors.card} ${themeConfig.colors.text} hover:bg-opacity-50 hover:bg-blue-500 hover:text-white`
              } hover:scale-105 active:scale-95`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs ${themeConfig.colors.textMuted} transition-colors`}>
            ~{tokenCount.toLocaleString()} tokens
          </span>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm ${themeConfig.colors.card} border ${themeConfig.colors.border} ${themeConfig.colors.text} hover:bg-opacity-10 hover:bg-blue-500 transition-all duration-200 hover:scale-105 active:scale-95`}
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
      <div className={`p-4 ${themeConfig.colors.card} transition-colors`}>
        {format === 'json' ? (
          <pre className={`text-sm font-mono overflow-x-auto ${themeConfig.colors.previewCodeBg} p-4 rounded border ${themeConfig.colors.border} ${themeConfig.colors.text} transition-colors`}>
            {preview}
          </pre>
        ) : format === 'markdown' ? (
          <div className="prose prose-sm max-w-none">
            <div className={`whitespace-pre-wrap text-sm ${themeConfig.colors.text} transition-colors`}>{preview}</div>
          </div>
        ) : (
          <pre className={`text-sm font-mono whitespace-pre-wrap overflow-x-auto ${themeConfig.colors.previewCodeBg} p-4 rounded border ${themeConfig.colors.border} ${themeConfig.colors.text} transition-colors`}>
            {preview}
          </pre>
        )}
      </div>

      {/* Empty State */}
      {!prompt.title && !prompt.role && !prompt.task && (
        <div className={`p-8 text-center ${themeConfig.colors.textMuted} transition-colors`}>
          <FileText size={48} className="mx-auto mb-3 opacity-50" />
          <p>Preview will appear here as you build your prompt</p>
        </div>
      )}
    </div>
  );
}

