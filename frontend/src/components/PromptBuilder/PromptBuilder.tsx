/**
 * Main Prompt Builder Component
 * Combines form, preview, and export functionality
 */

import { useState, useMemo, useEffect } from 'react';
import { Save, Download, Sparkles, Zap, Palette, BookOpen, X } from 'lucide-react';
import { StructuredPrompt, PromptBuilderProps } from '../../types/prompt';
import { PromptForm } from './PromptForm';
import { PromptPreview } from './PromptPreview';
import { PromptBuilderTestPanel } from './PromptBuilderTestPanel';
import { estimateTokens } from '../../utils/promptFormatters';
import { PROMPT_BUILDER_THEMES, PromptBuilderTheme, getStoredTheme, saveTheme } from '../../utils/promptBuilderThemes';
import { SAMPLE_PROMPTS, SamplePrompt } from '../../data/samplePrompts';

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
  const [theme, setTheme] = useState<PromptBuilderTheme>(getStoredTheme());
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showSamplePrompts, setShowSamplePrompts] = useState(false);
  const themeSelectorRef = useRef<HTMLDivElement>(null);
  const samplePromptsRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

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

  // Apply theme
  useEffect(() => {
    saveTheme(theme);
    document.documentElement.setAttribute('data-prompt-theme', theme);
  }, [theme]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeSelectorRef.current && !themeSelectorRef.current.contains(event.target as Node)) {
        setShowThemeSelector(false);
      }
      if (samplePromptsRef.current && !samplePromptsRef.current.contains(event.target as Node) && 
          !(event.target as HTMLElement).closest('[data-sample-button]')) {
        setShowSamplePrompts(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node) && 
          !(event.target as HTMLElement).closest('[data-export-button]')) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleThemeChange = (newTheme: PromptBuilderTheme) => {
    setTheme(newTheme);
    setShowThemeSelector(false);
  };

  const handleLoadSample = (sample: SamplePrompt) => {
    setPrompt(sample.prompt);
    setShowSamplePrompts(false);
  };

  const themeConfig = PROMPT_BUILDER_THEMES[theme];

  return (
    <div 
      className={`prompt-builder max-w-7xl mx-auto p-6 space-y-6 transition-all duration-300 ${themeConfig.colors.background} min-h-screen`}
      data-theme={theme}
    >
      {/* Header */}
      <div className={`flex items-center justify-between p-4 rounded-lg transition-all duration-200 ${themeConfig.colors.card} border ${themeConfig.colors.border} shadow-sm`}>
        <div>
          <h2 className={`text-2xl font-bold flex items-center gap-2 ${themeConfig.colors.text} transition-colors`}>
            <Sparkles size={24} className={themeConfig.colors.primary} />
            Structured Prompt Builder
          </h2>
          <p className={`text-sm ${themeConfig.colors.textMuted} mt-1 transition-colors`}>
            Build well-structured AI prompts with live preview and testing
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Sample Prompts Button */}
          <button
            data-sample-button
            onClick={() => setShowSamplePrompts(!showSamplePrompts)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${themeConfig.colors.buttonSecondary} ${themeConfig.colors.text} hover:scale-105 active:scale-95`}
            title="Load sample prompts"
          >
            <BookOpen size={16} />
            <span className="hidden sm:inline">Samples</span>
          </button>
          
          {/* Theme Selector Button */}
          <div className="relative" ref={themeSelectorRef}>
            <button
              onClick={() => setShowThemeSelector(!showThemeSelector)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${themeConfig.colors.buttonSecondary} ${themeConfig.colors.text} hover:scale-105 active:scale-95`}
              title="Change theme"
            >
              <Palette size={16} />
              <span className="hidden sm:inline">Theme</span>
            </button>
            
            {/* Theme Selector Dropdown */}
            {showThemeSelector && (
              <div className={`absolute right-0 mt-2 w-56 ${themeConfig.colors.card} border ${themeConfig.colors.border} rounded-lg shadow-xl z-50 overflow-hidden transition-all duration-200`}>
                <div className={`p-2 border-b ${themeConfig.colors.border}`}>
                  <p className={`text-xs font-semibold ${themeConfig.colors.textMuted} uppercase`}>Choose Theme</p>
                </div>
                <div className="p-2 space-y-1">
                  {Object.entries(PROMPT_BUILDER_THEMES).map(([key, themeOpt]) => (
                    <button
                      key={key}
                      onClick={() => handleThemeChange(key as PromptBuilderTheme)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all duration-150 ${
                        theme === key
                          ? `${themeConfig.colors.buttonPrimary} text-white`
                          : `${themeConfig.colors.text} hover:bg-opacity-10 hover:bg-blue-500`
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{themeOpt.name}</div>
                          <div className={`text-xs ${theme === key ? 'text-white/80' : themeConfig.colors.textMuted}`}>
                            {themeOpt.description}
                          </div>
                        </div>
                        {theme === key && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <span className={`text-xs ${themeConfig.colors.textMuted} px-2 hidden md:inline`}>
            ~{tokenCount.toLocaleString()} tokens
          </span>
          
          <button
            onClick={() => setShowTestPanel(!showTestPanel)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${themeConfig.colors.accent} bg-opacity-10 hover:bg-opacity-20 ${themeConfig.colors.text} hover:scale-105 active:scale-95`}
            title="Test prompt with AI models"
          >
            <Zap size={16} />
            <span className="hidden sm:inline">{showTestPanel ? 'Hide' : 'Test'}</span>
          </button>
          
          <button
            onClick={handleSave}
            disabled={isPromptEmpty}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${themeConfig.colors.buttonPrimary} text-white disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 disabled:hover:scale-100`}
          >
            <Save size={16} />
            <span className="hidden sm:inline">Save</span>
          </button>
          
          {onPromptExport && (
            <div className="relative" ref={exportMenuRef}>
              <button
                data-export-button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={isPromptEmpty}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${themeConfig.colors.buttonSecondary} ${themeConfig.colors.text} disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 disabled:hover:scale-100`}
              >
                <Download size={16} />
                <span className="hidden sm:inline">Export</span>
              </button>
              {showExportMenu && (
                <div className={`absolute right-0 mt-2 w-48 ${themeConfig.colors.card} border ${themeConfig.colors.border} rounded-lg shadow-xl z-50 overflow-hidden transition-all duration-200`}>
                  <button
                    onClick={() => handleExport('template')}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${themeConfig.colors.text} hover:bg-opacity-10 hover:bg-blue-500`}
                  >
                    Export as Template Prompt
                  </button>
                  <button
                    onClick={() => handleExport('rag')}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${themeConfig.colors.text} hover:bg-opacity-10 hover:bg-blue-500`}
                  >
                    Export as RAG Prompt
                  </button>
                  <button
                    onClick={() => handleExport('custom')}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${themeConfig.colors.text} hover:bg-opacity-10 hover:bg-blue-500`}
                  >
                    Export as Custom Prompt
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sample Prompts Panel */}
      {showSamplePrompts && (
        <div ref={samplePromptsRef} className={`${themeConfig.colors.card} border ${themeConfig.colors.border} rounded-lg shadow-lg p-4 transition-all duration-200`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${themeConfig.colors.text}`}>Sample Prompts</h3>
            <button
              onClick={() => setShowSamplePrompts(false)}
              className={`p-1 rounded-md ${themeConfig.colors.textMuted} hover:bg-opacity-10 hover:bg-gray-500 transition-colors`}
            >
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {SAMPLE_PROMPTS.map((sample) => (
              <button
                key={sample.id}
                onClick={() => handleLoadSample(sample)}
                className={`text-left p-3 rounded-lg border ${themeConfig.colors.border} transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95 ${themeConfig.colors.card} hover:border-blue-400`}
              >
                <div className={`font-semibold text-sm mb-1 ${themeConfig.colors.text}`}>{sample.name}</div>
                <div className={`text-xs ${themeConfig.colors.textMuted} line-clamp-2`}>{sample.description}</div>
                <div className={`mt-2 text-xs px-2 py-1 rounded inline-block ${themeConfig.colors.accent} bg-opacity-10`}>
                  {sample.category}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 transition-all duration-300">
        {/* Left Column: Form */}
        <div className="space-y-4">
          <div className={`${themeConfig.colors.card} border ${themeConfig.colors.border} rounded-lg p-6 shadow-sm transition-all duration-200 hover:shadow-md`}>
            <h3 className={`text-lg font-semibold mb-4 ${themeConfig.colors.text} transition-colors`}>Build Your Prompt</h3>
            <PromptForm prompt={prompt} onChange={setPrompt} theme={theme} />
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="space-y-4">
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${themeConfig.colors.text} transition-colors`}>Live Preview</h3>
            <PromptPreview prompt={prompt} theme={theme} />
          </div>
        </div>
      </div>

      {/* Mode-specific hints */}
      {mode === 'template' && (
        <div className={`${themeConfig.colors.buttonPrimary} bg-opacity-10 border ${themeConfig.colors.border} rounded-lg p-4 transition-all duration-200`}>
          <p className={`text-sm ${themeConfig.colors.text} transition-colors`}>
            <strong>Template Mode:</strong> This prompt will be used for data
            extraction. Make sure to include clear instructions about the JSON
            schema format.
          </p>
        </div>
      )}

      {mode === 'rag' && (
        <div className={`${themeConfig.colors.buttonPrimary} bg-opacity-10 border ${themeConfig.colors.border} rounded-lg p-4 transition-all duration-200`}>
          <p className={`text-sm ${themeConfig.colors.text} transition-colors`}>
            <strong>RAG Mode:</strong> This prompt will be used for question
            answering. The context and examples will be filled in automatically
            during query.
          </p>
        </div>
      )}

      {/* Test Panel */}
      {showTestPanel && (
        <div className="mt-6 transition-all duration-300">
          <PromptBuilderTestPanel prompt={prompt} theme={theme} />
        </div>
      )}
    </div>
  );
}

