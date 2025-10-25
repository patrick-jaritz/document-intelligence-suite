import React from 'react';
import { Star, GitFork, Users, Calendar, Code, Shield, Zap, ArrowRight } from 'lucide-react';

interface RepoComparisonProps {
  repo1: any;
  repo2: any;
  onClose: () => void;
}

export function RepoComparison({ repo1, repo2, onClose }: RepoComparisonProps) {
  const renderMetric = (icon: any, label: string, value1: any, value2: any, formatter?: (val: any) => string) => {
    const format = formatter || ((v: any) => v?.toLocaleString() || 'N/A');
    return (
      <div className="flex items-center justify-between py-2 border-b border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {icon}
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-blue-600">{format(value1)}</span>
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <span className="text-green-600">{format(value2)}</span>
        </div>
      </div>
    );
  };

  const renderList = (label: string, items1: string[], items2: string[]) => (
    <div className="mt-4">
      <h4 className="font-semibold text-gray-900 mb-2">{label}</h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          {items1.slice(0, 5).map((item, idx) => (
            <div key={idx} className="text-sm text-gray-700 mb-1">• {item}</div>
          ))}
        </div>
        <div>
          {items2.slice(0, 5).map((item, idx) => (
            <div key={idx} className="text-sm text-gray-700 mb-1">• {item}</div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Compare Repositories</h2>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
          >
            Close
          </button>
        </div>

        <div className="p-6">
          {/* Repository Names */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
              <h3 className="font-bold text-lg text-blue-900">{repo1?.analysis?.metadata?.name}</h3>
              <p className="text-sm text-gray-600">{repo1?.repository}</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 bg-green-50">
              <h3 className="font-bold text-lg text-green-900">{repo2?.analysis?.metadata?.name}</h3>
              <p className="text-sm text-gray-600">{repo2?.repository}</p>
            </div>
          </div>

          {/* Metrics Comparison */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Metrics</h3>
            {renderMetric(<Star className="w-4 h-4" />, 'Stars', repo1?.analysis?.metadata?.stars, repo2?.analysis?.metadata?.stars)}
            {renderMetric(<GitFork className="w-4 h-4" />, 'Forks', repo1?.analysis?.metadata?.forks, repo2?.analysis?.metadata?.forks)}
            {renderMetric(<Users className="w-4 h-4" />, 'Watchers', repo1?.analysis?.metadata?.watchers, repo2?.analysis?.metadata?.watchers)}
            {renderMetric(<Code className="w-4 h-4" />, 'Language', repo1?.analysis?.metadata?.language, repo2?.analysis?.metadata?.language)}
            {renderMetric(<Shield className="w-4 h-4" />, 'License', repo1?.analysis?.metadata?.license, repo2?.analysis?.metadata?.license)}
            {renderMetric(<Zap className="w-4 h-4" />, 'Size', repo1?.analysis?.metadata?.size, repo2?.analysis?.metadata?.size, (v: number) => 
              v ? `${(v / 1024).toFixed(1)} MB` : 'N/A'
            )}
          </div>

          {/* Tech Stack Comparison */}
          {repo1?.analysis?.technicalAnalysis?.techStack && repo2?.analysis?.technicalAnalysis?.techStack && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              {renderList(
                'Tech Stack',
                repo1.analysis.technicalAnalysis.techStack || [],
                repo2.analysis.technicalAnalysis.techStack || []
              )}
            </div>
          )}

          {/* Use Cases Comparison */}
          {repo1?.analysis?.useCases?.primary && repo2?.analysis?.useCases?.primary && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              {renderList(
                'Primary Use Cases',
                repo1.analysis.useCases.primary || [],
                repo2.analysis.useCases.primary || []
              )}
            </div>
          )}

          {/* Architecture Comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Architecture</h4>
              <p className="text-sm text-gray-700">{repo1?.analysis?.technicalAnalysis?.architecture}</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Architecture</h4>
              <p className="text-sm text-gray-700">{repo2?.analysis?.technicalAnalysis?.architecture}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
