/**
 * Version History Component
 * Shows version history and allows creating new versions
 */

import { useState } from 'react';
import { GitBranch, Plus, Check } from 'lucide-react';
import { createVersion } from '../../services/promptForgeService';
import type { PromptVersion } from '../../types/promptforge';

interface VersionHistoryProps {
  versions: PromptVersion[];
  currentVersionId?: string;
  onCreateVersion: (changelog?: string) => Promise<void>;
}

export function VersionHistory({ versions, currentVersionId, onCreateVersion }: VersionHistoryProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [changelog, setChangelog] = useState('');

  const handleCreateVersion = async () => {
    await onCreateVersion(changelog || undefined);
    setShowCreateModal(false);
    setChangelog('');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Version History</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Version
        </button>
      </div>

      {versions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No versions yet</div>
      ) : (
        <div className="space-y-4">
          {versions.map(version => (
            <div
              key={version.id}
              className={`border rounded-lg p-4 ${
                version.id === currentVersionId
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <GitBranch className="w-5 h-5 text-gray-600" />
                    <span className="font-medium">Version {version.version_number}</span>
                    {version.id === currentVersionId && (
                      <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                        Current
                      </span>
                    )}
                  </div>
                  {version.changelog && (
                    <p className="text-sm text-gray-600 mb-2">{version.changelog}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    {new Date(version.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Version Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Version</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Changelog (optional)
              </label>
              <textarea
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Describe what changed in this version..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setChangelog('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateVersion}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Version
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
