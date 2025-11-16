/**
 * Execution Panel Component
 * Handles prompt execution with parameter input and result display
 */

import { useState, useEffect } from 'react';
import { Play, Loader2, ThumbsUp, ThumbsDown, Star, Copy, Download } from 'lucide-react';
import { Execution, ExecutionRequest, UserFeedback } from '../../types/promptforge';
import { executePrompt, updateExecutionFeedback } from '../../services/executionService';
import { PromptWithVersion } from '../../types/promptforge';

interface ExecutionPanelProps {
  prompt: PromptWithVersion;
  onExecutionComplete?: (execution: Execution) => void;
}

export function ExecutionPanel({ prompt, onExecutionComplete }: ExecutionPanelProps) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [executing, setExecuting] = useState(false);
  const [execution, setExecution] = useState<Execution | null>(null);
  const [feedback, setFeedback] = useState<UserFeedback | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [model, setModel] = useState('gpt-4o-mini');
  const [temperature, setTemperature] = useState(0.7);

  // Extract placeholders from prompt body
  const placeholders = extractPlaceholders(
    prompt.current_version?.prompt_body || prompt.prompt_body
  );

  useEffect(() => {
    // Initialize inputs with empty values
    const initialInputs: Record<string, string> = {};
    placeholders.forEach((placeholder) => {
      initialInputs[placeholder] = '';
    });
    setInputs(initialInputs);
  }, [prompt.id]);

  const extractPlaceholders = (text: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = Array.from(text.matchAll(regex));
    return Array.from(new Set(matches.map((m) => m[1])));
  };

  const handleExecute = async () => {
    // Validate inputs
    const missingInputs = placeholders.filter((p) => !inputs[p] || inputs[p].trim() === '');
    if (missingInputs.length > 0) {
      alert(`Please fill in all required fields: ${missingInputs.join(', ')}`);
      return;
    }

    setExecuting(true);
    setExecution(null);
    setFeedback(null);
    setRating(null);

    try {
      const request: ExecutionRequest = {
        prompt_id: prompt.id,
        prompt_version_id: prompt.current_version_id || undefined,
        inputs,
        model,
        temperature,
      };

      const result = await executePrompt(request);
      if (result) {
        setExecution(result);
        if (onExecutionComplete) {
          onExecutionComplete(result);
        }
      } else {
        alert('Failed to execute prompt. Please try again.');
      }
    } catch (error) {
      console.error('Execution error:', error);
      alert('An error occurred during execution.');
    } finally {
      setExecuting(false);
    }
  };

  const handleFeedback = async (newFeedback: UserFeedback, newRating?: number) => {
    if (!execution) return;

    setFeedback(newFeedback);
    if (newRating !== undefined) {
      setRating(newRating);
    }

    await updateExecutionFeedback(execution.id, newFeedback, newRating);
  };

  const copyResponse = () => {
    if (execution?.response) {
      navigator.clipboard.writeText(execution.response);
    }
  };

  const downloadResponse = () => {
    if (execution?.response) {
      const blob = new Blob([execution.response], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompt-response-${execution.id}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <Play className="w-6 h-6 text-indigo-600" />
        Execute Prompt
      </h2>

      {/* Model Settings */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
              <option value="mistral-large">Mistral Large</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperature: {temperature}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Parameter Inputs */}
      {placeholders.length > 0 ? (
        <div className="mb-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Fill in the parameters:
          </h3>
          {placeholders.map((placeholder) => (
            <div key={placeholder}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {placeholder.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </label>
              <textarea
                value={inputs[placeholder] || ''}
                onChange={(e) =>
                  setInputs({ ...inputs, [placeholder]: e.target.value })
                }
                placeholder={`Enter ${placeholder}...`}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            This prompt has no parameters. Click "Execute" to run it directly.
          </p>
        </div>
      )}

      {/* Execute Button */}
      <button
        onClick={handleExecute}
        disabled={executing || (placeholders.length > 0 && Object.values(inputs).some((v) => !v.trim()))}
        className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-6"
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

      {/* Execution Result */}
      {execution && (
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Response</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={copyResponse}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Copy response"
              >
                <Copy className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={downloadResponse}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Download response"
              >
                <Download className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
              {execution.response}
            </pre>
          </div>

          {/* Execution Metadata */}
          {execution.latency_ms && (
            <div className="text-xs text-gray-500 mb-4">
              Executed in {execution.latency_ms}ms
              {execution.tokens_in && execution.tokens_out && (
                <span className="ml-4">
                  Tokens: {execution.tokens_in} in / {execution.tokens_out} out
                </span>
              )}
            </div>
          )}

          {/* Feedback Controls */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Was this helpful?</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleFeedback('success')}
                  className={`p-2 rounded-lg transition-colors ${
                    feedback === 'success'
                      ? 'bg-green-100 text-green-700'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <ThumbsUp className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleFeedback('fail')}
                  className={`p-2 rounded-lg transition-colors ${
                    feedback === 'fail'
                      ? 'bg-red-100 text-red-700'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <ThumbsDown className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => {
                      setRating(star);
                      handleFeedback(feedback || 'neutral', star);
                    }}
                    className={`p-1 ${
                      rating && star <= rating
                        ? 'text-yellow-500'
                        : 'text-gray-300 hover:text-yellow-400'
                    }`}
                  >
                    <Star className="w-5 h-5 fill-current" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
