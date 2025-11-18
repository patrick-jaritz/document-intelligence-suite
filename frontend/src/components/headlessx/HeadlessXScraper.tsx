/**
 * HeadlessX Web Scraper Component
 * UI for web scraping using HeadlessX integration
 */

import { useState } from 'react';
import { createHeadlessXClient, HeadlessXResult } from '../../services/headlessx';
import { Globe, Download, Image, FileText, Settings, AlertCircle, CheckCircle } from 'lucide-react';

export function HeadlessXScraper() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HeadlessXResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<'text' | 'html' | 'render'>('text');
  const [stealthMode, setStealthMode] = useState(false);
  
  // Get HeadlessX configuration from environment variables
  const headlessxUrl = import.meta.env.VITE_HEADLESSX_URL || '';
  const headlessxToken = import.meta.env.VITE_HEADLESSX_TOKEN || '';

  const handleScrape = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    if (!headlessxUrl) {
      setError('HeadlessX service URL not configured. Please set VITE_HEADLESSX_URL in environment.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const client = createHeadlessXClient(headlessxUrl, headlessxToken);
      
      let scrapResult: HeadlessXResult;

      switch (method) {
        case 'text':
          scrapResult = await client.getText(url, {
            behaviorSimulation: stealthMode,
            stealthMode: stealthMode ? 'maximum' : 'low'
          });
          break;
        
        case 'html':
          scrapResult = await client.getHtml(url, {
            behaviorSimulation: stealthMode,
            stealthMode: stealthMode ? 'maximum' : 'low'
          });
          break;
        
        case 'render':
          if (stealthMode) {
            scrapResult = await client.renderStealth(url);
          } else {
            scrapResult = await client.render({ url });
          }
          break;
        
        default:
          scrapResult = await client.getText(url);
      }

      if (scrapResult.success) {
        setResult(scrapResult);
      } else {
        setError(scrapResult.error || 'Scraping failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleScreenshot = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    if (!headlessxUrl) {
      setError('HeadlessX service URL not configured');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const client = createHeadlessXClient(headlessxUrl, headlessxToken);
      const screenshot = await client.screenshot({ url, fullPage: true });
      
      if (screenshot) {
        // Download the screenshot
        const downloadUrl = URL.createObjectURL(screenshot);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `screenshot-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        
        setError(null);
        alert('Screenshot downloaded successfully!');
      } else {
        setError('Failed to capture screenshot');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Screenshot failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePdf = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    if (!headlessxUrl) {
      setError('HeadlessX service URL not configured');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const client = createHeadlessXClient(headlessxUrl, headlessxToken);
      const pdf = await client.generatePdf({ url, format: 'A4' });
      
      if (pdf) {
        // Download the PDF
        const downloadUrl = URL.createObjectURL(pdf);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `page-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        
        setError(null);
        alert('PDF downloaded successfully!');
      } else {
        setError('Failed to generate PDF');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Globe className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              HeadlessX Web Scraper
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-300">
            Advanced web scraping with anti-detection and stealth capabilities
          </p>
        </div>

        {/* Configuration Status */}
        {!headlessxUrl && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                  Configuration Required
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  Please set <code className="bg-yellow-100 dark:bg-yellow-900/40 px-1.5 py-0.5 rounded">VITE_HEADLESSX_URL</code> environment variable to enable HeadlessX integration.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Input Section */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Target URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg 
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     dark:bg-slate-700 dark:text-white"
            disabled={loading}
          />

          {/* Method Selection */}
          <div className="mt-4 grid grid-cols-3 gap-4">
            <button
              onClick={() => setMethod('text')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                method === 'text'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
              disabled={loading}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Text
            </button>
            <button
              onClick={() => setMethod('html')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                method === 'html'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
              disabled={loading}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              HTML
            </button>
            <button
              onClick={() => setMethod('render')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                method === 'render'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
              disabled={loading}
            >
              <Globe className="w-4 h-4 inline mr-2" />
              Full Render
            </button>
          </div>

          {/* Stealth Mode Toggle */}
          <div className="mt-4 flex items-center gap-3">
            <input
              type="checkbox"
              id="stealth-mode"
              checked={stealthMode}
              onChange={(e) => setStealthMode(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <label htmlFor="stealth-mode" className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <Settings className="w-4 h-4" />
              Enable Stealth Mode (Anti-Detection)
            </label>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handleScrape}
              disabled={loading || !headlessxUrl}
              className="flex-1 min-w-[200px] px-6 py-3 bg-blue-600 hover:bg-blue-700 
                       disabled:bg-slate-300 disabled:cursor-not-allowed
                       text-white font-semibold rounded-lg transition-colors
                       flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Globe className="w-5 h-5" />
                  Scrape Content
                </>
              )}
            </button>

            <button
              onClick={handleScreenshot}
              disabled={loading || !headlessxUrl}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 
                       disabled:bg-slate-300 disabled:cursor-not-allowed
                       text-white font-semibold rounded-lg transition-colors
                       flex items-center gap-2"
            >
              <Image className="w-5 h-5" />
              Screenshot
            </button>

            <button
              onClick={handlePdf}
              disabled={loading || !headlessxUrl}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 
                       disabled:bg-slate-300 disabled:cursor-not-allowed
                       text-white font-semibold rounded-lg transition-colors
                       flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              PDF
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-200 mb-1">Error</h3>
                <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Result */}
        {result && result.success && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Scraping Complete
              </h2>
            </div>

            {/* Metadata */}
            {result.metadata && (
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Metadata</h3>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  {result.metadata.title && (
                    <>
                      <dt className="text-slate-600 dark:text-slate-400">Title:</dt>
                      <dd className="text-slate-900 dark:text-white font-medium">{result.metadata.title}</dd>
                    </>
                  )}
                  {result.metadata.wordCount !== undefined && (
                    <>
                      <dt className="text-slate-600 dark:text-slate-400">Word Count:</dt>
                      <dd className="text-slate-900 dark:text-white font-medium">{result.metadata.wordCount.toLocaleString()}</dd>
                    </>
                  )}
                  {result.metadata.processingTime !== undefined && (
                    <>
                      <dt className="text-slate-600 dark:text-slate-400">Processing Time:</dt>
                      <dd className="text-slate-900 dark:text-white font-medium">{result.metadata.processingTime}ms</dd>
                    </>
                  )}
                  {result.metadata.provider && (
                    <>
                      <dt className="text-slate-600 dark:text-slate-400">Provider:</dt>
                      <dd className="text-slate-900 dark:text-white font-medium">{result.metadata.provider}</dd>
                    </>
                  )}
                </dl>
              </div>
            )}

            {/* Content */}
            <div className="mt-4">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Content</h3>
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono">
                  {result.text || result.html || result.markdown || 'No content extracted'}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
