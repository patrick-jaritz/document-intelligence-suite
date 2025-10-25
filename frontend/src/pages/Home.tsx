import { useState } from 'react';
import { FileSearch, Settings, MessageCircle, FileText, Github, Globe, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DocumentUploader } from '../components/DocumentUploader';
import { TemplateEditor } from '../components/TemplateEditor';
import { ResultsDisplay } from '../components/ResultsDisplay';
import { useDocumentProcessor } from '../hooks/useDocumentProcessor';
import { RAGView } from '../components/RAGView';
import { GitHubAnalyzer } from '../components/GitHubAnalyzer';
import { WebCrawler } from '../components/WebCrawler';

type AppMode = 'extract' | 'ask' | 'github' | 'crawler';

export function Home() {
  const [appMode, setAppMode] = useState<AppMode>('extract');
  const navigate = useNavigate();

  // Extraction state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const defaultSchema = {
    type: 'object',
    properties: {
      title: { type: 'string' },
      date: { type: 'string' },
      summary: { type: 'string' },
    },
  };
  const [selectedTemplate, setSelectedTemplate] = useState<any>(defaultSchema);
  const [ocrProvider, setOcrProvider] = useState<'google-vision' | 'openai-vision' | 'mistral' | 'ocr-space' | 'tesseract' | 'paddleocr' | 'dots-ocr' | 'deepseek-ocr'>('google-vision');
  const [llmProvider, setLlmProvider] = useState<'openai' | 'anthropic' | 'mistral'>('openai');

  const {
    status,
    extractedText,
    structuredOutput,
    error,
    processingTime,
    processDocument,
    reset,
  } = useDocumentProcessor();

  const onProcess = async () => {
    if (!selectedFile) return;
    await processDocument(selectedFile, selectedTemplate, ocrProvider, llmProvider, 'gpt-4o-mini', 'gpt-4o-mini');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileSearch className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">BRAITER Document Intelligence Suite</h1>
                <p className="text-gray-600 mt-1">RAG-powered Q&A and structured data extraction</p>
              </div>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                Choose Your Mode
                </h3>
                </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => setAppMode('extract')}
                className={`p-6 rounded-lg border-2 transition-all ${appMode === 'extract' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${appMode === 'extract' ? 'bg-green-600' : 'bg-gray-100'}`}>
                    <FileText className={`w-6 h-6 ${appMode === 'extract' ? 'text-white' : 'text-gray-600'}`} />
                </div>
                <div>
                    <h4 className="font-semibold text-gray-900">Extract Data</h4>
                    <p className="text-sm text-gray-600">Structured information extraction</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Define a structure template and extract key fields from documents.</p>
              </button>

              <button
                onClick={() => setAppMode('ask')}
                className={`p-6 rounded-lg border-2 transition-all ${appMode === 'ask' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${appMode === 'ask' ? 'bg-blue-600' : 'bg-gray-100'}`}>
                    <MessageCircle className={`w-6 h-6 ${appMode === 'ask' ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Ask Questions (RAG)</h4>
                    <p className="text-sm text-gray-600">Chat with your documents</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Upload or link a document, then ask questions with source citations.</p>
              </button>

              <button
                onClick={() => setAppMode('github')}
                className={`p-6 rounded-lg border-2 transition-all ${appMode === 'github' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${appMode === 'github' ? 'bg-purple-600' : 'bg-gray-100'}`}>
                    <Github className={`w-6 h-6 ${appMode === 'github' ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">GitHub Analyzer</h4>
                    <p className="text-sm text-gray-600">Analyze repository capabilities</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Analyze GitHub repositories for technical insights and use case brainstorming.</p>
              </button>

              <button
                onClick={() => setAppMode('crawler')}
                className={`p-6 rounded-lg border-2 transition-all ${appMode === 'crawler' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${appMode === 'crawler' ? 'bg-emerald-600' : 'bg-gray-100'}`}>
                    <Globe className={`w-6 h-6 ${appMode === 'crawler' ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Web Crawler</h4>
                    <p className="text-sm text-gray-600">Extract web content</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Crawl and extract content from any URL with AI-enhanced parsing.</p>
              </button>
            </div>
                </div>
        </header>

        {/* Mode content */}
        {appMode === 'crawler' ? (
          <WebCrawler />
        ) : appMode === 'ask' ? (
          <RAGView />
        ) : appMode === 'github' ? (
          <GitHubAnalyzer />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Inputs */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Upload Document</h2>
                <DocumentUploader
                  onFileSelect={(file) => setSelectedFile(file)}
                  isProcessing={status === 'ocr_processing' || status === 'llm_processing'}
                />
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Settings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">OCR Provider</label>
                    <select
                      value={ocrProvider}
                      onChange={(e) => setOcrProvider(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={status === 'ocr_processing' || status === 'llm_processing'}
                    >
                      {/* Tier 1: Cloud APIs - Easy Setup, Ready to Use */}
                      <optgroup label="⭐⭐⭐ Cloud APIs (Easiest)">
                        <option value="google-vision">Google Vision API - Best quality & reliability (Recommended)</option>
                        <option value="openai-vision">OpenAI Vision (GPT-4o-mini) - Great for tables & complex layouts</option>
                        <option value="mistral">Mistral Vision - Good alternative, competitive pricing</option>
                      </optgroup>
                      
                      {/* Tier 2: Free Options - Good for Simple Docs */}
                      <optgroup label="⭐⭐ Free Options">
                        <option value="ocr-space">OCR.space API - 500 pages/day free tier</option>
                        <option value="tesseract">Tesseract (Browser) - 100% free, runs in your browser</option>
                      </optgroup>
                      
                      {/* Tier 3: Self-Hosted - Need Docker Setup */}
                      <optgroup label="⭐ Self-Hosted (Advanced)">
                        <option value="dots-ocr">dots.ocr - SOTA multilingual layout parsing</option>
                        <option value="paddleocr">PaddleOCR - Open-source, good for Chinese</option>
                        <option value="deepseek-ocr">DeepSeek-OCR - Premium quality, requires GPU</option>
                      </optgroup>
                    </select>
                    <p className="mt-2 text-xs text-gray-500">
                      💡 Tip: Start with Google Vision for best results. Use free options for simple documents or self-hosted for maximum control.
                    </p>
                </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">LLM Provider</label>
                    <select
                      value={llmProvider}
                      onChange={(e) => setLlmProvider(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={status === 'ocr_processing' || status === 'llm_processing'}
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="mistral">Mistral</option>
                    </select>
              </div>
            </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={onProcess}
                    disabled={!selectedFile || !selectedTemplate || status === 'ocr_processing' || status === 'llm_processing'}
                    className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Process Document
                  </button>
              <button
                    onClick={() => { setSelectedFile(null); setSelectedTemplate(null); reset(); }}
                    disabled={status === 'ocr_processing' || status === 'llm_processing'}
                    className="px-5 py-2.5 bg-white text-gray-700 rounded-lg font-medium border border-gray-300 hover:bg-gray-50"
              >
                    Reset
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Output Template</h2>
            <TemplateEditor
              selectedTemplate={selectedTemplate}
                  onTemplateSelect={(tpl) => setSelectedTemplate(tpl)}
            />
          </div>
        </div>

            {/* Right: Results */}
            <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Results</h2>
          <ResultsDisplay
                  status={status === 'idle' ? 'pending' : status === 'uploading' ? 'pending' : status}
                  extractedText={extractedText || ''}
            structuredOutput={structuredOutput}
            error={error}
            processingTime={processingTime}
            onRetry={onProcess}
          />
              </div>
              </div>
            </div>
          )}

        <footer className="mt-10 text-center text-sm text-gray-500">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-6">
              <button
                onClick={() => navigate('/health')}
                className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200"
              >
                <Activity className="w-4 h-4 mr-2" />
                System Health
              </button>
              <span className="text-gray-400">|</span>
              <span>Developed with ❤️ by Patrick</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}