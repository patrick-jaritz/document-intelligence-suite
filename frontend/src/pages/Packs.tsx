/**
 * Prompt Packs Page
 * Manage collections of prompts
 */

import { useState, useEffect } from 'react';
import { Package, Plus, Download, Upload, MoreVertical, Edit, Trash2, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Pack } from '../types/promptforge';
import { getPacks, deletePack, exportPack, importPack } from '../services/packService';
import { PackExport } from '../types/promptforge';

export function Packs() {
  const navigate = useNavigate();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    loadPacks();
  }, []);

  const loadPacks = async () => {
    setLoading(true);
    try {
      const data = await getPacks();
      setPacks(data);
    } catch (error) {
      console.error('Failed to load packs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (packId: string) => {
    const packExport = await exportPack(packId);
    if (packExport) {
      const blob = new Blob([JSON.stringify(packExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${packExport.pack.title.replace(/\s+/g, '-')}.promptpack`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const packExport: PackExport = JSON.parse(text);
      const imported = await importPack(packExport);
      if (imported) {
        await loadPacks();
        setShowImport(false);
        alert('Pack imported successfully!');
      }
    } catch (error) {
      console.error('Failed to import pack:', error);
      alert('Failed to import pack. Please check the file format.');
    }
  };

  const handleDelete = async (packId: string) => {
    if (confirm('Delete this pack? This will not delete the prompts, only the pack.')) {
      const success = await deletePack(packId);
      if (success) {
        await loadPacks();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Package className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Prompt Packs</h1>
                <p className="text-gray-600 mt-1">
                  Organize prompts into reusable collections
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowImport(!showImport)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Import Pack
              </button>
              <button
                onClick={() => navigate('/packs/new')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-5 h-5" />
                New Pack
              </button>
            </div>
          </div>

          {/* Import Panel */}
          {showImport && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Import Pack File (.promptpack)
              </label>
              <input
                type="file"
                accept=".promptpack,.json"
                onChange={handleImport}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
            </div>
          )}
        </div>

        {/* Packs Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading packs...</p>
            </div>
          </div>
        ) : packs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No packs yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first pack to organize related prompts
            </p>
            <button
              onClick={() => navigate('/packs/new')}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Your First Pack
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packs.map((pack) => (
              <div
                key={pack.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6 relative group"
              >
                {/* Actions Menu */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="relative">
                    <button
                      onClick={() => setSelectedPack(selectedPack === pack.id ? null : pack.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-600" />
                    </button>
                    {selectedPack === pack.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        <button
                          onClick={() => {
                            navigate(`/packs/edit?id=${pack.id}`);
                            setSelectedPack(null);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            handleExport(pack.id);
                            setSelectedPack(null);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                        >
                          <Download className="w-4 h-4" />
                          Export
                        </button>
                        <button
                          onClick={() => {
                            handleDelete(pack.id);
                            setSelectedPack(null);
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

                {/* Pack Content */}
                <div
                  onClick={() => navigate(`/packs/edit?id=${pack.id}`)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Package className="w-8 h-8 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900 pr-8">
                      {pack.title}
                    </h3>
                  </div>
                  {pack.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {pack.description}
                    </p>
                  )}

                  {/* Tags */}
                  {pack.tags && pack.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {pack.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {pack.tags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          +{pack.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
                    <span>
                      {pack.category && <span className="mr-3">{pack.category}</span>}
                      {pack.visibility}
                    </span>
                    <span>{new Date(pack.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
