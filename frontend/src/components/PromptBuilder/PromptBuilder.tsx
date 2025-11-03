/**
 * Main Prompt Builder Component
 * Combines form, preview, and export functionality
 */

import { useState, useMemo } from 'react';
import { Save, Download, Sparkles, Zap } from 'lucide-react';
import { StructuredPrompt, PromptBuilderProps } from '../../types/prompt';
import { PromptForm } from './PromptForm';
import { PromptPreview } from './PromptPreview';
import { PromptBuilderTestPanel } from './PromptBuilderTestPanel';
import { estimateTokens } from '../../utils/promptFormatters';

const DEFAULT_PROMPT: StructuredPrompt = {
  title: '',
  role: '',
  task: '',
  context: '',
  constraints: [],
  examples: [],
};

export function PromptBuilder({
  onPromptExport,
  initialPrompt,
  mode = 'custom',
  showTestPanel: initialShowTestPanel = false,
}: PromptBuilderProps) {
  const [prompt, setPrompt] = useState<StructuredPrompt>(
    initialPrompt || DEFAULT_PROMPT
  );
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(initialShowTestPanel);

  const tokenCount = useMemo(() => {
    const preview = JSON.stringify(prompt);
    return estimateTokens(preview);
  }, [prompt]);

  const handleExport = (exportType: 'template' | 'rag' | 'custom') => {
    if (onPromptExport) {
      onPromptExport(prompt);
    }
    setShowExportMenu(false);
  };

  const handleSave = async () => {
    // TODO: Implement save to database
    console.log('Saving prompt:', prompt);
    // Call API to save prompt
  };

  const isPromptEmpty =
    !prompt.title &&
    !prompt.role &&
    !prompt.task &&
    !prompt.context &&
    (!prompt.constraints || prompt.constraints.length === 0) &&
    (!prompt.examples || prompt.examples.length === 0);

  return (
    <div className="prompt-builder max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles size={24} className="text-blue-600" />
            Structured Prompt Builder
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Build well-structured AI prompts with live preview and testing
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            ~{tokenCount.toLocaleString()} tokens
          </span>
          <button
            onClick={() => setShowTestPanel(!showTestPanel)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
            title="Test prompt with AI models"
          >
            <Zap size={16} />
            {showTestPanel ? 'Hide' : 'Test'}
          </button>
          <button
            onClick={handleSave}
            disabled={isPromptEmpty}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save size={16} />
            Save
          </button>
          {onPromptExport && (
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={isPromptEmpty}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download size={16} />
                Export
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border rounded-md shadow-lg z-10">
                  <button
                    onClick={() => handleExport('template')}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                  >
                    Export as Template Prompt
                  </button>
                  <button
                    onClick={() => handleExport('rag')}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                  >
                    Export as RAG Prompt
                  </button>
                  <button
                    onClick={() => handleExport('custom')}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                  >
                    Export as Custom Prompt
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Form */}
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Build Your Prompt</h3>
            <PromptForm prompt={prompt} onChange={setPrompt} />
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-4">Live Preview</h3>
            <PromptPreview prompt={prompt} />
          </div>
        </div>
      </div>

      {/* Mode-specific hints */}
      {mode === 'template' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Template Mode:</strong> This prompt will be used for data
            extraction. Make sure to include clear instructions about the JSON
            schema format.
          </p>
        </div>
      )}

      {mode === 'rag' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>RAG Mode:</strong> This prompt will be used for question
            answering. The context and examples will be filled in automatically
            during query.
          </p>
        </div>
      )}

      {/* Test Panel */}
      {showTestPanel && (
        <div className="mt-6">
          <PromptBuilderTestPanel prompt={prompt} />
        </div>
      )}
    </div>
  );
}

