/**
 * Document Selector Component
 * Allows linking documents to prompts for context-aware prompt building
 */

import { useState, useEffect } from 'react';
import { FileText, X, Link as LinkIcon, Search } from 'lucide-react';
import { PromptDocument, DocumentRelationshipType } from '../../services/promptDocumentService';
import {
  getPromptDocuments,
  linkDocumentToPrompt,
  unlinkDocumentFromPrompt,
} from '../../services/promptDocumentService';

interface DocumentSelectorProps {
  promptId: string;
  onDocumentsChange?: (documents: PromptDocument[]) => void;
}

export function DocumentSelector({ promptId, onDocumentsChange }: DocumentSelectorProps) {
  const [documents, setDocuments] = useState<PromptDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDocuments();
  }, [promptId]);

  useEffect(() => {
    if (onDocumentsChange) {
      onDocumentsChange(documents);
    }
  }, [documents, onDocumentsChange]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await getPromptDocuments(promptId);
      setDocuments(data);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async (documentId: string, relationshipType: DocumentRelationshipType) => {
    const success = await linkDocumentToPrompt(promptId, documentId, relationshipType);
    if (success) {
      await loadDocuments();
    }
  };

  const handleUnlink = async (documentId: string) => {
    const success = await unlinkDocumentFromPrompt(promptId, documentId);
    if (success) {
      await loadDocuments();
    }
  };

  // TODO: Integrate with actual document service
  // For now, this is a placeholder that shows the UI structure
  const availableDocuments: Array<{ id: string; name: string; type: string }> = [];

  if (loading) {
    return (
      <div className="p-4 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 text-gray-600">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          Loading documents...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Linked Documents ({documents.length})
        </h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <LinkIcon className="w-4 h-4" />
          Link Document
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="p-6 border border-gray-200 rounded-lg text-center">
          <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">No documents linked</p>
          <p className="text-xs text-gray-500 mt-1">
            Link documents to provide context for your prompts
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={`${doc.prompt_id}-${doc.document_id}`}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Document {doc.document_id.slice(0, 8)}...
                  </div>
                  <div className="text-xs text-gray-500 capitalize">
                    {doc.relationship_type}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleUnlink(doc.document_id)}
                className="p-1 hover:bg-red-50 text-red-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Document Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Link Document</h2>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search documents..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Document List */}
              <div className="space-y-2">
                {availableDocuments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No documents available</p>
                    <p className="text-sm mt-2">
                      Upload documents in the Document Intelligence section to link them here
                    </p>
                  </div>
                ) : (
                  availableDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{doc.name}</div>
                          <div className="text-xs text-gray-500">{doc.type}</div>
                        </div>
                      </div>
                      <select
                        onChange={(e) => {
                          handleLink(doc.id, e.target.value as DocumentRelationshipType);
                          setShowAddModal(false);
                        }}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Select relationship
                        </option>
                        <option value="context">Context</option>
                        <option value="example">Example</option>
                        <option value="reference">Reference</option>
                        <option value="target">Target</option>
                      </select>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
