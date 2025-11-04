/**
 * Prompt Form Component
 * Handles input for all structured prompt fields
 */

import { useState } from 'react';
import { Plus, X, ArrowUp, ArrowDown } from 'lucide-react';
import { StructuredPrompt, PromptExample } from '../../types/prompt';
import { PromptBuilderTheme } from '../../utils/promptBuilderThemes';
import { PROMPT_BUILDER_THEMES } from '../../utils/promptBuilderThemes';

interface PromptFormProps {
  prompt: StructuredPrompt;
  onChange: (prompt: StructuredPrompt) => void;
  theme?: PromptBuilderTheme;
}

export function PromptForm({ prompt, onChange, theme = 'default' }: PromptFormProps) {
  const themeConfig = PROMPT_BUILDER_THEMES[theme];
  const updateField = (field: keyof StructuredPrompt, value: any) => {
    onChange({ ...prompt, [field]: value });
  };

  const addConstraint = () => {
    updateField('constraints', [...(prompt.constraints || []), '']);
  };

  const removeConstraint = (index: number) => {
    const newConstraints = [...(prompt.constraints || [])];
    newConstraints.splice(index, 1);
    updateField('constraints', newConstraints);
  };

  const updateConstraint = (index: number, value: string) => {
    const newConstraints = [...(prompt.constraints || [])];
    newConstraints[index] = value;
    updateField('constraints', newConstraints);
  };

  const moveConstraint = (index: number, direction: 'up' | 'down') => {
    const newConstraints = [...(prompt.constraints || [])];
    if (direction === 'up' && index > 0) {
      [newConstraints[index - 1], newConstraints[index]] = [
        newConstraints[index],
        newConstraints[index - 1],
      ];
    } else if (direction === 'down' && index < newConstraints.length - 1) {
      [newConstraints[index], newConstraints[index + 1]] = [
        newConstraints[index + 1],
        newConstraints[index],
      ];
    }
    updateField('constraints', newConstraints);
  };

  const addExample = () => {
    updateField('examples', [
      ...(prompt.examples || []),
      { input: '', output: '' },
    ]);
  };

  const removeExample = (index: number) => {
    const newExamples = [...(prompt.examples || [])];
    newExamples.splice(index, 1);
    updateField('examples', newExamples);
  };

  const updateExample = (
    index: number,
    field: keyof PromptExample,
    value: string
  ) => {
    const newExamples = [...(prompt.examples || [])];
    newExamples[index] = { ...newExamples[index], [field]: value };
    updateField('examples', newExamples);
  };

  return (
    <div className="prompt-form space-y-6">
      {/* Title */}
      <div>
        <label className={`block text-sm font-medium mb-2 ${themeConfig.colors.text} transition-colors`}>Title</label>
        <input
          type="text"
          value={prompt.title || ''}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="Enter prompt title..."
          className={`w-full px-3 py-2 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 ${themeConfig.colors.inputBg} ${themeConfig.colors.inputBorder} border ${themeConfig.colors.text} placeholder:${themeConfig.colors.textMuted} focus:ring-blue-500 hover:border-blue-400`}
        />
      </div>

      {/* Role */}
      <div>
        <label className={`block text-sm font-medium mb-2 ${themeConfig.colors.text} transition-colors`}>Role</label>
        <textarea
          value={prompt.role || ''}
          onChange={(e) => updateField('role', e.target.value)}
          placeholder="Define the AI's role (e.g., 'Expert data extraction specialist')..."
          rows={2}
          className={`w-full px-3 py-2 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 ${themeConfig.colors.inputBg} ${themeConfig.colors.inputBorder} border ${themeConfig.colors.text} placeholder:${themeConfig.colors.textMuted} focus:ring-blue-500 hover:border-blue-400 resize-none`}
        />
      </div>

      {/* Task */}
      <div>
        <label className={`block text-sm font-medium mb-2 ${themeConfig.colors.text} transition-colors`}>Task</label>
        <textarea
          value={prompt.task || ''}
          onChange={(e) => updateField('task', e.target.value)}
          placeholder="Describe the main task to be performed..."
          rows={3}
          className={`w-full px-3 py-2 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 ${themeConfig.colors.inputBg} ${themeConfig.colors.inputBorder} border ${themeConfig.colors.text} placeholder:${themeConfig.colors.textMuted} focus:ring-blue-500 hover:border-blue-400 resize-none`}
        />
      </div>

      {/* Context */}
      <div>
        <label className={`block text-sm font-medium mb-2 ${themeConfig.colors.text} transition-colors`}>Context</label>
        <textarea
          value={prompt.context || ''}
          onChange={(e) => updateField('context', e.target.value)}
          placeholder="Add relevant context or background information..."
          rows={3}
          className={`w-full px-3 py-2 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 ${themeConfig.colors.inputBg} ${themeConfig.colors.inputBorder} border ${themeConfig.colors.text} placeholder:${themeConfig.colors.textMuted} focus:ring-blue-500 hover:border-blue-400 resize-none`}
        />
      </div>

      {/* Constraints */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={`block text-sm font-medium ${themeConfig.colors.text} transition-colors`}>Constraints</label>
          <button
            onClick={addConstraint}
            className={`text-sm ${themeConfig.colors.primary} ${themeConfig.colors.primaryHover} flex items-center gap-1 transition-all duration-200 hover:scale-105 active:scale-95`}
          >
            <Plus size={16} />
            Add Constraint
          </button>
        </div>
        <div className="space-y-2">
          {(prompt.constraints || []).map((constraint, index) => (
            <div key={index} className={`flex items-start gap-2 p-2 rounded-md transition-all duration-200 hover:shadow-sm animate-in fade-in slide-in-from-left-2`}>
              <input
                type="text"
                value={constraint}
                onChange={(e) => updateConstraint(index, e.target.value)}
                placeholder={`Constraint ${index + 1}...`}
                className={`flex-1 px-3 py-2 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 ${themeConfig.colors.inputBg} ${themeConfig.colors.inputBorder} border ${themeConfig.colors.text} placeholder:${themeConfig.colors.textMuted} focus:ring-blue-500 hover:border-blue-400`}
              />
              <div className="flex gap-1">
                <button
                  onClick={() => moveConstraint(index, 'up')}
                  disabled={index === 0}
                  className={`p-2 rounded-md transition-all duration-200 ${themeConfig.colors.textMuted} hover:${themeConfig.colors.text} hover:bg-opacity-10 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed`}
                  title="Move up"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  onClick={() => moveConstraint(index, 'down')}
                  disabled={index === (prompt.constraints?.length || 0) - 1}
                  className={`p-2 rounded-md transition-all duration-200 ${themeConfig.colors.textMuted} hover:${themeConfig.colors.text} hover:bg-opacity-10 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed`}
                  title="Move down"
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  onClick={() => removeConstraint(index)}
                  className={`p-2 rounded-md transition-all duration-200 text-red-500 hover:text-red-700 hover:bg-opacity-10 hover:bg-red-500`}
                  title="Remove"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
          {(!prompt.constraints || prompt.constraints.length === 0) && (
            <p className={`text-sm ${themeConfig.colors.textMuted} italic transition-colors`}>
              No constraints added. Click "Add Constraint" to create rules.
            </p>
          )}
        </div>
      </div>

      {/* Examples */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={`block text-sm font-medium ${themeConfig.colors.text} transition-colors`}>Examples</label>
          <button
            onClick={addExample}
            className={`text-sm ${themeConfig.colors.primary} ${themeConfig.colors.primaryHover} flex items-center gap-1 transition-all duration-200 hover:scale-105 active:scale-95`}
          >
            <Plus size={16} />
            Add Example
          </button>
        </div>
        <div className="space-y-4">
          {(prompt.examples || []).map((example, index) => (
            <div
              key={index}
              className={`border ${themeConfig.colors.border} rounded-lg p-4 space-y-3 ${themeConfig.colors.previewBg} transition-all duration-200 hover:shadow-md animate-in fade-in slide-in-from-left-2`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${themeConfig.colors.text} transition-colors`}>
                  Example {index + 1}
                </span>
                <button
                  onClick={() => removeExample(index)}
                  className={`p-1 rounded-md transition-all duration-200 text-red-500 hover:text-red-700 hover:bg-opacity-10 hover:bg-red-500`}
                  title="Remove example"
                >
                  <X size={16} />
                </button>
              </div>
              <div>
                <label className={`block text-xs ${themeConfig.colors.textMuted} mb-1 transition-colors`}>Input</label>
                <textarea
                  value={example.input}
                  onChange={(e) =>
                    updateExample(index, 'input', e.target.value)
                  }
                  placeholder="Example input..."
                  rows={2}
                  className={`w-full px-3 py-2 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 ${themeConfig.colors.inputBg} ${themeConfig.colors.inputBorder} border ${themeConfig.colors.text} placeholder:${themeConfig.colors.textMuted} focus:ring-blue-500 hover:border-blue-400 resize-none`}
                />
              </div>
              <div>
                <label className={`block text-xs ${themeConfig.colors.textMuted} mb-1 transition-colors`}>Output</label>
                <textarea
                  value={example.output}
                  onChange={(e) =>
                    updateExample(index, 'output', e.target.value)
                  }
                  placeholder="Expected output..."
                  rows={2}
                  className={`w-full px-3 py-2 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 ${themeConfig.colors.inputBg} ${themeConfig.colors.inputBorder} border ${themeConfig.colors.text} placeholder:${themeConfig.colors.textMuted} focus:ring-blue-500 hover:border-blue-400 resize-none`}
                />
              </div>
            </div>
          ))}
          {(!prompt.examples || prompt.examples.length === 0) && (
            <p className={`text-sm ${themeConfig.colors.textMuted} italic transition-colors`}>
              No examples added. Click "Add Example" for few-shot learning.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

