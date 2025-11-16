/**
 * Document Prompt Suggestions Component
 * Shows suggested prompts based on uploaded documents
 */

import { FileText, Plus, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DocumentContent, suggestPromptsFromDocument, createPromptFromDocument } from '../../services/documentPromptService';
import { getAvailableDocuments } from '../../services/documentPromptService';

export function DocumentPromptSuggestions() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentContent[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentContent | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ title: string; description: string; promptBody: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    if (selectedDoc) {
      loadSuggestions();
    }
  }, [selectedDoc]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await getAvailableDocuments();
      setDocuments(docs);
      if (docs.length > 0) {
        setSelectedDoc(docs[0]);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async () => {
    if (!selectedDoc) return;
    try {
      const suggs = await suggestPromptsFromDocument(selectedDoc);
      setSuggestions(suggs);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const handleCreatePrompt = async (suggestion: { title: string; description: string; promptBody: string }) => {
    if (!selectedDoc) return;

    const promptId = await createPromptFromDocument(selectedDoc, {
      title: suggestion.title,
      description: suggestion.description,
      promptBody: suggestion.promptBody,
      tags: ['document-based', selectedDoc.type || 'general'],
      category: 'Document Processing',
    });

    if (promptId) {
      navigate(`/prompts/edit?id=${promptId}`);
    }
  };

  if (loading) {
    return (
      <div className="p-6 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 text-gray-600">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          Loading documents...
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="p-6 border border-gray-200 rounded-lg text-center">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-600 mb-2">No documents uploaded yet</p>
        <p className="text-xs text-gray-500">
          Upload documents in the Document Intelligence section to create prompts from them
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Create Prompt from Document
        </h3>
      </div>

      {/* Document Selector */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Select Document
        </label>
        <select
          value={selectedDoc?.id || ''}
          onChange={(e) => {
            const doc = documents.find((d) => d.id === e.target.value);
            setSelectedDoc(doc || null);
          }}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        >
          {documents.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.title}
            </option>
          ))}
        </select>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-gray-600">
            Suggested prompts based on "{selectedDoc?.title}":
          </p>
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-gray-900 mb-1">
                    {suggestion.title}
                  </h4>
                  <p className="text-xs text-gray-600">{suggestion.description}</p>
                </div>
                <button
                  onClick={() => handleCreatePrompt(suggestion)}
                  className="ml-3 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Create
                </button>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 line-clamp-2">
                  {suggestion.promptBody.substring(0, 150)}...
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
