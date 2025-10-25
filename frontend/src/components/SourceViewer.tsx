import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, ExternalLink } from 'lucide-react';

interface Source {
  text: string;
  metadata: any;
  similarity: number;
}

interface SourceViewerProps {
  sources: Source[];
}

export function SourceViewer({ sources }: SourceViewerProps) {
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());

  const toggleSource = (index: number) => {
    const newExpanded = new Set(expandedSources);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSources(newExpanded);
  };

  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {sources.map((source, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-3 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-600">
                Source {index + 1} • {Math.round(source.similarity * 100)}% match
              </span>
            </div>
            <button
              onClick={() => toggleSource(index)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              {expandedSources.has(index) ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>
          
          {expandedSources.has(index) && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-sm text-gray-700 leading-relaxed">
                {source.text}
              </p>
              
              {source.metadata && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {source.metadata.page_number && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      Page {source.metadata.page_number}
                    </span>
                  )}
                  {source.metadata.filename && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                      {source.metadata.filename}
                    </span>
                  )}
                  {source.metadata.source_url && (
                    <a
                      href={source.metadata.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded hover:bg-purple-200 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Source
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
