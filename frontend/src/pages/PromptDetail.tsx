/**
 * Prompt Detail Page
 * Shows prompt editor, metadata, versions, and execution interface
 */

import { useState, useEffect } from 'react';
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
  
  // New prompt state (only used when id === 'new')
  const [newPrompt, setNewPrompt] = useState({
    title: '',
    description: '',
    prompt_body: '',
    category: '',
    tags: [] as string[],
    visibility: 'private' as const,
  });
  const [creating, setCreating] = useState(false);

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

  const handleCreate = async () => {
    if (!newPrompt.title || !newPrompt.prompt_body) {
      alert('Title and prompt body are required');
      return;
    }

    setCreating(true);
    try {
      const { createPrompt } = await import('../services/promptForgeService');
      const created = await createPrompt(newPrompt);
      navigate(`/prompts/${created.id}`);
    } catch (error) {
      console.error('Error creating prompt:', error);
      alert('Failed to create prompt');
    } finally {
      setCreating(false);
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
          
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={newPrompt.title}
                onChange={(e) => setNewPrompt({ ...newPrompt, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="My Awesome Prompt"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newPrompt.description}
                onChange={(e) => setNewPrompt({ ...newPrompt, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="What does this prompt do?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prompt Body * (use {'{{placeholder}}'} for variables)
              </label>
              <textarea
                value={newPrompt.prompt_body}
                onChange={(e) => setNewPrompt({ ...newPrompt, prompt_body: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={10}
                placeholder="Write a blog post about {{topic}} in a {{tone}} tone..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={newPrompt.category}
                  onChange={(e) => setNewPrompt({ ...newPrompt, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Writing, Coding, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                <select
                  value={newPrompt.visibility}
                  onChange={(e) => setNewPrompt({ ...newPrompt, visibility: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="private">Private</option>
                  <option value="team">Team</option>
                  <option value="public">Public</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => navigate('/prompts')}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newPrompt.title || !newPrompt.prompt_body}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Create Prompt
              </button>
            </div>
          </div>
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
            {/* Metadata Editor */}
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={prompt.title}
                  onChange={(e) => setPrompt({ ...prompt, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={prompt.description || ''}
                  onChange={(e) => setPrompt({ ...prompt, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={prompt.category || ''}
                    onChange={(e) => setPrompt({ ...prompt, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Writing, Coding, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                  <select
                    value={prompt.visibility}
                    onChange={(e) => setPrompt({ ...prompt, visibility: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="private">Private</option>
                    <option value="team">Team</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Prompt Body Editor */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prompt Body (use {'{{placeholder}}'} for variables)
              </label>
              <textarea
                value={prompt.prompt_body}
                onChange={(e) => setPrompt({ ...prompt, prompt_body: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={10}
                placeholder="Write your prompt here. Use {{variable_name}} for placeholders."
              />
            </div>

            {/* Structured Prompt Builder (Optional) */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold mb-4">Structured Prompt Builder (Optional)</h3>
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
