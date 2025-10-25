import React from 'react';

interface TesseractProgressProps {
  progress?: number;
  status?: string;
  currentPage?: number;
  totalPages?: number;
  confidence?: number;
  estimatedTimeRemaining?: number;
}

export function TesseractProgress({
  progress = 0,
  status = 'Processing...',
  currentPage,
  totalPages,
  confidence,
  estimatedTimeRemaining
}: TesseractProgressProps) {
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };

  const getProgressColor = () => {
    if (progress < 30) return 'bg-red-500';
    if (progress < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getConfidenceColor = () => {
    if (!confidence) return 'text-gray-500';
    if (confidence < 70) return 'text-red-500';
    if (confidence < 85) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg border">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-gray-800">Tesseract OCR</h3>
          <span className="text-sm font-medium text-gray-600">
            {Math.round(progress)}%
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Status */}
        <p className="text-sm text-gray-700 mb-2">{status}</p>
        
        {/* Page Progress */}
        {currentPage && totalPages && (
          <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
            <span>Page {currentPage} of {totalPages}</span>
            <span>{Math.round((currentPage / totalPages) * 100)}% complete</span>
          </div>
        )}
        
        {/* Confidence Score */}
        {confidence !== undefined && (
          <div className="flex justify-between items-center text-sm mb-2">
            <span className="text-gray-600">Confidence:</span>
            <span className={`font-medium ${getConfidenceColor()}`}>
              {confidence.toFixed(1)}%
            </span>
          </div>
        )}
        
        {/* Time Remaining */}
        {estimatedTimeRemaining !== undefined && estimatedTimeRemaining > 0 && (
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Estimated time remaining:</span>
            <span className="font-medium">{formatTime(estimatedTimeRemaining)}</span>
          </div>
        )}
      </div>
      
      {/* Processing Tips */}
      <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
        <p className="font-medium mb-1">💡 Processing Tips:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Higher confidence scores indicate better text recognition</li>
          <li>Processing time depends on image quality and text density</li>
          <li>Large files may take several minutes to process</li>
        </ul>
      </div>
    </div>
  );
}

export default TesseractProgress;
