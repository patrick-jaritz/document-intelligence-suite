/**
 * Prompt Form Component
 * Handles input for all structured prompt fields
 */

import { useState } from 'react';
import { Plus, X, ArrowUp, ArrowDown } from 'lucide-react';
import { StructuredPrompt, PromptExample } from '../../types/prompt';

interface PromptFormProps {
  prompt: StructuredPrompt;
  onChange: (prompt: StructuredPrompt) => void;
}

export function PromptForm({ prompt, onChange }: PromptFormProps) {
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
        <label className="block text-sm font-medium mb-2">Title</label>
        <input
          type="text"
          value={prompt.title || ''}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="Enter prompt title..."
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Role */}
      <div>
        <label className="block text-sm font-medium mb-2">Role</label>
        <textarea
          value={prompt.role || ''}
          onChange={(e) => updateField('role', e.target.value)}
          placeholder="Define the AI's role (e.g., 'Expert data extraction specialist')..."
          rows={2}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Task */}
      <div>
        <label className="block text-sm font-medium mb-2">Task</label>
        <textarea
          value={prompt.task || ''}
          onChange={(e) => updateField('task', e.target.value)}
          placeholder="Describe the main task to be performed..."
          rows={3}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Context */}
      <div>
        <label className="block text-sm font-medium mb-2">Context</label>
        <textarea
          value={prompt.context || ''}
          onChange={(e) => updateField('context', e.target.value)}
          placeholder="Add relevant context or background information..."
          rows={3}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Constraints */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium">Constraints</label>
          <button
            onClick={addConstraint}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <Plus size={16} />
            Add Constraint
          </button>
        </div>
        <div className="space-y-2">
          {(prompt.constraints || []).map((constraint, index) => (
            <div key={index} className="flex items-start gap-2">
              <input
                type="text"
                value={constraint}
                onChange={(e) => updateConstraint(index, e.target.value)}
                placeholder={`Constraint ${index + 1}...`}
                className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-1">
                <button
                  onClick={() => moveConstraint(index, 'up')}
                  disabled={index === 0}
                  className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                  title="Move up"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  onClick={() => moveConstraint(index, 'down')}
                  disabled={index === (prompt.constraints?.length || 0) - 1}
                  className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                  title="Move down"
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  onClick={() => removeConstraint(index)}
                  className="p-2 text-red-500 hover:text-red-700"
                  title="Remove"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
          {(!prompt.constraints || prompt.constraints.length === 0) && (
            <p className="text-sm text-gray-500 italic">
              No constraints added. Click "Add Constraint" to create rules.
            </p>
          )}
        </div>
      </div>

      {/* Examples */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium">Examples</label>
          <button
            onClick={addExample}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <Plus size={16} />
            Add Example
          </button>
        </div>
        <div className="space-y-4">
          {(prompt.examples || []).map((example, index) => (
            <div
              key={index}
              className="border rounded-md p-4 space-y-3 bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Example {index + 1}
                </span>
                <button
                  onClick={() => removeExample(index)}
                  className="p-1 text-red-500 hover:text-red-700"
                  title="Remove example"
                >
                  <X size={16} />
                </button>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Input</label>
                <textarea
                  value={example.input}
                  onChange={(e) =>
                    updateExample(index, 'input', e.target.value)
                  }
                  placeholder="Example input..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Output</label>
                <textarea
                  value={example.output}
                  onChange={(e) =>
                    updateExample(index, 'output', e.target.value)
                  }
                  placeholder="Expected output..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ))}
          {(!prompt.examples || prompt.examples.length === 0) && (
            <p className="text-sm text-gray-500 italic">
              No examples added. Click "Add Example" for few-shot learning.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

