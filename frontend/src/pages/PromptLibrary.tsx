/**
 * Prompt Library Page
 * Main view for browsing, searching, and managing prompts
 */

import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Plus, Tag, FolderOpen, Archive, Sparkles, MoreVertical, Copy, Trash2, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PromptWithVersion, PromptFilters, PromptSortOption } from '../types/promptforge';
import { getPrompts, archivePrompt, deletePrompt, duplicatePrompt } from '../services/promptForgeService';
import { getAllTags, getCategories } from '../services/promptForgeService';

export function PromptLibrary() {
  const navigate = useNavigate();
  const [prompts, setPrompts] = useState<PromptWithVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [filters, setFilters] = useState<PromptFilters>({
    archived: false,
  });
  const [sort, setSort] = useState<PromptSortOption>({
    field: 'updated_at',
    direction: 'desc',
  });
  const [searchQuery, setSearchQuery] = useState('');

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

  // Load prompts
  useEffect(() => {
    loadPrompts();
  }, [page, filters, sort, searchQuery]);

  // Load tags and categories
  useEffect(() => {
    loadMetadata();
  }, []);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const currentFilters: PromptFilters = {
        ...filters,
        search: searchQuery || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        category: selectedCategory || undefined,
      };

      const result = await getPrompts(currentFilters, sort, page, pageSize);
      setPrompts(result.data);
      setTotal(result.total);
      setTotalPages(result.total_pages);
    } catch (error) {
      console.error('Failed to load prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMetadata = async () => {
    const [tags, categories] = await Promise.all([
      getAllTags(),
      getCategories(),
    ]);
    setAvailableTags(tags);
    setAvailableCategories(categories);
  };

  const handleArchive = async (promptId: string) => {
    if (confirm('Archive this prompt?')) {
      const success = await archivePrompt(promptId);
      if (success) {
        loadPrompts();
      }
    }
  };

  const handleDelete = async (promptId: string) => {
    if (confirm('Permanently delete this prompt? This cannot be undone.')) {
      const success = await deletePrompt(promptId);
      if (success) {
        loadPrompts();
      }
    }
  };

  const handleDuplicate = async (promptId: string) => {
    const duplicated = await duplicatePrompt(promptId);
    if (duplicated) {
      loadPrompts();
    }
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
    setPage(1); // Reset to first page
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSelectedCategory('');
    setSearchQuery('');
    setFilters({ archived: false });
    setPage(1);
  };

  const filteredCount = useMemo(() => {
    return total;
  }, [total]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <InfoPanel title="Welcome to PromptForge" defaultOpen={true} className="mb-6">
            <p>
              PromptForge helps you create, manage, and share AI prompts. Start by creating a new prompt or explore suggestions based on your uploaded documents.
            </p>
            <p className="mt-2">
              <strong>Quick Tips:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm mt-1">
              <li>Use the search bar to find prompts by title or content</li>
              <li>Filter by tags and categories to organize your prompts</li>
              <li>Click on a prompt to edit and refine it</li>
              <li>Use "Execute" to test prompts with real LLM models</li>
              <li>Share prompts as public web apps for others to use</li>
            </ul>
          </InfoPanel>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Prompt Library</h1>
                <p className="text-gray-600 mt-1">
                  {filteredCount} {filteredCount === 1 ? 'prompt' : 'prompts'}
                  {selectedTags.length > 0 && ` • ${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} selected`}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/prompts/edit?new=true')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-5 h-5" />
              New Prompt
            </button>
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search prompts by title, description, or content..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                  showFilters || selectedTags.length > 0 || selectedCategory
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-5 h-5" />
                Filters
                {(selectedTags.length > 0 || selectedCategory) && (
                  <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {selectedTags.length + (selectedCategory ? 1 : 0)}
                  </span>
                )}
              </button>

              {/* Sort */}
              <select
                value={`${sort.field}-${sort.direction}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split('-');
                  setSort({ field: field as any, direction: direction as 'asc' | 'desc' });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="updated_at-desc">Recently Updated</option>
                <option value="created_at-desc">Recently Created</option>
                <option value="title-asc">Title A-Z</option>
                <option value="title-desc">Title Z-A</option>
                <option value="usage_count-desc">Most Used</option>
                <option value="success_rate-desc">Highest Success</option>
              </select>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.slice(0, 20).map((tag) => (
                        <button
                          key={tag}
                          onClick={() => handleTagToggle(tag)}
                          className={`px-3 py-1 rounded-full text-sm transition-colors flex items-center gap-1 ${
                            selectedTags.includes(tag)
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <Tag className="w-3 h-3" />
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        setPage(1);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">All Categories</option>
                      {availableCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Clear Filters */}
                {(selectedTags.length > 0 || selectedCategory) && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Prompts Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading prompts...</p>
            </div>
          </div>
        ) : prompts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No prompts found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || selectedTags.length > 0 || selectedCategory
                ? 'Try adjusting your filters or search query'
                : 'Get started by creating your first prompt'}
            </p>
            {!(searchQuery || selectedTags.length > 0 || selectedCategory) && (
              <button
                onClick={() => navigate('/prompts/edit?new=true')}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Your First Prompt
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {prompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6 relative group"
                >
                  {/* Actions Menu */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="relative">
                      <button
                        onClick={() => setSelectedPrompt(selectedPrompt === prompt.id ? null : prompt.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-600" />
                      </button>
                      {selectedPrompt === prompt.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                          <button
                            onClick={() => {
                              navigate(`/prompts/edit?id=${prompt.id}`);
                              setSelectedPrompt(null);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              handleDuplicate(prompt.id);
                              setSelectedPrompt(null);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                          >
                            <Copy className="w-4 h-4" />
                            Duplicate
                          </button>
                          <button
                            onClick={() => {
                              handleArchive(prompt.id);
                              setSelectedPrompt(null);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                          >
                            <Archive className="w-4 h-4" />
                            Archive
                          </button>
                          <button
                            onClick={() => {
                              handleDelete(prompt.id);
                              setSelectedPrompt(null);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2 text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Prompt Content */}
                  <div
                    onClick={() => navigate(`/prompts/edit?id=${prompt.id}`)}
                    className="cursor-pointer"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 pr-8">
                      {prompt.title}
                    </h3>
                    {prompt.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {prompt.description}
                      </p>
                    )}

                    {/* Tags */}
                    {prompt.tags && prompt.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {prompt.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {prompt.tags.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{prompt.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
                      <span>
                        {prompt.category && (
                          <span className="mr-3">{prompt.category}</span>
                        )}
                        {prompt.current_version && (
                          <span>v{prompt.current_version.version_number}</span>
                        )}
                      </span>
                      <span>
                        {new Date(prompt.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
