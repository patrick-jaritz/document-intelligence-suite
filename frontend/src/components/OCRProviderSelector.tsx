import React from 'react';

interface OCRProviderSelectorProps {
  selectedProvider: 'google-vision' | 'openai-vision' | 'mistral' | 'ocr-space' | 'tesseract';
  onProviderChange: (provider: 'google-vision' | 'openai-vision' | 'mistral' | 'ocr-space' | 'tesseract') => void;
  disabled?: boolean;
}

export const OCRProviderSelector: React.FC<OCRProviderSelectorProps> = ({
  selectedProvider,
  onProviderChange,
  disabled = false
}) => {
  return (
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
            value={selectedProvider}
            onChange={(e) => onProviderChange(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={disabled}
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
        
        {selectedProvider === 'tesseract' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Tesseract:</strong> This will process your document entirely in your browser. 
              No data is sent to external services, but processing may take longer for large documents.
            </p>
          </div>
        )}
        
        {selectedProvider === 'ocr-space' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>OCR.space:</strong> Free tier limited to 1MB files. Files larger than 1MB will fail.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
