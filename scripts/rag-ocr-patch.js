#!/usr/bin/env node

// Quick patch to add OCR provider selection to RAG mode
// Run this to add OCR provider dropdown to RAG interface

const fs = require('fs');
const path = require('path');

const ragViewPath = path.join(__dirname, 'frontend/src/components/RAGView.tsx');

console.log('🔧 Adding OCR provider selection to RAG mode...');

// Read the current file
let content = fs.readFileSync(ragViewPath, 'utf8');

// Add OCR provider state after line with error state
const errorStateLine = '  const [error, setError] = useState<string>(\'\');';
const ocrProviderState = '  const [ocrProvider, setOcrProvider] = useState<\'google-vision\' | \'openai-vision\' | \'mistral\' | \'ocr-space\' | \'tesseract\'>(\'openai-vision\');';

if (!content.includes('ocrProvider')) {
  content = content.replace(errorStateLine, errorStateLine + '\n' + ocrProviderState);
  console.log('✅ Added OCR provider state');
}

// Add OCR provider selector after upload section
const uploadSectionEnd = '        )}';
const ocrSelector = `
        )}

        {/* OCR Provider Selection */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-600 rounded-full text-sm font-bold">
              ⚙️
            </span>
            OCR Provider Selection
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose OCR Provider for Document Processing:
              </label>
              <select
                value={ocrProvider}
                onChange={(e) => setOcrProvider(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isProcessing}
              >
                <option value="openai-vision">OpenAI Vision (Best for large PDFs)</option>
                <option value="google-vision">Google Vision (Good for images)</option>
                <option value="tesseract">Tesseract (Browser-based, no limits)</option>
                <option value="mistral">Mistral Vision (Alternative)</option>
                <option value="ocr-space">OCR.space (Free tier limited)</option>
              </select>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Provider Recommendations:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>OpenAI Vision</strong>: Best for large PDFs, handles complex layouts</li>
                <li>• <strong>Google Vision</strong>: Good for images, may struggle with large PDFs</li>
                <li>• <strong>Tesseract</strong>: Browser-based, no API limits, good fallback</li>
                <li>• <strong>Mistral Vision</strong>: Alternative option, good for some formats</li>
                <li>• <strong>OCR.space</strong>: Free but limited to 1MB files</li>
              </ul>
            </div>
          </div>
        </div>`;

if (!content.includes('OCR Provider Selection')) {
  content = content.replace(uploadSectionEnd, ocrSelector);
  console.log('✅ Added OCR provider selector UI');
}

// Update OCR calls to use selected provider
content = content.replace(/'google-vision',/g, 'ocrProvider,');
content = content.replace(/'openai-vision',/g, 'ocrProvider,');
console.log('✅ Updated OCR calls to use selected provider');

// Write the updated file
fs.writeFileSync(ragViewPath, content);
console.log('✅ RAG mode now has OCR provider selection!');
console.log('');
console.log('🎯 Next steps:');
console.log('1. Run: npm run build --prefix frontend');
console.log('2. Deploy the updated frontend');
console.log('3. Test different OCR providers with your document');
