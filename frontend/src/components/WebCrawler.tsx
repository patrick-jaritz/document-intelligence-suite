import { useState } from 'react';
import { Globe, Download, Save, Loader2, CheckCircle, AlertCircle, FileText, Archive, Settings } from 'lucide-react';
import { callEdgeFunction } from '../lib/supabase';
import { ConvertToMarkdownButton } from './ConvertToMarkdownButton';
import { validateWebUrl, sanitizeInput } from '../utils/validation';

interface CrawlResult {
  url: string;
  content: string;
  metadata: {
    title: string;
    links: string[];
    images: string[];
    crawledAt: string;
    mode: string;
  };
  success: boolean;
}

export function WebCrawler() {
  const [url, setUrl] = useState('');
  const [crawlMode, setCrawlMode] = useState<'basic' | 'llm-enhanced' | 'screenshots'>('basic');
  const [isCrawling, setIsCrawling] = useState(false);
  const [result, setResult] = useState<CrawlResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [crawlHistory, setCrawlHistory] = useState<CrawlResult[]>([]);

  const handleCrawl = async () => {
    if (!url) {
      setError('URL is required');
      return;
    }

    // Sanitize and validate URL
    const sanitizedUrl = sanitizeInput(url);
    const validation = validateWebUrl(sanitizedUrl);
    
    if (!validation.isValid) {
      setError(validation.error || 'Invalid URL');
      return;
    }

    setIsCrawling(true);
    setError(null);
    setResult(null);

    try {
      console.log('🌐 Starting crawl:', { url: sanitizedUrl, mode: crawlMode });
      
      // Call the crawl4ai Edge Function using the proper helper
      const data = await callEdgeFunction('crawl-url', {
        url: sanitizedUrl,
        mode: crawlMode,
      });

      const crawlResult: CrawlResult = {
        url,
        content: data.content || data.text || 'No content extracted',
        metadata: {
          title: data.title || 'Untitled',
          links: data.links || [],
          images: data.images || [],
          crawledAt: new Date().toISOString(),
          mode: crawlMode,
        },
        success: true,
      };

      setResult(crawlResult);
      setCrawlHistory(prev => [crawlResult, ...prev.slice(0, 9)]); // Keep last 10
    } catch (err) {
      const { handleError, formatErrorMessage } = await import('../utils/errors');
      const appError = handleError(err, 'WebCrawler.handleCrawl');
      setError(formatErrorMessage(appError));
    } finally {
      setIsCrawling(false);
    }
  };

  const handleExport = (format: 'markdown' | 'json') => {
    if (!result) return;

    let content = '';
    let filename = '';
    let mimeType = '';

    if (format === 'json') {
      content = JSON.stringify(result, null, 2);
      filename = `crawl_${Date.now()}.json`;
      mimeType = 'application/json';
    } else {
      content = `# ${result.metadata.title}\n\nURL: ${result.url}\n\n## Content\n\n${result.content}\n\n---\n\nCrawled: ${new Date(result.metadata.crawledAt).toLocaleString()}\nMode: ${result.metadata.mode}`;
      filename = `crawl_${Date.now()}.md`;
      mimeType = 'text/markdown';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveToArchive = () => {
    if (!result) return;

    // Save to localStorage (for demo; in production, use Supabase)
    const archive = JSON.parse(localStorage.getItem('crawlArchive') || '[]');
    archive.push(result);
    localStorage.setItem('crawlArchive', JSON.stringify(archive));

    alert('Crawl saved to archive!');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
            <Globe className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Web Crawler</h2>
            <p className="text-gray-600">Extract and analyze content from any URL</p>
          </div>
        </div>

        {/* URL Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            URL to Crawl
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={isCrawling}
            />
            <button
              onClick={handleCrawl}
              disabled={isCrawling || !url}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isCrawling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Crawling...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  Crawl
                </>
              )}
            </button>
          </div>
        </div>

        {/* Crawling Mode */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Crawling Mode
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setCrawlMode('basic')}
              className={`p-3 rounded-lg border-2 transition-all ${
                crawlMode === 'basic'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              disabled={isCrawling}
            >
              <div className="text-sm font-medium text-gray-900">Basic</div>
              <div className="text-xs text-gray-500 mt-1">Simple extraction</div>
            </button>
            <button
              onClick={() => setCrawlMode('llm-enhanced')}
              className={`p-3 rounded-lg border-2 transition-all ${
                crawlMode === 'llm-enhanced'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              disabled={isCrawling}
            >
              <div className="text-sm font-medium text-gray-900">LLM Enhanced</div>
              <div className="text-xs text-gray-500 mt-1">AI-powered parsing</div>
            </button>
            <button
              onClick={() => setCrawlMode('screenshots')}
              className={`p-3 rounded-lg border-2 transition-all ${
                crawlMode === 'screenshots'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              disabled={isCrawling}
            >
              <div className="text-sm font-medium text-gray-900">Screenshots</div>
              <div className="text-xs text-gray-500 mt-1">Visual capture</div>
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-900">Error</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Success Display */}
        {result && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-green-900">Successfully Crawled</h4>
              <p className="text-sm text-green-700 mt-1">
                Extracted content from {result.url}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('markdown')}
                className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                Markdown
              </button>
              <button
                onClick={() => handleExport('json')}
                className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                JSON
              </button>
              <button
                onClick={handleSaveToArchive}
                className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-1"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Display */}
      {result && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              Crawled Content
            </h3>
            <ConvertToMarkdownButton 
              text={result.content}
              filename={`${result.metadata.title.replace(/[^a-zA-Z0-9]/g, '-')}.txt`}
              onConvert={(markdown) => {
                const blob = new Blob([markdown], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${result.metadata.title.replace(/[^a-zA-Z0-9]/g, '-')}.md`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
            />
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">{result.metadata.title}</h4>
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-600 hover:underline"
              >
                {result.url}
              </a>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                {result.content}
              </pre>
            </div>

            {result.metadata.links.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Links ({result.metadata.links.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {result.metadata.links.slice(0, 10).map((link, idx) => (
                    <a
                      key={idx}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 truncate max-w-xs"
                    >
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Crawl History */}
      {crawlHistory.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Archive className="w-5 h-5 text-green-600" />
            Recent Crawls
          </h3>
          <div className="space-y-2">
            {crawlHistory.map((crawl, idx) => (
              <div
                key={idx}
                className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                onClick={() => setResult(crawl)}
              >
                <div className="font-medium text-gray-900 truncate">{crawl.metadata.title}</div>
                <div className="text-sm text-gray-500 truncate">{crawl.url}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
