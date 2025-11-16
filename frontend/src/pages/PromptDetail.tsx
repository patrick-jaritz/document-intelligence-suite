/**
 * Prompt Detail Page
 * Shows prompt editor, metadata, versions, and execution interface
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Copy, History, Play, Loader2 } from 'lucide-react';
import { getPrompt, updatePrompt, deletePrompt, getVersions, createVersion } from '../services/promptForgeService';
import { PromptBuilder } from '../components/PromptBuilder/PromptBuilder';
import { PromptExecutor } from '../components/prompts/PromptExecutor';
import { ExecutionHistory } from '../components/prompts/ExecutionHistory';
import { VersionHistory } from '../components/prompts/VersionHistory';
import type { Prompt, PromptVersion } from '../types/promptforge';

export function PromptDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'execute' | 'history' | 'versions'>('edit');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (id && id !== 'new') {
      loadPrompt();
      loadVersions();
    } else {
      setLoading(false);
    }
  }, [id]);

  const loadPrompt = async () => {
    if (!id || id === 'new') return;
    try {
      setLoading(true);
      const data = await getPrompt(id);
      setPrompt(data);
    } catch (error) {
      console.error('Error loading prompt:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async () => {
    if (!id || id === 'new') return;
    try {
      const data = await getVersions(id);
      setVersions(data);
    } catch (error) {
      console.error('Error loading versions:', error);
    }
  };

  const handleSave = async () => {
    if (!prompt || !id || id === 'new') return;
    
    setSaving(true);
    try {
      const updated = await updatePrompt(id, {
        title: prompt.title,
        description: prompt.description,
        prompt_body: prompt.prompt_body,
        system_message: prompt.system_message,
        category: prompt.category,
        tags: prompt.tags,
        visibility: prompt.visibility,
        role: prompt.role,
        task: prompt.task,
        context: prompt.context,
        constraints: prompt.constraints,
        examples: prompt.examples,
      });
      setPrompt(updated);
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert('Failed to save prompt');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || id === 'new') return;
    
    try {
      await deletePrompt(id);
      navigate('/prompts');
    } catch (error) {
      console.error('Error deleting prompt:', error);
      alert('Failed to delete prompt');
    }
  };

  const handleCreateVersion = async (changelog?: string) => {
    if (!prompt || !id || id === 'new') return;
    
    try {
      await createVersion(id, {
        prompt_body: prompt.prompt_body,
        system_message: prompt.system_message,
        role: prompt.role,
        task: prompt.task,
        context: prompt.context,
        constraints: prompt.constraints,
        examples: prompt.examples,
        changelog,
      });
      await loadVersions();
      await loadPrompt();
    } catch (error) {
      console.error('Error creating version:', error);
      alert('Failed to create version');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (id === 'new') {
    // New prompt creation - simplified for now
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/prompts')}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Library
          </button>
          <h1 className="text-3xl font-bold mb-6">Create New Prompt</h1>
          <PromptBuilder
            onPromptExport={async (structuredPrompt) => {
              // Convert structured prompt to CreatePromptRequest format
              const promptBody = [
                structuredPrompt.role && `Role: ${structuredPrompt.role}`,
                structuredPrompt.task && `Task: ${structuredPrompt.task}`,
                structuredPrompt.context && `Context: ${structuredPrompt.context}`,
                structuredPrompt.constraints?.length && `Constraints:\n${structuredPrompt.constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}`,
                structuredPrompt.examples?.length && `Examples:\n${structuredPrompt.examples.map((e, i) => `Example ${i + 1}:\nInput: ${e.input}\nOutput: ${e.output}`).join('\n\n')}`,
              ].filter(Boolean).join('\n\n');

              // This would need to be implemented properly
              console.log('Would create prompt:', promptBody);
            }}
          />
        </div>
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg mb-4">Prompt not found</p>
          <button
            onClick={() => navigate('/prompts')}
            className="text-blue-600 hover:text-blue-700"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/prompts')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{prompt.title}</h1>
                {prompt.description && (
                  <p className="text-sm text-gray-600 mt-1">{prompt.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-4 border-b border-gray-200">
            {(['edit', 'execute', 'history', 'versions'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'edit' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <PromptBuilder
              initialPrompt={{
                title: prompt.title || '',
                role: prompt.role || '',
                task: prompt.task || '',
                context: prompt.context || '',
                constraints: prompt.constraints || [],
                examples: prompt.examples || [],
              }}
              onPromptExport={(structuredPrompt) => {
                setPrompt({
                  ...prompt,
                  role: structuredPrompt.role,
                  task: structuredPrompt.task,
                  context: structuredPrompt.context,
                  constraints: structuredPrompt.constraints,
                  examples: structuredPrompt.examples,
                });
              }}
            />
          </div>
        )}

        {activeTab === 'execute' && prompt && (
          <PromptExecutor prompt={prompt} />
        )}

        {activeTab === 'history' && prompt && (
          <ExecutionHistory promptId={prompt.id} />
        )}

        {activeTab === 'versions' && (
          <VersionHistory
            versions={versions}
            currentVersionId={prompt.current_version_id}
            onCreateVersion={handleCreateVersion}
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Prompt?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{prompt.title}"? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
