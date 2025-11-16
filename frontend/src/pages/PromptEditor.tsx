/**
 * Prompt Editor Page
 * Full-featured prompt editing with versioning
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Save, ArrowLeft, History, Play, Sparkles, Tag as TagIcon, Eye, EyeOff, MessageSquare, Share2 } from 'lucide-react';
import { PromptWithVersion, PromptFormData, VersionFormData } from '../types/promptforge';
import { getPrompt, createPrompt, updatePrompt } from '../services/promptForgeService';
import { createPromptVersion } from '../services/promptVersionService';
import { VersionHistory } from '../components/PromptBuilder/VersionHistory';
import { PromptBuilder } from '../components/PromptBuilder/PromptBuilder';
import { ExecutionPanel } from '../components/PromptExecution/ExecutionPanel';
import { ExecutionHistory } from '../components/PromptExecution/ExecutionHistory';
import { AIChatPanel } from '../components/PromptBuilder/AIChatPanel';
import { AppSharePanel } from '../components/PromptBuilder/AppSharePanel';
import { StructuredPrompt } from '../types/prompt';
import { structuredPromptToFormData } from '../services/promptForgeService';

export function PromptEditor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const promptId = searchParams.get('id');
  const isNew = searchParams.get('new') === 'true';

  const [prompt, setPrompt] = useState<PromptWithVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showExecution, setShowExecution] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showAppShare, setShowAppShare] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<StructuredPrompt | null>(null);
  const [formData, setFormData] = useState<PromptFormData>({
    title: '',
    description: '',
    prompt_body: '',
    tags: [],
    category: '',
    visibility: 'private',
  });

  useEffect(() => {
    if (isNew) {
      setLoading(false);
      setFormData({
        title: '',
        description: '',
        prompt_body: '',
        tags: [],
        category: '',
        visibility: 'private',
      });
    } else if (promptId) {
      loadPrompt();
    } else {
      navigate('/prompts');
    }
  }, [promptId, isNew]);

  const loadPrompt = async () => {
    if (!promptId) return;
    setLoading(true);
    try {
      const data = await getPrompt(promptId);
      if (data) {
        setPrompt(data);
        const promptBody = data.current_version?.prompt_body || data.prompt_body;
        setFormData({
          title: data.title,
          description: data.description || '',
          prompt_body: promptBody,
          tags: data.tags || [],
          category: data.category || '',
          visibility: data.visibility,
        });
        
        // Try to parse prompt body into StructuredPrompt format
        // This is a simple parser - could be enhanced
        try {
          const structured = parsePromptBodyToStructured(promptBody);
          setCurrentPrompt(structured);
        } catch {
          // If parsing fails, use default
          setCurrentPrompt(null);
        }
      } else {
        navigate('/prompts');
      }
    } catch (error) {
      console.error('Failed to load prompt:', error);
      navigate('/prompts');
    } finally {
      setLoading(false);
    }
  };

  const parsePromptBodyToStructured = (body: string): StructuredPrompt => {
    // Simple parser - extracts sections from formatted prompt body
    const structured: StructuredPrompt = {
      title: prompt?.title || formData.title || '',
      role: '',
      task: '',
      context: '',
      constraints: [],
      examples: [],
    };

    const roleMatch = body.match(/Role:\s*(.+?)(?:\n\n|$)/i);
    if (roleMatch) structured.role = roleMatch[1].trim();

    const taskMatch = body.match(/Task:\s*(.+?)(?:\n\n|$)/i);
    if (taskMatch) structured.task = taskMatch[1].trim();

    const contextMatch = body.match(/Context:\s*(.+?)(?:\n\n|Constraints:|Examples:|$)/is);
    if (contextMatch) structured.context = contextMatch[1].trim();

    const constraintsMatch = body.match(/Constraints:\s*(.+?)(?:\n\n|Examples:|$)/is);
    if (constraintsMatch) {
      structured.constraints = constraintsMatch[1]
        .split('\n')
        .map((c) => c.trim())
        .filter(Boolean);
    }

    const examplesMatch = body.match(/Examples:\s*(.+?)$/is);
    if (examplesMatch) {
      structured.examples = examplesMatch[1]
        .split(/\n\n+/)
        .map((e) => e.trim())
        .filter(Boolean);
    }

    return structured;
  };

  const handleSave = async (saveAsNewVersion: boolean = false) => {
    setSaving(true);
    try {
      if (isNew || !promptId) {
        // Create new prompt
        const newPrompt = await createPrompt(formData);
        if (newPrompt) {
          navigate(`/prompts/edit?id=${newPrompt.id}`);
        }
      } else {
        // Update existing prompt
        if (saveAsNewVersion) {
          // Save as new version
          const versionData: VersionFormData = {
            prompt_body: formData.prompt_body,
            changelog: `Updated: ${formData.title}`,
          };
          const version = await createPromptVersion(promptId, versionData);
          if (version) {
            await updatePrompt(promptId, {
              title: formData.title,
              description: formData.description,
              tags: formData.tags,
              category: formData.category,
              visibility: formData.visibility,
            });
            await loadPrompt();
          }
        } else {
          // Update current version
          await updatePrompt(promptId, formData);
          if (prompt?.current_version_id) {
            const versionData: VersionFormData = {
              prompt_body: formData.prompt_body,
              changelog: 'Updated prompt body',
            };
            await createPromptVersion(promptId, versionData);
            await loadPrompt();
          }
        }
      }
    } catch (error) {
      console.error('Failed to save prompt:', error);
      alert('Failed to save prompt. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePromptChange = (updatedPrompt: StructuredPrompt) => {
    setCurrentPrompt(updatedPrompt);
    // Convert StructuredPrompt to form data
    const parts: string[] = [];
    if (updatedPrompt.role) parts.push(`Role: ${updatedPrompt.role}`);
    if (updatedPrompt.task) parts.push(`Task: ${updatedPrompt.task}`);
    if (updatedPrompt.context) parts.push(`Context: ${updatedPrompt.context}`);
    if (updatedPrompt.constraints && updatedPrompt.constraints.length > 0) {
      parts.push(`Constraints:\n${updatedPrompt.constraints.join('\n')}`);
    }
    if (updatedPrompt.examples && updatedPrompt.examples.length > 0) {
      parts.push(`Examples:\n${updatedPrompt.examples.join('\n\n')}`);
    }

    setFormData((prev) => ({
      ...prev,
      prompt_body: parts.join('\n\n'),
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading prompt...</p>
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
            onClick={() => navigate('/prompts')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Library
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {isNew ? 'Create New Prompt' : prompt?.title || 'Edit Prompt'}
                </h1>
                <p className="text-gray-600 mt-1">
                  {isNew ? 'Build your prompt from scratch' : 'Edit and version your prompt'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!isNew && prompt && (
                <>
                  <button
                    onClick={() => setShowAIChat(!showAIChat)}
                    className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
                      showAIChat
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <MessageSquare className="w-5 h-5" />
                    AI Assistant
                  </button>
                  <button
                    onClick={() => setShowAppShare(!showAppShare)}
                    className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
                      showAppShare
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Share2 className="w-5 h-5" />
                    Share
                  </button>
                  <button
                    onClick={() => setShowExecution(!showExecution)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Execute
                  </button>
                  <button
                    onClick={() => setShowVersionHistory(!showVersionHistory)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                  >
                    <History className="w-5 h-5" />
                    Versions
                  </button>
                </>
              )}
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : isNew ? 'Create' : 'Save'}
              </button>
              {!isNew && (
                <button
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="px-6 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 disabled:opacity-50 flex items-center gap-2"
                >
                  Save as New Version
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={`grid grid-cols-1 gap-6 ${showVersionHistory || showExecution || showAppShare ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
          {/* Left: Prompt Builder */}
          <div className={showVersionHistory || showExecution || showAppShare ? 'lg:col-span-2' : 'lg:col-span-1'}>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              {/* Metadata Editor */}
              <div className="mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter prompt title..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this prompt does..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Visibility
                    </label>
                    <select
                      value={formData.visibility}
                      onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Prompt Builder */}
              <div className="border-t border-gray-200 pt-6">
                <PromptBuilder
                  mode="custom"
                  initialPrompt={currentPrompt || undefined}
                  onPromptExport={handlePromptChange}
                />
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          {(showVersionHistory || showExecution || showAppShare) && promptId && prompt && (
            <div className="lg:col-span-1 space-y-6">
              {showExecution && (
                <div className="sticky top-6">
                  <ExecutionPanel
                    prompt={prompt}
                    onExecutionComplete={(execution) => {
                      console.log('Execution completed:', execution);
                      // Could reload prompt or show success message
                    }}
                  />
                </div>
              )}
              {showVersionHistory && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <VersionHistory
                    promptId={promptId}
                    currentVersionId={prompt?.current_version_id || null}
                    onVersionPromote={loadPrompt}
                  />
                </div>
              )}
              {showExecution && promptId && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <ExecutionHistory
                    promptId={promptId}
                    onExecutionSelect={(execution) => {
                      console.log('Selected execution:', execution);
                    }}
                  />
                </div>
              )}
              {showAppShare && promptId && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <AppSharePanel promptId={promptId} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* AI Chat Panel */}
      {showAIChat && currentPrompt && (
        <AIChatPanel
          prompt={currentPrompt}
          isOpen={showAIChat}
          onClose={() => setShowAIChat(false)}
          onPromptUpdate={(updatedPrompt) => {
            setCurrentPrompt(updatedPrompt);
            // Convert structured prompt back to form data
            const updatedFormData = structuredPromptToFormData(updatedPrompt, {
              title: formData.title,
              description: formData.description,
              tags: formData.tags,
              category: formData.category,
            });
            setFormData({
              ...formData,
              prompt_body: updatedFormData.prompt_body,
            });
          }}
        />
      )}
    </div>
  );
}
