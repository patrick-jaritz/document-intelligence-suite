/**
 * Pack Editor Page
 * Create and edit prompt packs
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, X, GripVertical, Package } from 'lucide-react';
import { PackWithPrompts, PackFormData } from '../types/promptforge';
import { getPack, createPack, updatePack } from '../services/packService';
import { getPrompts } from '../services/promptForgeService';
import { PromptWithVersion } from '../types/promptforge';

export function PackEditor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const packId = searchParams.get('id');
  const isNew = searchParams.get('new') === 'true';

  const [pack, setPack] = useState<PackWithPrompts | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availablePrompts, setAvailablePrompts] = useState<PromptWithVersion[]>([]);
  const [formData, setFormData] = useState<PackFormData>({
    title: '',
    description: '',
    tags: [],
    category: '',
    visibility: 'private',
    prompt_ids: [],
  });

  useEffect(() => {
    if (isNew) {
      setLoading(false);
      loadAvailablePrompts();
    } else if (packId) {
      loadPack();
    } else {
      navigate('/packs');
    }
  }, [packId, isNew]);

  const loadPack = async () => {
    if (!packId) return;
    setLoading(true);
    try {
      const data = await getPack(packId);
      if (data) {
        setPack(data);
        setFormData({
          title: data.title,
          description: data.description || '',
          tags: data.tags || [],
          category: data.category || '',
          visibility: data.visibility,
          prompt_ids: data.prompts.map((p) => p.id),
        });
      } else {
        navigate('/packs');
      }
    } catch (error) {
      console.error('Failed to load pack:', error);
      navigate('/packs');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailablePrompts = async () => {
    const result = await getPrompts({ archived: false }, { field: 'updated_at', direction: 'desc' });
    setAvailablePrompts(result.data);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew || !packId) {
        const newPack = await createPack(formData);
        if (newPack) {
          navigate(`/packs/edit?id=${newPack.id}`);
        }
      } else {
        await updatePack(packId, formData);
        await loadPack();
      }
    } catch (error) {
      console.error('Failed to save pack:', error);
      alert('Failed to save pack. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addPrompt = (promptId: string) => {
    if (!formData.prompt_ids.includes(promptId)) {
      setFormData({
        ...formData,
        prompt_ids: [...formData.prompt_ids, promptId],
      });
    }
  };

  const removePrompt = (promptId: string) => {
    setFormData({
      ...formData,
      prompt_ids: formData.prompt_ids.filter((id) => id !== promptId),
    });
  };

  const movePrompt = (fromIndex: number, toIndex: number) => {
    const newIds = [...formData.prompt_ids];
    const [removed] = newIds.splice(fromIndex, 1);
    newIds.splice(toIndex, 0, removed);
    setFormData({ ...formData, prompt_ids: newIds });
  };

  const selectedPrompts = availablePrompts.filter((p) =>
    formData.prompt_ids.includes(p.id)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading pack...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/packs')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Packs
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Package className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {isNew ? 'Create New Pack' : pack?.title || 'Edit Pack'}
                </h1>
                <p className="text-gray-600 mt-1">
                  {isNew ? 'Organize prompts into a reusable collection' : 'Edit your prompt pack'}
                </p>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !formData.title}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : isNew ? 'Create' : 'Save'}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Pack Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Metadata */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Pack Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter pack title..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe this pack..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., Writing, Coding"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Visibility
                    </label>
                    <select
                      value={formData.visibility}
                      onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="private">Private</option>
                      <option value="team">Team</option>
                      <option value="public">Public</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.tags.join(', ')}
                    onChange={(e) => {
                      const tags = e.target.value.split(',').map((t) => t.trim()).filter(Boolean);
                      setFormData({ ...formData, tags });
                    }}
                    placeholder="tag1, tag2, tag3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Selected Prompts */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Prompts in Pack ({formData.prompt_ids.length})
              </h2>
              {formData.prompt_ids.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No prompts added yet. Add prompts from the right panel.
                </p>
              ) : (
                <div className="space-y-2">
                  {formData.prompt_ids.map((promptId, index) => {
                    const prompt = selectedPrompts.find((p) => p.id === promptId);
                    return (
                      <div
                        key={promptId}
                        className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
                      >
                        <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                        <span className="text-sm font-semibold text-gray-500 w-8">
                          {index + 1}
                        </span>
                        <span className="flex-1 font-medium text-gray-900">
                          {prompt?.title || 'Unknown Prompt'}
                        </span>
                        <button
                          onClick={() => removePrompt(promptId)}
                          className="p-1 hover:bg-red-50 text-red-600 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Available Prompts */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Available Prompts
              </h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availablePrompts
                  .filter((p) => !formData.prompt_ids.includes(p.id))
                  .map((prompt) => (
                    <button
                      key={prompt.id}
                      onClick={() => addPrompt(prompt.id)}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
                    >
                      <div className="font-medium text-sm text-gray-900">{prompt.title}</div>
                      {prompt.description && (
                        <div className="text-xs text-gray-600 mt-1 line-clamp-1">
                          {prompt.description}
                        </div>
                      )}
                    </button>
                  ))}
                {availablePrompts.filter((p) => !formData.prompt_ids.includes(p.id)).length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    All prompts added
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
