/**
 * App Share Panel Component
 * Manage public apps for a prompt
 */

import { useState, useEffect } from 'react';
import { Share2, Plus, ExternalLink, Copy, Check, Trash2, Power, PowerOff, Settings } from 'lucide-react';
import { PromptApp, AppFormData } from '../../types/promptforge';
import {
  getPromptApps,
  createPromptApp,
  updateApp,
  toggleAppActive,
  deleteApp,
} from '../../services/promptAppService';

interface AppSharePanelProps {
  promptId: string;
}

export function AppSharePanel({ promptId }: AppSharePanelProps) {
  const [apps, setApps] = useState<PromptApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [formData, setFormData] = useState<AppFormData>({
    title: '',
    description: '',
    allow_anonymous: true,
    require_auth: false,
    max_executions_per_day: 100,
    max_executions_total: null,
    expires_at: null,
  });

  useEffect(() => {
    loadApps();
  }, [promptId]);

  const loadApps = async () => {
    setLoading(true);
    try {
      const data = await getPromptApps(promptId);
      setApps(data);
    } catch (error) {
      console.error('Failed to load apps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }

    const app = await createPromptApp(promptId, formData);
    if (app) {
      await loadApps();
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        allow_anonymous: true,
        require_auth: false,
        max_executions_per_day: 100,
        max_executions_total: null,
        expires_at: null,
      });
    }
  };

  const handleToggle = async (appId: string, currentStatus: boolean) => {
    const success = await toggleAppActive(appId, !currentStatus);
    if (success) {
      await loadApps();
    }
  };

  const handleDelete = async (appId: string) => {
    if (confirm('Delete this app? The public URL will no longer work.')) {
      const success = await deleteApp(appId);
      if (success) {
        await loadApps();
      }
    }
  };

  const copyAppUrl = (slug: string) => {
    const url = `${window.location.origin}/app/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const getAppUrl = (slug: string) => {
    return `${window.location.origin}/app/${slug}`;
  };

  if (loading) {
    return (
      <div className="p-4 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 text-gray-600">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          Loading apps...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Share2 className="w-4 h-4" />
          Public Apps ({apps.length})
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New App
        </button>
      </div>

      {apps.length === 0 ? (
        <div className="p-6 border border-gray-200 rounded-lg text-center">
          <Share2 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">No public apps yet</p>
          <p className="text-xs text-gray-500 mt-1">
            Create a public app to share this prompt
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => (
            <div
              key={app.id}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{app.title}</h4>
                    {app.is_active ? (
                      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  {app.description && (
                    <p className="text-sm text-gray-600 mb-2">{app.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Slug: {app.slug}</span>
                    {app.expires_at && (
                      <span>
                        Expires: {new Date(app.expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyAppUrl(app.slug)}
                    className="p-1.5 hover:bg-gray-200 rounded"
                    title="Copy URL"
                  >
                    {copiedSlug === app.slug ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                  <a
                    href={getAppUrl(app.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-gray-200 rounded"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-600" />
                  </a>
                  <button
                    onClick={() => handleToggle(app.id, app.is_active)}
                    className="p-1.5 hover:bg-gray-200 rounded"
                    title={app.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {app.is_active ? (
                      <PowerOff className="w-4 h-4 text-gray-600" />
                    ) : (
                      <Power className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(app.id)}
                    className="p-1.5 hover:bg-red-100 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100">
                <a
                  href={getAppUrl(app.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  {getAppUrl(app.slug)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create Public App</h2>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="My Public Prompt App"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this app does..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Executions/Day
                  </label>
                  <input
                    type="number"
                    value={formData.max_executions_per_day}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_executions_per_day: parseInt(e.target.value) || 100,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Total Executions
                  </label>
                  <input
                    type="number"
                    value={formData.max_executions_total || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_executions_total: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="Unlimited"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.allow_anonymous}
                    onChange={(e) =>
                      setFormData({ ...formData, allow_anonymous: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Allow anonymous users</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.require_auth}
                    onChange={(e) =>
                      setFormData({ ...formData, require_auth: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Require authentication</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expires At (optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.expires_at || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expires_at: e.target.value || null,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Create App
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
