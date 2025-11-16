/**
 * Version History Component
 * Displays and manages prompt versions
 */

import { useState, useEffect } from 'react';
import { History, Check, Copy, ArrowUp } from 'lucide-react';
import { PromptVersion } from '../../types/promptforge';
import { getPromptVersions, promoteVersion } from '../../services/promptVersionService';

interface VersionHistoryProps {
  promptId: string;
  currentVersionId: string | null;
  onVersionSelect?: (version: PromptVersion) => void;
  onVersionPromote?: () => void;
}

export function VersionHistory({
  promptId,
  currentVersionId,
  onVersionSelect,
  onVersionPromote,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  useEffect(() => {
    loadVersions();
  }, [promptId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const data = await getPromptVersions(promptId);
      setVersions(data);
      setSelectedVersionId(currentVersionId);
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async (versionId: string) => {
    const success = await promoteVersion(promptId, versionId);
    if (success) {
      await loadVersions();
      if (onVersionPromote) {
        onVersionPromote();
      }
    }
  };

  const handleSelect = (version: PromptVersion) => {
    setSelectedVersionId(version.id);
    if (onVersionSelect) {
      onVersionSelect(version);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 text-gray-600 mb-4">
          <History className="w-5 h-5" />
          <span className="font-semibold">Version History</span>
        </div>
        <div className="text-sm text-gray-500">Loading versions...</div>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-gray-200">
      <div className="flex items-center gap-2 text-gray-900 mb-4">
        <History className="w-5 h-5" />
        <span className="font-semibold">Version History</span>
        <span className="text-sm text-gray-500">({versions.length})</span>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {versions.length === 0 ? (
          <div className="text-sm text-gray-500 py-4 text-center">
            No versions yet
          </div>
        ) : (
          versions.map((version) => (
            <div
              key={version.id}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                version.id === selectedVersionId
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => handleSelect(version)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">
                    Version {version.version_number}
                  </span>
                  {version.is_current && (
                    <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Current
                    </span>
                  )}
                </div>
                {!version.is_current && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePromote(version.id);
                    }}
                    className="p-1 hover:bg-indigo-100 rounded text-indigo-600"
                    title="Promote to current version"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                )}
              </div>

              {version.changelog && (
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                  {version.changelog}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {new Date(version.created_at).toLocaleDateString()}
                </span>
                <span className="text-gray-400">
                  {version.prompt_body.length} chars
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
