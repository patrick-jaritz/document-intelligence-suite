/**
 * Prompt Executor Component
 * Executes prompts with parameter form and displays results
 */

import { useState, useEffect } from 'react';
import { Play, Loader2, Copy, Check } from 'lucide-react';
import { executePrompt, extractPlaceholders, generateFormSchema, replacePlaceholders } from '../../services/promptForgeService';
import type { Prompt, ExecutePromptResponse } from '../../types/promptforge';

interface PromptExecutorProps {
  prompt: Prompt;
}

export function PromptExecutor({ prompt }: PromptExecutorProps) {
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [modelProvider, setModelProvider] = useState<'openai' | 'anthropic' | 'openrouter'>('openrouter');
  const [modelName, setModelName] = useState('gpt-4o');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<ExecutePromptResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const placeholders = extractPlaceholders(prompt.prompt_body);
  const formFields = generateFormSchema(placeholders);

  useEffect(() => {
    // Initialize parameters with empty strings
    const initialParams: Record<string, string> = {};
    placeholders.forEach(placeholder => {
      initialParams[placeholder] = '';
    });
    setParameters(initialParams);
  }, [prompt.prompt_body]);

  const handleExecute = async () => {
    setExecuting(true);
    setError(null);
    setResult(null);

    try {
      // Get API keys from localStorage or prompt user
      // In production, these should be stored securely per user in settings
      let openrouterApiKey = localStorage.getItem('openrouter_api_key') || '';
      let openaiApiKey = localStorage.getItem('openai_api_key') || '';
      let anthropicApiKey = localStorage.getItem('anthropic_api_key') || '';

      // If not stored, prompt user (one-time setup)
      if (!openrouterApiKey && modelProvider === 'openrouter') {
        openrouterApiKey = prompt('Enter your OpenRouter API key:') || '';
        if (openrouterApiKey) localStorage.setItem('openrouter_api_key', openrouterApiKey);
      }
      if (!openaiApiKey && modelProvider === 'openai') {
        openaiApiKey = prompt('Enter your OpenAI API key:') || '';
        if (openaiApiKey) localStorage.setItem('openai_api_key', openaiApiKey);
      }
      if (!anthropicApiKey && modelProvider === 'anthropic') {
        anthropicApiKey = prompt('Enter your Anthropic API key:') || '';
        if (anthropicApiKey) localStorage.setItem('anthropic_api_key', anthropicApiKey);
      }

      if (!openrouterApiKey && !openaiApiKey && !anthropicApiKey) {
        throw new Error('API key is required for execution');
      }

      const response = await executePrompt({
        prompt_id: prompt.id,
        parameters,
        model_provider: modelProvider,
        model_name: modelName,
        temperature,
        max_tokens: maxTokens,
        system_message: prompt.system_message,
        openrouter_api_key: openrouterApiKey || undefined,
        openai_api_key: openaiApiKey || undefined,
        anthropic_api_key: anthropicApiKey || undefined,
      });

      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute prompt');
    } finally {
      setExecuting(false);
    }
  };

  const handleCopy = async () => {
    if (result?.response) {
      await navigator.clipboard.writeText(result.response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Parameter Form */}
      {formFields.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formFields.map(field => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={parameters[field.name] || ''}
                    onChange={(e) => setParameters({ ...parameters, [field.name]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    required={field.required}
                  />
                ) : (
                  <input
                    type={field.type}
                    value={parameters[field.name] || ''}
                    onChange={(e) => setParameters({ ...parameters, [field.name]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required={field.required}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Model Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Model Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
            <select
              value={modelProvider}
              onChange={(e) => setModelProvider(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="openrouter">OpenRouter</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="gpt-4o, claude-3-opus, etc."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Temperature: {temperature}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
            <input
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="1"
              max="32000"
            />
          </div>
        </div>
      </div>

      {/* Execute Button */}
      <div className="flex justify-end">
        <button
          onClick={handleExecute}
          disabled={executing || (formFields.length > 0 && Object.values(parameters).some(v => !v))}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {executing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Execute Prompt
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Response</h3>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <pre className="whitespace-pre-wrap text-sm">{result.response}</pre>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Tokens:</span>
              <span className="ml-2 font-medium">{result.usage.total_tokens}</span>
            </div>
            <div>
              <span className="text-gray-600">Latency:</span>
              <span className="ml-2 font-medium">{result.latency_ms}ms</span>
            </div>
            {result.cost && (
              <div>
                <span className="text-gray-600">Cost:</span>
                <span className="ml-2 font-medium">${result.cost.toFixed(6)}</span>
              </div>
            )}
            <div>
              <span className="text-gray-600">Model:</span>
              <span className="ml-2 font-medium">{result.model}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
