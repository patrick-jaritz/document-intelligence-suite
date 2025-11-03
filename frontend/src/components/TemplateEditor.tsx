import { useState, useEffect } from 'react';
import { FileJson, Plus, Loader2, Copy, Info, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PromptBuilder } from './PromptBuilder';
import { StructuredPrompt } from '../types/prompt';

interface Template {
  id: string;
  name: string;
  description: string | null;
  template_schema: any;
  is_public: boolean;
}

interface TemplateEditorProps {
  onTemplateSelect: (template: any) => void;
  selectedTemplate: any;
}

export function TemplateEditor({ onTemplateSelect, selectedTemplate }: TemplateEditorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [customJson, setCustomJson] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [showPromptBuilder, setShowPromptBuilder] = useState(false);
  const [customPrompt, setCustomPrompt] = useState<StructuredPrompt | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('structure_templates')
        .select('*')
        .eq('is_public', true)
        .order('name');

      let rows = data || [];
      if (error || rows.length === 0) {
        // Fallback local templates
        rows = [
          { 
            id: 'local-exam', 
            name: 'Exam Questions', 
            description: 'Extract exam questions with MCQ options, answers, solutions, difficulty levels, and tags', 
            template_schema: { 
              type: 'array', 
              items: { 
                type: 'object', 
                properties: { 
                  stem: { type: 'string', description: 'The question text or prompt' }, 
                  options: { type: 'array', items: { type: 'string' }, description: 'Multiple choice options (A, B, C, D) - omit for short answer questions' }, 
                  correctAnswer: { type: 'string', description: 'The correct answer (letter for MCQ, full answer for short response)' }, 
                  solution: { type: 'string', description: 'Detailed explanation of the correct answer' }, 
                  difficulty: { type: 'number', description: 'Difficulty level from 1 (easy) to 5 (very hard)' }, 
                  format: { type: 'string', enum: ['mcq', 'short', 'essay', 'true-false'], description: 'Question format type' }, 
                  tags: { type: 'array', items: { type: 'string' }, description: 'Topic tags and keywords for categorization' } 
                }, 
                required: ['stem', 'correctAnswer', 'format'] 
              } 
            }, 
            is_public: true 
          },
          { id: 'local-invoice', name: 'Invoice', description: 'Extract invoice details', template_schema: { type: 'object', properties: { invoice_number: { type: 'string' }, invoice_date: { type: 'string' }, due_date: { type: 'string' }, vendor_name: { type: 'string' }, items: { type: 'array', items: { type: 'object', properties: { description: { type: 'string' }, quantity: { type: 'number' }, unit_price: { type: 'number' }, total: { type: 'number' } } } }, total_amount: { type: 'number' } } }, is_public: true },
          { id: 'local-receipt', name: 'Receipt', description: 'Extract receipt information', template_schema: { type: 'object', properties: { store_name: { type: 'string' }, transaction_date: { type: 'string' }, items: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, quantity: { type: 'number' }, total_price: { type: 'number' } } } }, total: { type: 'number' } } }, is_public: true },
          { id: 'local-summary', name: 'Document Summary', description: 'General summary fields', template_schema: { type: 'object', properties: { title: { type: 'string' }, date: { type: 'string' }, author: { type: 'string' }, summary: { type: 'string' }, key_points: { type: 'array', items: { type: 'string' } } } }, is_public: true },
        ] as any;
      }

      const priorityOrder = ['Exam Questions', 'Invoice', 'Receipt', 'Document Summary'];
      const sorted = rows.sort((a: any, b: any) => {
        const aIndex = priorityOrder.indexOf(a.name);
        const bIndex = priorityOrder.indexOf(b.name);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.name.localeCompare(b.name);
      });

      setTemplates(sorted);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateClick = (template: Template) => {
    onTemplateSelect(template.template_schema);
    setShowCustomEditor(false);
  };

  const handleCustomJsonChange = (value: string) => {
    setCustomJson(value);
    setJsonError('');

    if (value.trim()) {
      try {
        const parsed = JSON.parse(value);
        onTemplateSelect(parsed);
      } catch (error) {
        setJsonError('Invalid JSON format');
      }
    }
  };

  const formatJsonForDisplay = (obj: any): string => {
    return JSON.stringify(obj, null, 2);
  };

  const defaultTemplate = {
    type: 'object',
    properties: {
      title: { type: 'string' },
      date: { type: 'string' },
      summary: { type: 'string' },
      key_points: {
        type: 'array',
        items: { type: 'string' },
      },
    },
  };

  useEffect(() => {
    if (showCustomEditor && !customJson) {
      setCustomJson(formatJsonForDisplay(defaultTemplate));
      onTemplateSelect(defaultTemplate);
    }
  }, [showCustomEditor]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileJson className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Output Structure Template
          </h3>
        </div>

        <button
          onClick={() => setShowCustomEditor(!showCustomEditor)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
        >
          {showCustomEditor ? (
            <>
              <Copy className="w-4 h-4" />
              Use Preset
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Custom JSON
            </>
          )}
        </button>
      </div>

      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-900">
          Templates define how your extracted data will be structured. Choose a pre-built template or create your own custom JSON schema.
        </p>
      </div>

      {!showCustomEditor ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => {
            const isSelected =
              JSON.stringify(selectedTemplate) === JSON.stringify(template.template_schema);

            return (
              <button
                key={template.id}
                onClick={() => handleTemplateClick(template)}
                className={`
                  p-4 rounded-lg border-2 text-left transition-all
                  ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }
                `}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{template.name}</h4>
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  )}
                </div>
                {template.description && (
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                )}
                <div className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded overflow-x-auto">
                  {Object.keys(template.template_schema.properties || {}).join(', ')}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom JSON Schema
            </label>
            <textarea
              value={customJson}
              onChange={(e) => handleCustomJsonChange(e.target.value)}
              className={`
                w-full h-64 px-4 py-3 border rounded-lg font-mono text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${jsonError ? 'border-red-500' : 'border-gray-300'}
              `}
              placeholder="Enter your custom JSON schema..."
            />
            {jsonError && (
              <p className="mt-2 text-sm text-red-600">{jsonError}</p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Tip:</strong> Define your structure using JSON Schema format.
              Include properties with types like string, number, boolean, array, or
              object.
            </p>
          </div>
        </div>
      )}

      {selectedTemplate && !showCustomEditor && !showPromptBuilder && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">Selected Schema:</p>
          <pre className="text-xs text-gray-600 overflow-x-auto">
            {formatJsonForDisplay(selectedTemplate)}
          </pre>
        </div>
      )}

      {/* Prompt Builder Section */}
      <div className="mt-6 border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles size={20} className="text-blue-600" />
              Custom Prompt Builder
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Build a custom prompt to enhance data extraction accuracy
            </p>
          </div>
          <button
            onClick={() => {
              setShowPromptBuilder(!showPromptBuilder);
              setShowCustomEditor(false);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Sparkles size={16} />
            {showPromptBuilder ? 'Hide' : 'Show'} Prompt Builder
          </button>
        </div>

        {showPromptBuilder && (
          <div className="mt-4 border rounded-lg p-4 bg-white">
            <PromptBuilder
              mode="template"
              initialPrompt={customPrompt || undefined}
              onPromptExport={(prompt) => {
                setCustomPrompt(prompt);
                console.log('Prompt exported:', prompt);
                // TODO: Save prompt and link to template
              }}
            />
          </div>
        )}

        {customPrompt && !showPromptBuilder && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>✓ Custom prompt configured</strong> - Your extraction will use this optimized prompt.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
