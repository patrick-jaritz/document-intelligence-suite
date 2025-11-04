/**
 * Prompt Builder Test Panel
 * Tests prompts with OpenRouter API (100+ models)
 */

import { useState, useEffect, useRef } from 'react';
import { Play, Loader2, Copy, Check, Settings, TrendingUp, Zap } from 'lucide-react';
import { StructuredPrompt } from '../../types/prompt';
import { generatePreview } from '../../utils/promptFormatters';
import { supabaseUrl, supabaseAnonKey } from '../../lib/supabase';
import { PromptBuilderTheme } from '../../utils/promptBuilderThemes';
import { PROMPT_BUILDER_THEMES } from '../../utils/promptBuilderThemes';

interface Model {
  id: string;
  name: string;
  context_length: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
}

interface TestConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stream: boolean;
  jsonMode: boolean;
}

interface TestResult {
  response: string;
  model: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost?: {
    prompt: number;
    completion: number;
    total: number;
  };
  duration: number;
}

interface PromptBuilderTestPanelProps {
  prompt: StructuredPrompt;
  testInput?: string;
  apiKey?: string;
  theme?: PromptBuilderTheme;
}

export function PromptBuilderTestPanel({
  prompt,
  testInput = '',
  apiKey: providedApiKey,
  theme = 'default',
}: PromptBuilderTestPanelProps) {
  const themeConfig = PROMPT_BUILDER_THEMES[theme];
  const [models, setModels] = useState<Model[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [input, setInput] = useState(testInput);
  const [apiKey, setApiKey] = useState(providedApiKey || '');
  const [copied, setCopied] = useState(false);

  const [config, setConfig] = useState<TestConfig>({
    model: '',
    temperature: 0.7,
    maxTokens: 1000,
    topP: 1.0,
    topK: 40,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stream: false,
    jsonMode: false,
  });

  // Load models when API key is provided
  useEffect(() => {
    if (apiKey && apiKey.length > 0) {
      loadModels();
    }
  }, [apiKey]);

  // Update config when model changes
  useEffect(() => {
    if (selectedModel) {
      setConfig((prev) => ({ ...prev, model: selectedModel }));
    }
  }, [selectedModel]);

  const loadModels = async () => {
    setIsLoadingModels(true);
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load models. Check your API key.');
      }

      const data = await response.json();
      const sortedModels = (data.data || [])
        .filter((m: any) => m.name) // Filter out invalid models
        .sort((a: any, b: any) => {
          // Popular models first
          const popular = ['gpt-4', 'claude', 'gemini', 'llama'];
          const aPopular = popular.some((p) => a.id.toLowerCase().includes(p));
          const bPopular = popular.some((p) => b.id.toLowerCase().includes(p));
          if (aPopular && !bPopular) return -1;
          if (!aPopular && bPopular) return 1;
          return a.id.localeCompare(b.id);
        });

      setModels(sortedModels);

      // Auto-select first popular model
      if (sortedModels.length > 0 && !selectedModel) {
        const popular = sortedModels.find((m: Model) =>
          ['gpt-4', 'claude', 'gemini'].some((p) => m.id.toLowerCase().includes(p))
        );
        setSelectedModel(popular?.id || sortedModels[0].id);
      }
    } catch (error) {
      console.error('Error loading models:', error);
      setTestError(error instanceof Error ? error.message : 'Failed to load models');
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleTest = async () => {
    if (!apiKey) {
      setTestError('Please enter your OpenRouter API key');
      return;
    }

    if (!config.model) {
      setTestError('Please select a model');
      return;
    }

    setIsTesting(true);
    setTestError(null);
    setTestResult(null);

    try {
      const promptText = generatePreview(prompt, 'markdown');
      const fullPrompt = input
        ? `${promptText}\n\nUser Input: ${input}`
        : promptText;

      const startTime = Date.now();

      // Call our Edge Function (proxy to OpenRouter)
      const response = await fetch(
        `${supabaseUrl}/functions/v1/test-prompt`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            prompt: fullPrompt,
            systemPrompt: prompt.role || 'You are a helpful assistant.',
            model: config.model,
            temperature: config.temperature,
            max_tokens: config.maxTokens,
            top_p: config.topP,
            top_k: config.topK,
            frequency_penalty: config.frequencyPenalty,
            presence_penalty: config.presencePenalty,
            stream: config.stream,
            json_mode: config.jsonMode,
            openrouter_api_key: apiKey,
          }),
        }
      );

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      setTestResult({
        response: result.response || result.content || '',
        model: config.model,
        tokensUsed: {
          prompt: result.usage?.prompt_tokens || 0,
          completion: result.usage?.completion_tokens || 0,
          total: result.usage?.total_tokens || 0,
        },
        cost: result.cost,
        duration,
      });
    } catch (error) {
      console.error('Test error:', error);
      setTestError(error instanceof Error ? error.message : 'Failed to test prompt');
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="prompt-test-panel border rounded-lg bg-white">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Zap size={20} className="text-orange-600" />
              Test Prompt
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Test your prompt with 100+ AI models via OpenRouter
            </p>
          </div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md hover:bg-gray-100"
          >
            <Settings size={16} />
            {showAdvanced ? 'Hide' : 'Show'} Advanced
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* API Key Input */}
        <div>
          <label className="block text-sm font-medium mb-2">
            OpenRouter API Key
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-xs text-blue-600 hover:underline"
            >
              (Get one here)
            </a>
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-or-..."
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Your API key is stored locally and only sent to OpenRouter for testing
          </p>
        </div>

        {/* Model Selection */}
        {apiKey && (
          <div>
            <label className="block text-sm font-medium mb-2">Model</label>
            {isLoadingModels ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 size={16} className="animate-spin" />
                Loading models...
              </div>
            ) : (
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a model...</option>
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} {model.pricing ? `($${model.pricing.prompt}/1M prompt)` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Test Input */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Test Input (Optional)
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter test input to see how the prompt responds..."
            rows={3}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Advanced Settings */}
        {showAdvanced && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Temperature: {config.temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={config.temperature}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      temperature: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Max Tokens</label>
                <input
                  type="number"
                  min="1"
                  max="32000"
                  value={config.maxTokens}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      maxTokens: parseInt(e.target.value) || 1000,
                    }))
                  }
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Top P: {config.topP}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={config.topP}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      topP: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Top K</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.topK}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      topK: parseInt(e.target.value) || 40,
                    }))
                  }
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Frequency Penalty: {config.frequencyPenalty}
                </label>
                <input
                  type="range"
                  min="-2"
                  max="2"
                  step="0.1"
                  value={config.frequencyPenalty}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      frequencyPenalty: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Presence Penalty: {config.presencePenalty}
                </label>
                <input
                  type="range"
                  min="-2"
                  max="2"
                  step="0.1"
                  value={config.presencePenalty}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      presencePenalty: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.stream}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, stream: e.target.checked }))
                  }
                  className="rounded"
                />
                Stream Response
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.jsonMode}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, jsonMode: e.target.checked }))
                  }
                  className="rounded"
                />
                JSON Mode
              </label>
            </div>
          </div>
        )}

        {/* Test Button */}
        <button
          onClick={handleTest}
          disabled={isTesting || !apiKey || !config.model}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isTesting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Play size={18} />
              Test Prompt
            </>
          )}
        </button>

        {/* Error Display */}
        {testError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{testError}</p>
          </div>
        )}

        {/* Result Display */}
        {testResult && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold flex items-center gap-2">
                <TrendingUp size={18} className="text-green-600" />
                Test Result
              </h4>
              <button
                onClick={() => handleCopy(testResult.response)}
                className="flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-gray-100"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    Copy
                  </>
                )}
              </button>
            </div>

            <div className="p-4 bg-gray-50 border rounded-md">
              <pre className="whitespace-pre-wrap text-sm">{testResult.response}</pre>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="p-2 bg-blue-50 rounded">
                <div className="text-xs text-gray-600">Model</div>
                <div className="font-medium">{testResult.model}</div>
              </div>
              <div className="p-2 bg-green-50 rounded">
                <div className="text-xs text-gray-600">Tokens</div>
                <div className="font-medium">
                  {testResult.tokensUsed.total.toLocaleString()}
                </div>
              </div>
              <div className="p-2 bg-purple-50 rounded">
                <div className="text-xs text-gray-600">Duration</div>
                <div className="font-medium">{testResult.duration}ms</div>
              </div>
              {testResult.cost && (
                <div className="p-2 bg-orange-50 rounded">
                  <div className="text-xs text-gray-600">Cost</div>
                  <div className="font-medium">
                    ${testResult.cost.total.toFixed(6)}
                  </div>
                </div>
              )}
            </div>

            {/* Token Breakdown */}
            <div className="p-3 bg-gray-50 rounded text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-gray-600">Prompt:</span>{' '}
                  <span className="font-medium">
                    {testResult.tokensUsed.prompt.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Completion:</span>{' '}
                  <span className="font-medium">
                    {testResult.tokensUsed.completion.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Total:</span>{' '}
                  <span className="font-medium">
                    {testResult.tokensUsed.total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

